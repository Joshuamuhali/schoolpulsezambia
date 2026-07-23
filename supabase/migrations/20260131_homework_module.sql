-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260131_homework_module
-- Homework Management - Assignments, Submissions, and Grading
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. HOMEWORK ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS homework_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Assignment details
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  
  -- Assignment settings
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  max_points INTEGER DEFAULT 100,
  
  -- Assignment type and status
  assignment_type TEXT NOT NULL DEFAULT 'regular' CHECK (assignment_type IN ('regular', 'project', 'group', 'exam_prep')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  
  -- Attachments and resources
  attachment_urls TEXT[],
  instructions TEXT,
  
  -- Visibility settings
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_homework_assignments_school ON homework_assignments(school_id);
CREATE INDEX idx_homework_assignments_class ON homework_assignments(class_id);
CREATE INDEX idx_homework_assignments_subject ON homework_assignments(subject_id);
CREATE INDEX idx_homework_assignments_due_date ON homework_assignments(due_date);
CREATE INDEX idx_homework_assignments_status ON homework_assignments(status);
CREATE INDEX idx_homework_assignments_assigned_by ON homework_assignments(assigned_by);

-- ============================================================================
-- 2. HOMEWORK SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS homework_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- References
  assignment_id UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Submission details
  submitted_at TIMESTAMPTZ,
  submission_text TEXT,
  attachment_urls TEXT[],
  
  -- Grading
  points_earned INTEGER,
  points_possible INTEGER,
  grade TEXT,
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN ('not_submitted', 'submitted', 'late', 'graded', 'returned')),
  
  -- Late submission tracking
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  late_submission_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX idx_homework_submissions_school ON homework_submissions(school_id);
CREATE INDEX idx_homework_submissions_assignment ON homework_submissions(assignment_id);
CREATE INDEX idx_homework_submissions_student ON homework_submissions(student_id);
CREATE INDEX idx_homework_submissions_status ON homework_submissions(status);
CREATE INDEX idx_homework_submissions_submitted_at ON homework_submissions(submitted_at DESC);

-- ============================================================================
-- 3. HOMEWORK COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS homework_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- References
  submission_id UUID NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
  
  -- Comment details
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('teacher', 'student', 'parent')),
  comment_text TEXT NOT NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_homework_comments_school ON homework_comments(school_id);
CREATE INDEX idx_homework_comments_submission ON homework_comments(submission_id);
CREATE INDEX idx_homework_comments_author ON homework_comments(author_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all homework tables
ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HOMEWORK ASSIGNMENTS POLICIES
-- ============================================================================

-- School Admin: Full access to all assignments in their school
CREATE POLICY "school_admin_manage_homework_assignments"
  ON homework_assignments FOR ALL
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

-- Teacher: Can view assignments for their assigned classes/subjects
CREATE POLICY "teacher_view_homework_assignments"
  ON homework_assignments FOR SELECT
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
    )
  );

-- Teacher: Can create assignments for their assigned classes/subjects
CREATE POLICY "teacher_create_homework_assignments"
  ON homework_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'teacher')
    )
    AND assigned_by = auth.uid()
    AND (
      class_id IN (
        SELECT id FROM classes WHERE class_teacher_id = auth.uid()
      )
      OR subject_id IN (
        SELECT subject_id FROM teacher_assignments 
        WHERE teacher_id IN (SELECT staff_id FROM profiles WHERE id = auth.uid())
      )
    )
  );

-- Teacher: Can update their own assignments
CREATE POLICY "teacher_update_own_homework_assignments"
  ON homework_assignments FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'teacher')
    )
    AND assigned_by = auth.uid()
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'teacher')
    )
  );

-- Student: Can view published assignments for their class
CREATE POLICY "student_view_homework_assignments"
  ON homework_assignments FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'student')
    )
    AND is_published = TRUE
    AND class_id IN (
      SELECT class_id FROM students WHERE id IN (
        SELECT student_id FROM student_guardians sg
        JOIN guardians g ON g.id = sg.guardian_id
        WHERE g.user_id = auth.uid()
      )
    )
  );

-- Parent: Can view published assignments for their children's classes
CREATE POLICY "parent_view_homework_assignments"
  ON homework_assignments FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'parent')
    )
    AND is_published = TRUE
    AND class_id IN (
      SELECT class_id FROM students WHERE id IN (
        SELECT student_id FROM student_guardians sg
        JOIN guardians g ON g.id = sg.guardian_id
        WHERE g.user_id = auth.uid()
      )
    )
  );

-- Platform Admin: Full access
CREATE POLICY "platform_admin_manage_homework_assignments"
  ON homework_assignments FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================================
-- HOMEWORK SUBMISSIONS POLICIES
-- ============================================================================

-- School Admin: Full access to all submissions in their school
CREATE POLICY "school_admin_manage_homework_submissions"
  ON homework_submissions FOR ALL
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

-- Teacher: Can view and grade submissions for their assignments
CREATE POLICY "teacher_manage_homework_submissions"
  ON homework_submissions FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'teacher')
    )
    AND assignment_id IN (
      SELECT id FROM homework_assignments WHERE assigned_by = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'teacher')
    )
  );

-- Student: Can view and submit their own submissions
CREATE POLICY "student_manage_own_homework_submissions"
  ON homework_submissions FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'student')
    )
    AND student_id IN (
      SELECT id FROM students WHERE id IN (
        SELECT student_id FROM student_guardians sg
        JOIN guardians g ON g.id = sg.guardian_id
        WHERE g.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'student')
    )
    AND student_id IN (
      SELECT id FROM students WHERE id IN (
        SELECT student_id FROM student_guardians sg
        JOIN guardians g ON g.id = sg.guardian_id
        WHERE g.user_id = auth.uid()
      )
    )
  );

-- Parent: Can view their children's submissions
CREATE POLICY "parent_view_homework_submissions"
  ON homework_submissions FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'parent')
    )
    AND student_id IN (
      SELECT student_id FROM student_guardians sg
      JOIN guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
    )
  );

-- Platform Admin: Full access
CREATE POLICY "platform_admin_manage_homework_submissions"
  ON homework_submissions FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================================
-- HOMEWORK COMMENTS POLICIES
-- ============================================================================

-- School Admin: Full access
CREATE POLICY "school_admin_manage_homework_comments"
  ON homework_comments FOR ALL
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

-- Teacher: Can view and add comments to submissions they can grade
CREATE POLICY "teacher_manage_homework_comments"
  ON homework_comments FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'teacher')
    )
    AND submission_id IN (
      SELECT id FROM homework_submissions 
      WHERE assignment_id IN (
        SELECT id FROM homework_assignments WHERE assigned_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'teacher')
    )
    AND author_id = auth.uid()
  );

-- Student: Can view and add comments to their own submissions
CREATE POLICY "student_manage_own_homework_comments"
  ON homework_comments FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'student')
    )
    AND submission_id IN (
      SELECT id FROM homework_submissions WHERE student_id IN (
        SELECT id FROM students WHERE id IN (
          SELECT student_id FROM student_guardians sg
          JOIN guardians g ON g.id = sg.guardian_id
          WHERE g.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE key = 'student')
    )
    AND author_id = auth.uid()
  );

-- Platform Admin: Full access
CREATE POLICY "platform_admin_manage_homework_comments"
  ON homework_comments FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_homework_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_homework_assignments_updated_at
  BEFORE UPDATE ON homework_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_assignments_updated_at();

CREATE OR REPLACE FUNCTION update_homework_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_homework_submissions_updated_at
  BEFORE UPDATE ON homework_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_submissions_updated_at();

CREATE OR REPLACE FUNCTION update_homework_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_homework_comments_updated_at
  BEFORE UPDATE ON homework_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_comments_updated_at();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if homework is overdue
CREATE OR REPLACE FUNCTION is_homework_overdue(homework_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM homework_assignments 
    WHERE id = homework_id 
    AND due_date < CURRENT_DATE 
    AND status = 'published'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get homework statistics for a class
CREATE OR REPLACE FUNCTION get_homework_class_stats(class_id UUID, academic_year_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_assignments', COUNT(*) FILTER (WHERE status = 'published'),
    'total_submissions', COUNT(DISTINCT hs.id),
    'graded_submissions', COUNT(*) FILTER (WHERE hs.status = 'graded'),
    'pending_submissions', COUNT(*) FILTER (WHERE hs.status = 'not_submitted'),
    'late_submissions', COUNT(*) FILTER (WHERE hs.is_late = TRUE),
    'average_score', AVG(hs.points_earned::FLOAT / NULLIF(hs.points_possible, 0) * 100) FILTER (WHERE hs.points_earned IS NOT NULL)
  )
  INTO result
  FROM homework_assignments ha
  LEFT JOIN homework_submissions hs ON hs.assignment_id = ha.id
  WHERE ha.class_id = class_id
  AND (academic_year_id IS NULL OR ha.academic_year_id = academic_year_id);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get student homework summary
CREATE OR REPLACE FUNCTION get_student_homework_summary(student_id UUID, academic_year_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_assignments', COUNT(*) FILTER (WHERE ha.status = 'published'),
    'submitted', COUNT(*) FILTER (WHERE hs.status IN ('submitted', 'late', 'graded')),
    'graded', COUNT(*) FILTER (WHERE hs.status = 'graded'),
    'pending', COUNT(*) FILTER (WHERE hs.status = 'not_submitted'),
    'late', COUNT(*) FILTER (WHERE hs.is_late = TRUE),
    'average_score', AVG(hs.points_earned::FLOAT / NULLIF(hs.points_possible, 0) * 100) FILTER (WHERE hs.points_earned IS NOT NULL)
  )
  INTO result
  FROM homework_assignments ha
  JOIN homework_submissions hs ON hs.assignment_id = ha.id
  WHERE hs.student_id = student_id
  AND (academic_year_id IS NULL OR ha.academic_year_id = academic_year_id);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
