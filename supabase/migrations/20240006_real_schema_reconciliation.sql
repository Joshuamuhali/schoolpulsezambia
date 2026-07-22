-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20240006_real_schema_reconciliation
--
-- Reconciles the database schema with the "REAL live schema" expected by the code.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Schools: Rename access_state to state
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'access_state') THEN
    ALTER TABLE schools RENAME COLUMN access_state TO state;
  END IF;
END $$;

-- 2. Profiles: Remove columns not in real schema
ALTER TABLE profiles DROP COLUMN IF EXISTS school_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE profiles DROP COLUMN IF EXISTS updated_at;

-- 3. Roles: Add scope and key columns
ALTER TABLE roles ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'school';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS key TEXT;

-- Update existing roles with keys and scope
UPDATE roles SET key = 'super_admin', scope = 'platform' WHERE name = 'SUPER_ADMIN';
UPDATE roles SET key = 'operations_admin', scope = 'platform' WHERE name = 'OPERATIONS_ADMIN';
UPDATE roles SET key = 'finance_admin', scope = 'platform' WHERE name = 'FINANCE_ADMIN';
UPDATE roles SET key = 'support_admin', scope = 'platform' WHERE name = 'SUPPORT_ADMIN';
UPDATE roles SET key = 'school_owner', scope = 'school' WHERE name = 'SCHOOL_OWNER';
UPDATE roles SET key = 'school_admin', scope = 'school' WHERE name = 'SCHOOL_ADMIN';
UPDATE roles SET key = 'academic_manager', scope = 'school' WHERE name = 'ACADEMIC_MANAGER';
UPDATE roles SET key = 'bursar', scope = 'school' WHERE name = 'BURSAR';
UPDATE roles SET key = 'teacher', scope = 'school' WHERE name = 'TEACHER';
UPDATE roles SET key = 'class_teacher', scope = 'school' WHERE name = 'CLASS_TEACHER';
UPDATE roles SET key = 'parent', scope = 'school' WHERE name = 'PARENT';
UPDATE roles SET key = 'student', scope = 'school' WHERE name = 'STUDENT';

-- Fill any remaining keys
UPDATE roles SET key = lower(replace(name, ' ', '_')) WHERE key IS NULL;
ALTER TABLE roles ALTER COLUMN key SET NOT NULL;
ALTER TABLE roles ADD CONSTRAINT roles_key_unique UNIQUE (key);

-- 4. School Members (replaces user_roles)
CREATE TABLE IF NOT EXISTS school_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE, -- NULL = platform level
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id, school_id)
);

-- Migrate data from user_roles if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    INSERT INTO school_members (user_id, role_id, school_id, created_at)
    SELECT user_id, role_id, school_id, created_at FROM user_roles
    ON CONFLICT DO NOTHING;
    DROP TABLE user_roles;
  END IF;
END $$;

-- 5. Feature Catalog & Pricing
ALTER TABLE feature_catalog ADD COLUMN IF NOT EXISTS category TEXT;

CREATE TABLE IF NOT EXISTS feature_pricing (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_id    UUID NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  setup_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(feature_id, currency)
);

-- 6. School Feature Flags: Migrate from feature_key (text) to feature_id (UUID)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_feature_flags' AND column_name = 'feature_key') THEN
    ALTER TABLE school_feature_flags ADD COLUMN IF NOT EXISTS feature_id UUID REFERENCES feature_catalog(id);
    UPDATE school_feature_flags sff SET feature_id = fc.id FROM feature_catalog fc WHERE sff.feature_key = fc.key;
    ALTER TABLE school_feature_flags DROP COLUMN IF EXISTS feature_key;
    ALTER TABLE school_feature_flags ALTER COLUMN feature_id SET NOT NULL;
  END IF;
END $$;

-- 7. Permissions: Rename name to key if needed
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'name') AND 
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'key') THEN
    ALTER TABLE permissions RENAME COLUMN name TO key;
  END IF;
END $$;

-- 8. Update Helper Functions to use school_members
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM school_members sm
    JOIN roles r ON r.id = sm.role_id
    WHERE sm.user_id = auth.uid()
      AND sm.school_id IS NULL
      AND r.scope = 'platform'
  );
$$;

CREATE OR REPLACE FUNCTION user_has_permission(p_permission TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM school_members sm
    JOIN role_permissions rp ON rp.role_id = sm.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE sm.user_id = auth.uid()
      AND p.key = p_permission -- Note: assumed "key" in permissions, if "name" use p.name
  );
$$;

-- 8. Fix current_user_school (already in 20240005 but re-affirming here)
CREATE OR REPLACE FUNCTION current_user_school()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT school_id 
  FROM school_members 
  WHERE user_id = auth.uid() 
    AND status = 'active'
    AND school_id IS NOT NULL
  LIMIT 1;
$$;
