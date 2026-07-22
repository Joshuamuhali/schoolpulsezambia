-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260117_student_management_enhancements
-- Enhanced student management with medical info, transfers, and RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. ENHANCE STUDENTS TABLE
-- ============================================================================

-- Add medical information and additional fields
ALTER TABLE students ADD COLUMN IF NOT EXISTS
  medical_conditions TEXT,
  allergies TEXT,
  blood_group TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  previous_school TEXT,
  transfer_certificate_number TEXT,
  enrollment_date DATE,
  graduation_date DATE,
  notes TEXT;

-- Add index for medical queries
CREATE INDEX IF NOT EXISTS idx_students_medical ON students(school_id, blood_group) WHERE status = 'active';

-- ============================================================================
-- 2. ENHANCE GUARDIANS TABLE
-- ============================================================================

-- Add additional guardian fields
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS
  address TEXT,
  occupation TEXT,
  national_id TEXT,
  is_emergency_contact BOOLEAN DEFAULT FALSE,
  can_pickup BOOLEAN DEFAULT TRUE,
  notes TEXT;

-- ============================================================================
-- 3. STUDENT TRANSFERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Transfer details
  from_class_id UUID NOT NULL REFERENCES classes(id),
  to_class_id UUID NOT NULL REFERENCES classes(id),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Reason and approval
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
  
  -- Academic impact
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms(id),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_transfers_school ON student_transfers(school_id);
CREATE INDEX idx_student_transfers_student ON student_transfers(student_id);
CREATE INDEX idx_student_transfers_status ON student_transfers(status);
CREATE INDEX idx_student_transfers_date ON student_transfers(transfer_date DESC);

-- ============================================================================
-- 4. STUDENT IMPORT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Import details
  file_name TEXT,
  total_records INTEGER NOT NULL,
  successful_imports INTEGER NOT NULL DEFAULT 0,
  failed_imports INTEGER NOT NULL DEFAULT 0,
  
  -- Error tracking
  errors JSONB DEFAULT '[]',
  
  -- Audit
  imported_by UUID NOT NULL REFERENCES auth.users(id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_import_logs_school ON student_import_logs(school_id);
CREATE INDEX idx_student_import_logs_date ON student_import_logs(imported_at DESC);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all student-related tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_import_logs ENABLE ROW LEVEL SECURITY;

-- STUDENTS POLICIES

-- School Admin: Full access to students in their school
CREATE POLICY "school_admin_full_access_students"
  ON students FOR ALL
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

-- Teachers: Can view and update students in their assigned classes
CREATE POLICY "teacher_view_assigned_students"
  ON students FOR SELECT
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
      class_id IN (
        SELECT id FROM classes WHERE class_teacher_id = auth.uid()
      )
      OR class_id IN (
        SELECT class_id FROM teacher_subjects WHERE teacher_id = auth.uid()
      )
    )
  );

CREATE POLICY "teacher_update_student_notes"
  ON students FOR UPDATE
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
      SELECT id FROM classes WHERE class_teacher_id = auth.uid()
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
  );

-- Parents: Can view their linked children only
CREATE POLICY "parent_view_own_children"
  ON students FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('parent')
      )
    )
    AND id IN (
      SELECT student_id FROM student_guardians sg
      JOIN guardians g ON g.id = sg.guardian_id
      WHERE g.school_id = students.school_id
      AND g.user_id = auth.uid()
    )
  );

-- Bursar: Can view all students in their school
CREATE POLICY "bursar_view_all_students"
  ON students FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('bursar', 'finance_officer')
      )
    )
  );

-- GUARDIANS POLICIES

CREATE POLICY "school_admin_manage_guardians"
  ON guardians FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar')
      )
    )
  );

CREATE POLICY "parent_view_own_guardian"
  ON guardians FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('parent')
      )
    )
    AND user_id = auth.uid()
  );

-- STUDENT_GUARDIANS POLICIES

CREATE POLICY "school_admin_manage_student_guardians"
  ON student_guardians FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE school_id IN (
        SELECT school_id FROM school_members 
        WHERE user_id = auth.uid() 
        AND role_id IN (
          SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar')
        )
      )
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE school_id IN (
        SELECT school_id FROM school_members 
        WHERE user_id = auth.uid() 
        AND role_id IN (
          SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar')
        )
      )
    )
  );

-- STUDENT_TRANSFERS POLICIES

CREATE POLICY "school_admin_manage_transfers"
  ON student_transfers FOR ALL
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

CREATE POLICY "teacher_view_transfers"
  ON student_transfers FOR SELECT
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

-- STUDENT_IMPORT_LOGS POLICIES

CREATE POLICY "school_admin_view_import_logs"
  ON student_import_logs FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

CREATE POLICY "staff_create_import_logs"
  ON student_import_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar', 'teacher')
      )
    )
    AND imported_by = auth.uid()
  );

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- 6.1 Get student count by class
CREATE OR REPLACE FUNCTION get_student_count_by_class(p_class_id UUID)
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

-- 6.2 Get student count by grade
CREATE OR REPLACE FUNCTION get_student_count_by_grade(p_grade_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM students
  WHERE grade_id = p_grade_id
    AND status = 'active';
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- 6.3 Check if student has outstanding balance
CREATE OR REPLACE FUNCTION has_outstanding_balance(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_balance DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(balance), 0) INTO v_balance
  FROM student_bills
  WHERE student_id = p_student_id
    AND status IN ('unpaid', 'partial');
  
  RETURN v_balance > 0;
END;
$$;

-- 6.4 Get student's primary guardian
CREATE OR REPLACE FUNCTION get_student_primary_guardian(p_student_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_guardian_id UUID;
BEGIN
  SELECT guardian_id INTO v_guardian_id
  FROM student_guardians
  WHERE student_id = p_student_id
    AND is_primary = TRUE
  LIMIT 1;
  
  RETURN v_guardian_id;
END;
$$;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Update timestamps for student_transfers
CREATE TRIGGER update_student_transfers_updated_at
  BEFORE UPDATE ON student_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for student_import_logs
CREATE TRIGGER update_student_import_logs_updated_at
  BEFORE UPDATE ON student_import_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE students IS 'Student records with medical information and transfer tracking';
COMMENT ON TABLE guardians IS 'Parent/guardian information with emergency contact details';
COMMENT ON TABLE student_guardians IS 'Many-to-many relationship between students and guardians';
COMMENT ON TABLE student_transfers IS 'Track student class transfers with approval workflow';
COMMENT ON TABLE student_import_logs IS 'Log bulk student imports for audit and error tracking';

COMMENT ON COLUMN students.medical_conditions IS 'Any medical conditions the student has';
COMMENT ON COLUMN students.allergies IS 'Known allergies (food, medication, etc.)';
COMMENT ON COLUMN students.blood_group IS 'Blood group for emergency situations';
COMMENT ON COLUMN students.emergency_contact_name IS 'Emergency contact person name';
COMMENT ON COLUMN students.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN students.previous_school IS 'Previous school name for transfers';
COMMENT ON COLUMN students.transfer_certificate_number IS 'Transfer certificate from previous school';
COMMENT ON COLUMN guardians.is_emergency_contact IS 'Whether this guardian is the emergency contact';
COMMENT ON COLUMN guardians.can_pickup IS 'Whether this guardian is authorized to pick up the student';

-- ============================================================================
-- 9. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample medical conditions enum values (if using enum)
-- This is just a comment - actual enum would be created separately
-- Medical conditions: asthma, diabetes, epilepsy, allergies, heart_condition, none

-- ============================================================================
-- 10. GRANTS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON students TO authenticated;
GRANT ALL ON guardians TO authenticated;
GRANT ALL ON student_guardians TO authenticated;
GRANT ALL ON student_transfers TO authenticated;
GRANT ALL ON student_import_logs TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE students_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE guardians_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE student_transfers_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE student_import_logs_id_seq TO authenticated;