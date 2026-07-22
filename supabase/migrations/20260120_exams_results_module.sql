-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260120_exams_results_module
-- Exams & Results Management - Academic assessment system
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. GRADING SYSTEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS grading_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Grading system details
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, name)
);

CREATE INDEX idx_grading_systems_school ON grading_systems(school_id);
CREATE INDEX idx_grading_systems_status ON grading_systems(status);

-- ============================================================================
-- 2. GRADE RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS grade_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grading_system_id UUID NOT NULL REFERENCES grading_systems(id) ON DELETE CASCADE,
  
  -- Grade details
  grade_name TEXT NOT NULL,
  min_score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL,
  remarks TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, grading_system_id, grade_name)
);

CREATE INDEX idx_grade_rules_school ON grade_rules(school_id);
CREATE INDEX idx_grade_rules_grading_system ON grade_rules(grading_system_id);

-- ============================================================================
-- 3. EXAMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  
  -- Exam details
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'marks_entry', 'completed', 'published')),
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exams_school ON exams(school_id);
CREATE INDEX idx_exams_academic_year ON exams(academic_year_id);
CREATE INDEX idx_exams_term ON exams(term_id);
CREATE INDEX idx_exams_status ON exams(status);

-- ============================================================================
-- 4. EXAM SUBJECTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS exam_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  
  -- Assessment details
  max_marks DECIMAL(5,2) NOT NULL DEFAULT 100,
  pass_marks DECIMAL(5,2) NOT NULL DEFAULT 50,
  exam_date DATE,
  duration_minutes INTEGER,
  instructions TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, exam_id, class_id, subject_id)
);

CREATE INDEX idx_exam_subjects_school ON exam_subjects(school_id);
CREATE INDEX idx_exam_subjects_exam ON exam_subjects(exam_id);
CREATE INDEX idx_exam_subjects_class ON exam_subjects(class_id);
CREATE INDEX idx_exam_subjects_teacher ON exam_subjects(teacher_id);

-- ============================================================================
-- 5. STUDENT RESULTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_subject_id UUID NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Marks
  score DECIMAL(5,2),
  grade TEXT,
  remarks TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'published')),
  
  -- Audit
  marked_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, exam_subject_id, student_id)
);

CREATE INDEX idx_student_results_school ON student_results(school_id);
CREATE INDEX idx_student_results_exam_subject ON student_results(exam_subject_id);
CREATE INDEX idx_student_results_student ON student_results(student_id);
CREATE INDEX idx_student_results_status ON student_results(status);

-- ============================================================================
-- 6. STUDENT EXAM RESULTS TABLE (Aggregated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Results
  total_marks DECIMAL(6,2) NOT NULL DEFAULT 0,
  total_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  average DECIMAL(5,2) NOT NULL DEFAULT 0,
  overall_grade TEXT,
  position INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'published')),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, exam_id, student_id)
);

CREATE INDEX idx_student_exam_results_school ON student_exam_results(school_id);
CREATE INDEX idx_student_exam_results_exam ON student_exam_results(exam_id);
CREATE INDEX idx_student_exam_results_student ON student_exam_results(student_id);

-- ============================================================================
-- 7. REPORT CARDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  
  -- Comments
  teacher_comment TEXT,
  principal_comment TEXT,
  
  -- Attendance
  attendance_percentage DECIMAL(5,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published')),
  
  -- Audit
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  published_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, student_id, term_id, exam_id)
);

CREATE INDEX idx_report_cards_school ON report_cards(school_id);
CREATE INDEX idx_report_cards_student ON report_cards(student_id);
CREATE INDEX idx_report_cards_term ON report_cards(term_id);
CREATE INDEX idx_report_cards_exam ON report_cards(exam_id);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all exam tables
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;

-- GRADING SYSTEMS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_grading_systems"
  ON grading_systems FOR ALL
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

-- Teachers: Can view
CREATE POLICY "teacher_view_grading_systems"
  ON grading_systems FOR SELECT
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

-- EXAMS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_exams"
  ON exams FOR ALL
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

-- Teachers: Can view exams for their classes
CREATE POLICY "teacher_view_exams"
  ON exams FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND id IN (
      SELECT exam_id FROM exam_subjects 
      WHERE teacher_id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- EXAM SUBJECTS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_exam_subjects"
  ON exam_subjects FOR ALL
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

-- Teachers: Can view and update own exam subjects
CREATE POLICY "teacher_manage_own_exam_subjects"
  ON exam_subjects FOR ALL
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

-- STUDENT RESULTS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_student_results"
  ON student_results FOR ALL
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

-- Teachers: Can view and update results for own exam subjects
CREATE POLICY "teacher_manage_own_student_results"
  ON student_results FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND exam_subject_id IN (
      SELECT id FROM exam_subjects 
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
    AND exam_subject_id IN (
      SELECT id FROM exam_subjects 
      WHERE teacher_id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- STUDENT EXAM RESULTS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_student_exam_results"
  ON student_exam_results FOR ALL
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

-- Teachers: Can view results for their exams
CREATE POLICY "teacher_view_student_exam_results"
  ON student_exam_results FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND exam_id IN (
      SELECT exam_id FROM exam_subjects 
      WHERE teacher_id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- REPORT CARDS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_report_cards"
  ON report_cards FOR ALL
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

-- Teachers: Can view report cards for their classes
CREATE POLICY "teacher_view_report_cards"
  ON report_cards FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND exam_id IN (
      SELECT exam_id FROM exam_subjects 
      WHERE teacher_id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- 9.1 Calculate grade from score
CREATE OR REPLACE FUNCTION calculate_grade(
  p_score DECIMAL,
  p_school_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_grade TEXT;
BEGIN
  SELECT grade_name INTO v_grade
  FROM grade_rules
  WHERE school_id = p_school_id
    AND p_score BETWEEN min_score AND max_score
    AND grading_system_id IN (
      SELECT id FROM grading_systems WHERE school_id = p_school_id AND status = 'active'
    )
  ORDER BY min_score DESC
  LIMIT 1;
  
  RETURN COALESCE(v_grade, 'F');
END;
$$;

-- 9.2 Calculate exam results for a student
CREATE OR REPLACE FUNCTION calculate_exam_results(
  p_exam_id UUID,
  p_student_id UUID,
  p_school_id UUID
)
RETURNS TABLE (
  total_marks DECIMAL,
  total_score DECIMAL,
  average DECIMAL,
  overall_grade TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(es.max_marks)::DECIMAL as total_marks,
    SUM(COALESCE(sr.score, 0))::DECIMAL as total_score,
    ROUND(SUM(COALESCE(sr.score, 0))::DECIMAL / NULLIF(SUM(es.max_marks), 0) * 100, 2) as average,
    calculate_grade(ROUND(SUM(COALESCE(sr.score, 0))::DECIMAL / NULLIF(SUM(es.max_marks), 0) * 100), p_school_id) as overall_grade
  FROM exam_subjects es
  LEFT JOIN student_results sr ON sr.exam_subject_id = es.id AND sr.student_id = p_student_id
  WHERE es.exam_id = p_exam_id
    AND es.school_id = p_school_id
  GROUP BY p_student_id;
END;
$$;

-- 9.3 Calculate class positions
CREATE OR REPLACE FUNCTION calculate_class_positions(
  p_exam_id UUID,
  p_school_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE student_exam_results
  SET position = sub.rank
  FROM (
    SELECT 
      id,
      RANK() OVER (ORDER BY average DESC) as rank
    FROM student_exam_results
    WHERE exam_id = p_exam_id
      AND school_id = p_school_id
  ) sub
  WHERE student_exam_results.id = sub.id;
END;
$$;

-- ============================================================================
-- 10. TRIGGERS
-- ============================================================================

-- Update timestamps for grading_systems
CREATE TRIGGER update_grading_systems_updated_at
  BEFORE UPDATE ON grading_systems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for grade_rules
CREATE TRIGGER update_grade_rules_updated_at
  BEFORE UPDATE ON grade_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for exams
CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for exam_subjects
CREATE TRIGGER update_exam_subjects_updated_at
  BEFORE UPDATE ON exam_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for student_results
CREATE TRIGGER update_student_results_updated_at
  BEFORE UPDATE ON student_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for student_exam_results
CREATE TRIGGER update_student_exam_results_updated_at
  BEFORE UPDATE ON student_exam_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for report_cards
CREATE TRIGGER update_report_cards_updated_at
  BEFORE UPDATE ON report_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. COMMENTS
-- ============================================================================

COMMENT ON TABLE grading_systems IS 'School-level grading systems';
COMMENT ON TABLE grade_rules IS 'Grade rules for grading systems';
COMMENT ON TABLE exams IS 'Examinations/assessments';
COMMENT ON TABLE exam_subjects IS 'Subjects included in exams';
COMMENT ON TABLE student_results IS 'Individual student marks for exam subjects';
COMMENT ON TABLE student_exam_results IS 'Aggregated exam results per student';
COMMENT ON TABLE report_cards IS 'Student report cards';

-- ============================================================================
-- 12. GRANTS
-- ============================================================================

GRANT ALL ON grading_systems TO authenticated;
GRANT ALL ON grade_rules TO authenticated;
GRANT ALL ON exams TO authenticated;
GRANT ALL ON exam_subjects TO authenticated;
GRANT ALL ON student_results TO authenticated;
GRANT ALL ON student_exam_results TO authenticated;
GRANT ALL ON report_cards TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE grading_systems_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE grade_rules_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE exams_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE exam_subjects_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE student_results_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE student_exam_results_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE report_cards_id_seq TO authenticated;