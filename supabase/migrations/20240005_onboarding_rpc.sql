-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20240005_onboarding_rpc
--
-- RPC to handle school onboarding in a single transaction.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_school_onboarding(
  p_school_name TEXT,
  p_subdomain   TEXT,
  p_admin_id     UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id UUID;
  v_role_id   UUID;
  v_result    JSONB;
BEGIN
  -- 1. Check if subdomain is already taken
  IF EXISTS (SELECT 1 FROM schools WHERE subdomain = lower(trim(p_subdomain))) THEN
    RAISE EXCEPTION 'Subdomain % is already taken.', p_subdomain;
  END IF;

  -- 2. Create the school
  INSERT INTO schools (name, subdomain, state)
  VALUES (p_school_name, lower(trim(p_subdomain)), 'draft')
  RETURNING id INTO v_school_id;

  -- 3. Get the SCHOOL_OWNER role ID
  SELECT id INTO v_role_id FROM roles WHERE key = 'school_owner' OR name = 'SCHOOL_OWNER' LIMIT 1;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'SCHOOL_OWNER role not found.';
  END IF;

  -- 4. Assign the user as school owner
  INSERT INTO school_members (school_id, user_id, role_id, status)
  VALUES (v_school_id, p_admin_id, v_role_id, 'active');

  -- 5. Prepare result
  v_result := jsonb_build_object(
    'school_id', v_school_id,
    'school_name', p_school_name,
    'subdomain', p_subdomain
  );

  RETURN v_result;
END;
$$;

-- ─── Fix current_user_school to use school_members instead of profiles ───────
-- This aligns with the "real schema" where profiles don't have school_id.
CREATE OR REPLACE FUNCTION current_user_school()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT school_id 
  FROM school_members 
  WHERE user_id = auth.uid() 
    AND status = 'active'
  LIMIT 1;
$$;
