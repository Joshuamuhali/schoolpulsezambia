-- ============================================================================
-- KYC ONBOARDING SYSTEM - COMPLETE DATABASE SCHEMA
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCE SCHOOLS TABLE
-- ============================================================================

ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS school_type TEXT CHECK (school_type IN ('day', 'boarding', 'mixed')),
ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN ('ece', 'primary', 'secondary', 'combined')),
ADD COLUMN IF NOT EXISTS year_established INTEGER,
ADD COLUMN IF NOT EXISTS motto TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'in_review', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kyc_verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- ============================================================================
-- PART 2: MINISTRY OF EDUCATION REGISTRATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  registration_number TEXT NOT NULL,
  certificate_url TEXT,
  date_registered DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- ============================================================================
-- PART 3: BUSINESS REGISTRATION (PACRA, TPIN)
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  pacra_number TEXT,
  pacra_certificate_url TEXT,
  tpin TEXT,
  business_licence_number TEXT,
  business_licence_url TEXT,
  company_name TEXT,
  company_registration_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- ============================================================================
-- PART 4: SCHOOL OWNERSHIP
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_ownership (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  ownership_type TEXT CHECK (ownership_type IN ('sole_proprietorship', 'limited_company', 'church', 'trust', 'ngo', 'cooperative')),
  proprietor_name TEXT NOT NULL,
  proprietor_nrc TEXT,
  proprietor_passport TEXT,
  proprietor_nrc_front_url TEXT,
  proprietor_nrc_back_url TEXT,
  proprietor_position TEXT,
  proprietor_phone TEXT,
  proprietor_email TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- ============================================================================
-- PART 5: HEAD TEACHER / PRINCIPAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_heads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  tcz_number TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- ============================================================================
-- PART 6: SCHOOL ADDRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  province TEXT,
  district TEXT,
  physical_address TEXT,
  gps_location TEXT,
  postal_address TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- ============================================================================
-- PART 7: SCHOOL STATISTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  number_of_students INTEGER DEFAULT 0,
  number_of_teachers INTEGER DEFAULT 0,
  number_of_classrooms INTEGER DEFAULT 0,
  number_of_streams INTEGER DEFAULT 0,
  number_of_campuses INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- ============================================================================
-- PART 8: SCHOOL FACILITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_facilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  facility_type TEXT CHECK (facility_type IN ('library', 'computer_lab', 'science_lab', 'boarding', 'sports', 'school_bus', 'clinic', 'dining_hall')),
  has_facility BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, facility_type)
);

-- ============================================================================
-- PART 9: KYC VERIFICATION LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS kyc_verification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  section TEXT CHECK (section IN ('registration', 'business', 'ownership', 'head_teacher', 'address', 'statistics')),
  status TEXT CHECK (status IN ('approved', 'rejected', 'pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 10: PAYMENT CONFIRMATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_confirmations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  payment_type TEXT CHECK (payment_type IN ('setup_fee', 'modules')),
  payment_id UUID REFERENCES school_payments(id),
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, payment_type)
);

-- ============================================================================
-- PART 11: RLS POLICIES
-- ============================================================================

-- Enable RLS on all KYC tables
ALTER TABLE school_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_verification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_confirmations ENABLE ROW LEVEL SECURITY;

-- School registrations policies
CREATE POLICY "Schools can view own registration"
  ON school_registrations FOR SELECT
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Schools can manage own registration"
  ON school_registrations FOR ALL
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage all registrations"
  ON school_registrations FOR ALL
  USING (is_platform_admin());

-- Business registrations policies
CREATE POLICY "Schools can view own business registration"
  ON business_registrations FOR SELECT
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Schools can manage own business registration"
  ON business_registrations FOR ALL
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage all business registrations"
  ON business_registrations FOR ALL
  USING (is_platform_admin());

-- School ownership policies
CREATE POLICY "Schools can view own ownership"
  ON school_ownership FOR SELECT
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Schools can manage own ownership"
  ON school_ownership FOR ALL
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage all ownership"
  ON school_ownership FOR ALL
  USING (is_platform_admin());

-- School heads policies
CREATE POLICY "Schools can view own head teacher"
  ON school_heads FOR SELECT
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Schools can manage own head teacher"
  ON school_heads FOR ALL
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage all head teachers"
  ON school_heads FOR ALL
  USING (is_platform_admin());

-- School addresses policies
CREATE POLICY "Schools can view own address"
  ON school_addresses FOR SELECT
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Schools can manage own address"
  ON school_addresses FOR ALL
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage all addresses"
  ON school_addresses FOR ALL
  USING (is_platform_admin());

-- School statistics policies
CREATE POLICY "Schools can view own statistics"
  ON school_statistics FOR SELECT
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Schools can manage own statistics"
  ON school_statistics FOR ALL
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage all statistics"
  ON school_statistics FOR ALL
  USING (is_platform_admin());

-- School facilities policies
CREATE POLICY "Schools can view own facilities"
  ON school_facilities FOR SELECT
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Schools can manage own facilities"
  ON school_facilities FOR ALL
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage all facilities"
  ON school_facilities FOR ALL
  USING (is_platform_admin());

-- KYC verification log policies
CREATE POLICY "Platform admins can view all verification logs"
  ON kyc_verification_log FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert verification logs"
  ON kyc_verification_log FOR INSERT
  WITH CHECK (is_platform_admin());

-- Payment confirmations policies
CREATE POLICY "Schools can view own payment confirmations"
  ON payment_confirmations FOR SELECT
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Schools can manage own payment confirmations"
  ON payment_confirmations FOR ALL
  USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage all payment confirmations"
  ON payment_confirmations FOR ALL
  USING (is_platform_admin());

-- ============================================================================
-- PART 12: HELPER FUNCTIONS
-- ============================================================================

-- Function to get KYC status
CREATE OR REPLACE FUNCTION get_kyc_status(p_school_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'overall', (SELECT kyc_status FROM schools WHERE id = p_school_id),
    'registration', (SELECT status FROM school_registrations WHERE school_id = p_school_id),
    'business', (SELECT status FROM business_registrations WHERE school_id = p_school_id),
    'ownership', (SELECT status FROM school_ownership WHERE school_id = p_school_id),
    'head_teacher', (SELECT status FROM school_heads WHERE school_id = p_school_id),
    'address', (SELECT status FROM school_addresses WHERE school_id = p_school_id),
    'statistics', (SELECT status FROM school_statistics WHERE school_id = p_school_id)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if school is KYC verified
CREATE OR REPLACE FUNCTION is_kyc_verified(p_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM schools 
    WHERE id = p_school_id 
    AND kyc_status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending confirmations
CREATE OR REPLACE FUNCTION get_pending_confirmations(p_school_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'setup_fee', (
      SELECT jsonb_build_object(
        'has_pending', EXISTS (
          SELECT 1 FROM payment_confirmations 
          WHERE school_id = p_school_id 
          AND payment_type = 'setup_fee' 
          AND status = 'pending'
        ),
        'amount', (SELECT amount FROM payment_confirmations 
                   WHERE school_id = p_school_id AND payment_type = 'setup_fee')
      )
    ),
    'modules', (
      SELECT jsonb_build_object(
        'has_pending', EXISTS (
          SELECT 1 FROM payment_confirmations 
          WHERE school_id = p_school_id 
          AND payment_type = 'modules' 
          AND status = 'pending'
        ),
        'amount', (SELECT amount FROM payment_confirmations 
                   WHERE school_id = p_school_id AND payment_type = 'modules')
      )
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_kyc_status TO authenticated;
GRANT EXECUTE ON FUNCTION is_kyc_verified TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_confirmations TO authenticated;

-- ============================================================================
-- PART 13: STORAGE BUCKETS FOR DOCUMENTS
-- ============================================================================

-- Create storage buckets (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for kyc-documents bucket
CREATE POLICY "Schools can upload KYC documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents' AND
    auth.uid() IN (
      SELECT user_id FROM school_members 
      WHERE school_id IN (
        SELECT school_id FROM school_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Schools can view own KYC documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents' AND
    auth.uid() IN (
      SELECT user_id FROM school_members 
      WHERE school_id IN (
        SELECT school_id FROM school_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Platform admins can view all KYC documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents' AND
    is_platform_admin()
  );

-- ============================================================================
-- PART 14: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_school_registrations_school_id ON school_registrations(school_id);
CREATE INDEX IF NOT EXISTS idx_business_registrations_school_id ON business_registrations(school_id);
CREATE INDEX IF NOT EXISTS idx_school_ownership_school_id ON school_ownership(school_id);
CREATE INDEX IF NOT EXISTS idx_school_heads_school_id ON school_heads(school_id);
CREATE INDEX IF NOT EXISTS idx_school_addresses_school_id ON school_addresses(school_id);
CREATE INDEX IF NOT EXISTS idx_school_statistics_school_id ON school_statistics(school_id);
CREATE INDEX IF NOT EXISTS idx_school_facilities_school_id ON school_facilities(school_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verification_log_school_id ON kyc_verification_log(school_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_school_id ON payment_confirmations(school_id);

-- ============================================================================
-- PART 15: VERIFICATION
-- ============================================================================

SELECT 
  '✅ KYC Tables Created' as status,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_name IN (
  'school_registrations',
  'business_registrations',
  'school_ownership',
  'school_heads',
  'school_addresses',
  'school_statistics',
  'school_facilities',
  'kyc_verification_log',
  'payment_confirmations'
);

SELECT 
  '✅ Schools table enhanced' as status,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_name = 'schools' 
AND column_name IN ('kyc_status', 'school_type', 'education_level', 'logo_url');

SELECT 
  '✅ Helper functions created' as status,
  COUNT(*) as count
FROM pg_proc 
WHERE proname IN ('get_kyc_status', 'is_kyc_verified', 'get_pending_confirmations');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'KYC ONBOARDING SYSTEM - COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Schools table enhanced with KYC fields';
  RAISE NOTICE '✅ 9 KYC tables created';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Helper functions created';
  RAISE NOTICE '✅ Storage bucket configured';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '========================================';
END $$;