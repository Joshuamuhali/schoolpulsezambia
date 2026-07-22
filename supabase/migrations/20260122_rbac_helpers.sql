-- ============================================================================
-- RBAC Helper Functions
-- ============================================================================
-- These functions provide centralized permission and ownership checks
-- ============================================================================

-- ============================================================================
-- Helper Function: Get User Context
-- Returns user_id, school_id, role, and permissions for the authenticated user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_context()
RETURNS TABLE (
  user_id UUID,
  school_id UUID,
  role TEXT,
  permissions TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as user_id,
    p.school_id,
    p.role,
    ARRAY(
      SELECT rp.permission_code 
      FROM role_permissions rp 
      WHERE rp.role = p.role
    ) as permissions
  FROM profiles p
  WHERE p.id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_context TO authenticated;

-- ============================================================================
-- Helper Function: Check Permission
-- Returns true if user has the specified permission
-- ============================================================================

CREATE OR REPLACE FUNCTION has_permission(p_permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN profiles p ON p.role = rp.role
    WHERE p.id = auth.uid()
      AND rp.permission_code = p_permission_code
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION has_permission TO authenticated;

-- ============================================================================
-- Helper Function: Check Module Enabled
-- Returns true if the school has the specified module enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION is_module_enabled(p_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM school_feature_flags sff
    JOIN profiles p ON p.school_id = sff.school_id
    WHERE p.id = auth.uid()
      AND sff.feature_id = p_feature_key
      AND sff.status = 'active'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_module_enabled TO authenticated;

-- ============================================================================
-- Helper Function: Assert Teacher Owns Class
-- Returns true if the authenticated user is a teacher assigned to the class
-- ============================================================================

CREATE OR REPLACE FUNCTION assert_teacher_owns_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM teacher_assignments ta
    JOIN profiles p ON p.id = ta.teacher_id
    WHERE p.id = auth.uid()
      AND ta.class_id = p_class_id
      AND p.role IN ('teacher', 'class_teacher')
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION assert_teacher_owns_class TO authenticated;

-- ============================================================================
-- Helper Function: Assert Parent Linked to Student
-- Returns true if the authenticated parent is linked to the student
-- ============================================================================

CREATE OR REPLACE FUNCTION assert_parent_linked_to_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM student_guardians sg
    JOIN profiles p ON p.id = sg.guardian_id
    WHERE p.id = auth.uid()
      AND sg.student_id = p_student_id
      AND p.role = 'parent'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION assert_parent_linked_to_student TO authenticated;

-- ============================================================================
-- Helper Function: Get Current School ID
-- Returns the school_id for the authenticated user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_school_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_current_school_id TO authenticated;
