-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260117_academic_structure_module
-- Academic Structure Management - Foundation for all school operations
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. ACADEMIC YEARS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Year details
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Notes
  description TEXT,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, name)
);

CREATE INDEX idx_academic_years_school ON academic_years(school_id);
CREATE INDEX idx_academic_years_status ON academic_years(status);
CREATE INDEX idx_academic_years_current ON academic_years(is_current) WHERE is_current = TRUE;

-- ============================================================================
-- 2. TERMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  
  -- Term details
  name TEXT NOT NULL,
  term_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Notes
  description TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, academic_year_id, term_number)
);

CREATE INDEX idx_terms_school ON terms(school_id);
CREATE INDEX idx_terms_academic_year ON terms(academic_year_id);
CREATE INDEX idx_terms_status ON terms(status);
CREATE INDEX idx_terms_current ON terms(is_current) WHERE is_current = TRUE;

-- ============================================================================
-- 3. GRADES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Grade details
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  description TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, level)
);

CREATE INDEX idx_grades_school ON grades(school_id);
CREATE INDEX idx_grades_level ON grades(level);
CREATE INDEX idx_grades_active ON grades(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 4. CLASSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  
  -- Class details
  name TEXT NOT NULL,
  stream TEXT,
  capacity INTEGER,
  
  -- Class teacher
  class_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Notes
  description TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, grade_id, name, academic_year_id)
);

CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_classes_grade ON classes(grade_id);
CREATE INDEX idx_classes_academic_year ON classes(academic_year_id);
CREATE INDEX idx_classes_teacher ON classes(class_teacher_id);
CREATE INDEX idx_classes_active ON classes(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 5. SUBJECTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Subject details
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  
  -- Status
  is_compulsory BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, name)
);

CREATE INDEX idx_subjects_school ON subjects(school_id);
CREATE INDEX idx_subjects_active ON subjects(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 6. CLASS SUBJECTS TABLE (Many-to-Many: Classes ↔ Subjects)
-- ============================================================================

CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Assignment details
  is_compulsory BOOLEAN NOT NULL DEFAULT TRUE,
  periods_per_week INTEGER,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, class_id, subject_id)
);

CREATE INDEX idx_class_subjects_school ON class_subjects(school_id);
CREATE INDEX idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX idx_class_subjects_subject ON class_subjects(subject_id);
CREATE INDEX idx_class_subjects_teacher ON class_subjects(teacher_id);
CREATE INDEX idx_class_subjects_active ON class_subjects(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all academic tables
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- ACADEMIC YEARS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_academic_years"
  ON academic_years FOR ALL
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

-- Teachers: Can view only
CREATE POLICY "teacher_view_academic_years"
  ON academic_years FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
  );

-- TERMS POLICIES

CREATE POLICY "school_admin_manage_terms"
  ON terms FOR ALL
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

CREATE POLICY "teacher_view_terms"
  ON terms FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
  );

-- GRADES POLICIES

CREATE POLICY "school_admin_manage_grades"
  ON grades FOR ALL
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

CREATE POLICY "teacher_view_grades"
  ON grades FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
  );

-- CLASSES POLICIES

CREATE POLICY "school_admin_manage_classes"
  ON classes FOR ALL
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

CREATE POLICY "teacher_view_assigned_classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND (
      class_teacher_id = auth.uid()
      OR id IN (
        SELECT class_id FROM class_subjects WHERE teacher_id = auth.uid()
      )
    )
  );

-- SUBJECTS POLICIES

CREATE POLICY "school_admin_manage_subjects"
  ON subjects FOR ALL
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

CREATE POLICY "teacher_view_subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
  );

-- CLASS SUBJECTS POLICIES

CREATE POLICY "school_admin_manage_class_subjects"
  ON class_subjects FOR ALL
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

CREATE POLICY "teacher_view_assigned_subjects"
  ON class_subjects FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND teacher_id = auth.uid()
  );

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- 8.1 Get current academic year for a school
CREATE OR REPLACE FUNCTION get_current_academic_year(p_school_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_year_id UUID;
BEGIN
  SELECT id INTO v_year_id
  FROM academic_years
  WHERE school_id = p_school_id
    AND is_current = TRUE
    AND status = 'active'
  LIMIT 1;
  
  RETURN v_year_id;
END;
$$;

-- 8.2 Get current term for a school
CREATE OR REPLACE FUNCTION get_current_term(p_school_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_term_id UUID;
BEGIN
  SELECT t.id INTO v_term_id
  FROM terms t
  JOIN academic_years ay ON ay.id = t.academic_year_id
  WHERE t.school_id = p_school_id
    AND t.is_current = TRUE
    AND t.status = 'active'
    AND ay.is_current = TRUE
  LIMIT 1;
  
  RETURN v_term_id;
END;
$$;

-- 8.3 Get class student count
CREATE OR REPLACE FUNCTION get_class_student_count(p_class_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM students
  WHERE class_id = p_class_id
    AND status = 'active';
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- 8.4 Check if class is full
CREATE OR REPLACE FUNCTION is_class_full(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_capacity INTEGER;
  v_current_count INTEGER;
BEGIN
  SELECT capacity, get_class_student_count(p_class_id) INTO v_capacity, v_current_count
  FROM classes
  WHERE id = p_class_id;
  
  IF v_capacity IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN v_current_count >= v_capacity;
END;
$$;

-- 8.5 Get teacher's classes
CREATE OR REPLACE FUNCTION get_teacher_classes(p_teacher_id UUID, p_school_id UUID)
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  grade_name TEXT,
  subject_name TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as class_id,
    c.name as class_name,
    g.name as grade_name,
    s.name as subject_name
  FROM class_subjects cs
  JOIN classes c ON c.id = cs.class_id
  JOIN grades g ON g.id = c.grade_id
  JOIN subjects s ON s.id = cs.subject_id
  WHERE cs.teacher_id = p_teacher_id
    AND cs.school_id = p_school_id
    AND cs.is_active = TRUE
    AND c.is_active = TRUE
  ORDER BY g.level, c.name, s.name;
END;
$$;

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Update timestamps for academic_years
CREATE TRIGGER update_academic_years_updated_at
  BEFORE UPDATE ON academic_years
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for terms
CREATE TRIGGER update_terms_updated_at
  BEFORE UPDATE ON terms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for grades
CREATE TRIGGER update_grades_updated_at
  BEFORE UPDATE ON grades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for classes
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for subjects
CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for class_subjects
CREATE TRIGGER update_class_subjects_updated_at
  BEFORE UPDATE ON class_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE academic_years IS 'Academic year periods for schools';
COMMENT ON TABLE terms IS 'Academic terms within academic years';
COMMENT ON TABLE grades IS 'Grade levels in the school (e.g., Grade 1, Grade 2)';
COMMENT ON TABLE classes IS 'Actual classes/streams within grades (e.g., Grade 5A, Grade 5B)';
COMMENT ON TABLE subjects IS 'Subjects taught in the school';
COMMENT ON TABLE class_subjects IS 'Many-to-many relationship between classes and subjects with teacher assignment';

-- ============================================================================
-- 11. GRANTS
-- ============================================================================

GRANT ALL ON academic_years TO authenticated;
GRANT ALL ON terms TO authenticated;
GRANT ALL ON grades TO authenticated;
GRANT ALL ON classes TO authenticated;
GRANT ALL ON subjects TO authenticated;
GRANT ALL ON class_subjects TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE academic_years_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE terms_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE grades_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE classes_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE subjects_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE class_subjects_id_seq TO authenticated;