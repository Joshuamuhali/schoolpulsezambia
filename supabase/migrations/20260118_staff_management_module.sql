-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260118_staff_management_module
-- Staff Management - Teachers, Administrators, and Staff
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. STAFF PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Employee information
  employee_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F')),
  date_of_birth DATE,
  phone TEXT,
  email TEXT,
  address TEXT,
  
  -- Employment details
  position TEXT,
  department TEXT,
  employment_type TEXT CHECK (employment_type IN ('permanent', 'contract', 'temporary', 'intern')),
  employment_date DATE,
  termination_date DATE,
  termination_reason TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  
  -- Additional information
  qualifications TEXT,
  experience_years INTEGER,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  photo_url TEXT,
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, employee_number),
  UNIQUE(school_id, email)
);

CREATE INDEX idx_staff_profiles_school ON staff_profiles(school_id);
CREATE INDEX idx_staff_profiles_status ON staff_profiles(status);
CREATE INDEX idx_staff_profiles_email ON staff_profiles(email);

-- ============================================================================
-- 2. TEACHER ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  
  -- Assignment type
  assignment_type TEXT NOT NULL DEFAULT 'subject_teacher' CHECK (assignment_type IN ('class_teacher', 'subject_teacher')),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, teacher_id, class_id, subject_id, academic_year_id)
);

CREATE INDEX idx_teacher_assignments_school ON teacher_assignments(school_id);
CREATE INDEX idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_class ON teacher_assignments(class_id);
CREATE INDEX idx_teacher_assignments_subject ON teacher_assignments(subject_id);
CREATE INDEX idx_teacher_assignments_year ON teacher_assignments(academic_year_id);
CREATE INDEX idx_teacher_assignments_active ON teacher_assignments(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 3. STAFF INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Invitation details
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role_id UUID NOT NULL REFERENCES roles(id),
  
  -- Invitation status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  -- Token for acceptance
  token TEXT NOT NULL UNIQUE,
  
  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  
  -- Who sent the invitation
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_invitations_school ON staff_invitations(school_id);
CREATE INDEX idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX idx_staff_invitations_status ON staff_invitations(status);

-- ============================================================================
-- 4. UPDATE PROFILES TABLE
-- ============================================================================

-- Add staff_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_staff_id ON profiles(staff_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all staff tables
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- STAFF PROFILES POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_staff_profiles"
  ON staff_profiles FOR ALL
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

-- Teachers: Can view own profile only
CREATE POLICY "teacher_view_own_profile"
  ON staff_profiles FOR SELECT
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
      SELECT staff_id FROM profiles WHERE id = auth.uid()
    )
  );

-- TEACHER ASSIGNMENTS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_teacher_assignments"
  ON teacher_assignments FOR ALL
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

-- Teachers: Can view own assignments
CREATE POLICY "teacher_view_own_assignments"
  ON teacher_assignments FOR SELECT
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
  );

-- STAFF INVITATIONS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_staff_invitations"
  ON staff_invitations FOR ALL
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

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- 6.1 Get teacher's classes
CREATE OR REPLACE FUNCTION get_teacher_assignments(p_teacher_id UUID, p_school_id UUID)
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  grade_name TEXT,
  subject_name TEXT,
  assignment_type TEXT
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
    s.name as subject_name,
    ta.assignment_type
  FROM teacher_assignments ta
  JOIN classes c ON c.id = ta.class_id
  JOIN grades g ON g.id = c.grade_id
  JOIN subjects s ON s.id = ta.subject_id
  WHERE ta.teacher_id = p_teacher_id
    AND ta.school_id = p_school_id
    AND ta.is_active = TRUE
    AND c.is_active = TRUE
  ORDER BY g.level, c.name, s.name;
END;
$$;

-- 6.2 Get staff count for a school
CREATE OR REPLACE FUNCTION get_staff_count(p_school_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM staff_profiles
  WHERE school_id = p_school_id
    AND status = 'active';
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- 6.3 Get teacher count for a school
CREATE OR REPLACE FUNCTION get_teacher_count(p_school_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM staff_profiles
  WHERE school_id = p_school_id
    AND status = 'active'
    AND position ILIKE '%teacher%';
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Update timestamps for staff_profiles
CREATE TRIGGER update_staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for teacher_assignments
CREATE TRIGGER update_teacher_assignments_updated_at
  BEFORE UPDATE ON teacher_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for staff_invitations
CREATE TRIGGER update_staff_invitations_updated_at
  BEFORE UPDATE ON staff_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE staff_profiles IS 'Staff member profiles and employment information';
COMMENT ON TABLE teacher_assignments IS 'Teacher assignments to classes and subjects';
COMMENT ON TABLE staff_invitations IS 'Staff invitation system for onboarding';

-- ============================================================================
-- 9. GRANTS
-- ============================================================================

GRANT ALL ON staff_profiles TO authenticated;
GRANT ALL ON teacher_assignments TO authenticated;
GRANT ALL ON staff_invitations TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE staff_profiles_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE teacher_assignments_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE staff_invitations_id_seq TO authenticated;