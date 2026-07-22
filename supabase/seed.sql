-- ─────────────────────────────────────────────────────────────────────────────
-- seed.sql  —  Local development seed data
--
-- Applied automatically after migrations by:
--   supabase db reset
--
-- For production Supabase: run only the sections marked [PROD SAFE]
-- NEVER run the auth.users section in production — use the dashboard instead.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── [PROD SAFE] Subscription plans ──────────────────────────────────────────
-- Feature catalog is already seeded inside migration 20240001.

INSERT INTO subscription_plans (name, description, price_monthly, price_annual, features) VALUES
  ('Starter',
   'Up to 300 students, core modules (students, teachers, attendance)',
   99, 990,
   ARRAY['students','teachers','attendance']),

  ('Standard',
   'Up to 1000 students, 6 modules',
   199, 1990,
   ARRAY['students','teachers','attendance','exams','finance','communication']),

  ('Enterprise',
   'Unlimited students, all modules, priority support',
   399, 3990,
   ARRAY['students','teachers','attendance','exams','finance','communication',
         'timetable','parent_portal','analytics','reports'])
ON CONFLICT DO NOTHING;

-- ─── LOCAL DEV ONLY: Super Admin user ────────────────────────────────────────
--
-- Supabase local dev stack (supabase start) exposes an Inbucket SMTP server
-- at http://localhost:54324 — all emails land there (no real email sent).
--
-- HOW THIS WORKS:
--   1. We insert directly into auth.users using pgcrypto to hash the password.
--   2. The handle_new_user trigger fires → creates the profile row automatically.
--   3. We then call promote_to_super_admin() to assign the SUPER_ADMIN role.
--
-- ─── CREDENTIALS (LOCAL ONLY) ────────────────────────────────────────────────
--   Email:    superadmin@schoolpulse.local
--   Password: SuperAdmin@2025!
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_user_id  UUID := '00000000-0000-0000-0000-000000000001';
  v_email    TEXT := 'superadmin@schoolpulse.local';
  v_result   TEXT;
BEGIN
  -- Only run if this user doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN

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
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      -- bcrypt hash of "SuperAdmin@2025!"
      crypt('SuperAdmin@2025!', gen_salt('bf', 10)),
      NOW(),  -- email pre-confirmed (no email verification needed locally)
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      FALSE,
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );

    RAISE NOTICE 'Created auth user: %', v_email;
  ELSE
    RAISE NOTICE 'Auth user already exists: %', v_email;
  END IF;

  -- Assign SUPER_ADMIN role (safe to run multiple times due to ON CONFLICT)
  SELECT promote_to_super_admin(v_user_id) INTO v_result;
  RAISE NOTICE '%', v_result;

END $$;

-- ─── Verify seed worked ───────────────────────────────────────────────────────
-- Uncomment to confirm after running:
-- SELECT * FROM list_platform_admins();
