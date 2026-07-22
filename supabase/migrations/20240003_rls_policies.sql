-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20240003_rls_policies
-- Row Level Security policies for every table.
-- Primary rule: school_id = current_user_school()
-- Platform admins bypass via is_platform_admin()
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on every table
ALTER TABLE schools                ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_catalog        ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_feature_flags   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years         ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians              ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures         ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_bills          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs             ENABLE ROW LEVEL SECURITY;

-- ─── schools ─────────────────────────────────────────────────────────────────
-- Platform admins see all schools; school users see only their own.
CREATE POLICY "schools_select" ON schools FOR SELECT USING (
  is_platform_admin() OR id = current_user_school()
);
CREATE POLICY "schools_insert" ON schools FOR INSERT WITH CHECK (is_platform_admin());
CREATE POLICY "schools_update" ON schools FOR UPDATE USING (
  is_platform_admin() OR id = current_user_school()
);
CREATE POLICY "schools_delete" ON schools FOR DELETE USING (is_platform_admin());

-- ─── school_settings ─────────────────────────────────────────────────────────
CREATE POLICY "school_settings_select" ON school_settings FOR SELECT USING (
  is_platform_admin() OR school_id = current_user_school()
);
CREATE POLICY "school_settings_write" ON school_settings FOR ALL USING (
  is_platform_admin() OR (school_id = current_user_school() AND user_has_permission('settings.write'))
);

-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (
  id = auth.uid() OR is_platform_admin() OR school_id = current_user_school()
);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());

-- ─── roles & permissions — read only for everyone authenticated ───────────────
CREATE POLICY "roles_select" ON roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "permissions_select" ON permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─── school_members ────────────────────────────────────────────────────────────
CREATE POLICY "school_members_select" ON school_members FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin() OR school_id = current_user_school()
);
CREATE POLICY "school_members_write" ON school_members FOR ALL USING (
  is_platform_admin() OR (school_id = current_user_school() AND user_has_permission('settings.write'))
);

-- ─── feature_catalog — readable by all auth users ────────────────────────────
CREATE POLICY "feature_catalog_select" ON feature_catalog FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "feature_catalog_write"  ON feature_catalog FOR ALL USING (is_platform_admin());

-- ─── school_feature_flags ────────────────────────────────────────────────────
CREATE POLICY "school_feature_flags_select" ON school_feature_flags FOR SELECT USING (
  is_platform_admin() OR school_id = current_user_school()
);
CREATE POLICY "school_feature_flags_write" ON school_feature_flags FOR ALL USING (is_platform_admin());

-- ─── subscription_plans — readable by all ────────────────────────────────────
CREATE POLICY "subscription_plans_select" ON subscription_plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "subscription_plans_write"  ON subscription_plans FOR ALL USING (is_platform_admin());

-- ─── subscriptions ───────────────────────────────────────────────────────────
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT USING (
  is_platform_admin() OR school_id = current_user_school()
);
CREATE POLICY "subscriptions_write" ON subscriptions FOR ALL USING (is_platform_admin());

-- ─── payment_verifications ───────────────────────────────────────────────────
CREATE POLICY "payment_verifications_select" ON payment_verifications FOR SELECT USING (
  is_platform_admin() OR school_id = current_user_school()
);
CREATE POLICY "payment_verifications_insert" ON payment_verifications FOR INSERT WITH CHECK (
  school_id = current_user_school()
);
CREATE POLICY "payment_verifications_update" ON payment_verifications FOR UPDATE USING (is_platform_admin());

-- ─── audit_logs ──────────────────────────────────────────────────────────────
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  is_platform_admin() OR school_id = current_user_school()
);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (
  is_platform_admin() OR school_id = current_user_school()
);

-- ─── Macro: tenant-scoped table policies ─────────────────────────────────────
-- Applied to all school-scoped tables: academic_years, terms, grades, classes,
-- subjects, students, guardians, attendance, teachers, fee_categories,
-- fee_structures, student_bills, payments, financial_transactions, exams,
-- grading_scales, marks, announcements, notifications, sms_logs, email_logs

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'academic_years','terms','grades','classes','subjects',
    'students','guardians','attendance','teachers',
    'fee_categories','fee_structures','student_bills','payments','financial_transactions',
    'exams','grading_scales','marks',
    'announcements','sms_logs','email_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('
      CREATE POLICY %I ON %I FOR SELECT USING (
        is_platform_admin() OR school_id = current_user_school()
      );', tbl || '_select', tbl);

    EXECUTE format('
      CREATE POLICY %I ON %I FOR INSERT WITH CHECK (
        school_id = current_user_school()
      );', tbl || '_insert', tbl);

    EXECUTE format('
      CREATE POLICY %I ON %I FOR UPDATE USING (
        is_platform_admin() OR school_id = current_user_school()
      );', tbl || '_update', tbl);

    EXECUTE format('
      CREATE POLICY %I ON %I FOR DELETE USING (
        is_platform_admin() OR (school_id = current_user_school() AND user_has_permission(''settings.write''))
      );', tbl || '_delete', tbl);
  END LOOP;
END $$;

-- student_guardians — no school_id column, derive via students
CREATE POLICY "student_guardians_select" ON student_guardians FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM students s WHERE s.id = student_id
      AND (is_platform_admin() OR s.school_id = current_user_school())
  )
);

-- notifications — user sees their own
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin()
);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (
  school_id = current_user_school()
);

CREATE POLICY "email_logs_write" ON email_logs FOR INSERT WITH CHECK (
  school_id = current_user_school()
);
