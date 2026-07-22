-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20240008_standardize_rls
--
-- Standardizes RLS across all tables to use deterministic JWT claims.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper to drop all policies on a table
CREATE OR REPLACE FUNCTION public.drop_all_policies(tbl_name text, schema_name text DEFAULT 'public')
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = tbl_name AND schemaname = schema_name
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol_name, schema_name, tbl_name);
    END LOOP;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
  -- Tables with school_id column
  school_scoped_tbls TEXT[] := ARRAY[
    'school_settings','school_members','school_feature_flags','subscriptions',
    'payment_verifications','audit_logs','academic_years','terms','grades',
    'classes','subjects','students','guardians','attendance','teachers',
    'fee_categories','fee_structures','student_bills','payments',
    'financial_transactions','exams','grading_scales','marks',
    'announcements','notifications','sms_logs','email_logs'
  ];
BEGIN
  -- 1. Standardize schools table (id is the school_id)
  PERFORM public.drop_all_policies('schools');
  CREATE POLICY "schools_select" ON schools FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean = true
    OR id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid
  );
  CREATE POLICY "schools_insert" ON schools FOR INSERT WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean = true
  );
  CREATE POLICY "schools_update" ON schools FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean = true
    OR id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid
  );
  CREATE POLICY "schools_delete" ON schools FOR DELETE USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean = true
  );

  -- 2. Standardize school-scoped tables
  FOREACH tbl IN ARRAY school_scoped_tbls LOOP
    PERFORM public.drop_all_policies(tbl);
    
    EXECUTE format('
      CREATE POLICY %I ON %I FOR SELECT USING (
        (auth.jwt() -> ''app_metadata'' ->> ''is_platform_admin'')::boolean = true
        OR school_id = (auth.jwt() -> ''app_metadata'' ->> ''school_id'')::uuid
      );', tbl || '_select', tbl);

    EXECUTE format('
      CREATE POLICY %I ON %I FOR INSERT WITH CHECK (
        (auth.jwt() -> ''app_metadata'' ->> ''is_platform_admin'')::boolean = true
        OR school_id = (auth.jwt() -> ''app_metadata'' ->> ''school_id'')::uuid
      );', tbl || '_insert', tbl);

    EXECUTE format('
      CREATE POLICY %I ON %I FOR UPDATE USING (
        (auth.jwt() -> ''app_metadata'' ->> ''is_platform_admin'')::boolean = true
        OR school_id = (auth.jwt() -> ''app_metadata'' ->> ''school_id'')::uuid
      );', tbl || '_update', tbl);

    EXECUTE format('
      CREATE POLICY %I ON %I FOR DELETE USING (
        (auth.jwt() -> ''app_metadata'' ->> ''is_platform_admin'')::boolean = true
        OR school_id = (auth.jwt() -> ''app_metadata'' ->> ''school_id'')::uuid
      );', tbl || '_delete', tbl);
  END LOOP;

  -- 3. Profiles (no school_id anymore, but linked via auth.uid() or membership)
  PERFORM public.drop_all_policies('profiles');
  CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
    id = auth.uid() 
    OR (auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean = true
    -- Allow users in the same school to see each other (requires a join, but profiles are small)
    OR EXISTS (
      SELECT 1 FROM school_members
      WHERE user_id = profiles.id 
      AND school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid
    )
  );
  CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

  -- 4. Global tables (readable by all auth users)
  PERFORM public.drop_all_policies('roles');
  CREATE POLICY "roles_select" ON roles FOR SELECT USING (auth.uid() IS NOT NULL);
  
  PERFORM public.drop_all_policies('permissions');
  CREATE POLICY "permissions_select" ON permissions FOR SELECT USING (auth.uid() IS NOT NULL);
  
  PERFORM public.drop_all_policies('role_permissions');
  CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
  
  PERFORM public.drop_all_policies('feature_catalog');
  CREATE POLICY "feature_catalog_select" ON feature_catalog FOR SELECT USING (auth.uid() IS NOT NULL);
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_pricing') THEN
    PERFORM public.drop_all_policies('feature_pricing');
    CREATE POLICY "feature_pricing_select" ON feature_pricing FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  -- 5. Special cases
  PERFORM public.drop_all_policies('student_guardians');
  CREATE POLICY "student_guardians_select" ON student_guardians FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean = true
    OR EXISTS (
      SELECT 1 FROM students s 
      WHERE s.id = student_id 
      AND s.school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid
    )
  );

END $$;

-- Cleanup helper
DROP FUNCTION public.drop_all_policies(text, text);
