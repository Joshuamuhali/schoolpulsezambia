# How to Run Phase 0 Diagnostics

## Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/uqesuujpshaktrnxlhjb/sql/new
2. You should see a SQL editor with a text area

## Step 2: Run Each Query

Open the file `PHASE0_DIAGNOSTIC_QUERIES.sql` in your project and run these queries **ONE AT A TIME** in the Supabase SQL Editor:

### Query 1: FK Constraints (MOST IMPORTANT)
```sql
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
```
**Copy the FULL output table and paste it here**

### Query 2: Table Columns
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('school_payments','profiles','school_members','schools','module_catalog','module_usage','roles')
ORDER BY table_name, ordinal_position;
```
**Copy the FULL output and paste it here**

### Query 3: RLS Policies
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('school_payments','profiles','school_members','schools','module_catalog','module_usage','roles')
ORDER BY tablename, cmd, policyname;
```
**Copy the FULL output and paste it here**

### Query 5: RLS Enabled Status
```sql
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('school_payments','profiles','school_members','schools','module_catalog','module_usage','roles')
ORDER BY tablename;
```
**Copy the FULL output and paste it here**

### Query 6: Test Queries (CRITICAL - includes error messages)
Run these ONE AT A TIME:

#### Test 6a: school_payments query
```sql
SELECT id, amount, currency, status, payment_method, reference, created_at, verified_at,
       schools(id, name),
       profiles(id, full_name)
FROM school_payments
LIMIT 1;
```
**If it fails, copy the EXACT error message. If it succeeds, copy the results.**

#### Test 6b: profiles query
```sql
SELECT id, email, full_name, phone, created_at,
       school_members(school_id, role, is_active, schools(id, name))
FROM profiles
LIMIT 1;
```
**If it fails, copy the EXACT error message. If it succeeds, copy the results.**

#### Test 6c: roles query
```sql
SELECT id, key, name, description
FROM roles
ORDER BY name ASC
LIMIT 10;
```
**If it fails, copy the EXACT error message. If it succeeds, copy the results.**

### Query 8: Row Counts
```sql
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
```
**Copy the FULL output and paste it here**

## Step 3: Paste Results Back Here

Paste all the results in this order:
1. Query 1 output (FK constraints)
2. Query 2 output (table columns)
3. Query 3 output (RLS policies)
4. Query 5 output (RLS enabled)
5. Query 6a output (school_payments test + error if any)
6. Query 6b output (profiles test + error if any)
7. Query 6c output (roles test + error if any)
8. Query 8 output (row counts)

## What Happens Next

Once you paste the results, I will:
1. Analyze the exact cause of the 400/406 errors
2. Create a precise fix (usually adding missing FK constraints or fixing RLS policies)
3. Provide the exact SQL to run
4. Verify the fix works
5. Then we can build the onboarding workflow on a working database

**Time estimate:** 10-15 minutes to run queries, 30-60 minutes to fix and verify.