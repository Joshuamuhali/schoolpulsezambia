-- ─────────────────────────────────────────────────────────────────────────────
-- create_super_admin.sql
--
-- Run this in: Supabase Dashboard → SQL Editor  (production)
--
-- STEP 1:  Create the auth user via Supabase Dashboard:
--          Authentication → Users → Invite User (or Add User)
--          Email:    admin@yourschool.com
--          Password: choose a strong password
--
-- STEP 2:  Run this query to promote them to SUPER_ADMIN.
--          Replace the email below with your actual admin email.
-- ─────────────────────────────────────────────────────────────────────────────

-- Option A: Promote by email (recommended)
SELECT promote_to_super_admin_by_email('admin@yourschool.com');

-- Option B: Promote by UUID (if you know the user's ID from auth.users)
-- SELECT promote_to_super_admin('paste-user-uuid-here');

-- Verify the result:
SELECT * FROM list_platform_admins();
