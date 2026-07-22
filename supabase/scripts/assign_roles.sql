-- ─────────────────────────────────────────────────────────────────────────────
-- assign_roles.sql — Role assignment reference
--
-- Run in Supabase SQL Editor. Replace emails and school IDs as needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Promote to other platform admin roles ───────────────────────────────────

-- Operations admin (can manage schools but not billing)
INSERT INTO user_roles (user_id, role_id, school_id)
SELECT u.id, r.id, NULL
FROM auth.users u, roles r
WHERE u.email = 'ops@schoolpulse.com'
  AND r.name = 'OPERATIONS_ADMIN'
ON CONFLICT DO NOTHING;

-- Finance admin (revenue overview only)
INSERT INTO user_roles (user_id, role_id, school_id)
SELECT u.id, r.id, NULL
FROM auth.users u, roles r
WHERE u.email = 'finance@schoolpulse.com'
  AND r.name = 'FINANCE_ADMIN'
ON CONFLICT DO NOTHING;

-- ─── Assign a school-level role ───────────────────────────────────────────────
-- Replace school_id with the actual UUID from your schools table

-- School admin
INSERT INTO user_roles (user_id, role_id, school_id)
SELECT u.id, r.id, 'your-school-uuid-here'::UUID
FROM auth.users u, roles r
WHERE u.email = 'schooladmin@example.com'
  AND r.name = 'SCHOOL_ADMIN'
ON CONFLICT DO NOTHING;

-- Teacher
INSERT INTO user_roles (user_id, role_id, school_id)
SELECT u.id, r.id, 'your-school-uuid-here'::UUID
FROM auth.users u, roles r
WHERE u.email = 'teacher@example.com'
  AND r.name = 'TEACHER'
ON CONFLICT DO NOTHING;

-- Bursar
INSERT INTO user_roles (user_id, role_id, school_id)
SELECT u.id, r.id, 'your-school-uuid-here'::UUID
FROM auth.users u, roles r
WHERE u.email = 'bursar@example.com'
  AND r.name = 'BURSAR'
ON CONFLICT DO NOTHING;

-- Also link their profile to the school
UPDATE profiles
SET school_id = 'your-school-uuid-here'::UUID
WHERE email IN ('teacher@example.com', 'bursar@example.com', 'schooladmin@example.com');

-- ─── Verify all role assignments ─────────────────────────────────────────────
SELECT
  p.email,
  r.name AS role,
  s.name AS school,
  ur.created_at
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
LEFT JOIN schools s ON s.id = ur.school_id
ORDER BY r.name, p.email;
