-- ============================================================================
-- MODULE 10: BILLING & SUBSCRIPTION CONTROL
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SUBSCRIPTION PLANS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  features JSONB DEFAULT '[]'::jsonb, -- Array of feature codes included in plan
  max_students INTEGER,
  max_staff INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_status ON subscription_plans(status);

-- ----------------------------------------------------------------------------
-- 2. FEATURES/MODULES CATALOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_core BOOLEAN DEFAULT false, -- Core features are always enabled
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_features_code ON features(code);
CREATE INDEX idx_features_category ON features(category);

-- Insert default features
INSERT INTO features (name, code, category, description, is_core) VALUES
  ('Student Management', 'students', 'Academic', 'Manage student records and enrollment', true),
  ('Staff Management', 'staff', 'Academic', 'Manage teaching and non-teaching staff', true),
  ('Class Management', 'classes', 'Academic', 'Manage classes and grade levels', true),
  ('Attendance', 'attendance', 'Academic', 'Track student attendance', false),
  ('Exams & Results', 'exams', 'Academic', 'Manage examinations and results', false),
  ('Finance', 'finance', 'Financial', 'Manage fees, payments, and expenses', false),
  ('Parent Portal', 'parents', 'Communication', 'Parent access to student information', false),
  ('SMS Notifications', 'sms', 'Communication', 'Send SMS alerts to parents', false),
  ('Email Notifications', 'email', 'Communication', 'Send email notifications', false),
  ('Analytics', 'analytics', 'Reports', 'Advanced analytics and reporting', false),
  ('Payroll', 'payroll', 'Financial', 'Manage staff salaries and payroll', false),
  ('Admissions', 'admissions', 'Academic', 'Manage student admissions process', false)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. TENANT SUBSCRIPTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'pending_payment', 'active', 'expired', 'suspended')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);

-- ----------------------------------------------------------------------------
-- 4. SUBSCRIPTION PAYMENTS (Manual Payment Proof)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES tenant_subscriptions(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL, -- bank_transfer, airtel_money, mtn_money, cash
  reference TEXT NOT NULL,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_payments_tenant_id ON subscription_payments(tenant_id);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(status);

-- ----------------------------------------------------------------------------
-- 5. TENANT FEATURES (Module Access Control)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  activated_by UUID REFERENCES profiles(id),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, feature_id)
);

CREATE INDEX idx_tenant_features_tenant_id ON tenant_features(tenant_id);
CREATE INDEX idx_tenant_features_feature_id ON tenant_features(feature_id);

-- ----------------------------------------------------------------------------
-- 6. SUBSCRIPTION ALERTS (For monitoring)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trial_expiring', 'subscription_expiring', 'subscription_expired', 'payment_pending')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_alerts_tenant_id ON subscription_alerts(tenant_id);
CREATE INDEX idx_subscription_alerts_status ON subscription_alerts(status);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_alerts ENABLE ROW LEVEL SECURITY;

-- Subscription plans: Public read, platform admin write
CREATE POLICY "Public can view subscription plans" ON subscription_plans
  FOR SELECT USING (true);

CREATE POLICY "Platform admin can manage subscription plans" ON subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
      AND profiles.user_type = 'STAFF'
    )
  );

-- Features: Public read, platform admin write
CREATE POLICY "Public can view features" ON features
  FOR SELECT USING (true);

CREATE POLICY "Platform admin can manage features" ON features
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
      AND profiles.user_type = 'STAFF'
    )
  );

-- Tenant subscriptions: Tenant can view own, platform admin can manage all
CREATE POLICY "Tenants can view own subscription" ON tenant_subscriptions
  FOR SELECT USING (
    tenant_id IN (
      SELECT school_id FROM school_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admin can manage all subscriptions" ON tenant_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
      AND profiles.user_type = 'STAFF'
    )
  );

-- Subscription payments: Tenant can view/submit own, platform admin can manage all
CREATE POLICY "Tenants can view own payments" ON subscription_payments
  FOR SELECT USING (
    tenant_id IN (
      SELECT school_id FROM school_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can submit payments" ON subscription_payments
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT school_id FROM school_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admin can manage all payments" ON subscription_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
      AND profiles.user_type = 'STAFF'
    )
  );

-- Tenant features: Tenant can view own, platform admin can manage all
CREATE POLICY "Tenants can view own features" ON tenant_features
  FOR SELECT USING (
    tenant_id IN (
      SELECT school_id FROM school_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admin can manage all features" ON tenant_features
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
      AND profiles.user_type = 'STAFF'
    )
  );

-- Subscription alerts: Platform admin can view all
CREATE POLICY "Platform admin can view all alerts" ON subscription_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
      AND profiles.user_type = 'STAFF'
    )
  );

CREATE POLICY "System can create alerts" ON subscription_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Platform admin can update alerts" ON subscription_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
      AND profiles.user_type = 'STAFF'
    )
  );

-- ----------------------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------------------

-- Check if tenant has access to a feature
CREATE OR REPLACE FUNCTION check_tenant_feature_access(
  p_tenant_id UUID,
  p_feature_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Core features are always enabled
  IF EXISTS (
    SELECT 1 FROM features
    WHERE code = p_feature_code
    AND is_core = true
    AND status = 'active'
  ) THEN
    RETURN true;
  END IF;

  -- Check if feature is enabled for tenant
  RETURN EXISTS (
    SELECT 1
    FROM tenant_features tf
    JOIN features f ON f.id = tf.feature_id
    WHERE tf.tenant_id = p_tenant_id
    AND f.code = p_feature_code
    AND tf.enabled = true
    AND f.status = 'active'
  );
END;
$$;

-- Get tenant's enabled features
CREATE OR REPLACE FUNCTION get_tenant_features(p_tenant_id UUID)
RETURNS TABLE (
  feature_id UUID,
  feature_name TEXT,
  feature_code TEXT,
  category TEXT,
  enabled BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.code,
    f.category,
    COALESCE(tf.enabled, false)
  FROM features f
  LEFT JOIN tenant_features tf ON tf.feature_id = f.id AND tf.tenant_id = p_tenant_id
  WHERE f.status = 'active'
  AND (f.is_core = true OR tf.id IS NOT NULL)
  ORDER BY f.category, f.name;
END;
$$;

-- Enable feature for tenant
CREATE OR REPLACE FUNCTION enable_tenant_feature(
  p_tenant_id UUID,
  p_feature_id UUID,
  p_activated_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO tenant_features (tenant_id, feature_id, enabled, activated_by, activated_at)
  VALUES (p_tenant_id, p_feature_id, true, p_activated_by, NOW())
  ON CONFLICT (tenant_id, feature_id)
  DO UPDATE SET
    enabled = true,
    activated_by = p_activated_by,
    activated_at = NOW(),
    updated_at = NOW();
END;
$$;

-- Disable feature for tenant
CREATE OR REPLACE FUNCTION disable_tenant_feature(
  p_tenant_id UUID,
  p_feature_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tenant_features
  SET enabled = false, updated_at = NOW()
  WHERE tenant_id = p_tenant_id
  AND feature_id = p_feature_id;
END;
$$;

-- Approve subscription payment
CREATE OR REPLACE FUNCTION approve_subscription_payment(
  p_payment_id UUID,
  p_verified_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment subscription_payments%ROWTYPE;
  v_subscription tenant_subscriptions%ROWTYPE;
BEGIN
  -- Get payment details
  SELECT * INTO v_payment FROM subscription_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  -- Update payment status
  UPDATE subscription_payments
  SET status = 'verified', verified_by = p_verified_by, verified_at = NOW(), updated_at = NOW()
  WHERE id = p_payment_id;

  -- Get or create subscription
  SELECT * INTO v_subscription FROM tenant_subscriptions WHERE tenant_id = v_payment.tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  -- Update subscription status
  UPDATE tenant_subscriptions
  SET status = 'active',
      start_date = NOW(),
      expiry_date = NOW() + INTERVAL '1 month',
      approved_by = p_verified_by,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = v_subscription.id;
END;
$$;

-- Reject subscription payment
CREATE OR REPLACE FUNCTION reject_subscription_payment(
  p_payment_id UUID,
  p_rejection_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE subscription_payments
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      updated_at = NOW()
  WHERE id = p_payment_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_subscription_plans_updated_at();

CREATE OR REPLACE FUNCTION update_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_features_updated_at
  BEFORE UPDATE ON features
  FOR EACH ROW EXECUTE FUNCTION update_features_updated_at();

CREATE OR REPLACE FUNCTION update_tenant_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_tenant_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION update_subscription_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW EXECUTE FUNCTION update_subscription_payments_updated_at();

CREATE OR REPLACE FUNCTION update_tenant_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_features_updated_at
  BEFORE UPDATE ON tenant_features
  FOR EACH ROW EXECUTE FUNCTION update_tenant_features_updated_at();

CREATE OR REPLACE FUNCTION update_subscription_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_alerts_updated_at
  BEFORE UPDATE ON subscription_alerts
  FOR EACH ROW EXECUTE FUNCTION update_subscription_alerts_updated_at();

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------

COMMENT ON TABLE subscription_plans IS 'Available subscription plans for schools';
COMMENT ON TABLE features IS 'Available features/modules that can be enabled';
COMMENT ON TABLE tenant_subscriptions IS 'School subscription records';
COMMENT ON TABLE subscription_payments IS 'Manual payment submissions from schools';
COMMENT ON TABLE tenant_features IS 'Feature access control per school';
COMMENT ON TABLE subscription_alerts IS 'Subscription-related alerts and notifications';