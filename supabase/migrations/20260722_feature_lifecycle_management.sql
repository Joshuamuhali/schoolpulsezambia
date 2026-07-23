-- ============================================================================
-- FEATURE LIFECYCLE MANAGEMENT SYSTEM
-- Complete feature state tracking, billing, and mutability
-- ============================================================================

-- ============================================================================
-- 1. ADD FEATURE STATUS TRACKING TO SCHOOL_MODULES
-- ============================================================================

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'paused', 'expired', 'pending', 'removed'));

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS paused_reason TEXT;

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS removal_requested_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS removal_effective_date DATE;

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_school_modules_status ON school_modules(status);
CREATE INDEX IF NOT EXISTS idx_school_modules_school_status ON school_modules(school_id, status);

-- ============================================================================
-- 2. FEATURE BILLING HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_billing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL REFERENCES module_catalog(code) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_id UUID REFERENCES school_payments(id),
  billing_month DATE NOT NULL,  -- First day of month
  status TEXT CHECK (status IN ('paid', 'pending', 'failed', 'refunded', 'paused', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, feature_code, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_billing_history_school_month ON feature_billing_history(school_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON feature_billing_history(status);

-- ============================================================================
-- 3. FEATURE CHANGE REQUESTS (Add/Remove)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL REFERENCES module_catalog(code) ON DELETE CASCADE,
  change_type TEXT CHECK (change_type IN ('add', 'remove')),
  status TEXT CHECK (status IN ('pending', 'approved', 'executed', 'rejected')) DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_school ON feature_change_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_change_requests(status);

-- ============================================================================
-- 4. BILLING SETTINGS (Per School or Global)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  grace_period_days INTEGER DEFAULT 7,
  pause_after_days INTEGER DEFAULT 7,
  reminder_days INTEGER[] DEFAULT ARRAY[30, 15, 7, 3, 1],
  billing_day INTEGER DEFAULT 1,
  auto_pause_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- Insert default global settings (school_id = NULL means global default)
INSERT INTO billing_settings (school_id, grace_period_days, pause_after_days, reminder_days, billing_day, auto_pause_enabled)
VALUES (NULL, 7, 7, ARRAY[30, 15, 7, 3, 1], 1, true)
ON CONFLICT (school_id) DO NOTHING;

-- ============================================================================
-- 5. UPDATE TRIGGER FOR school_modules
-- ============================================================================

CREATE OR REPLACE FUNCTION update_school_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_school_modules_updated_at
  BEFORE UPDATE ON school_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_school_modules_updated_at();

-- ============================================================================
-- 6. UPDATE TRIGGER FOR feature_billing_history
-- ============================================================================

CREATE OR REPLACE FUNCTION update_billing_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_history_updated_at
  BEFORE UPDATE ON feature_billing_history
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_history_updated_at();

-- ============================================================================
-- 7. UPDATE TRIGGER FOR feature_change_requests
-- ============================================================================

CREATE OR REPLACE FUNCTION update_feature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON feature_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_requests_updated_at();

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Get school features with status
CREATE OR REPLACE FUNCTION get_school_features(p_school_id UUID)
RETURNS TABLE (
  feature_code TEXT,
  feature_name TEXT,
  status TEXT,
  monthly_price DECIMAL,
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  grace_period_ends_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.feature_code,
    mc.name as feature_name,
    sm.status,
    mc.monthly_price,
    sm.added_at as activated_at,
    NULL as expires_at,
    sm.grace_period_ends_at
  FROM school_modules sm
  JOIN module_catalog mc ON mc.code = sm.feature_code
  WHERE sm.school_id = p_school_id
  ORDER BY mc.category, mc.name;
END;
$$ LANGUAGE plpgsql;

-- Calculate monthly total for school
CREATE OR REPLACE FUNCTION calculate_school_monthly_total(p_school_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(mc.monthly_price), 0)
  INTO total
  FROM school_modules sm
  JOIN module_catalog mc ON mc.code = sm.feature_code
  WHERE sm.school_id = p_school_id
    AND sm.status = 'active';
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE feature_billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;

-- Schools can view their own billing history
CREATE POLICY "Schools can view own billing history" ON feature_billing_history
  FOR SELECT USING (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- Schools can create change requests
CREATE POLICY "Schools can create change requests" ON feature_change_requests
  FOR INSERT WITH CHECK (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

-- Schools can view their own change requests
CREATE POLICY "Schools can view own change requests" ON feature_change_requests
  FOR SELECT USING (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- Platform admins can manage billing settings
CREATE POLICY "Platform admins can manage billing settings" ON billing_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE feature_billing_history IS 'Tracks monthly billing for each school feature';
COMMENT ON TABLE feature_change_requests IS 'Tracks requests to add/remove features';
COMMENT ON TABLE billing_settings IS 'Billing configuration per school or global defaults';
COMMENT ON COLUMN school_modules.status IS 'Feature status: active, paused, expired, pending, removed';
COMMENT ON COLUMN school_modules.grace_period_ends_at IS 'Timestamp when grace period ends and feature will be paused';