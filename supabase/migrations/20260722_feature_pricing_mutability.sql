-- ============================================================================
-- FEATURE PRICING MUTABILITY - GLOBAL PRICE CHANGES
-- Price changes enforced across ALL schools
-- ============================================================================

-- ============================================================================
-- 1. UPDATE MODULE CATALOG WITH PRICING FIELDS
-- ============================================================================

ALTER TABLE module_catalog 
ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2) DEFAULT 0;

ALTER TABLE module_catalog 
ADD COLUMN IF NOT EXISTS price_termly DECIMAL(10,2) DEFAULT 0;  -- 3 months

ALTER TABLE module_catalog 
ADD COLUMN IF NOT EXISTS price_annual DECIMAL(10,2) DEFAULT 0;   -- 12 months

ALTER TABLE module_catalog 
ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly'
CHECK (billing_frequency IN ('monthly', 'termly', 'annual'));

ALTER TABLE module_catalog 
ADD COLUMN IF NOT EXISTS is_price_editable BOOLEAN DEFAULT true;

ALTER TABLE module_catalog 
ADD COLUMN IF NOT EXISTS last_price_update_by UUID REFERENCES auth.users(id);

ALTER TABLE module_catalog 
ADD COLUMN IF NOT EXISTS last_price_update_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE module_catalog 
ADD COLUMN IF NOT EXISTS price_change_reason TEXT;

-- ============================================================================
-- 2. PRICE HISTORY (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_code TEXT NOT NULL REFERENCES module_catalog(code) ON DELETE CASCADE,
  field_changed TEXT CHECK (field_changed IN ('price_monthly', 'price_termly', 'price_annual', 'billing_frequency')),
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  notes TEXT,
  schools_affected INTEGER,  -- Number of schools using this feature
  additional_revenue_impact DECIMAL(10,2)  -- Estimated revenue change
);

CREATE INDEX IF NOT EXISTS idx_price_history_feature ON feature_price_history(feature_code);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON feature_price_history(changed_at DESC);

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Get feature price based on frequency
CREATE OR REPLACE FUNCTION get_feature_price(
  p_feature_code TEXT,
  p_frequency TEXT DEFAULT 'monthly'
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE p_frequency
    WHEN 'monthly' THEN (SELECT price_monthly FROM module_catalog WHERE code = p_feature_code)
    WHEN 'termly' THEN (SELECT price_termly FROM module_catalog WHERE code = p_feature_code)
    WHEN 'annual' THEN (SELECT price_annual FROM module_catalog WHERE code = p_feature_code)
    ELSE (SELECT price_monthly FROM module_catalog WHERE code = p_feature_code)
  END;
END;
$$ LANGUAGE plpgsql;

-- Get school total based on frequency
CREATE OR REPLACE FUNCTION get_school_total(
  p_school_id UUID,
  p_frequency TEXT DEFAULT 'monthly'
)
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(
    CASE p_frequency
      WHEN 'monthly' THEN mc.price_monthly
      WHEN 'termly' THEN mc.price_termly
      WHEN 'annual' THEN mc.price_annual
      ELSE mc.price_monthly
    END
  ), 0)
  INTO total
  FROM school_modules sm
  JOIN module_catalog mc ON mc.code = sm.feature_code
  WHERE sm.school_id = p_school_id
    AND sm.status = 'active';
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Get schools using a feature
CREATE OR REPLACE FUNCTION get_schools_using_feature(p_feature_code TEXT)
RETURNS TABLE (
  school_id UUID,
  school_name TEXT,
  current_price DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    mc.price_monthly
  FROM school_modules sm
  JOIN schools s ON s.id = sm.school_id
  JOIN module_catalog mc ON mc.code = sm.feature_code
  WHERE sm.feature_code = p_feature_code
    AND sm.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Calculate revenue impact of price change
CREATE OR REPLACE FUNCTION calculate_revenue_impact(
  p_feature_code TEXT,
  p_old_price DECIMAL,
  p_new_price DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  school_count INTEGER;
  price_diff DECIMAL;
BEGIN
  SELECT COUNT(*) INTO school_count
  FROM school_modules
  WHERE feature_code = p_feature_code
    AND status = 'active';
  
  price_diff := p_new_price - p_old_price;
  
  RETURN school_count * price_diff;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. TRIGGER TO AUTO-LOG PRICE CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION log_feature_price_change()
RETURNS TRIGGER AS $$
DECLARE
  schools_count INTEGER;
  revenue_impact DECIMAL;
BEGIN
  -- Log price_monthly changes
  IF OLD.price_monthly IS DISTINCT FROM NEW.price_monthly THEN
    -- Get schools affected
    SELECT COUNT(*) INTO schools_count
    FROM school_modules
    WHERE feature_code = NEW.code
      AND status = 'active';
    
    -- Calculate revenue impact
    revenue_impact := schools_count * (NEW.price_monthly - OLD.price_monthly);
    
    INSERT INTO feature_price_history (
      feature_code, field_changed, old_value, new_value, changed_by, changed_at, reason,
      schools_affected, additional_revenue_impact
    ) VALUES (
      NEW.code, 'price_monthly', 
      OLD.price_monthly::TEXT, 
      NEW.price_monthly::TEXT,
      auth.uid(),
      NOW(),
      NEW.price_change_reason,
      schools_count,
      revenue_impact
    );
  END IF;
  
  -- Log price_termly changes
  IF OLD.price_termly IS DISTINCT FROM NEW.price_termly THEN
    INSERT INTO feature_price_history (
      feature_code, field_changed, old_value, new_value, changed_by, changed_at, reason
    ) VALUES (
      NEW.code, 'price_termly',
      OLD.price_termly::TEXT,
      NEW.price_termly::TEXT,
      auth.uid(),
      NOW(),
      NEW.price_change_reason
    );
  END IF;
  
  -- Log price_annual changes
  IF OLD.price_annual IS DISTINCT FROM NEW.price_annual THEN
    INSERT INTO feature_price_history (
      feature_code, field_changed, old_value, new_value, changed_by, changed_at, reason
    ) VALUES (
      NEW.code, 'price_annual',
      OLD.price_annual::TEXT,
      NEW.price_annual::TEXT,
      auth.uid(),
      NOW(),
      NEW.price_change_reason
    );
  END IF;
  
  -- Log billing_frequency changes
  IF OLD.billing_frequency IS DISTINCT FROM NEW.billing_frequency THEN
    INSERT INTO feature_price_history (
      feature_code, field_changed, old_value, new_value, changed_by, changed_at, reason
    ) VALUES (
      NEW.code, 'billing_frequency',
      OLD.billing_frequency,
      NEW.billing_frequency,
      auth.uid(),
      NOW(),
      NEW.price_change_reason
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_feature_price_change_trigger
  BEFORE UPDATE ON module_catalog
  FOR EACH ROW
  EXECUTE FUNCTION log_feature_price_change();

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

ALTER TABLE feature_price_history ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all price history
CREATE POLICY "Platform admins view price history" ON feature_price_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE feature_price_history IS 'Audit trail for all feature price changes';
COMMENT ON COLUMN module_catalog.price_monthly IS 'Monthly price in K';
COMMENT ON COLUMN module_catalog.price_termly IS 'Termly price (3 months) in K';
COMMENT ON COLUMN module_catalog.price_annual IS 'Annual price (12 months) in K';
COMMENT ON COLUMN module_catalog.billing_frequency IS 'Default billing frequency: monthly, termly, or annual';