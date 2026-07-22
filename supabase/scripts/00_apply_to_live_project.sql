-- ═════════════════════════════════════════════════════════════════════════════
-- APPLY TO LIVE SUPABASE PROJECT
-- Project: eqejmbxekqpvveaixfhc
--
-- Run this entire file in ONE paste in the SQL Editor:
-- https://supabase.com/dashboard/project/eqejmbxekqpvveaixfhc/sql/new
--
-- This applies all migrations + creates the super admin in one shot.
-- Safe to re-run — every statement uses IF NOT EXISTS / ON CONFLICT guards.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE access_state AS ENUM ('draft','preview','payment_pending','active','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present','absent','late','excused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gender AS ENUM ('M','F','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE student_status_enum AS ENUM ('active','inactive','graduated','transferred');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE teacher_status_enum AS ENUM ('active','on_leave','terminated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('pending','verified','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bill_status_enum AS ENUM ('unpaid','partial','paid','overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exam_status_enum AS ENUM ('scheduled','ongoing','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feature_status_enum AS ENUM ('active','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status_enum AS ENUM ('active','cancelled','past_due','trialing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type_enum AS ENUM ('income','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── updated_at trigger function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ─── schools ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
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
CREATE INDEX IF NOT EXISTS idx_schools_access_state ON schools(access_state);
DROP TRIGGER IF EXISTS trg_schools_updated_at ON schools;
CREATE TRIGGER trg_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── school_settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, key)
);
DROP TRIGGER IF EXISTS trg_school_settings_updated_at ON school_settings;
CREATE TRIGGER trg_school_settings_updated_at BEFORE UPDATE ON school_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id  UUID REFERENCES schools(id) ON DELETE SET NULL,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  avatar_url TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── roles ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
  ('SUPER_ADMIN',      'Full platform access'),
  ('OPERATIONS_ADMIN', 'Platform operations management'),
  ('FINANCE_ADMIN',    'Platform finance overview'),
  ('SUPPORT_ADMIN',    'Customer support access'),
  ('SCHOOL_OWNER',     'School owner with full school access'),
  ('SCHOOL_ADMIN',     'School administrator'),
  ('ACADEMIC_MANAGER', 'Academic coordination'),
  ('BURSAR',           'Finance and payments'),
  ('TEACHER',          'Teaching staff'),
  ('CLASS_TEACHER',    'Class teacher with extra privileges'),
  ('PARENT',           'Parent/guardian portal access'),
  ('STUDENT',          'Student portal access')
ON CONFLICT (name) DO NOTHING;

-- ─── permissions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  module     TEXT NOT NULL,
  action     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO permissions (name, module, action) VALUES
  ('schools.read',       'schools',       'read'),
  ('schools.write',      'schools',       'write'),
  ('schools.admin',      'schools',       'admin'),
  ('students.read',      'students',      'read'),
  ('students.write',     'students',      'write'),
  ('students.delete',    'students',      'delete'),
  ('teachers.read',      'teachers',      'read'),
  ('teachers.write',     'teachers',      'write'),
  ('attendance.read',    'attendance',    'read'),
  ('attendance.write',   'attendance',    'write'),
  ('finance.read',       'finance',       'read'),
  ('finance.write',      'finance',       'write'),
  ('exams.read',         'exams',         'read'),
  ('exams.write',        'exams',         'write'),
  ('communication.read', 'communication', 'read'),
  ('communication.write','communication', 'write'),
  ('settings.read',      'settings',      'read'),
  ('settings.write',     'settings',      'write'),
  ('features.admin',     'features',      'admin')
ON CONFLICT (name) DO NOTHING;

-- ─── role_permissions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- SUPER_ADMIN gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- SCHOOL_ADMIN gets everything except platform admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SCHOOL_ADMIN'
  AND p.name NOT IN ('schools.admin','features.admin')
ON CONFLICT DO NOTHING;

-- BURSAR gets finance + student read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'BURSAR'
  AND p.name IN ('finance.read','finance.write','students.read')
ON CONFLICT DO NOTHING;

-- TEACHER / CLASS_TEACHER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('TEACHER','CLASS_TEACHER')
  AND p.name IN ('students.read','attendance.read','attendance.write','exams.read','exams.write')
ON CONFLICT DO NOTHING;

-- ─── user_roles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id, school_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id   ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_school_id ON user_roles(school_id);

-- ─── Helper functions ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_user_school()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION user_has_permission(p_permission TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid() AND p.name = p_permission
  );
$$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('SUPER_ADMIN','OPERATIONS_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN')
  );
$$;

-- ─── Auto-create profile on signup ───────────────────────────────────────────
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── feature_catalog ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_catalog (
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
DROP TRIGGER IF EXISTS trg_feature_catalog_updated_at ON feature_catalog;
CREATE TRIGGER trg_feature_catalog_updated_at BEFORE UPDATE ON feature_catalog FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO feature_catalog (key, name, description, monthly_price, setup_fee) VALUES
  ('students',      'Student Management',  'Enrolment, records, guardians',               0,   0),
  ('teachers',      'Teacher Management',  'Staff records, subjects, assignments',         0,   0),
  ('attendance',    'Attendance',          'Daily/period attendance with parent alerts',   50,  0),
  ('exams',         'Exams & Grading',     'Results, report cards, grading schemes',       75,  0),
  ('finance',       'Finance',             'Fee structures, billing, payments, arrears',   100, 500),
  ('communication', 'Communication',       'SMS/Email notifications and announcements',    80,  0),
  ('timetable',     'Timetable',           'Class scheduling and period management',        60,  0),
  ('parent_portal', 'Parent Portal',       'Parent access to grades, fees, attendance',    40,  0),
  ('analytics',     'Analytics',           'Reports and performance dashboards',            50,  0),
  ('reports',       'Report Cards',        'Automated report card generation',              50,  0)
ON CONFLICT (key) DO NOTHING;

-- ─── school_feature_flags ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_feature_flags (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  feature_key  TEXT NOT NULL REFERENCES feature_catalog(key) ON DELETE CASCADE,
  status       feature_status_enum NOT NULL DEFAULT 'inactive',
  activated_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, feature_key)
);
CREATE INDEX IF NOT EXISTS idx_school_feature_flags_school_id ON school_feature_flags(school_id);

-- ─── subscription_plans ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_annual  NUMERIC(10,2) NOT NULL,
  features      TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans (name, description, price_monthly, price_annual, features) VALUES
  ('Starter',    'Up to 300 students, 3 modules',   99,  990,  ARRAY['students','teachers','attendance']),
  ('Standard',   'Up to 1000 students, 6 modules',  199, 1990, ARRAY['students','teachers','attendance','exams','finance','communication']),
  ('Enterprise', 'Unlimited students, all modules', 399, 3990, ARRAY['students','teachers','attendance','exams','finance','communication','timetable','parent_portal','analytics','reports'])
ON CONFLICT DO NOTHING;

-- ─── subscriptions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id            UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id              UUID REFERENCES subscription_plans(id),
  status               subscription_status_enum NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── payment_verifications ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_verifications (
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

-- ─── audit_logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
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
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id  ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ─── academic_years ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_years (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- ─── terms ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS terms (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  is_current       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── grades ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grades (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  level      INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, level)
);

-- ─── classes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_id         UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  stream           TEXT,
  class_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);

-- ─── subjects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT,
  is_compulsory BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- ─── students ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admission_number TEXT NOT NULL,
  full_name        TEXT NOT NULL,
  gender           gender NOT NULL,
  date_of_birth    DATE,
  class_id         UUID REFERENCES classes(id) ON DELETE SET NULL,
  grade_id         UUID REFERENCES grades(id) ON DELETE SET NULL,
  status           student_status_enum NOT NULL DEFAULT 'active',
  photo_url        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, admission_number)
);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_status    ON students(status);

-- ─── guardians ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guardians (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  relationship TEXT NOT NULL DEFAULT 'parent',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_guardians (
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (student_id, guardian_id)
);

-- ─── attendance ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      attendance_status NOT NULL,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, date, class_id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date      ON attendance(date DESC);

-- ─── teachers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_number TEXT,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  subjects        TEXT[] NOT NULL DEFAULT '{}',
  status          teacher_status_enum NOT NULL DEFAULT 'active',
  joined_date     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, email)
);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);

-- ─── finance ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS fee_structures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_id        UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  fee_category_id UUID NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
  term_id         UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  due_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_bills (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id      UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  total_amount NUMERIC(12,2) NOT NULL,
  paid_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance      NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status       bill_status_enum NOT NULL DEFAULT 'unpaid',
  due_date     DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  bill_id        UUID NOT NULL REFERENCES student_bills(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference      TEXT,
  status         payment_status_enum NOT NULL DEFAULT 'verified',
  recorded_by    UUID NOT NULL REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_school_id  ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type        transaction_type_enum NOT NULL,
  category    TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  description TEXT,
  date        DATE NOT NULL,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── exams ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term_id    UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  exam_type  TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  status     exam_status_enum NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grading_scales (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  min_score    NUMERIC(5,2) NOT NULL,
  max_score    NUMERIC(5,2) NOT NULL,
  grade_letter TEXT NOT NULL,
  remarks      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_id      UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id   UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  score        NUMERIC(5,2),
  grade_letter TEXT,
  remarks      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, student_id, subject_id)
);

-- ─── communication ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  audience     TEXT[] NOT NULL DEFAULT '{}',
  created_by   UUID NOT NULL REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  message   TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'sent',
  provider  TEXT,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  subject   TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'sent',
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── promote_to_super_admin helpers ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION promote_to_super_admin(p_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role_id UUID;
  v_email   TEXT;
BEGIN
  SELECT id   INTO v_role_id FROM roles      WHERE name  = 'SUPER_ADMIN';
  SELECT email INTO v_email  FROM auth.users WHERE id    = p_user_id;
  IF v_role_id IS NULL THEN RAISE EXCEPTION 'SUPER_ADMIN role not found'; END IF;
  IF v_email   IS NULL THEN RAISE EXCEPTION 'User % not found', p_user_id; END IF;

  INSERT INTO profiles (id, full_name, email)
  SELECT p_user_id,
         COALESCE(raw_user_meta_data->>'full_name', split_part(email,'@',1)),
         email
  FROM auth.users WHERE id = p_user_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role_id, school_id)
  VALUES (p_user_id, v_role_id, NULL)
  ON CONFLICT DO NOTHING;

  RETURN format('✓ %s promoted to SUPER_ADMIN', v_email);
END;
$$;

CREATE OR REPLACE FUNCTION promote_to_super_admin_by_email(p_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID; BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email));
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No user with email: %', p_email; END IF;
  RETURN promote_to_super_admin(v_user_id);
END;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE schools              ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_catalog      ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years       ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades               ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE students             ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians            ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures       ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_bills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales       ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs           ENABLE ROW LEVEL SECURITY;

-- schools
DROP POLICY IF EXISTS schools_select ON schools;
CREATE POLICY schools_select ON schools FOR SELECT USING (is_platform_admin() OR id = current_user_school());
DROP POLICY IF EXISTS schools_insert ON schools;
CREATE POLICY schools_insert ON schools FOR INSERT WITH CHECK (is_platform_admin());
DROP POLICY IF EXISTS schools_update ON schools;
CREATE POLICY schools_update ON schools FOR UPDATE USING (is_platform_admin() OR id = current_user_school());
DROP POLICY IF EXISTS schools_delete ON schools;
CREATE POLICY schools_delete ON schools FOR DELETE USING (is_platform_admin());

-- profiles
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid() OR is_platform_admin() OR school_id = current_user_school());
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());
DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- roles / permissions / role_permissions — read-only for all authenticated
DROP POLICY IF EXISTS roles_select ON roles;
CREATE POLICY roles_select ON roles FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS permissions_select ON permissions;
CREATE POLICY permissions_select ON permissions FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS role_permissions_select ON role_permissions;
CREATE POLICY role_permissions_select ON role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- user_roles
DROP POLICY IF EXISTS user_roles_select ON user_roles;
CREATE POLICY user_roles_select ON user_roles FOR SELECT USING (user_id = auth.uid() OR is_platform_admin() OR school_id = current_user_school());
DROP POLICY IF EXISTS user_roles_insert ON user_roles;
CREATE POLICY user_roles_insert ON user_roles FOR INSERT WITH CHECK (is_platform_admin());

-- feature_catalog
DROP POLICY IF EXISTS feature_catalog_select ON feature_catalog;
CREATE POLICY feature_catalog_select ON feature_catalog FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS feature_catalog_write ON feature_catalog;
CREATE POLICY feature_catalog_write ON feature_catalog FOR ALL USING (is_platform_admin());

-- school_feature_flags
DROP POLICY IF EXISTS school_feature_flags_select ON school_feature_flags;
CREATE POLICY school_feature_flags_select ON school_feature_flags FOR SELECT USING (is_platform_admin() OR school_id = current_user_school());
DROP POLICY IF EXISTS school_feature_flags_write ON school_feature_flags;
CREATE POLICY school_feature_flags_write ON school_feature_flags FOR ALL USING (is_platform_admin());

-- subscription_plans
DROP POLICY IF EXISTS subscription_plans_select ON subscription_plans;
CREATE POLICY subscription_plans_select ON subscription_plans FOR SELECT USING (auth.uid() IS NOT NULL);

-- audit_logs
DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT USING (is_platform_admin() OR school_id = current_user_school());
DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (is_platform_admin() OR school_id = current_user_school());

-- Tenant-scoped tables macro
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'academic_years','terms','grades','classes','subjects',
    'students','guardians','attendance','teachers',
    'fee_categories','fee_structures','student_bills','payments',
    'financial_transactions','exams','grading_scales','marks',
    'announcements','sms_logs','email_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl||'_select', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (is_platform_admin() OR school_id = current_user_school())', tbl||'_select', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl||'_insert', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (school_id = current_user_school())', tbl||'_insert', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl||'_update', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (is_platform_admin() OR school_id = current_user_school())', tbl||'_update', tbl);
  END LOOP;
END $$;

-- notifications
DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications FOR SELECT USING (user_id = auth.uid() OR is_platform_admin());
DROP POLICY IF EXISTS notifications_insert ON notifications;
CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (school_id = current_user_school());

-- payment_verifications
DROP POLICY IF EXISTS payment_verifications_select ON payment_verifications;
CREATE POLICY payment_verifications_select ON payment_verifications FOR SELECT USING (is_platform_admin() OR school_id = current_user_school());
DROP POLICY IF EXISTS payment_verifications_insert ON payment_verifications;
CREATE POLICY payment_verifications_insert ON payment_verifications FOR INSERT WITH CHECK (school_id = current_user_school());
DROP POLICY IF EXISTS payment_verifications_update ON payment_verifications;
CREATE POLICY payment_verifications_update ON payment_verifications FOR UPDATE USING (is_platform_admin());

-- ─── CREATE SUPER ADMIN USER ─────────────────────────────────────────────────
-- Creates the user, confirms email, and assigns SUPER_ADMIN role in one block.

DO $$
DECLARE
  v_user_id UUID;
  v_result  TEXT;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'superadmin@schoolpulse.com';

  IF v_user_id IS NULL THEN
    -- Create fresh
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at, aud, role
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'superadmin@schoolpulse.com',
      crypt('SuperAdmin@2025!', gen_salt('bf', 10)),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      FALSE, NOW(), NOW(), 'authenticated', 'authenticated'
    )
    RETURNING id INTO v_user_id;

    RAISE NOTICE 'Created new auth user: superadmin@schoolpulse.com (id: %)', v_user_id;
  ELSE
    -- User exists — reset password and confirm email
    UPDATE auth.users
    SET encrypted_password = crypt('SuperAdmin@2025!', gen_salt('bf', 10)),
        email_confirmed_at = NOW(),
        updated_at         = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE 'Updated existing user: superadmin@schoolpulse.com (id: %)', v_user_id;
  END IF;

  -- Assign role
  SELECT promote_to_super_admin(v_user_id) INTO v_result;
  RAISE NOTICE '%', v_result;
END $$;

-- ─── FINAL VERIFICATION ──────────────────────────────────────────────────────
SELECT
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  p.full_name,
  r.name AS role
FROM auth.users u
JOIN profiles   p  ON p.id       = u.id
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles      r  ON r.id       = ur.role_id
WHERE u.email = 'superadmin@schoolpulse.com';

-- ─── CREDENTIALS ─────────────────────────────────────────────────────────────
-- Email:    superadmin@schoolpulse.com
-- Password: SuperAdmin@2025!
-- Login at: http://localhost:8080/auth/login
-- ─────────────────────────────────────────────────────────────────────────────
