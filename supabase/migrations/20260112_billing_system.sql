-- Billing System Migration
-- Adds payment verification, invoices, and billing columns

-- ============================================================================
-- 1. UPDATE SCHOOLS TABLE WITH BILLING COLUMNS
-- ============================================================================

ALTER TABLE schools 
  ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_fee_paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_payment_id UUID,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Add constraints
ALTER TABLE schools ADD CONSTRAINT valid_billing_status 
  CHECK (billing_status IN ('pending', 'active', 'suspended', 'cancelled'));

ALTER TABLE schools ADD CONSTRAINT valid_subscription_status 
  CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'cancelled'));

-- ============================================================================
-- 2. PAYMENT VERIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Payment details
  transaction_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_time TIME NOT NULL,
  mobile_network TEXT NOT NULL CHECK (mobile_network IN ('mtn', 'airtel', 'zamtel')),
  sender_phone TEXT,
  proof_of_payment_url TEXT NOT NULL,
  
  -- Billing breakdown
  payment_type TEXT NOT NULL CHECK (payment_type IN ('onboarding', 'monthly', 'both')),
  onboarding_fee DECIMAL(10, 2),
  module_fees JSONB,
  modules_selected UUID[],
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  
  -- Audit
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_verifications_school ON payment_verifications(school_id);
CREATE INDEX idx_payment_verifications_status ON payment_verifications(status);
CREATE INDEX idx_payment_verifications_created ON payment_verifications(created_at DESC);

-- ============================================================================
-- 3. INVOICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  
  -- Billing period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Breakdown
  onboarding_fee DECIMAL(10, 2) DEFAULT 0,
  module_fees JSONB,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  
  -- Payment tracking
  payment_id UUID REFERENCES payment_verifications(id),
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_school ON invoices(school_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- ============================================================================
-- 4. FEATURE ACCESS LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES feature_catalog(id),
  action TEXT NOT NULL CHECK (action IN ('activated', 'deactivated', 'suspended')),
  reason TEXT,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_access_logs_school ON feature_access_logs(school_id);
CREATE INDEX idx_feature_access_logs_created ON feature_access_logs(created_at DESC);

-- ============================================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_payment_verifications_updated_at
  BEFORE UPDATE ON payment_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Calculate total monthly cost for a school
CREATE OR REPLACE FUNCTION calculate_school_monthly_cost(p_school_id UUID)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(fp.monthly_price), 0)
  INTO total
  FROM school_feature_flags sff
  JOIN feature_catalog fc ON sff.feature_id = fc.id
  JOIN feature_pricing fp ON fp.feature_id = fc.id
  WHERE sff.school_id = p_school_id
    AND sff.status = 'active'
    AND fp.is_active = true;
  
  RETURN total;
END;
$$;

-- Check if school has access to a feature
CREATE OR REPLACE FUNCTION check_feature_access(
  p_school_id UUID,
  p_feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECL
  has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM school_feature_flags sff
    JOIN feature_catalog fc ON sff.feature_id = fc.id
    WHERE sff.school_id = p_school_id
      AND fc.key = p_feature_key
      AND sff.status = 'active'
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- Payment verifications: Schools can view their own, admins can view all
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can view own payment verifications"
  ON payment_verifications FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Schools can insert own payment verifications"
  ON payment_verifications FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Invoices: Schools can view their own, admins can view all
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can view own invoices"
  ON invoices FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Feature access logs: Schools can view their own, admins can view all
ALTER TABLE feature_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can view own feature access logs"
  ON feature_access_logs FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON payment_verifications TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON feature_access_logs TO authenticated;

-- ============================================================================
-- 9. COMMENTS
-- ============================================================================

COMMENT ON TABLE payment_verifications IS 'Payment verification records for onboarding and monthly fees';
COMMENT ON TABLE invoices IS 'Generated invoices for schools';
COMMENT ON TABLE feature_access_logs IS 'Audit trail for feature access changes';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================