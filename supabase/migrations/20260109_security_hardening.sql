-- Security Hardening Migration
-- Adds server-side validation, reserved subdomains, and email confirmation tracking

-- ============================================================================
-- 1. RESERVED SUBDOMAINS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reserved_subdomains (
  subdomain TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert reserved subdomains
INSERT INTO reserved_subdomains (subdomain, reason) VALUES
  ('admin', 'System reserved - admin portal'),
  ('api', 'System reserved - API endpoints'),
  ('www', 'System reserved - WWW prefix'),
  ('app', 'System reserved - main application'),
  ('dashboard', 'System reserved - dashboard access'),
  ('auth', 'System reserved - authentication'),
  ('login', 'System reserved - login page'),
  ('signup', 'System reserved - signup page'),
  ('onboarding', 'System reserved - onboarding flow'),
  ('help', 'System reserved - help documentation'),
  ('support', 'System reserved - support portal'),
  ('docs', 'System reserved - documentation'),
  ('blog', 'System reserved - blog'),
  ('status', 'System reserved - status page'),
  ('mail', 'System reserved - mail server'),
  ('smtp', 'System reserved - SMTP server'),
  ('ftp', 'System reserved - FTP access'),
  ('cdn', 'System reserved - CDN'),
  ('static', 'System reserved - static assets'),
  ('assets', 'System reserved - asset storage')
ON CONFLICT (subdomain) DO NOTHING;

-- ============================================================================
-- 2. SUBDOMAIN VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_subdomain(p_subdomain TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Check length (3-63 characters)
  IF length(p_subdomain) < 3 OR length(p_subdomain) > 63 THEN
    RETURN 'Subdomain must be between 3 and 63 characters';
  END IF;

  -- Check format (lowercase letters, numbers, hyphens only)
  IF p_subdomain !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' THEN
    RETURN 'Subdomain can only contain lowercase letters, numbers, and hyphens. Must start and end with a letter or number.';
  END IF;

  -- Check for reserved subdomains
  IF EXISTS (SELECT 1 FROM reserved_subdomains WHERE subdomain = p_subdomain) THEN
    RETURN 'This subdomain is reserved. Please choose another.';
  END IF;

  -- Check for consecutive hyphens
  IF p_subdomain LIKE '%-%' AND p_subdomain LIKE '--%' THEN
    RETURN 'Subdomain cannot contain consecutive hyphens';
  END IF;

  RETURN NULL; -- Valid
END;
$$;

-- ============================================================================
-- 3. EMAIL VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Basic email format check
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN 'Invalid email format';
  END IF;

  -- Check for disposable email domains
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('tempmail.com'),
      ('guerrillamail.com'),
      ('mailinator.com'),
      ('10minutemail.com'),
      ('throwaway.email'),
      ('fakeinbox.com'),
      ('temp-mail.org'),
      ('dispostable.com'),
      ('mailnesia.com'),
      ('tempail.com')
    ) AS disposable(domain)
    WHERE lower(split_part(p_email, '@', 2)) = domain
  ) THEN
    RETURN 'Disposable email addresses are not allowed';
  END IF;

  RETURN NULL; -- Valid
END;
$$;

-- ============================================================================
-- 4. UPDATE SCHOOLS TABLE WITH VALIDATION CONSTRAINTS
-- ============================================================================

-- Add subdomain format constraint
ALTER TABLE schools 
  DROP CONSTRAINT IF EXISTS schools_subdomain_format;

ALTER TABLE schools 
  ADD CONSTRAINT schools_subdomain_format 
  CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]{2,61}[a-z0-9]$');

-- Add unique constraint on subdomain (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'schools_subdomain_key' 
    AND conrelid = 'schools'::regclass
  ) THEN
    ALTER TABLE schools ADD CONSTRAINT schools_subdomain_key UNIQUE (subdomain);
  END IF;
END $$;

-- ============================================================================
-- 5. EMAIL CONFIRMATION TRACKING
-- ============================================================================

-- Add email confirmation tracking to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_attempts INTEGER DEFAULT 0;

-- Create index for email confirmation queries
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed 
  ON profiles(email_confirmed_at) 
  WHERE email_confirmed_at IS NULL;

-- ============================================================================
-- 6. AUDIT LOG ENHANCEMENTS
-- ============================================================================

-- Add more audit log fields
ALTER TABLE audit_logs 
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_created 
  ON audit_logs(school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created 
  ON audit_logs(actor_id, created_at DESC);

-- ============================================================================
-- 7. RATE LIMITING TABLE (for server-side tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset 
  ON rate_limits(reset_at);

-- Clean up expired rate limits (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits WHERE reset_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- 8. SCHOOL ONBOARDING VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_school_onboarding(
  p_school_name TEXT,
  p_subdomain TEXT,
  p_admin_id UUID,
  p_selected_modules UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id UUID;
  v_validation_error TEXT;
  v_school_count INTEGER;
BEGIN
  -- Validate school name
  IF length(trim(p_school_name)) < 3 THEN
    RAISE EXCEPTION 'School name must be at least 3 characters';
  END IF;

  IF length(trim(p_school_name)) > 100 THEN
    RAISE EXCEPTION 'School name must be less than 100 characters';
  END IF;

  -- Validate subdomain
  v_validation_error := validate_subdomain(p_subdomain);
  IF v_validation_error IS NOT NULL THEN
    RAISE EXCEPTION '%', v_validation_error;
  END IF;

  -- Check if subdomain already exists
  IF EXISTS (SELECT 1 FROM schools WHERE subdomain = p_subdomain) THEN
    RAISE EXCEPTION 'Subdomain "%" is already taken', p_subdomain;
  END IF;

  -- Validate admin exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Create school
  INSERT INTO schools (name, subdomain, state, created_at, updated_at)
  VALUES (trim(p_school_name), p_subdomain, 'preview', NOW(), NOW())
  RETURNING id INTO v_school_id;

  -- Create school_members entry for admin
  INSERT INTO school_members (school_id, user_id, role_id, status, created_at)
  SELECT v_school_id, p_admin_id, r.id, 'active', NOW()
  FROM roles r
  WHERE r.key = 'school_admin'
  LIMIT 1;

  -- Create feature flags for selected modules or default free modules
  IF p_selected_modules IS NOT NULL AND array_length(p_selected_modules, 1) > 0 THEN
    INSERT INTO school_feature_flags (school_id, feature_id, status, enabled_at)
    SELECT v_school_id, unnest(p_selected_modules), 'active', NOW();
  ELSE
    -- Default: activate free modules
    INSERT INTO school_feature_flags (school_id, feature_id, status, enabled_at)
    SELECT v_school_id, id, 'active', NOW()
    FROM feature_catalog
    WHERE monthly_price = 0 AND is_active = true;
  END IF;

  -- Log audit
  INSERT INTO audit_logs (school_id, actor_id, action, table_name, record_id, new_data, created_at)
  VALUES (
    v_school_id,
    p_admin_id,
    'school_created',
    'schools',
    v_school_id,
    jsonb_build_object('name', p_school_name, 'subdomain', p_subdomain, 'state', 'preview'),
    NOW()
  );

  RETURN jsonb_build_object(
    'school_id', v_school_id,
    'school_name', p_school_name,
    'subdomain', p_subdomain,
    'state', 'preview'
  );
END;
$$;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Allow authenticated users to call the onboarding function
GRANT EXECUTE ON FUNCTION create_school_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION validate_subdomain TO authenticated;
GRANT EXECUTE ON FUNCTION validate_email TO authenticated;

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE reserved_subdomains IS 'Reserved subdomains that cannot be used for school registration';
COMMENT ON FUNCTION validate_subdomain IS 'Validates subdomain format and checks against reserved list';
COMMENT ON FUNCTION validate_email IS 'Validates email format and checks against disposable email domains';
COMMENT ON FUNCTION create_school_onboarding IS 'Creates a new school with validation and feature flags';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================