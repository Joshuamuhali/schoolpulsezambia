-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20240009_centralize_rbac_features
--
-- Implements database-level RBAC and Feature Gating enforcement.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Feature Flag Helper
CREATE OR REPLACE FUNCTION public.school_has_feature(p_feature_key TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM school_feature_flags sff
    JOIN feature_catalog fc ON fc.id = sff.feature_id
    WHERE sff.school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid
      AND fc.key = p_feature_key
      AND sff.status = 'active'
  );
$$;

-- 2. RBAC Helper
CREATE OR REPLACE FUNCTION public.user_can(p_permission_key TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean, false)
    OR EXISTS (
      SELECT 1
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.key = (auth.jwt() -> 'app_metadata' ->> 'role')::text
        AND p.key = p_permission_key
    );
$$;

-- 3. Unified Permissions View
CREATE OR REPLACE VIEW public.user_permissions_view AS
SELECT 
  sm.user_id,
  sm.school_id,
  r.key as role_key,
  p.key as permission_key
FROM school_members sm
JOIN roles r ON r.id = sm.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id;

-- 4. Update RLS policies with feature gating
-- Note: We assume RLS policies from 20240008 are already present.
-- We will refine them for module-specific tables.

DO $$
DECLARE
    tbl TEXT;
BEGIN
    -- Attendance module
    FOR tbl IN SELECT unnest(ARRAY['attendance']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_select', tbl);
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (
            (auth.jwt() -> ''app_metadata'' ->> ''is_platform_admin'')::boolean = true
            OR (school_id = (auth.jwt() -> ''app_metadata'' ->> ''school_id'')::uuid AND school_has_feature(''attendance''))
        )', tbl || '_select', tbl);
    END LOOP;

    -- Exams module
    FOR tbl IN SELECT unnest(ARRAY['exams','grading_scales','marks']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_select', tbl);
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (
            (auth.jwt() -> ''app_metadata'' ->> ''is_platform_admin'')::boolean = true
            OR (school_id = (auth.jwt() -> ''app_metadata'' ->> ''school_id'')::uuid AND school_has_feature(''exams''))
        )', tbl || '_select', tbl);
    END LOOP;

    -- Finance module
    FOR tbl IN SELECT unnest(ARRAY['fee_categories','fee_structures','student_bills','payments','financial_transactions']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_select', tbl);
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (
            (auth.jwt() -> ''app_metadata'' ->> ''is_platform_admin'')::boolean = true
            OR (school_id = (auth.jwt() -> ''app_metadata'' ->> ''school_id'')::uuid AND school_has_feature(''finance''))
        )', tbl || '_select', tbl);
    END LOOP;

    -- Communication module
    FOR tbl IN SELECT unnest(ARRAY['announcements','sms_logs','email_logs']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_select', tbl);
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (
            (auth.jwt() -> ''app_metadata'' ->> ''is_platform_admin'')::boolean = true
            OR (school_id = (auth.jwt() -> ''app_metadata'' ->> ''school_id'')::uuid AND school_has_feature(''communication''))
        )', tbl || '_select', tbl);
    END LOOP;
END $$;
