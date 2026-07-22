-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260119_attendance_management_module
-- Attendance Management - Daily attendance tracking
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. ATTENDANCE SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Attendance configuration
  allow_editing BOOLEAN NOT NULL DEFAULT TRUE,
  late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
  attendance_method TEXT NOT NULL DEFAULT 'present_absent_late' CHECK (attendance_method IN ('present_absent', 'present_absent_late', 'custom')),
  
  -- Custom statuses (JSON array if using custom method)
  custom_statuses JSONB,
  
  -- Notifications
  notify_parents_on_absence BOOLEAN NOT NULL DEFAULT FALSE,
  notify_parents_on_late BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id)
);

CREATE INDEX idx_attendance_settings_school ON attendance_settings(school_id);

-- ============================================================================
-- 2. ATTENDANCE SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  
  -- Session details
  date DATE NOT NULL,
  period TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'locked')),
  
  -- Summary
  total_students INTEGER NOT NULL DEFAULT 0,
  present_count INTEGER NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  late_count INTEGER NOT NULL DEFAULT 0,
  excused_count INTEGER NOT NULL DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, class_id, teacher_id, date, period)
);

CREATE INDEX idx_attendance_sessions_school ON attendance_sessions(school_id);
CREATE INDEX idx_attendance_sessions_class ON attendance_sessions(class_id);
CREATE INDEX idx_attendance_sessions_teacher ON attendance_sessions(teacher_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(date);
CREATE INDEX idx_attendance_sessions_status ON attendance_sessions(status);

-- ============================================================================
-- 3. ATTENDANCE RECORDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  attendance_session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Attendance status
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  
  -- Additional information
  remarks TEXT,
  late_minutes INTEGER,
  
  -- Audit
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, attendance_session_id, student_id)
);

CREATE INDEX idx_attendance_records_school ON attendance_records(school_id);
CREATE INDEX idx_attendance_records_session ON attendance_records(attendance_session_id);
CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);

-- ============================================================================
-- 4. ATTENDANCE SUMMARY TABLE (for performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  
  -- Period
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  
  -- Counts
  total_days INTEGER NOT NULL DEFAULT 0,
  present_count INTEGER NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  late_count INTEGER NOT NULL DEFAULT 0,
  excused_count INTEGER NOT NULL DEFAULT 0,
  
  -- Calculated
  attendance_rate DECIMAL(5,2),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, student_id, class_id, academic_year_id, month, year)
);

CREATE INDEX idx_attendance_summary_school ON attendance_summary(school_id);
CREATE INDEX idx_attendance_summary_student ON attendance_summary(student_id);
CREATE INDEX idx_attendance_summary_class ON attendance_summary(class_id);
CREATE INDEX idx_attendance_summary_period ON attendance_summary(year, month);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all attendance tables
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;

-- ATTENDANCE SETTINGS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_attendance_settings"
  ON attendance_settings FOR ALL
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

-- ATTENDANCE SESSIONS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_attendance_sessions"
  ON attendance_sessions FOR ALL
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

-- Teachers: Can view and edit own sessions
CREATE POLICY "teacher_manage_own_attendance_sessions"
  ON attendance_sessions FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND teacher_id IN (
      SELECT staff_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND teacher_id IN (
      SELECT staff_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ATTENDANCE RECORDS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_attendance_records"
  ON attendance_records FOR ALL
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

-- Teachers: Can view and edit records for own sessions
CREATE POLICY "teacher_manage_own_attendance_records"
  ON attendance_records FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND attendance_session_id IN (
      SELECT id FROM attendance_sessions 
      WHERE teacher_id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND attendance_session_id IN (
      SELECT id FROM attendance_sessions 
      WHERE teacher_id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ATTENDANCE SUMMARY POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_attendance_summary"
  ON attendance_summary FOR ALL
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

-- Teachers: Can view summary for own classes
CREATE POLICY "teacher_view_own_attendance_summary"
  ON attendance_summary FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND class_id IN (
      SELECT class_id FROM teacher_assignments 
      WHERE teacher_id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
      AND is_active = TRUE
    )
  );

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- 6.1 Get attendance for a class on a specific date
CREATE OR REPLACE FUNCTION get_class_attendance(
  p_class_id UUID,
  p_date DATE,
  p_school_id UUID
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  status TEXT,
  remarks TEXT,
  late_minutes INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as student_id,
    s.full_name as student_name,
    ar.status,
    ar.remarks,
    ar.late_minutes
  FROM students s
  LEFT JOIN attendance_sessions ats ON ats.class_id = p_class_id AND ats.date = p_date AND ats.school_id = p_school_id
  LEFT JOIN attendance_records ar ON ar.attendance_session_id = ats.id AND ar.student_id = s.id
  WHERE s.class_id = p_class_id
    AND s.school_id = p_school_id
    AND s.status = 'active'
  ORDER BY s.full_name;
END;
$$;

-- 6.2 Get attendance statistics for a class
CREATE OR REPLACE FUNCTION get_class_attendance_stats(
  p_class_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_school_id UUID
)
RETURNS TABLE (
  total_students INTEGER,
  total_sessions INTEGER,
  avg_present DECIMAL,
  avg_absent DECIMAL,
  avg_late DECIMAL,
  avg_excused DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT s.id)::INTEGER as total_students,
    COUNT(DISTINCT ats.id)::INTEGER as total_sessions,
    ROUND(AVG(ats.present_count::DECIMAL / NULLIF(ats.total_students, 0) * 100), 2) as avg_present,
    ROUND(AVG(ats.absent_count::DECIMAL / NULLIF(ats.total_students, 0) * 100), 2) as avg_absent,
    ROUND(AVG(ats.late_count::DECIMAL / NULLIF(ats.total_students, 0) * 100), 2) as avg_late,
    ROUND(AVG(ats.excused_count::DECIMAL / NULLIF(ats.total_students, 0) * 100), 2) as avg_excused
  FROM classes c
  JOIN attendance_sessions ats ON ats.class_id = p_class_id AND ats.date BETWEEN p_start_date AND p_end_date AND ats.school_id = p_school_id
  JOIN students s ON s.class_id = p_class_id AND s.school_id = p_school_id AND s.status = 'active'
  WHERE c.id = p_class_id
  GROUP BY c.id;
END;
$$;

-- 6.3 Get student attendance summary
CREATE OR REPLACE FUNCTION get_student_attendance_summary(
  p_student_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_school_id UUID
)
RETURNS TABLE (
  total_days INTEGER,
  present_count INTEGER,
  absent_count INTEGER,
  late_count INTEGER,
  excused_count INTEGER,
  attendance_rate DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ats.id)::INTEGER as total_days,
    COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::INTEGER as present_count,
    COUNT(CASE WHEN ar.status = 'absent' THEN 1 END)::INTEGER as absent_count,
    COUNT(CASE WHEN ar.status = 'late' THEN 1 END)::INTEGER as late_count,
    COUNT(CASE WHEN ar.status = 'excused' THEN 1 END)::INTEGER as excused_count,
    ROUND(COUNT(CASE WHEN ar.status IN ('present', 'late', 'excused') THEN 1 END)::DECIMAL / NULLIF(COUNT(DISTINCT ats.id), 0) * 100, 2) as attendance_rate
  FROM students s
  JOIN attendance_records ar ON ar.student_id = p_student_id AND ar.school_id = p_school_id
  JOIN attendance_sessions ats ON ats.id = ar.attendance_session_id AND ats.date BETWEEN p_start_date AND p_end_date
  WHERE s.id = p_student_id
  GROUP BY s.id;
END;
$$;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Update timestamps for attendance_settings
CREATE TRIGGER update_attendance_settings_updated_at
  BEFORE UPDATE ON attendance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for attendance_sessions
CREATE TRIGGER update_attendance_sessions_updated_at
  BEFORE UPDATE ON attendance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for attendance_records
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for attendance_summary
CREATE TRIGGER update_attendance_summary_updated_at
  BEFORE UPDATE ON attendance_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE attendance_settings IS 'School-level attendance configuration';
COMMENT ON TABLE attendance_sessions IS 'Daily attendance sessions for classes';
COMMENT ON TABLE attendance_records IS 'Individual student attendance records';
COMMENT ON TABLE attendance_summary IS 'Aggregated attendance statistics for performance';

-- ============================================================================
-- 9. GRANTS
-- ============================================================================

GRANT ALL ON attendance_settings TO authenticated;
GRANT ALL ON attendance_sessions TO authenticated;
GRANT ALL ON attendance_records TO authenticated;
GRANT ALL ON attendance_summary TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE attendance_settings_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE attendance_sessions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE attendance_records_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE attendance_summary_id_seq TO authenticated;