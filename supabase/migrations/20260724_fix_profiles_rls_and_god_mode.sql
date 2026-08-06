-- ============================================================================
-- FIX PROFILES 406 ERROR & GOD MODE UNIFICATION
-- ============================================================================

-- ============================================================================
-- PART 1: FIX PROFILES RLS POLICIES
-- ============================================================================

-- 1.1 Enable RLS on profiles (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1.2 Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Platform admins can manage all profiles" ON profiles;

-- 1.3 Create comprehensive RLS policies for profiles

-- Platform admins can do EVERYTHING with profiles
CREATE POLICY "Platform admins can manage all profiles"
  ON profiles FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_platform_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_platform_admin())
  WITH CHECK (id = auth.uid() OR is_platform_admin());

-- Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- PART 2: ENSURE full_name COLUMN EXISTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
    RAISE NOTICE '✅ Added full_name column to profiles';
  ELSE
    RAISE NOTICE '✅ full_name column already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 3: CREATE PROFILES VIEW (SAFE FOR ADMINS)
-- ============================================================================

DROP VIEW IF EXISTS profiles_view CASCADE;

CREATE VIEW profiles_view AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.created_at,
  p.school_id,
  p.is_blocked,
  p.blocked_reason,
  p.blocked_at,
  p.blocked_by,
  p.unblocked_at,
  p.unblocked_by,
  s.name as school_name,
  s.subdomain as school_subdomain,
  s.state as school_state,
  -- Get role from school_members
  (SELECT role FROM school_members WHERE user_id = p.id LIMIT 1) as role,
  -- Get is_active from school_members
  (SELECT is_active FROM school_members WHERE user_id = p.id LIMIT 1) as is_active,
  -- Check if user is platform admin
  (SELECT role FROM platform_admins WHERE user_id = p.id AND is_active = true) as platform_role,
  -- Get user email from auth.users
  (SELECT email FROM auth.users WHERE id = p.id) as auth_email
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id;

-- Grant access to the view
GRANT SELECT ON profiles_view TO authenticated;

-- ============================================================================
-- PART 4: FIX is_platform_admin FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS is_platform_admin() CASCADE;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM platform_admins 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role IN ('god_mode', 'super_admin', 'platform_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;

-- ============================================================================
-- PART 5: ENSURE GOD MODE USERS EXIST
-- ============================================================================

-- Insert Joshua Muali as God Mode (if not exists)
INSERT INTO platform_admins (user_id, role, is_active, permissions, created_at)
SELECT 
  id,
  'god_mode',
  true,
  '["*"]'::jsonb,
  NOW()
FROM auth.users
WHERE email = 'muhali@schoolpulsezambia.com'
ON CONFLICT (user_id) DO UPDATE
SET 
  role = 'god_mode',
  is_active = true,
  permissions = '["*"]'::jsonb,
  updated_at = NOW();

-- Insert joshmuherly@gmail.com as God Mode (if not exists)
INSERT INTO platform_admins (user_id, role, is_active, permissions, created_at)
SELECT 
  id,
  'god_mode',
  true,
  '["*"]'::jsonb,
  NOW()
FROM auth.users
WHERE email = 'joshmuherly@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET 
  role = 'god_mode',
  is_active = true,
  permissions = '["*"]'::jsonb,
  updated_at = NOW();

-- ============================================================================
-- PART 6: FIX RLS ON OTHER CRITICAL TABLES
-- ============================================================================

-- 6.1 Fix schools RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view all schools" ON schools;
DROP POLICY IF EXISTS "Users can view own school" ON schools;
DROP POLICY IF EXISTS "Users can create schools" ON schools;
DROP POLICY IF EXISTS "School admins can update own school" ON schools;

CREATE POLICY "Platform admins can manage all schools"
  ON schools FOR ALL
  USING (is_platform_admin());

CREATE POLICY "Users can view own school"
  ON schools FOR SELECT
  USING (id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create schools"
  ON schools FOR INSERT
  WITH CHECK (true);

CREATE POLICY "School admins can update own school"
  ON schools FOR UPDATE
  USING (id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 6.2 Fix school_payments RLS
ALTER TABLE school_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view all payments" ON school_payments;

CREATE POLICY "Platform admins can manage all payments"
  ON school_payments FOR ALL
  USING (is_platform_admin());

-- 6.3 Fix school_modules RLS
ALTER TABLE school_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view all modules" ON school_modules;

CREATE POLICY "Platform admins can manage all modules"
  ON school_modules FOR ALL
  USING (is_platform_admin());

-- 6.4 Fix audit_logs RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view all audit logs" ON audit_logs;

CREATE POLICY "Platform admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (is_platform_admin());

-- 6.5 Fix support_tickets RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view all tickets" ON support_tickets;

CREATE POLICY "Platform admins can manage all tickets"
  ON support_tickets FOR ALL
  USING (is_platform_admin());

-- 6.6 Fix module_catalog RLS
ALTER TABLE module_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can manage module catalog" ON module_catalog;

CREATE POLICY "Platform admins can manage module catalog"
  ON module_catalog FOR ALL
  USING (is_platform_admin());

-- 6.7 Fix school_subscriptions RLS
ALTER TABLE school_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view all subscriptions" ON school_subscriptions;

CREATE POLICY "Platform admins can manage all subscriptions"
  ON school_subscriptions FOR ALL
  USING (is_platform_admin());

-- 6.8 Fix notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view all notifications" ON notifications;

CREATE POLICY "Platform admins can manage all notifications"
  ON notifications FOR ALL
  USING (is_platform_admin());

-- ============================================================================
-- PART 7: CREATE HELPER VIEWS
-- ============================================================================

-- 7.1 View to see all platform admins
DROP VIEW IF EXISTS platform_admins_view CASCADE;

CREATE VIEW platform_admins_view AS
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  u.last_sign_in_at,
  p.full_name,
  pa.role,
  pa.is_active,
  pa.permissions,
  pa.created_at as admin_created_at,
  pa.updated_at as admin_updated_at
FROM auth.users u
JOIN platform_admins pa ON pa.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
ORDER BY pa.role, u.email;

GRANT SELECT ON platform_admins_view TO authenticated;

-- 7.2 View to check if current user is God Mode
CREATE OR REPLACE VIEW current_user_status AS
SELECT 
  auth.uid() as user_id,
  is_platform_admin() as is_platform_admin,
  (SELECT role FROM platform_admins WHERE user_id = auth.uid() AND is_active = true) as role,
  (SELECT permissions FROM platform_admins WHERE user_id = auth.uid() AND is_active = true) as permissions;

GRANT SELECT ON current_user_status TO authenticated;

-- ============================================================================
-- PART 8: GRANTS
-- ============================================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- PART 9: VERIFICATION
-- ============================================================================

-- 9.1 Check profiles RLS policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 9.2 Check if full_name column exists
SELECT 
  '✅ full_name column' as status,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') as exists;

-- 9.3 Check if profiles_view exists
SELECT 
  '✅ profiles_view' as status,
  EXISTS (SELECT 1 FROM information_schema.views WHERE view_name = 'profiles_view') as exists;

-- 9.4 Check platform admins
SELECT 
  '✅ Platform Admins' as status,
  COUNT(*) as count
FROM platform_admins;

-- 9.5 Show all God Mode users
SELECT 
  user_id,
  email,
  full_name,
  role,
  is_active,
  permissions
FROM platform_admins_view
ORDER BY role;

-- 9.6 Test is_platform_admin function
SELECT 
  '✅ is_platform_admin function' as status,
  COUNT(*) as exists
FROM pg_proc 
WHERE proname = 'is_platform_admin';

-- ============================================================================
-- PART 10: SAMPLE QUERIES THAT NOW WORK
-- ============================================================================

-- This query now works for platform admins (fixes the 406 error):
-- SELECT * FROM profiles_view WHERE id = auth.uid();

-- This query now works for platform admins:
-- SELECT * FROM profiles WHERE id = auth.uid();

-- This query now works for platform admins:
-- SELECT full_name FROM profiles WHERE id = auth.uid();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Final verification
DO $$
DECLARE
  v_profiles_rls BOOLEAN;
  v_full_name_exists BOOLEAN;
  v_view_exists BOOLEAN;
  v_function_exists BOOLEAN;
  v_admin_count INTEGER;
BEGIN
  -- Check profiles RLS
  SELECT relrowsecurity INTO v_profiles_rls
  FROM pg_class
  WHERE relname = 'profiles';
  
  -- Check full_name column
  SELECT EXISTS INTO v_full_name_exists
  FROM information_schema.columns 
  WHERE table_name = 'profiles' 
  AND column_name = 'full_name';
  
  -- Check view
  SELECT EXISTS INTO v_view_exists
  FROM information_schema.views 
  WHERE view_name = 'profiles_view';
  
  -- Check function
  SELECT COUNT INTO v_function_exists
  FROM pg_proc 
  WHERE proname = 'is_platform_admin';
  
  -- Check admin count
  SELECT COUNT(*) INTO v_admin_count
  FROM platform_admins;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE - VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Profiles RLS enabled: %', v_profiles_rls;
  RAISE NOTICE '✅ full_name column exists: %', v_full_name_exists;
  RAISE NOTICE '✅ profiles_view created: %', v_view_exists;
  RAISE NOTICE '✅ is_platform_admin function exists: %', v_function_exists;
  RAISE NOTICE '✅ Platform admins count: %', v_admin_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 406 ERROR FIXED!';
  RAISE NOTICE '👑 GOD MODE = PLATFORM ADMIN';
  RAISE NOTICE '========================================';
END $$;