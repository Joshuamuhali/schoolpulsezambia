-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20240010_update_onboarding_rpc
--
-- Updates the onboarding RPC to be transactional and handle subscriptions.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_school_onboarding(
  p_school_name TEXT,
  p_subdomain   TEXT,
  p_admin_id     UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_school_id UUID;
  v_role_id   UUID;
  v_result    JSONB;
  v_full_name TEXT;
BEGIN
  -- 1. Check if authenticated
  IF auth.uid() IS NULL OR auth.uid() <> p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Check if subdomain is already taken
  IF EXISTS (SELECT 1 FROM schools WHERE subdomain = lower(trim(p_subdomain))) THEN
    RAISE EXCEPTION 'Subdomain % is already taken.', p_subdomain;
  END IF;

  -- 3. Create the school (state=draft)
  INSERT INTO schools (name, subdomain, state)
  VALUES (p_school_name, lower(trim(p_subdomain)), 'draft')
  RETURNING id INTO v_school_id;

  -- 4. Get the SCHOOL_OWNER role ID
  SELECT id INTO v_role_id FROM roles WHERE key = 'school_owner' LIMIT 1;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'SCHOOL_OWNER role not found.';
  END IF;

  -- 5. Assign the user as school owner
  INSERT INTO school_members (school_id, user_id, role_id, status)
  VALUES (v_school_id, p_admin_id, v_role_id, 'active');

  -- 6. Create trial subscription
  INSERT INTO subscriptions (school_id, status, current_period_start, current_period_end)
  VALUES (
    v_school_id, 
    'trialing', 
    NOW(), 
    NOW() + INTERVAL '14 days'
  );

  -- 7. Sync full name from auth metadata to profiles
  SELECT raw_user_meta_data->>'full_name' INTO v_full_name FROM auth.users WHERE id = p_admin_id;
  IF v_full_name IS NOT NULL THEN
    UPDATE profiles SET full_name = v_full_name WHERE id = p_admin_id;
  END IF;

  -- 8. Prepare result
  v_result := jsonb_build_object(
    'school_id', v_school_id,
    'school_name', p_school_name,
    'subdomain', p_subdomain
  );

  RETURN v_result;
END;
$$;
