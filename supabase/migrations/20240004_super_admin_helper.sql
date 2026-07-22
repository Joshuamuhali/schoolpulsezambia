-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20240004_super_admin_helper
--
-- Adds a helper function to promote any existing auth user to SUPER_ADMIN.
-- Called from seed.sql (local) or the Supabase SQL Editor (production).
--
-- Usage after running migrations:
--   SELECT promote_to_super_admin('user-uuid-here');
--   SELECT promote_to_super_admin_by_email('admin@schoolpulse.com');
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION promote_to_super_admin(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_id UUID;
  v_email   TEXT;
BEGIN
  -- Get the SUPER_ADMIN role id
  SELECT id INTO v_role_id FROM roles WHERE name = 'SUPER_ADMIN';
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'SUPER_ADMIN role not found. Run migrations first.';
  END IF;

  -- Get the user's email for confirmation message
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User % not found in auth.users.', p_user_id;
  END IF;

  -- Ensure profile exists (trigger should have created it, but just in case)
  INSERT INTO profiles (id, full_name, email)
  SELECT p_user_id,
         COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
         email
  FROM auth.users WHERE id = p_user_id
  ON CONFLICT (id) DO NOTHING;

  -- Assign SUPER_ADMIN role (school_id NULL = platform-level, not school-scoped)
  INSERT INTO school_members (user_id, role_id, school_id, status)
  VALUES (p_user_id, v_role_id, NULL, 'active')
  ON CONFLICT (user_id, role_id, school_id) DO NOTHING;

  RETURN format('✓ User %s (%s) promoted to SUPER_ADMIN', p_user_id, v_email);
END;
$$;

-- Convenience overload: promote by email instead of UUID
CREATE OR REPLACE FUNCTION promote_to_super_admin_by_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email));
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found with email: %', p_email;
  END IF;

  RETURN promote_to_super_admin(v_user_id);
END;
$$;

-- Convenience: list all current platform admins
CREATE OR REPLACE FUNCTION list_platform_admins()
RETURNS TABLE (user_id UUID, email TEXT, role TEXT, assigned_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT sm.user_id, p.email, r.name, sm.created_at
  FROM school_members sm
  JOIN roles r ON r.id = sm.role_id
  JOIN profiles p ON p.id = sm.user_id
  WHERE r.scope = 'platform'
  ORDER BY r.name, p.email;
$$;
