-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20240001_platform_foundation
-- Creates core platform tables: schools, profiles, RBAC, feature catalog, RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE access_state AS ENUM ('draft','preview','payment_pending','active','suspended');
CREATE TYPE attendance_status AS ENUM ('present','absent','late','excused');
CREATE TYPE gender AS ENUM ('M','F','other');
CREATE TYPE student_status_enum AS ENUM ('active','inactive','graduated','transferred');
CREATE TYPE teacher_status_enum AS ENUM ('active','on_leave','terminated');
CREATE TYPE payment_status_enum AS ENUM ('pending','verified','failed','refunded');
CREATE TYPE bill_status_enum AS ENUM ('unpaid','partial','paid','overdue');
CREATE TYPE exam_status_enum AS ENUM ('scheduled','ongoing','completed','cancelled');
CREATE TYPE feature_status_enum AS ENUM ('active','inactive');
CREATE TYPE subscription_status_enum AS ENUM ('active','cancelled','past_due','trialing');
CREATE TYPE transaction_type_enum AS ENUM ('income','expense');

-- ─── PLATFORM: schools ───────────────────────────────────────────────────────

CREATE TABLE schools (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  subdomain    TEXT NOT NULL UNIQUE,
  logo_url     TEXT,
  address      TEXT,
  phone        TEXT,
  email        TEXT,
  access_state access_state NOT NULL DEFAULT 'draft',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schools_access_state ON schools(access_state);

-- ─── PLATFORM: school_settings ───────────────────────────────────────────────

CREATE TABLE school_settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, key)
);

-- ─── RBAC: profiles ──────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id  UUID REFERENCES schools(id) ON DELETE SET NULL,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  avatar_url TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_school_id ON profiles(school_id);

-- ─── RBAC: roles ─────────────────────────────────────────────────────────────

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
  ('SUPER_ADMIN',       'Full platform access'),
  ('OPERATIONS_ADMIN',  'Platform operations management'),
  ('FINANCE_ADMIN',     'Platform finance overview'),
  ('SUPPORT_ADMIN',     'Customer support access'),
  ('SCHOOL_OWNER',      'School owner with full school access'),
  ('SCHOOL_ADMIN',      'School administrator'),
  ('ACADEMIC_MANAGER',  'Academic coordination'),
  ('BURSAR',            'Finance and payments'),
  ('TEACHER',           'Teaching staff'),
  ('CLASS_TEACHER',     'Class teacher with extra privileges'),
  ('PARENT',            'Parent/guardian portal access'),
  ('STUDENT',           'Student portal access');

-- ─── RBAC: permissions ───────────────────────────────────────────────────────

CREATE TABLE permissions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE, -- e.g. "students.read"
  module     TEXT NOT NULL,
  action     TEXT NOT NULL,        -- read | write | delete | admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed core permissions
INSERT INTO permissions (name, module, action) VALUES
  ('schools.read',          'schools',    'read'),
  ('schools.write',         'schools',    'write'),
  ('schools.admin',         'schools',    'admin'),
  ('students.read',         'students',   'read'),
  ('students.write',        'students',   'write'),
  ('students.delete',       'students',   'delete'),
  ('teachers.read',         'teachers',   'read'),
  ('teachers.write',        'teachers',   'write'),
  ('attendance.read',       'attendance', 'read'),
  ('attendance.write',      'attendance', 'write'),
  ('finance.read',          'finance',    'read'),
  ('finance.write',         'finance',    'write'),
  ('exams.read',            'exams',      'read'),
  ('exams.write',           'exams',      'write'),
  ('communication.read',    'communication','read'),
  ('communication.write',   'communication','write'),
  ('settings.read',         'settings',   'read'),
  ('settings.write',        'settings',   'write'),
  ('features.admin',        'features',   'admin');

-- ─── RBAC: role_permissions ──────────────────────────────────────────────────

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- SUPER_ADMIN gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'SUPER_ADMIN';

-- SCHOOL_ADMIN gets school-scoped everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SCHOOL_ADMIN'
  AND p.name NOT IN ('schools.admin','features.admin');

-- BURSAR gets finance
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'BURSAR'
  AND p.module IN ('finance','students')
  AND p.action = 'read';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'BURSAR' AND p.name IN ('finance.write','students.read');

-- TEACHER gets attendance + exams
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('TEACHER','CLASS_TEACHER')
  AND p.name IN ('students.read','attendance.read','attendance.write','exams.read','exams.write');

-- ─── RBAC: user_roles ────────────────────────────────────────────────────────

CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id, school_id)
);

CREATE INDEX idx_user_roles_user_id  ON user_roles(user_id);
CREATE INDEX idx_user_roles_school_id ON user_roles(school_id);

-- ─── Helper function: current_user_school ────────────────────────────────────

CREATE OR REPLACE FUNCTION current_user_school()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ─── Helper function: user has permission ────────────────────────────────────

CREATE OR REPLACE FUNCTION user_has_permission(p_permission TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.name = p_permission
  );
$$;

-- ─── Helper function: is platform admin ──────────────────────────────────────

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('SUPER_ADMIN','OPERATIONS_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN')
  );
$$;

-- ─── Feature catalog ─────────────────────────────────────────────────────────

CREATE TABLE feature_catalog (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key           TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  setup_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_catalog (key, name, description, monthly_price, setup_fee) VALUES
  ('students',      'Student Management',   'Enrolment, records, guardians',                  0,    0),
  ('teachers',      'Teacher Management',   'Staff records, subjects, assignments',            0,    0),
  ('attendance',    'Attendance',           'Daily/period attendance with parent alerts',      50,   0),
  ('exams',         'Exams & Grading',      'Results, report cards, grading schemes',          75,   0),
  ('finance',       'Finance',             'Fee structures, billing, payments, arrears',       100,  500),
  ('communication', 'Communication',       'SMS/Email notifications and announcements',        80,   0),
  ('timetable',     'Timetable',            'Class scheduling and period management',           60,   0),
  ('parent_portal', 'Parent Portal',        'Parent access to grades, fees, and attendance',   40,   0),
  ('analytics',     'Analytics',            'Reports and performance dashboards',               50,   0),
  ('reports',       'Report Cards',         'Automated report card generation',                 50,   0);

-- ─── School feature flags ─────────────────────────────────────────────────────

CREATE TABLE school_feature_flags (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  feature_key  TEXT NOT NULL REFERENCES feature_catalog(key) ON DELETE CASCADE,
  status       feature_status_enum NOT NULL DEFAULT 'inactive',
  activated_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, feature_key)
);

CREATE INDEX idx_school_feature_flags_school_id ON school_feature_flags(school_id);

-- ─── Subscriptions ───────────────────────────────────────────────────────────

CREATE TABLE subscription_plans (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  description    TEXT,
  price_monthly  NUMERIC(10,2) NOT NULL,
  price_annual   NUMERIC(10,2) NOT NULL,
  features       TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id             UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id               UUID REFERENCES subscription_plans(id),
  status                subscription_status_enum NOT NULL DEFAULT 'trialing',
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Payment verifications ───────────────────────────────────────────────────

CREATE TABLE payment_verifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'ZMW',
  proof_url   TEXT,
  status      payment_status_enum NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Audit logs ──────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID REFERENCES schools(id) ON DELETE SET NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  table_name TEXT,
  record_id  UUID,
  old_data   JSONB,
  new_data   JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ─── Updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_schools_updated_at            BEFORE UPDATE ON schools            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_school_settings_updated_at    BEFORE UPDATE ON school_settings    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at           BEFORE UPDATE ON profiles           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_feature_catalog_updated_at    BEFORE UPDATE ON feature_catalog    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_school_feature_flags_updated_at BEFORE UPDATE ON school_feature_flags FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at      BEFORE UPDATE ON subscriptions      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payment_verifications_updated  BEFORE UPDATE ON payment_verifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Auto-create profile on auth.users insert ────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
