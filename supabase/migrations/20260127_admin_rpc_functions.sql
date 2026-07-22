-- ============================================================================
-- ADMIN RPC FUNCTIONS
-- Secure database functions for platform admin operations
-- ============================================================================

-- ─── Create School with Admin User ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_school_with_admin(
  p_name TEXT,
  p_subdomain TEXT,
  p_admin_email TEXT,
  p_admin_password TEXT,
  p_admin_first_name TEXT,
  p_admin_last_name TEXT,
  p_state TEXT DEFAULT 'preview'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id UUID;
  v_admin_user_id UUID;
  v_admin_role_id UUID;
  v_result JSON;
BEGIN
  -- Validate subdomain uniqueness
  IF EXISTS (SELECT 1 FROM schools WHERE subdomain = p_subdomain) THEN
    RAISE EXCEPTION 'Subdomain already exists: %', p_subdomain;
  END IF;

  -- Validate email uniqueness
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_admin_email) THEN
    RAISE EXCEPTION 'Email already exists: %', p_admin_email;
  END IF;

  -- Get admin role ID
  SELECT id INTO v_admin_role_id FROM roles WHERE key = 'admin' LIMIT 1;
  
  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found in roles table';
  END IF;

  -- Create school
  INSERT INTO schools (name, subdomain, state)
  VALUES (p_name, p_subdomain, p_state)
  RETURNING id INTO v_school_id;

  -- Create admin user in auth
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, confirmed_at)
  VALUES (p_admin_email, crypt(p_admin_password, gen_salt('bf')), now(), now())
  RETURNING id INTO v_admin_user_id;

  -- Create profile
  INSERT INTO profiles (id, email, first_name, last_name, is_active)
  VALUES (v_admin_user_id, p_admin_email, p_admin_first_name, p_admin_last_name, true);

  -- Add to school_members as admin
  INSERT INTO school_members (user_id, school_id, role_id, is_active)
  VALUES (v_admin_user_id, v_school_id, v_admin_role_id, true);

  -- Create default feature flags for the school
  INSERT INTO school_feature_flags (school_id, feature_id, status)
  SELECT v_school_id, id, 'inactive'
  FROM feature_catalog
  WHERE is_active = true;

  -- Log audit
  INSERT INTO audit_logs (action, table_name, record_id, after_state, actor_id)
  VALUES (
    'create',
    'schools',
    v_school_id,
    jsonb_build_object(
      'id', v_school_id,
      'name', p_name,
      'subdomain', p_subdomain,
      'state', p_state
    ),
    v_admin_user_id
  );

  -- Return result
  v_result = jsonb_build_object(
    'school_id', v_school_id,
    'admin_user_id', v_admin_user_id,
    'name', p_name,
    'subdomain', p_subdomain,
    'state', p_state
  );

  RETURN v_result;
END;
$$;

-- ─── Create Platform Admin ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_platform_admin(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Validate email uniqueness
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email already exists: %', p_email;
  END IF;

  -- Validate role
  IF p_role NOT IN ('super_admin', 'operations_admin', 'finance_admin', 'support_admin') THEN
    RAISE EXCEPTION 'Invalid platform admin role: %', p_role;
  END IF;

  -- Create user in auth (no school_id - this makes them a platform admin)
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, confirmed_at)
  VALUES (p_email, crypt(p_password, gen_salt('bf')), now(), now())
  RETURNING id INTO v_user_id;

  -- Create profile
  INSERT INTO profiles (id, email, first_name, last_name, is_active)
  VALUES (v_user_id, p_email, p_first_name, p_last_name, true);

  -- Add to platform_admins table
  INSERT INTO platform_admins (user_id, role)
  VALUES (v_user_id, p_role);

  -- Log audit
  INSERT INTO audit_logs (action, table_name, record_id, after_state, actor_id)
  VALUES (
    'create',
    'platform_admins',
    v_user_id,
    jsonb_build_object(
      'user_id', v_user_id,
      'email', p_email,
      'role', p_role
    ),
    v_user_id
  );

  -- Return result
  v_result = jsonb_build_object(
    'user_id', v_user_id,
    'email', p_email,
    'role', p_role
  );

  RETURN v_result;
END;
$$;

-- ─── Approve Payment ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION approve_payment(
  p_payment_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
  v_result JSON;
BEGIN
  -- Get payment details
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  -- Update payment status
  UPDATE payments
  SET status = 'verified', verified_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  -- Log audit
  INSERT INTO audit_logs (action, table_name, record_id, after_state, school_id)
  VALUES (
    'approve',
    'payments',
    p_payment_id,
    jsonb_build_object(
      'id', v_payment.id,
      'status', 'verified',
      'verified_at', now()
    ),
    v_payment.school_id
  );

  -- Return result
  v_result = jsonb_build_object(
    'id', v_payment.id,
    'status', 'verified',
    'verified_at', now()
  );

  RETURN v_result;
END;
$$;

-- ─── Reject Payment ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION reject_payment(
  p_payment_id UUID,
  p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
  v_result JSON;
BEGIN
  -- Get payment details
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  -- Update payment status
  UPDATE payments
  SET status = 'rejected', rejection_reason = p_reason
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  -- Log audit
  INSERT INTO audit_logs (action, table_name, record_id, after_state, school_id)
  VALUES (
    'reject',
    'payments',
    p_payment_id,
    jsonb_build_object(
      'id', v_payment.id,
      'status', 'rejected',
      'rejection_reason', p_reason
    ),
    v_payment.school_id
  );

  -- Return result
  v_result = jsonb_build_object(
    'id', v_payment.id,
    'status', 'rejected',
    'rejection_reason', p_reason
  );

  RETURN v_result;
END;
$$;

-- ─── Get System Health ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_system_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_db_size BIGINT;
  v_table_sizes JSON;
  v_connection_count INT;
  v_result JSON;
BEGIN
  -- Get database size
  SELECT pg_database_size(current_database()) INTO v_db_size;

  -- Get table sizes
  SELECT jsonb_object_agg(relname, pg_size_pretty(pg_total_relation_size(relid)))
  INTO v_table_sizes
  FROM pg_stat_user_tables;

  -- Get connection count
  SELECT count(*) INTO v_connection_count
  FROM pg_stat_activity
  WHERE datname = current_database();

  -- Build result
  v_result = jsonb_build_object(
    'status', 'healthy',
    'database_size', pg_size_pretty(v_db_size),
    'database_size_bytes', v_db_size,
    'table_sizes', v_table_sizes,
    'active_connections', v_connection_count,
    'timestamp', now()
  );

  RETURN v_result;
END;
$$;

-- ─── Grant permissions ────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION create_school_with_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_platform_admin TO authenticated;
GRANT EXECUTE ON FUNCTION approve_payment TO authenticated;
GRANT EXECUTE ON FUNCTION reject_payment TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_health TO authenticated;

-- ─── Comments ────────────────────────────────────────────────────────────────

COMMENT ON FUNCTION create_school_with_admin IS 'Creates a new school with an admin user. Returns school and admin details.';
COMMENT ON FUNCTION create_platform_admin IS 'Creates a new platform admin user. Requires super_admin role.';
COMMENT ON FUNCTION approve_payment IS 'Approves a pending payment. Updates status to verified.';
COMMENT ON FUNCTION reject_payment IS 'Rejects a pending payment with a reason.';
COMMENT ON FUNCTION get_system_health IS 'Returns system health metrics including database size and connection count.';