-- ─────────────────────────────────────────────────────────────────────────────
-- bootstrap_super_admin.sql
--
-- Run this IN ORDER in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eqejmbxekqpvveaixfhc/sql/new
--
-- PURPOSE: Create a confirmed super admin user and wire up all required tables.
--
-- DO NOT run this more than once. Each block is safe to re-run (idempotent)
-- if you use the ON CONFLICT guards, but creating the auth user twice will fail.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── STEP 1: Verify your migrations have run ─────────────────────────────────
-- If this returns 0 rows, your migrations have NOT been applied yet.
-- Apply them first via: supabase db push  OR paste migration SQL manually.

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles','roles','user_roles','feature_catalog')
ORDER BY table_name;

-- Expected output: 4 rows (feature_catalog, profiles, roles, user_roles)
-- If you see fewer rows → STOP and run your migrations first.


-- ─── STEP 2: Check if user already exists ────────────────────────────────────

SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'superadmin@schoolpulse.com';

-- If this returns a row → skip STEP 3, go straight to STEP 4.
-- If this returns 0 rows → continue to STEP 3.


-- ─── STEP 3: Create the super admin auth user ────────────────────────────────
-- Only run if STEP 2 returned 0 rows.
--
-- This uses pgcrypto to hash the password — same as Supabase does internally.
-- Email is pre-confirmed (email_confirmed_at = NOW()) so no email needed.

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  aud,
  role
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'superadmin@schoolpulse.com',
  crypt('SuperAdmin@2025!', gen_salt('bf', 10)),
  NOW(),   -- pre-confirmed: no email verification step needed
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Super Admin"}',
  FALSE,
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
);

-- ─── STEP 4: Confirm email if it was unconfirmed ─────────────────────────────
-- Safe to run even if already confirmed.

UPDATE auth.users
SET email_confirmed_at = NOW(),
    updated_at         = NOW()
WHERE email = 'superadmin@schoolpulse.com'
  AND email_confirmed_at IS NULL;


-- ─── STEP 5: Ensure profile row exists ───────────────────────────────────────
-- The handle_new_user trigger should have created this automatically.
-- This is a safety net in case the trigger wasn't in place when the user
-- was created (e.g. user created before migrations were applied).

INSERT INTO profiles (id, full_name, email)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email
FROM auth.users u
WHERE u.email = 'superadmin@schoolpulse.com'
ON CONFLICT (id) DO NOTHING;


-- ─── STEP 6: Assign SUPER_ADMIN role ─────────────────────────────────────────

INSERT INTO user_roles (user_id, role_id, school_id)
SELECT
  u.id,
  r.id,
  NULL   -- NULL school_id = platform-level, not scoped to any school
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'superadmin@schoolpulse.com'
  AND r.name  = 'SUPER_ADMIN'
ON CONFLICT (user_id, role_id, school_id) DO NOTHING;


-- ─── STEP 7: Verify everything is correct ────────────────────────────────────

SELECT
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL  AS email_confirmed,
  p.full_name,
  r.name                            AS role
FROM auth.users u
JOIN profiles   p  ON p.id        = u.id
JOIN user_roles ur ON ur.user_id  = u.id
JOIN roles      r  ON r.id        = ur.role_id
WHERE u.email = 'superadmin@schoolpulse.com';

-- Expected output:
-- id   | email                       | email_confirmed | full_name   | role
-- uuid | superadmin@schoolpulse.com  | true            | Super Admin | SUPER_ADMIN


-- ─── CREDENTIALS ─────────────────────────────────────────────────────────────
--
--   URL:      http://localhost:8080/auth/login
--   Email:    superadmin@schoolpulse.com
--   Password: SuperAdmin@2025!
--
-- After login → redirected to /dashboard → then /admin (role detected by useAuth)
-- ─────────────────────────────────────────────────────────────────────────────
