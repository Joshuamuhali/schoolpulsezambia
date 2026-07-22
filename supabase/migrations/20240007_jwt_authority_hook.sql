-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20240007_jwt_authority_hook
--
-- Implements Supabase Auth Hook for deterministic tenant isolation and
-- set_active_school RPC.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Hook function to inject tenant context into JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_active_school_id UUID;
  v_role_key TEXT;
  v_is_platform_admin BOOLEAN;
  v_claims JSONB;
BEGIN
  -- Extract user ID
  v_user_id := (event->>'user_id')::UUID;

  -- Get active_school_id from user metadata
  SELECT (raw_user_meta_data->>'active_school_id')::UUID
  INTO v_active_school_id
  FROM auth.users
  WHERE id = v_user_id;

  -- If no active school is set, try to pick the first active membership
  IF v_active_school_id IS NULL THEN
    SELECT sm.school_id, r.key
    INTO v_active_school_id, v_role_key
    FROM school_members sm
    JOIN roles r ON r.id = sm.role_id
    WHERE sm.user_id = v_user_id
      AND sm.status = 'active'
      AND sm.school_id IS NOT NULL
    ORDER BY sm.created_at ASC
    LIMIT 1;
  ELSE
    -- Verify membership and get role for the active school
    SELECT r.key
    INTO v_role_key
    FROM school_members sm
    JOIN roles r ON r.id = sm.role_id
    WHERE sm.user_id = v_user_id
      AND sm.school_id = v_active_school_id
      AND sm.status = 'active';
      
    -- If membership not found for the requested active school, fallback
    IF v_role_key IS NULL THEN
       SELECT sm.school_id, r.key
       INTO v_active_school_id, v_role_key
       FROM school_members sm
       JOIN roles r ON r.id = sm.role_id
       WHERE sm.user_id = v_user_id
         AND sm.status = 'active'
         AND sm.school_id IS NOT NULL
       ORDER BY sm.created_at ASC
       LIMIT 1;
    END IF;
  END IF;

  -- Check platform admin status (membership with school_id IS NULL)
  SELECT EXISTS (
    SELECT 1
    FROM school_members sm
    JOIN roles r ON r.id = sm.role_id
    WHERE sm.user_id = v_user_id
      AND sm.school_id IS NULL
      AND r.scope = 'platform'
      AND sm.status = 'active'
  ) INTO v_is_platform_admin;

  -- Inject claims
  v_claims := event->'claims';
  
  -- Ensure app_metadata exists
  IF v_claims->'app_metadata' IS NULL THEN
    v_claims := jsonb_set(v_claims, '{app_metadata}', '{}');
  END IF;

  -- Set claims
  IF v_active_school_id IS NOT NULL THEN
    v_claims := jsonb_set(v_claims, '{app_metadata, school_id}', to_jsonb(v_active_school_id::text));
    v_claims := jsonb_set(v_claims, '{app_metadata, role}', to_jsonb(v_role_key));
  END IF;
  
  v_claims := jsonb_set(v_claims, '{app_metadata, is_platform_admin}', to_jsonb(v_is_platform_admin));

  -- Return the modified event
  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

-- Grant permissions for hook execution
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON public.school_members TO supabase_auth_admin;
GRANT SELECT ON public.roles TO supabase_auth_admin;
-- auth.users is already accessible to supabase_auth_admin

-- 2. RPC to set the active school context
CREATE OR REPLACE FUNCTION public.set_active_school(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_is_member BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate membership
  SELECT EXISTS (
    SELECT 1 FROM school_members
    WHERE user_id = v_user_id
      AND school_id = p_school_id
      AND status = 'active'
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of this school';
  END IF;

  -- Update metadata
  UPDATE auth.users
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('active_school_id', p_school_id)
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'active_school_id', p_school_id);
END;
$$;

-- 3. Redefine is_platform_admin to use JWT claims
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean, false);
$$;

-- 4. Redefine current_user_school to use JWT claims (new standard)
CREATE OR REPLACE FUNCTION public.current_user_school()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid;
$$;
