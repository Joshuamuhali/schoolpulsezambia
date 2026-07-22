-- ─────────────────────────────────────────────────────────────────────────────
-- Test: RLS Isolation Verification
-- This script tests if the RLS policies correctly isolate tenants based on JWT.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Setup mock context for School A
-- We simulate a JWT for a user in School A
SET request.jwt.claims = '{"app_metadata": {"school_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "school_admin", "is_platform_admin": false}}';

-- Test SELECT on schools
-- Should only return School A (if it exists) or nothing if it doesn't match
SELECT id, name FROM schools;

-- Test INSERT on students for School A
-- This should succeed if we specify School A's ID
INSERT INTO students (school_id, first_name, last_name, admission_number)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test', 'Student A', 'S001');

-- Test INSERT on students for School B (Should Fail)
-- This should fail because school_id mismatch with JWT
DO $$
BEGIN
  BEGIN
    INSERT INTO students (school_id, first_name, last_name, admission_number)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Test', 'Student B', 'S002');
    RAISE EXCEPTION 'RLS BYPASS DETECTED: Was able to insert for another school!';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Success: RLS blocked insert for another school.';
  END;
END $$;

-- 2. Setup mock context for Platform Admin
SET request.jwt.claims = '{"app_metadata": {"is_platform_admin": true}}';

-- Test SELECT on schools
-- Should return ALL schools
SELECT count(*) FROM schools;

-- 3. Cleanup
SET request.jwt.claims = '';
