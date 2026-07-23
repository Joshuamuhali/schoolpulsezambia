-- ============================================================================
-- ONBOARDING & MODULE SELECTION - COMPLETE DATABASE SETUP
-- ============================================================================

-- ============================================================================
-- 1. ADD PRICING COLUMNS TO MODULE_CATALOG
-- ============================================================================

ALTER TABLE module_catalog 
ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_termly DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_annual DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- 2. CREATE SCHOOL_MODULE_SELECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_module_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  module_codes TEXT[] NOT NULL,
  total_monthly DECIMAL(10,2) NOT NULL,
  setup_fee DECIMAL(10,2) DEFAULT 100.00,
  grand_total DECIMAL(10,2) NOT NULL,
  billing_frequency TEXT DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly', 'termly', 'annual')),
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- ============================================================================
-- 3. ADD STATUS TRACKING TO SCHOOL_PAYMENTS
-- ============================================================================

ALTER TABLE school_payments 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ============================================================================
-- 4. ENABLE RLS AND CREATE POLICIES
-- ============================================================================

ALTER TABLE school_module_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_payments ENABLE ROW LEVEL SECURITY;

-- School admins can manage module selections
CREATE POLICY "Schools manage module selections"
  ON school_module_selections FOR ALL
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

-- Schools can view own payments
CREATE POLICY "Schools view own payments"
  ON school_payments FOR SELECT
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

-- Schools can submit payments
CREATE POLICY "Schools submit payments"
  ON school_payments FOR INSERT
  WITH CHECK (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

-- Platform admins can manage payments
CREATE POLICY "Platform admins manage payments"
  ON school_payments FOR ALL
  USING (is_platform_admin());

-- Platform admins can view module selections
CREATE POLICY "Platform admins view module selections"
  ON school_module_selections FOR SELECT
  USING (is_platform_admin());

-- ============================================================================
-- 5. CREATE TOTAL CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_module_total(
  p_module_codes TEXT[],
  p_frequency TEXT DEFAULT 'monthly'
)
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(
    CASE p_frequency
      WHEN 'monthly' THEN price_monthly
      WHEN 'termly' THEN price_termly
      WHEN 'annual' THEN price_annual
      ELSE price_monthly
    END
  ), 0)
  INTO total
  FROM module_catalog
  WHERE code = ANY(p_module_codes)
    AND is_active = true;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. UPDATE MODULE PRICES
-- ============================================================================

UPDATE module_catalog SET 
  price_monthly = 250,
  price_termly = 700,
  price_annual = 2500,
  display_order = 1
WHERE code = 'core_students';

UPDATE module_catalog SET 
  price_monthly = 200,
  price_termly = 550,
  price_annual = 2000,
  display_order = 2
WHERE code = 'core_staff';

UPDATE module_catalog SET 
  price_monthly = 150,
  price_termly = 420,
  price_annual = 1500,
  display_order = 3
WHERE code = 'core_classes';

UPDATE module_catalog SET 
  price_monthly = 100,
  price_termly = 280,
  price_annual = 1000,
  display_order = 4
WHERE code = 'core_academic';

UPDATE module_catalog SET 
  price_monthly = 275,
  price_termly = 770,
  price_annual = 2750,
  display_order = 5
WHERE code = 'attendance';

UPDATE module_catalog SET 
  price_monthly = 250,
  price_termly = 700,
  price_annual = 2500,
  display_order = 6
WHERE code = 'exams';

UPDATE module_catalog SET 
  price_monthly = 200,
  price_termly = 550,
  price_annual = 2000,
  display_order = 7
WHERE code = 'homework';

UPDATE module_catalog SET 
  price_monthly = 200,
  price_termly = 550,
  price_annual = 2000,
  display_order = 8
WHERE code = 'timetable';

UPDATE module_catalog SET 
  price_monthly = 350,
  price_termly = 980,
  price_annual = 3500,
  display_order = 9
WHERE code = 'finance';

UPDATE module_catalog SET 
  price_monthly = 250,
  price_termly = 700,
  price_annual = 2500,
  display_order = 10
WHERE code = 'payroll';

UPDATE module_catalog SET 
  price_monthly = 200,
  price_termly = 550,
  price_annual = 2000,
  display_order = 11
WHERE code = 'parent_portal';

UPDATE module_catalog SET 
  price_monthly = 150,
  price_termly = 420,
  price_annual = 1500,
  display_order = 12
WHERE code = 'messaging';

UPDATE module_catalog SET 
  price_monthly = 150,
  price_termly = 420,
  price_annual = 1500,
  display_order = 13
WHERE code = 'sms';

UPDATE module_catalog SET 
  price_monthly = 100,
  price_termly = 280,
  price_annual = 1000,
  display_order = 14
WHERE code = 'email';

UPDATE module_catalog SET 
  price_monthly = 200,
  price_termly = 550,
  price_annual = 2000,
  display_order = 15
WHERE code = 'library';

UPDATE module_catalog SET 
  price_monthly = 150,
  price_termly = 420,
  price_annual = 1500,
  display_order = 16
WHERE code = 'health';

UPDATE module_catalog SET 
  price_monthly = 150,
  price_termly = 420,
  price_annual = 1500,
  display_order = 17
WHERE code = 'behavior';

UPDATE module_catalog SET 
  price_monthly = 200,
  price_termly = 550,
  price_annual = 2000,
  display_order = 18
WHERE code = 'inventory';

UPDATE module_catalog SET 
  price_monthly = 150,
  price_termly = 420,
  price_annual = 1500,
  display_order = 19
WHERE code = 'events';

UPDATE module_catalog SET 
  price_monthly = 300,
  price_termly = 840,
  price_annual = 3000,
  display_order = 20
WHERE code = 'analytics';

UPDATE module_catalog SET 
  price_monthly = 250,
  price_termly = 700,
  price_annual = 2500,
  display_order = 21
WHERE code = 'reports';

UPDATE module_catalog SET 
  price_monthly = 350,
  price_termly = 980,
  price_annual = 3500,
  display_order = 22
WHERE code = 'predictive';

-- ============================================================================
-- 7. CREATE NOTIFICATIONS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 8. CREATE ADMIN NOTIFICATION FUNCTION AND TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admin_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for all platform admins
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    created_at
  )
  SELECT 
    id,
    'payment_submitted',
    'New Payment Submitted',
    'A school has submitted a payment for approval.',
    jsonb_build_object(
      'payment_id', NEW.id,
      'school_id', NEW.school_id,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method,
      'reference', NEW.reference
    ),
    NOW()
  FROM auth.users
  WHERE id IN (
    SELECT user_id FROM school_members 
    WHERE role IN ('god_mode', 'super_admin', 'platform_admin')
    LIMIT 5
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS notify_admin_on_payment_trigger ON school_payments;

CREATE TRIGGER notify_admin_on_payment_trigger
  AFTER INSERT ON school_payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_payment();

-- ============================================================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_school_module_selections_school_id 
  ON school_module_selections(school_id);

CREATE INDEX IF NOT EXISTS idx_school_payments_school_id 
  ON school_payments(school_id);

CREATE INDEX IF NOT EXISTS idx_school_payments_status 
  ON school_payments(status);

CREATE INDEX IF NOT EXISTS idx_module_catalog_code 
  ON module_catalog(code);

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON school_module_selections TO authenticated;
GRANT ALL ON school_payments TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO authenticated;

-- ============================================================================
-- 11. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get onboarding status
CREATE OR REPLACE FUNCTION get_onboarding_status(p_school_id UUID)
RETURNS JSONB AS $$
DECLARE
  module_selection_count INTEGER;
  payment_count INTEGER;
  payment_status TEXT;
BEGIN
  -- Count module selections
  SELECT COUNT(*) INTO module_selection_count
  FROM school_module_selections
  WHERE school_id = p_school_id;
  
  -- Get latest payment status
  SELECT status INTO payment_status
  FROM school_payments
  WHERE school_id = p_school_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN jsonb_build_object(
    'has_module_selection', module_selection_count > 0,
    'has_payment', payment_status IS NOT NULL,
    'payment_status', COALESCE(payment_status, 'none'),
    'onboarding_complete', module_selection_count > 0 AND payment_status IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. INSERT SAMPLE DATA (if module_catalog is empty)
-- ============================================================================

INSERT INTO module_catalog (code, name, description, category, price_monthly, price_termly, price_annual, display_order, is_active)
VALUES
  ('core_students', 'Student Management', 'Manage student profiles, enrollment, transfers', 'core', 250, 700, 2500, 1, true),
  ('core_staff', 'Staff Management', 'Manage teachers and staff members', 'core', 200, 550, 2000, 2, true),
  ('core_classes', 'Class Management', 'Organize classes and grade levels', 'core', 150, 420, 1500, 3, true),
  ('core_academic', 'Academic Structure', 'Set up years, terms, and grading systems', 'core', 100, 280, 1000, 4, true),
  ('attendance', 'Attendance', 'Daily attendance tracking and reports', 'academic', 275, 770, 2750, 5, true),
  ('exams', 'Exams & Results', 'Exam management and result processing', 'academic', 250, 700, 2500, 6, true),
  ('homework', 'Homework', 'Homework assignment and tracking', 'academic', 200, 550, 2000, 7, true),
  ('timetable', 'Timetable', 'Class and exam timetable management', 'academic', 200, 550, 2000, 8, true),
  ('finance', 'Finance', 'Fee collection and financial management', 'finance', 350, 980, 3500, 9, true),
  ('payroll', 'Payroll', 'Staff salary and payroll management', 'finance', 250, 700, 2500, 10, true),
  ('parent_portal', 'Parent Portal', 'Parent access to student information', 'communication', 200, 550, 2000, 11, true),
  ('messaging', 'Messaging', 'Internal messaging system', 'communication', 150, 420, 1500, 12, true),
  ('sms', 'SMS Notifications', 'SMS alerts and notifications', 'communication', 150, 420, 1500, 13, true),
  ('email', 'Email Notifications', 'Email alerts and notifications', 'communication', 100, 280, 1000, 14, true),
  ('library', 'Library Management', 'Library inventory and tracking', 'operations', 200, 550, 2000, 15, true),
  ('health', 'Health Records', 'Student health and medical records', 'operations', 150, 420, 1500, 16, true),
  ('behavior', 'Behavior Tracking', 'Student behavior and discipline tracking', 'operations', 150, 420, 1500, 17, true),
  ('inventory', 'Inventory', 'School inventory management', 'operations', 200, 550, 2000, 18, true),
  ('events', 'Events', 'School events and calendar', 'operations', 150, 420, 1500, 19, true),
  ('analytics', 'Analytics', 'Advanced analytics and insights', 'analytics', 300, 840, 3000, 20, true),
  ('reports', 'Reports', 'Custom report generation', 'analytics', 250, 700, 2500, 21, true),
  ('predictive', 'Predictive Analytics', 'AI-powered predictions and recommendations', 'analytics', 350, 980, 3500, 22, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 13. CREATE STORAGE BUCKET FOR PAYMENT PROOFS
-- ============================================================================

-- Note: This needs to be done in Supabase Dashboard or via Supabase CLI
-- Run this in Supabase Dashboard > Storage:
-- 
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'payment-proofs',
--   'payment-proofs',
--   false,
--   5242880, -- 5MB
--   ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
-- );

-- ============================================================================
-- 14. STORAGE RLS POLICIES (run after bucket creation)
-- ============================================================================

-- Note: These need to be created in Supabase Dashboard > Storage > Policies
-- or via the Supabase Management API

-- Policy for schools to upload their own payment proofs
-- CREATE POLICY "Schools upload payment proofs"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'payment-proofs' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy for schools to view their own payment proofs
-- CREATE POLICY "Schools view payment proofs"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'payment-proofs' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy for platform admins to view all payment proofs
-- CREATE POLICY "Admins view all payment proofs"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'payment-proofs' AND
--     is_platform_admin()
--   );

-- ============================================================================
-- 15. UPDATE EXISTING RECORDS
-- ============================================================================

-- Update any existing module_catalog records to have default prices
UPDATE module_catalog 
SET 
  price_monthly = COALESCE(price_monthly, 0),
  price_termly = COALESCE(price_termly, 0),
  price_annual = COALESCE(price_annual, 0),
  display_order = COALESCE(display_order, 0),
  is_active = COALESCE(is_active, true)
WHERE price_monthly IS NULL OR price_termly IS NULL OR price_annual IS NULL;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ONBOARDING & MODULE SELECTION SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. ✅ module_catalog pricing columns added';
  RAISE NOTICE '2. ✅ school_module_selections table created';
  RAISE NOTICE '3. ✅ school_payments status columns added';
  RAISE NOTICE '4. ✅ RLS policies created';
  RAISE NOTICE '5. ✅ calculate_module_total() function created';
  RAISE NOTICE '6. ✅ Module prices updated';
  RAISE NOTICE '7. ✅ notifications table created';
  RAISE NOTICE '8. ✅ Admin notification trigger created';
  RAISE NOTICE '9. ✅ Indexes created for performance';
  RAISE NOTICE '10. ✅ Helper functions created';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Create payment-proofs storage bucket in Supabase Dashboard';
  RAISE NOTICE '2. Add storage RLS policies (see comments in migration)';
  RAISE NOTICE '3. Test the onboarding flow';
  RAISE NOTICE '4. Verify admin notifications are working';
  RAISE NOTICE '========================================';
END $$;