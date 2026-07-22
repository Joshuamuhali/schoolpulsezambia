-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260113_user_management_system
--
-- Complete User Management & Role-Based Access Control System
-- - Enhanced roles with categories and module alignment
-- - Granular permissions system
-- - Role history audit trail
-- - User invitation system
-- - Master account designation
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. ENHANCE ROLES TABLE
-- ============================================================================

-- Add new columns to existing roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'school' 
  CHECK (category IN ('school', 'module', 'system'));
ALTER TABLE roles ADD COLUMN IF NOT EXISTS module_key TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS key TEXT UNIQUE;

-- Update existing roles with keys and categories
UPDATE roles SET 
  key = LOWER(REPLACE(name, ' ', '_')),
  category = 'school',
  is_master = (name IN ('SUPER_ADMIN', 'SCHOOL_OWNER'))
WHERE key IS NULL;

-- Insert additional school-level roles
INSERT INTO roles (name, key, description, category, is_master) VALUES
  ('Principal', 'principal', 'Academic leadership and management', 'school', FALSE),
  ('School Administrator', 'school_admin', 'Day-to-day operations management', 'school', FALSE),
  ('Accountant', 'accountant', 'Financial management and reporting', 'school', FALSE),
  ('HR Officer', 'hr_officer', 'Staff and human resources management', 'school', FALSE),
  ('Teacher', 'teacher', 'Classroom management and teaching', 'school', FALSE),
  ('Parent', 'parent', 'View children progress and communicate', 'school', FALSE),
  ('Registrar', 'registrar', 'Student enrollment and records', 'school', FALSE),
  ('Receptionist', 'receptionist', 'Front desk and visitor management', 'school', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Insert module-specific roles
INSERT INTO roles (name, key, description, category, module_key) VALUES
  -- Teachers Module
  ('Head of Department', 'hod', 'Lead subject department', 'module', 'teachers'),
  ('Head Teacher', 'head_teacher', 'Grade/class level lead', 'module', 'teachers'),
  ('Subject Coordinator', 'subject_coordinator', 'Subject planning and resources', 'module', 'teachers'),
  
  -- Exams Module
  ('Examinations Officer', 'exams_officer', 'Manage exams and results', 'module', 'exams'),
  ('Grading Officer', 'grading_officer', 'Manage grading system', 'module', 'exams'),
  
  -- Finance Module
  ('Finance Director', 'finance_director', 'Oversee finance operations', 'module', 'finance'),
  ('Payroll Officer', 'payroll_officer', 'Manage staff payroll', 'module', 'finance'),
  ('Bursar Assistant', 'bursar_assistant', 'Assist with fee collections', 'module', 'finance'),
  
  -- Students Module
  ('Guidance Counselor', 'counselor', 'Student wellness and guidance', 'module', 'students'),
  ('School Nurse', 'nurse', 'Health services and first aid', 'module', 'students'),
  ('Sports Director', 'sports_director', 'Sports and physical education', 'module', 'students'),
  ('Librarian', 'librarian', 'Manage library resources', 'module', 'students'),
  
  -- Communication Module
  ('Communications Officer', 'comms_officer', 'Manage parent communication', 'module', 'communication'),
  ('Parent Liaison', 'parent_liaison', 'Parent communication and meetings', 'module', 'communication'),
  
  -- System Module
  ('IT Support', 'it_support', 'System maintenance and user support', 'module', 'system'),
  ('Secretary', 'secretary', 'Office administration', 'module', 'system')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. ENHANCE PERMISSIONS TABLE
-- ============================================================================

-- Add key column if not exists
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS key TEXT UNIQUE;

-- Update existing permissions with keys
UPDATE permissions SET key = module || ':' || action WHERE key IS NULL;

-- Insert additional granular permissions
INSERT INTO permissions (name, module, action, key) VALUES
  -- School Management
  ('View school settings', 'school', 'read', 'school:read'),
  ('Edit school settings', 'school', 'write', 'school:write'),
  ('Manage school settings', 'school', 'admin', 'school:admin'),
  
  -- User Management
  ('View users', 'users', 'read', 'users:read'),
  ('Add/edit users', 'users', 'write', 'users:write'),
  ('Remove users', 'users', 'delete', 'users:delete'),
  ('Change user roles', 'users', 'manage_roles', 'users:manage_roles'),
  
  -- Student Management
  ('View students', 'students', 'read', 'students:read'),
  ('Add/edit students', 'students', 'write', 'students:write'),
  ('Delete students', 'students', 'delete', 'students:delete'),
  ('Full student management', 'students', 'manage', 'students:manage'),
  ('View own children', 'students', 'read_own', 'students:read_own'),
  
  -- Staff Management
  ('View staff', 'staff', 'read', 'staff:read'),
  ('Add/edit staff', 'staff', 'write', 'staff:write'),
  ('Delete staff', 'staff', 'delete', 'staff:delete'),
  ('Full staff management', 'staff', 'manage', 'staff:manage'),
  
  -- Attendance
  ('View attendance', 'attendance', 'read', 'attendance:read'),
  ('Mark attendance', 'attendance', 'write', 'attendance:write'),
  ('Edit attendance', 'attendance', 'update', 'attendance:update'),
  ('Full attendance management', 'attendance', 'manage', 'attendance:manage'),
  ('View own attendance', 'attendance', 'read_own', 'attendance:read_own'),
  
  -- Exams
  ('View exams', 'exams', 'read', 'exams:read'),
  ('Create/edit exams', 'exams', 'write', 'exams:write'),
  ('Delete exams', 'exams', 'delete', 'exams:delete'),
  ('Enter marks', 'exams', 'enter_marks', 'exams:enter_marks'),
  ('Manage all marks', 'exams', 'manage_marks', 'exams:manage_marks'),
  ('Full exam management', 'exams', 'manage', 'exams:manage'),
  
  -- Finance
  ('View fees', 'finance', 'read', 'finance:read'),
  ('Create fee structures', 'finance', 'write', 'finance:write'),
  ('Delete fees', 'finance', 'delete', 'finance:delete'),
  ('Record payments', 'finance', 'record_payments', 'finance:record_payments'),
  ('Manage all payments', 'finance', 'manage_payments', 'finance:manage_payments'),
  ('Full finance management', 'finance', 'manage', 'finance:manage'),
  ('View payroll', 'finance', 'view_payroll', 'finance:view_payroll'),
  ('Manage payroll', 'finance', 'manage_payroll', 'finance:manage_payroll'),
  
  -- Communication
  ('View messages', 'communication', 'read', 'communication:read'),
  ('Send messages', 'communication', 'write', 'communication:write'),
  ('Manage communications', 'communication', 'manage', 'communication:manage'),
  ('Send announcements', 'communication', 'announce', 'communication:announce'),
  
  -- Reports
  ('View reports', 'reports', 'read', 'reports:read'),
  ('Create reports', 'reports', 'write', 'reports:write'),
  ('Export reports', 'reports', 'export', 'reports:export'),
  ('View financial reports', 'reports', 'view_financial', 'reports:view_financial'),
  ('View academic reports', 'reports', 'view_academic', 'reports:view_academic'),
  
  -- Timetable
  ('View timetable', 'timetable', 'read', 'timetable:read'),
  ('Create/edit timetable', 'timetable', 'write', 'timetable:write'),
  ('Manage timetable', 'timetable', 'manage', 'timetable:manage'),
  
  -- Analytics
  ('View analytics', 'analytics', 'read', 'analytics:read'),
  ('View attendance analytics', 'analytics', 'view_attendance', 'analytics:view_attendance'),
  ('View financial analytics', 'analytics', 'view_financial', 'analytics:view_financial'),
  ('View academic analytics', 'analytics', 'view_academic', 'analytics:view_academic')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. ENHANCE ROLE_PERMISSIONS MAPPING
-- ============================================================================

-- Clear existing mappings to rebuild with new permission keys
DELETE FROM role_permissions;

-- SUPER_ADMIN gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.key = 'super_admin';

-- SCHOOL_OWNER gets everything except platform admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.key = 'school_owner'
  AND p.module NOT IN ('schools', 'features');

-- Principal (Academic + Staff + Reports)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.key = 'principal'
  AND p.key IN (
    'school:read',
    'users:read', 'users:write', 'users:manage_roles',
    'students:read', 'students:write', 'students:manage',
    'staff:read', 'staff:write', 'staff:manage',
    'attendance:read', 'attendance:write', 'attendance:manage',
    'exams:read', 'exams:write', 'exams:manage',
    'reports:read', 'reports:write', 'reports:export',
    'timetable:read', 'timetable:write', 'timetable:manage',
    'analytics:read', 'analytics:view_attendance', 'analytics:view_academic'
  );

-- School Administrator (Everything except finance)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.key = 'school_admin'
  AND p.module NOT IN ('finance', 'payroll');

-- Accountant (Finance + Reports)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.key = 'accountant'
  AND p.module IN ('finance', 'reports', 'students')
  AND p.action IN ('read', 'write', 'manage', 'view_financial');

-- HR Officer (Staff + Payroll)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.key = 'hr_officer'
  AND p.module IN ('staff', 'finance')
  AND p.key IN (
    'staff:read', 'staff:write', 'staff:manage',
    'finance:view_payroll', 'finance:manage_payroll',
    'reports:read', 'reports:view_financial'
  );

-- Teacher (Classroom only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.key = 'teacher'
  AND p.key IN (
    'students:read',
    'attendance:read', 'attendance:write',
    'exams:read', 'exams:write', 'exams:enter_marks',
    'communication:write',
    'reports:read', 'reports:view_academic'
  );

-- Parent (View own children only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.key = 'parent'
  AND p.key IN (
    'students:read_own',
    'attendance:read_own',
    'exams:read',
    'communication:read',
    'reports:read'
  );

-- Registrar (Students + Records)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.key = 'registrar'
  AND p.module IN ('students', 'staff')
  AND p.action IN ('read', 'write', 'manage');

-- Receptionist (View only, basic operations)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.key = 'receptionist'
  AND p.key IN (
    'students:read',
    'staff:read',
    'communication:read'
  );

-- ============================================================================
-- 4. ENHANCE SCHOOL_MEMBERS TABLE
-- ============================================================================

-- Add new columns
ALTER TABLE school_members ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE;
ALTER TABLE school_members ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE school_members ADD COLUMN IF NOT EXISTS invitation_token TEXT;
ALTER TABLE school_members ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

-- Create index for master account queries
CREATE INDEX IF NOT EXISTS idx_school_members_master ON school_members(school_id, is_master) 
  WHERE is_master = TRUE;

-- ============================================================================
-- 5. CREATE ROLE_HISTORY TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_member_id UUID NOT NULL REFERENCES school_members(id) ON DELETE CASCADE,
  old_role_id UUID REFERENCES roles(id),
  new_role_id UUID NOT NULL REFERENCES roles(id),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_role_history_school_member ON role_history(school_member_id);
CREATE INDEX idx_role_history_changed_at ON role_history(changed_at DESC);

-- ============================================================================
-- 6. CREATE USER_INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, email)
);

CREATE INDEX idx_user_invitations_school ON user_invitations(school_id);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Get user's primary role in a school
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID, p_school_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT r.key
  FROM school_members sm
  JOIN roles r ON r.id = sm.role_id
  WHERE sm.user_id = p_user_id
    AND sm.school_id = p_school_id
    AND sm.status = 'active'
    AND sm.is_master = TRUE
  LIMIT 1;
$$;

-- Check if user is master account
CREATE OR REPLACE FUNCTION is_master_account(p_user_id UUID, p_school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM school_members
    WHERE user_id = p_user_id
      AND school_id = p_school_id
      AND is_master = TRUE
      AND status = 'active'
  );
$$;

-- Get all users with their roles for a school
CREATE OR REPLACE FUNCTION get_school_users(p_school_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role_id UUID,
  role_name TEXT,
  role_key TEXT,
  is_master BOOLEAN,
  status TEXT,
  joined_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    sm.user_id,
    p.email,
    p.full_name,
    sm.role_id,
    r.name as role_name,
    r.key as role_key,
    sm.is_master,
    sm.status,
    sm.joined_at
  FROM school_members sm
  JOIN profiles p ON p.id = sm.user_id
  JOIN roles r ON r.id = sm.role_id
  WHERE sm.school_id = p_school_id
  ORDER BY sm.joined_at DESC;
$$;

-- Change user role with audit trail
CREATE OR REPLACE FUNCTION change_user_role(
  p_user_id UUID,
  p_school_id UUID,
  p_new_role_id UUID,
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_member_id UUID;
  v_old_role_id UUID;
  v_result JSONB;
BEGIN
  -- Get current role
  SELECT id, role_id INTO v_member_id, v_old_role_id
  FROM school_members
  WHERE user_id = p_user_id
    AND school_id = p_school_id
  LIMIT 1;
  
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'User not found in school';
  END IF;
  
  -- Update role
  UPDATE school_members
  SET role_id = p_new_role_id, updated_at = NOW()
  WHERE id = v_member_id;
  
  -- Log role change
  INSERT INTO role_history (school_member_id, old_role_id, new_role_id, changed_by, reason)
  VALUES (v_member_id, v_old_role_id, p_new_role_id, p_changed_by, p_reason);
  
  -- Prepare result
  v_result := jsonb_build_object(
    'success', TRUE,
    'user_id', p_user_id,
    'school_id', p_school_id,
    'old_role_id', v_old_role_id,
    'new_role_id', p_new_role_id
  );
  
  RETURN v_result;
END;
$$;

-- Invite user to school
CREATE OR REPLACE FUNCTION invite_user_to_school(
  p_school_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role_id UUID,
  p_invited_by UUID,
  p_expires_in_hours INTEGER DEFAULT 168 -- 7 days
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_token TEXT;
  v_invitation_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;
  
  -- Create invitation
  INSERT INTO user_invitations (school_id, email, full_name, role_id, invited_by, token, expires_at)
  VALUES (p_school_id, p_email, p_full_name, p_role_id, p_invited_by, v_token, v_expires_at)
  ON CONFLICT (school_id, email) DO UPDATE
  SET token = v_token,
      expires_at = v_expires_at,
      status = 'pending',
      updated_at = NOW()
  RETURNING id INTO v_invitation_id;
  
  -- Prepare result
  v_result := jsonb_build_object(
    'success', TRUE,
    'invitation_id', v_invitation_id,
    'email', p_email,
    'token', v_token,
    'expires_at', v_expires_at
  );
  
  RETURN v_result;
END;
$$;

-- Accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invitation RECORD;
  v_result JSONB;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1;
  
  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Add user to school
  INSERT INTO school_members (school_id, user_id, role_id, status)
  VALUES (v_invitation.school_id, p_user_id, v_invitation.role_id, 'active')
  ON CONFLICT (school_id, user_id) DO UPDATE
  SET role_id = v_invitation.role_id,
      status = 'active',
      updated_at = NOW();
  
  -- Mark invitation as accepted
  UPDATE user_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = v_invitation.id;
  
  -- Prepare result
  v_result := jsonb_build_object(
    'success', TRUE,
    'school_id', v_invitation.school_id,
    'role_id', v_invitation.role_id
  );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

-- Role history: Users can view their own history, admins can view all
ALTER TABLE role_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role history"
  ON role_history FOR SELECT
  USING (
    school_member_id IN (
      SELECT id FROM school_members 
      WHERE user_id = auth.uid()
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- User invitations: School admins can manage invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can manage invitations"
  ON user_invitations FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON role_history TO authenticated;
GRANT ALL ON user_invitations TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 11. COMMENTS
-- ============================================================================

COMMENT ON TABLE roles IS 'User roles with categories and module alignment';
COMMENT ON TABLE permissions IS 'Granular permissions for RBAC';
COMMENT ON TABLE role_permissions IS 'Role-permission mapping';
COMMENT ON TABLE school_members IS 'School members with roles and status';
COMMENT ON TABLE role_history IS 'Audit trail for role changes';
COMMENT ON TABLE user_invitations IS 'User invitation tracking';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================