-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260121_parent_portal_communication
-- Parent Portal & Communication Module
-- - Parent profiles and authentication
-- - Announcements system
-- - Notifications (SMS, Email, In-app)
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. PARENT PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS parent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Parent details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('mother', 'father', 'guardian', 'grandparent', 'other')),
  occupation TEXT,
  address TEXT,
  national_id TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  
  -- Preferences
  notification_preferences JSONB DEFAULT '{"sms": true, "email": true, "in_app": true}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, user_id),
  UNIQUE(school_id, email)
);

CREATE INDEX idx_parent_profiles_school ON parent_profiles(school_id);
CREATE INDEX idx_parent_profiles_user ON parent_profiles(user_id);
CREATE INDEX idx_parent_profiles_email ON parent_profiles(email);
CREATE INDEX idx_parent_profiles_status ON parent_profiles(status);
CREATE INDEX idx_parent_profiles_verified ON parent_profiles(is_verified) WHERE is_verified = TRUE;

-- ============================================================================
-- 2. ANNOUNCEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Announcement details
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  summary TEXT,
  
  -- Audience targeting
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'parents', 'staff', 'specific_class', 'specific_grade')),
  target_class_ids UUID[] DEFAULT '{}',
  target_grade_ids UUID[] DEFAULT '{}',
  target_role_keys TEXT[] DEFAULT '{}',
  
  -- Priority and type
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'academic', 'financial', 'event', 'urgent', 'holiday')),
  
  -- Scheduling
  publish_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expire_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  -- Attachments
  attachment_urls TEXT[] DEFAULT '{}',
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  published_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_school ON announcements(school_id);
CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_audience ON announcements(audience);
CREATE INDEX idx_announcements_publish_at ON announcements(publish_at DESC);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_created_by ON announcements(created_by);

-- ============================================================================
-- 3. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification details
  type TEXT NOT NULL CHECK (type IN ('attendance_alert', 'fee_reminder', 'exam_notification', 'result_published', 'announcement', 'payment_receipt', 'general', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  
  -- Channel
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'in_app', 'push')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  
  -- Related records
  related_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  related_announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  related_payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  external_id TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_school ON notifications(school_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read_at) WHERE read_at IS NULL;

-- ============================================================================
-- 4. ANNOUNCEMENT READ TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX idx_announcement_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX idx_announcement_reads_read_at ON announcement_reads(read_at DESC);

-- ============================================================================
-- 5. NOTIFICATION TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Template details
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Templates for different channels
  sms_template TEXT,
  email_subject TEXT,
  email_body TEXT,
  in_app_title TEXT,
  in_app_message TEXT,
  
  -- Variables available
  available_variables TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, type)
);

CREATE INDEX idx_notification_templates_school ON notification_templates(school_id);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 6. SMS PROVIDER CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Provider details
  provider_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT,
  sender_id TEXT,
  api_endpoint TEXT NOT NULL,
  
  -- Configuration
  is_active BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Usage tracking
  sms_sent_count INTEGER DEFAULT 0,
  sms_failed_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_providers_school ON sms_providers(school_id);
CREATE INDEX idx_sms_providers_active ON sms_providers(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 7. EMAIL PROVIDER CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Provider details
  provider_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  reply_to_email TEXT,
  
  -- Configuration
  is_active BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Usage tracking
  emails_sent_count INTEGER DEFAULT 0,
  emails_failed_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_providers_school ON email_providers(school_id);
CREATE INDEX idx_email_providers_active ON email_providers(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all parent portal tables
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_providers ENABLE ROW LEVEL SECURITY;

-- PARENT PROFILES POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_parent_profiles"
  ON parent_profiles FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar')
      )
    )
  );

-- Parents: Can view and update own profile
CREATE POLICY "parent_manage_own_profile"
  ON parent_profiles FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('parent')
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('parent')
      )
    )
  );

-- ANNOUNCEMENTS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_announcements"
  ON announcements FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

-- Parents: Can view published announcements
CREATE POLICY "parent_view_announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('parent')
      )
    )
    AND status = 'published'
    AND publish_at <= NOW()
    AND (expire_at IS NULL OR expire_at > NOW())
  );

-- Staff: Can view published announcements
CREATE POLICY "staff_view_announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'teacher', 'bursar', 'registrar', 'receptionist')
      )
    )
    AND status = 'published'
    AND publish_at <= NOW()
    AND (expire_at IS NULL OR expire_at > NOW())
  );

-- NOTIFICATIONS POLICIES

-- School Admin: Can view all notifications in their school
CREATE POLICY "school_admin_view_all_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

-- Users: Can view own notifications
CREATE POLICY "user_view_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- System: Can insert notifications
CREATE POLICY "system_create_notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'teacher', 'bursar')
      )
    )
  );

-- Users: Can update own notifications (mark as read)
CREATE POLICY "user_update_own_notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- ANNOUNCEMENT READS POLICIES

-- Users: Can view own reads
CREATE POLICY "user_view_own_announcement_reads"
  ON announcement_reads FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- System: Can insert reads
CREATE POLICY "system_create_announcement_reads"
  ON announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- NOTIFICATION TEMPLATES POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

-- SMS PROVIDERS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_sms_providers"
  ON sms_providers FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

-- EMAIL PROVIDERS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_email_providers"
  ON email_providers FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- 9.1 Get parent's children
CREATE OR REPLACE FUNCTION get_parent_children(p_parent_user_id UUID)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  admission_number TEXT,
  grade_id UUID,
  grade_name TEXT,
  class_id UUID,
  class_name TEXT,
  class_teacher_id UUID,
  class_teacher_name TEXT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    s.id as student_id,
    s.full_name as student_name,
    s.admission_number,
    s.grade_id,
    g.name as grade_name,
    s.class_id,
    c.name as class_name,
    c.class_teacher_id,
    p.full_name as class_teacher_name
  FROM student_guardians sg
  JOIN students s ON s.id = sg.student_id
  JOIN grades g ON g.id = s.grade_id
  LEFT JOIN classes c ON c.id = s.class_id
  LEFT JOIN profiles p ON p.id = c.class_teacher_id
  WHERE sg.guardian_id IN (
    SELECT id FROM guardians WHERE user_id = p_parent_user_id
  )
  AND s.status = 'active'
  ORDER BY s.full_name;
$$;

-- 9.2 Get parent's unread notification count
CREATE OR REPLACE FUNCTION get_parent_unread_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)
  FROM notifications
  WHERE user_id = p_user_id
    AND status IN ('pending', 'sent', 'delivered')
    AND read_at IS NULL;
$$;

-- 9.3 Get parent's attendance summary
CREATE OR REPLACE FUNCTION get_parent_attendance_summary(p_student_id UUID)
RETURNS TABLE (
  total_days INTEGER,
  present_days INTEGER,
  absent_days INTEGER,
  late_days INTEGER,
  excused_days INTEGER,
  attendance_percentage DECIMAL
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    COUNT(*)::INTEGER as total_days,
    COUNT(CASE WHEN status = 'present' THEN 1 END)::INTEGER as present_days,
    COUNT(CASE WHEN status = 'absent' THEN 1 END)::INTEGER as absent_days,
    COUNT(CASE WHEN status = 'late' THEN 1 END)::INTEGER as late_days,
    COUNT(CASE WHEN status = 'excused' THEN 1 END)::INTEGER as excused_days,
    ROUND(
      COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(*), 0) * 100,
      2
    ) as attendance_percentage
  FROM attendance_records
  WHERE student_id = p_student_id
    AND date >= CURRENT_DATE - INTERVAL '30 days';
$$;

-- 9.4 Get parent's fee summary
CREATE OR REPLACE FUNCTION get_parent_fee_summary(p_student_id UUID)
RETURNS TABLE (
  total_fees DECIMAL,
  total_paid DECIMAL,
  balance DECIMAL,
  overdue_count INTEGER
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    COALESCE(SUM(total_amount), 0) as total_fees,
    COALESCE(SUM(amount_paid), 0) as total_paid,
    COALESCE(SUM(balance), 0) as balance,
    COUNT(CASE WHEN status IN ('unpaid', 'overdue') THEN 1 END)::INTEGER as overdue_count
  FROM student_bills
  WHERE student_id = p_student_id;
$$;

-- 9.5 Get parent's latest results
CREATE OR REPLACE FUNCTION get_parent_latest_results(p_student_id UUID)
RETURNS TABLE (
  exam_id UUID,
  exam_name TEXT,
  term_id UUID,
  term_name TEXT,
  academic_year_id UUID,
  average DECIMAL,
  overall_grade TEXT,
  position INTEGER,
  published_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    e.id as exam_id,
    e.name as exam_name,
    t.id as term_id,
    t.name as term_name,
    ay.id as academic_year_id,
    ser.average,
    ser.overall_grade,
    ser.position,
    e.published_at
  FROM student_exam_results ser
  JOIN exams e ON e.id = ser.exam_id
  JOIN terms t ON t.id = e.term_id
  JOIN academic_years ay ON ay.id = e.academic_year_id
  WHERE ser.student_id = p_student_id
    AND ser.status = 'published'
  ORDER BY e.published_at DESC
  LIMIT 5;
$$;

-- 9.6 Check if user is parent
CREATE OR REPLACE FUNCTION is_parent(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM school_members
    WHERE user_id = p_user_id
      AND role_id IN (SELECT id FROM roles WHERE key = 'parent')
      AND status = 'active'
  );
$$;

-- 9.7 Get parent's school
CREATE OR REPLACE FUNCTION get_parent_school(p_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT school_id
  FROM school_members
  WHERE user_id = p_user_id
    AND role_id IN (SELECT id FROM roles WHERE key = 'parent')
    AND status = 'active'
  LIMIT 1;
$$;

-- ============================================================================
-- 10. TRIGGERS
-- ============================================================================

-- Update timestamps for parent_profiles
CREATE TRIGGER update_parent_profiles_updated_at
  BEFORE UPDATE ON parent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for announcements
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for notifications
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for notification_templates
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for sms_providers
CREATE TRIGGER update_sms_providers_updated_at
  BEFORE UPDATE ON sms_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for email_providers
CREATE TRIGGER update_email_providers_updated_at
  BEFORE UPDATE ON email_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. SEED DEFAULT NOTIFICATION TEMPLATES
-- ============================================================================

-- Insert default templates for each school (will be done per school via application)
-- This is just a comment - actual templates will be created when school is set up

-- ============================================================================
-- 12. COMMENTS
-- ============================================================================

COMMENT ON TABLE parent_profiles IS 'Parent/guardian profiles with verification and preferences';
COMMENT ON TABLE announcements IS 'School announcements with audience targeting';
COMMENT ON TABLE notifications IS 'Multi-channel notifications (SMS, Email, In-app)';
COMMENT ON TABLE announcement_reads IS 'Track which users have read which announcements';
COMMENT ON TABLE notification_templates IS 'Customizable notification message templates';
COMMENT ON TABLE sms_providers IS 'SMS provider configurations';
COMMENT ON TABLE email_providers IS 'Email provider configurations';

COMMENT ON COLUMN parent_profiles.relationship IS 'Relationship to student: mother, father, guardian, grandparent, other';
COMMENT ON COLUMN parent_profiles.notification_preferences IS 'JSON object with channel preferences: {sms: true, email: true, in_app: true}';
COMMENT ON COLUMN announcements.audience IS 'Target audience: all, parents, staff, specific_class, specific_grade';
COMMENT ON COLUMN announcements.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN notifications.channel IS 'Delivery channel: sms, email, in_app, push';
COMMENT ON COLUMN notifications.type IS 'Notification type for categorization and templating';

-- ============================================================================
-- 13. GRANTS
-- ============================================================================

GRANT ALL ON parent_profiles TO authenticated;
GRANT ALL ON announcements TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON announcement_reads TO authenticated;
GRANT ALL ON notification_templates TO authenticated;
GRANT ALL ON sms_providers TO authenticated;
GRANT ALL ON email_providers TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE parent_profiles_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE announcements_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE announcement_reads_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notification_templates_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sms_providers_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE email_providers_id_seq TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================