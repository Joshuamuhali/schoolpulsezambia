-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260131_timetable_module
-- Timetable Management - Class scheduling and conflict detection
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. TIMETABLE ENTRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Scheduling details
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  
  -- Time slot
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Room and location
  room_number TEXT,
  building TEXT,
  
  -- Entry details
  entry_type TEXT NOT NULL DEFAULT 'regular' CHECK (entry_type IN ('regular', 'exam', 'assembly', 'break', 'lunch', 'sports', 'activity')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  
  -- Color coding for UI
  color_hex TEXT,
  
  -- Audit
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure no overlapping entries for the same class at the same time
  EXCLUDE USING GIST (
    class_id WITH =,
    day_of_week WITH =,
    tsrange(start_time, end_time) WITH &&
  )
);

CREATE INDEX idx_timetable_entries_school ON timetable_entries(school_id);
CREATE INDEX idx_timetable_entries_class ON timetable_entries(class_id);
CREATE INDEX idx_timetable_entries_subject ON timetable_entries(subject_id);
CREATE INDEX idx_timetable_entries_teacher ON timetable_entries(teacher_id);
CREATE INDEX idx_timetable_entries_day ON timetable_entries(day_of_week);
CREATE INDEX idx_timetable_entries_time ON timetable_entries(start_time, end_time);
CREATE INDEX idx_timetable_entries_academic_year ON timetable_entries(academic_year_id);
CREATE INDEX idx_timetable_entries_term ON timetable_entries(term_id);
CREATE INDEX idx_timetable_entries_active ON timetable_entries(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 2. TIMETABLE CONFLICTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS timetable_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Conflict details
  entry_id UUID NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('teacher_conflict', 'room_conflict', 'class_conflict')),
  
  -- Conflicting entry
  conflicting_entry_id UUID REFERENCES timetable_entries(id) ON DELETE SET NULL,
  
  -- Conflict description
  description TEXT NOT NULL,
  
  -- Resolution
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Audit
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timetable_conflicts_school ON timetable_conflicts(school_id);
CREATE INDEX idx_timetable_conflicts_entry ON timetable_conflicts(entry_id);
CREATE INDEX idx_timetable_conflicts_type ON timetable_conflicts(conflict_type);
CREATE INDEX idx_timetable_conflicts_resolved ON timetable_conflicts(is_resolved);

-- ============================================================================
-- 3. TIMETABLE TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS timetable_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Template details
  name TEXT NOT NULL,
  description TEXT,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  
  -- Template type
  template_type TEXT NOT NULL DEFAULT 'weekly' CHECK (template_type IN ('weekly', 'daily', 'exam', 'event')),
  
  -- Is default template
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Audit
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timetable_templates_school ON timetable_templates(school_id);
CREATE INDEX idx_timetable_templates_academic_year ON timetable_templates(academic_year_id);

-- ============================================================================
-- 4. TIMETABLE TEMPLATE ENTRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS timetable_template_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- References
  template_id UUID NOT NULL REFERENCES timetable_templates(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  
  -- Time slot
  day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME,
  end_time TIME,
  
  -- Entry details
  entry_type TEXT NOT NULL DEFAULT 'regular' CHECK (entry_type IN ('regular', 'exam', 'assembly', 'break', 'lunch', 'sports', 'activity')),
  room_number TEXT,
  notes TEXT,
  
  -- Order for display
  display_order INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timetable_template_entries_school ON timetable_template_entries(school_id);
CREATE INDEX idx_timetable_template_entries_template ON timetable_template_entries(template_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all timetable tables
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_template_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TIMETABLE ENTRIES POLICIES
-- ============================================================================

-- School Admin: Full access
CREATE POLICY "school_admin_manage_timetable_entries"
  ON timetable_entries FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

-- Teacher: Can view timetable for their classes and subjects
CREATE POLICY "teacher_view_timetable_entries"
  ON timetable_entries FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'teacher')
    )
    AND (
      class_id IN (
        SELECT id FROM classes WHERE class_teacher_id = auth.uid()
      )
      OR subject_id IN (
        SELECT subject_id FROM teacher_assignments 
        WHERE teacher_id IN (SELECT staff_id FROM profiles WHERE id = auth.uid())
      )
      OR teacher_id IN (SELECT staff_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Student: Can view timetable for their class
CREATE POLICY "student_view_timetable_entries"
  ON timetable_entries FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'student')
    )
    AND class_id IN (
      SELECT class_id FROM students WHERE id IN (
        SELECT student_id FROM student_guardians sg
        JOIN guardians g ON g.id = sg.guardian_id
        WHERE g.user_id = auth.uid()
      )
    )
  );

-- Parent: Can view timetable for their children's classes
CREATE POLICY "parent_view_timetable_entries"
  ON timetable_entries FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'parent')
    )
    AND class_id IN (
      SELECT class_id FROM students WHERE id IN (
        SELECT student_id FROM student_guardians sg
        JOIN guardians g ON g.id = sg.guardian_id
        WHERE g.user_id = auth.uid()
      )
    )
  );

-- Platform Admin: Full access
CREATE POLICY "platform_admin_manage_timetable_entries"
  ON timetable_entries FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================================
-- TIMETABLE CONFLICTS POLICIES
-- ============================================================================

-- School Admin: Full access
CREATE POLICY "school_admin_manage_timetable_conflicts"
  ON timetable_conflicts FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

-- Teacher: Can view conflicts for their entries
CREATE POLICY "teacher_view_timetable_conflicts"
  ON timetable_conflicts FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'teacher')
    )
    AND entry_id IN (
      SELECT id FROM timetable_entries WHERE teacher_id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Platform Admin: Full access
CREATE POLICY "platform_admin_manage_timetable_conflicts"
  ON timetable_conflicts FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================================
-- TIMETABLE TEMPLATES POLICIES
-- ============================================================================

-- School Admin: Full access
CREATE POLICY "school_admin_manage_timetable_templates"
  ON timetable_templates FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

-- Teacher: View only
CREATE POLICY "teacher_view_timetable_templates"
  ON timetable_templates FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'teacher')
    )
  );

-- Platform Admin: Full access
CREATE POLICY "platform_admin_manage_timetable_templates"
  ON timetable_templates FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================================
-- TIMETABLE TEMPLATE ENTRIES POLICIES
-- ============================================================================

-- School Admin: Full access
CREATE POLICY "school_admin_manage_timetable_template_entries"
  ON timetable_template_entries FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

-- Platform Admin: Full access
CREATE POLICY "platform_admin_manage_timetable_template_entries"
  ON timetable_template_entries FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timetable_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timetable_entries_updated_at
  BEFORE UPDATE ON timetable_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_timetable_entries_updated_at();

CREATE OR REPLACE FUNCTION update_timetable_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timetable_templates_updated_at
  BEFORE UPDATE ON timetable_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_timetable_templates_updated_at();

CREATE OR REPLACE FUNCTION update_timetable_template_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timetable_template_entries_updated_at
  BEFORE UPDATE ON timetable_template_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_timetable_template_entries_updated_at();

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to check for teacher conflicts
CREATE OR REPLACE FUNCTION check_teacher_conflict(
  p_school_id UUID,
  p_teacher_id UUID,
  p_day_of_week INTEGER,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_entry_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM timetable_entries
    WHERE school_id = p_school_id
    AND teacher_id = p_teacher_id
    AND day_of_week = p_day_of_week
    AND tsrange(start_time, end_time) && tsrange(p_start_time, p_end_time)
    AND (p_exclude_entry_id IS NULL OR id != p_exclude_entry_id)
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for room conflicts
CREATE OR REPLACE FUNCTION check_room_conflict(
  p_school_id UUID,
  p_room_number TEXT,
  p_day_of_week INTEGER,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_entry_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM timetable_entries
    WHERE school_id = p_school_id
    AND room_number = p_room_number
    AND day_of_week = p_day_of_week
    AND tsrange(start_time, end_time) && tsrange(p_start_time, p_end_time)
    AND (p_exclude_entry_id IS NULL OR id != p_exclude_entry_id)
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect and log conflicts
CREATE OR REPLACE FUNCTION detect_timetable_conflicts(p_entry_id UUID)
RETURNS JSONB AS $$
DECLARE
  entry RECORD;
  teacher_conflict BOOLEAN;
  room_conflict BOOLEAN;
  conflict_count INTEGER := 0;
BEGIN
  -- Get the entry details
  SELECT * INTO entry FROM timetable_entries WHERE id = p_entry_id;
  
  -- Check for teacher conflict
  teacher_conflict := check_teacher_conflict(
    entry.school_id,
    entry.teacher_id,
    entry.day_of_week,
    entry.start_time,
    entry.end_time,
    p_entry_id
  );
  
  -- Check for room conflict
  room_conflict := check_room_conflict(
    entry.school_id,
    entry.room_number,
    entry.day_of_week,
    entry.start_time,
    entry.end_time,
    p_entry_id
  );
  
  -- Log teacher conflict
  IF teacher_conflict THEN
    INSERT INTO timetable_conflicts (
      school_id, entry_id, conflict_type, description
    )
    VALUES (
      entry.school_id,
      p_entry_id,
      'teacher_conflict',
      'Teacher has another class at this time'
    );
    conflict_count := conflict_count + 1;
  END IF;
  
  -- Log room conflict
  IF room_conflict THEN
    INSERT INTO timetable_conflicts (
      school_id, entry_id, conflict_type, description
    )
    VALUES (
      entry.school_id,
      p_entry_id,
      'room_conflict',
      'Room is already booked at this time'
    );
    conflict_count := conflict_count + 1;
  END IF;
  
  RETURN jsonb_build_object(
    'teacher_conflict', teacher_conflict,
    'room_conflict', room_conflict,
    'total_conflicts', conflict_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get weekly timetable for a class
CREATE OR REPLACE FUNCTION get_class_weekly_timetable(
  p_class_id UUID,
  p_academic_year_id UUID DEFAULT NULL,
  p_term_id UUID DEFAULT NULL
)
RETURNS TABLE (
  day_of_week INTEGER,
  entries JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    te.day_of_week,
    jsonb_agg(
      jsonb_build_object(
        'id', te.id,
        'subject_id', te.subject_id,
        'subject_name', s.name,
        'teacher_id', te.teacher_id,
        'teacher_name', sp.first_name || ' ' || sp.last_name,
        'start_time', te.start_time,
        'end_time', te.end_time,
        'room_number', te.room_number,
        'building', te.building,
        'entry_type', te.entry_type,
        'color_hex', te.color_hex
      ) ORDER BY te.start_time
    ) AS entries
  FROM timetable_entries te
  LEFT JOIN subjects s ON s.id = te.subject_id
  LEFT JOIN staff_profiles sp ON sp.id = te.teacher_id
  WHERE te.class_id = p_class_id
  AND te.is_active = TRUE
  AND (p_academic_year_id IS NULL OR te.academic_year_id = p_academic_year_id)
  AND (p_term_id IS NULL OR te.term_id = p_term_id)
  GROUP BY te.day_of_week
  ORDER BY te.day_of_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get teacher's weekly schedule
CREATE OR REPLACE FUNCTION get_teacher_weekly_schedule(
  p_teacher_id UUID,
  p_academic_year_id UUID DEFAULT NULL,
  p_term_id UUID DEFAULT NULL
)
RETURNS TABLE (
  day_of_week INTEGER,
  entries JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    te.day_of_week,
    jsonb_agg(
      jsonb_build_object(
        'id', te.id,
        'class_id', te.class_id,
        'class_name', c.name,
        'subject_id', te.subject_id,
        'subject_name', s.name,
        'start_time', te.start_time,
        'end_time', te.end_time,
        'room_number', te.room_number,
        'building', te.building,
        'entry_type', te.entry_type
      ) ORDER BY te.start_time
    ) AS entries
  FROM timetable_entries te
  LEFT JOIN classes c ON c.id = te.class_id
  LEFT JOIN subjects s ON s.id = te.subject_id
  WHERE te.teacher_id = p_teacher_id
  AND te.is_active = TRUE
  AND (p_academic_year_id IS NULL OR te.academic_year_id = p_academic_year_id)
  AND (p_term_id IS NULL OR te.term_id = p_term_id)
  GROUP BY te.day_of_week
  ORDER BY te.day_of_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically detect conflicts on insert/update
CREATE OR REPLACE FUNCTION trigger_detect_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM detect_timetable_conflicts(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_timetable_conflicts
  AFTER INSERT OR UPDATE ON timetable_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_detect_conflicts();
