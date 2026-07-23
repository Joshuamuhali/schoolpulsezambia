-- ============================================================================
-- PHASE 0 DIAGNOSTIC QUERIES
-- Run these in Supabase SQL Editor (Dashboard → SQL Editor)
-- Copy the FULL output of each query and paste it back
-- ============================================================================

-- ============================================================================
-- QUERY 1: All FK constraints touching these tables
-- This tells us if PostgREST embedding can even work
-- ============================================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name IN ('school_payments','profiles','school_members','schools','module_catalog','module_usage')
       OR ccu.table_name IN ('school_payments','profiles','school_members','schools','module_catalog','module_usage'))
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- QUERY 2: Actual columns on every table involved
-- ============================================================================
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('school_payments','profiles','school_members','schools','module_catalog','module_usage','roles')
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- QUERY 3: All RLS policies on these tables
-- ============================================================================
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('school_payments','profiles','school_members','schools','module_catalog','module_usage','roles')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- QUERY 4: Every view/function already created during prior fix attempts
-- ============================================================================
SELECT table_name FROM information_schema.views 
WHERE table_name LIKE '%payment%' 
   OR table_name LIKE '%profile%' 
   OR table_name LIKE '%user_detail%' 
   OR table_name LIKE '%feature%'
   OR table_name = 'roles'
   OR table_name LIKE '%school%'
ORDER BY table_name;

SELECT proname AS function_name, pg_get_function_identity_arguments(oid) AS arguments
FROM pg_proc 
WHERE proname LIKE '%payment%'
   OR proname LIKE '%school%'
   OR proname LIKE '%user%'
   OR proname LIKE '%feature%'
ORDER BY proname;

-- ============================================================================
-- QUERY 5: Check if RLS is enabled on these tables
-- ============================================================================
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('school_payments','profiles','school_members','schools','module_catalog','module_usage','roles')
ORDER BY tablename;

-- ============================================================================
-- QUERY 6: Test the exact failing queries from the browser console
-- Run these ONE AT A TIME and capture the FULL error response
-- ============================================================================

-- Test 1: school_payments with nested joins (this is failing with 400)
-- Copy the error message exactly as shown
SELECT id, amount, currency, status, payment_method, reference, created_at, verified_at,
       schools(id, name),
       profiles(id, full_name)
FROM school_payments
LIMIT 1;

-- Test 2: profiles with nested joins (this is also failing with 400)
SELECT id, email, full_name, phone, created_at,
       school_members(school_id, role, is_active, schools(id, name))
FROM profiles
LIMIT 1;

-- Test 3: roles table (failing with 400)
SELECT id, key, name, description
FROM roles
ORDER BY name ASC
LIMIT 10;

-- ============================================================================
-- QUERY 7: Check what the actual error is from PostgREST's perspective
-- This will show the PGRST error code
-- ============================================================================
-- If the above queries fail, run this to see the exact PostgREST error:
-- (This is a meta-query that shows the last error)
SELECT * FROM pg_stat_activity WHERE state = 'idle' AND query LIKE '%school_payments%';

-- ============================================================================
-- QUERY 8: Count rows in each table to see if data exists
-- ============================================================================
SELECT 'school_payments' AS table_name, COUNT(*) AS row_count FROM school_payments
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'school_members', COUNT(*) FROM school_members
UNION ALL
SELECT 'schools', COUNT(*) FROM schools
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'module_catalog', COUNT(*) FROM module_catalog
UNION ALL
SELECT 'module_usage', COUNT(*) FROM module_usage;

-- ============================================================================
-- QUERY 9: Check if there are duplicate/conflicting FKs
-- ============================================================================
SELECT 
  tc.table_name,
  kcu.column_name,
  COUNT(*) as fk_count
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('school_payments','profiles','school_members','schools')
GROUP BY tc.table_name, kcu.column_name
HAVING COUNT(*) > 1;

-- ============================================================================
-- QUERY 10: Check auth.users vs profiles relationship
-- ============================================================================
SELECT 
  'profiles FK to auth.users' as check_type,
  COUNT(*) as exists_count
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'profiles'
  AND ccu.table_name = 'auth.users'

UNION ALL

SELECT 
  'school_payments FK to auth.users (reviewed_by)' as check_type,
  COUNT(*) as exists_count
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'school_payments'
  AND kcu.column_name IN ('reviewed_by', 'verified_by')
  AND ccu.table_name = 'auth.users';