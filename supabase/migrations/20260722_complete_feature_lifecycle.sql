-- ============================================================================
-- COMPLETE FEATURE LIFECYCLE - MISSING FIELDS & FUNCTIONS
-- Extends existing lifecycle management with full lifecycle support
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING LIFECYCLE FIELDS TO SCHOOL_MODULES
-- ============================================================================

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS price_at_activation DECIMAL(10,2);

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly'
CHECK (billing_frequency IN ('monthly', 'termly', 'annual'));

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS next_billing_date DATE;

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id);

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS reactivation_count INTEGER DEFAULT 0;

ALTER TABLE school_modules 
ADD COLUMN IF NOT EXISTS total_paused_days INTEGER DEFAULT 0;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_school_modules_next_billing ON school_modules(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_school_modules_expires_at ON school_modules(expires_at);
CREATE INDEX IF NOT EXISTS idx_school_modules_activated_by ON school_modules(activated_by);

-- ============================================================================
-- 2. SCHOOL FEATURE LIFECYCLE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW school_feature_lifecycle AS
SELECT 
  sm.school_id,
  s.name as school_name,
  sm.feature_code,
  mc.name as feature_name,
  mc.category,
  sm.status,
  sm.price_at_activation,
  sm.billing_frequency,
  sm.activated_at,
  sm.expires_at,
  sm.grace_period_ends_at,
  sm.paused_at,
  sm.paused_reason,
  sm.reactivation_count,
  sm.next_billing_date,
  sm.total_paused_days,
  CASE 
    WHEN sm.status = 'active' AND sm.expires_at IS NOT NULL THEN 
      EXTRACT(DAY FROM (sm.expires_at - NOW()))::INTEGER
    WHEN sm.status = 'active' AND sm.grace_period_ends_at IS NOT NULL THEN 
      EXTRACT(DAY FROM (sm.grace_period_ends_at - NOW()))::INTEGER
    ELSE NULL
  END as days_remaining,
  -- Last billing record
  (SELECT status FROM feature_billing_history 
   WHERE school_id = sm.school_id 
   AND feature_code = sm.feature_code 
   ORDER BY billing_month DESC LIMIT 1) as last_billing_status,
  -- Total paid
  (SELECT COALESCE(SUM(amount), 0) FROM feature_billing_history 
   WHERE school_id = sm.school_id 
   AND feature_code = sm.feature_code 
   AND status = 'paid') as total_paid,
  -- Current price from catalog
  CASE sm.billing_frequency
    WHEN 'monthly' THEN mc.price_monthly
    WHEN 'termly' THEN mc.price_termly
    WHEN 'annual' THEN mc.price_annual
    ELSE mc.price_monthly
  END as current_price
FROM school_modules sm
JOIN schools s ON s.id = sm.school_id
JOIN module_catalog mc ON mc.code = sm.feature_code;

-- ============================================================================
-- 3. FEATURE ACTIVATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_feature(
  p_school_id UUID,
  p_feature_code TEXT,
  p_activated_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module_id UUID;
  v_price DECIMAL(10,2);
  v_frequency TEXT;
  v_next_billing DATE;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_result JSONB;
BEGIN
  -- Check if feature already exists
  SELECT id INTO v_module_id
  FROM school_modules
  WHERE school_id = p_school_id AND feature_code = p_feature_code;
  
  IF v_module_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Feature already exists for this school',
      'current_status', (SELECT status FROM school_modules WHERE id = v_module_id)
    );
  END IF;
  
  -- Get feature pricing
  SELECT 
    price_monthly, 
    billing_frequency
  INTO v_price, v_frequency
  FROM module_catalog
  WHERE code = p_feature_code;
  
  IF v_price IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Feature not found in catalog'
    );
  END IF;
  
  -- Calculate next billing date (first of next month)
  v_next_billing := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  
  -- Calculate expires_at (30 days from activation)
  v_expires_at := NOW() + INTERVAL '30 days';
  
  -- Insert school module
  INSERT INTO school_modules (
    school_id,
    feature_code,
    status,
    status_updated_at,
    price_at_activation,
    billing_frequency,
    next_billing_date,
    expires_at,
    activated_at,
    activated_by,
    added_at
  ) VALUES (
    p_school_id,
    p_feature_code,
    'active',
    NOW(),
    v_price,
    v_frequency,
    v_next_billing,
    v_expires_at,
    NOW(),
    p_activated_by,
    NOW()
  ) RETURNING id INTO v_module_id;
  
  -- Create initial billing record
  INSERT INTO feature_billing_history (
    school_id,
    feature_code,
    amount,
    billing_month,
    status
  ) VALUES (
    p_school_id,
    p_feature_code,
    v_price,
    DATE_TRUNC('month', CURRENT_DATE),
    'paid'
  );
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'module_id', v_module_id,
    'feature_code', p_feature_code,
    'status', 'active',
    'price', v_price,
    'billing_frequency', v_frequency,
    'next_billing_date', v_next_billing,
    'expires_at', v_expires_at
  );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 4. FEATURE PAUSE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION pause_feature(
  p_school_id UUID,
  p_feature_code TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module_id UUID;
  v_result JSONB;
BEGIN
  -- Get module ID
  SELECT id INTO v_module_id
  FROM school_modules
  WHERE school_id = p_school_id AND feature_code = p_feature_code;
  
  IF v_module_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Feature not found for this school'
    );
  END IF;
  
  -- Update module status
  UPDATE school_modules
  SET 
    status = 'paused',
    status_updated_at = NOW(),
    paused_at = NOW(),
    paused_reason = p_reason,
    grace_period_ends_at = NULL,
    reactivation_count = reactivation_count + 1
  WHERE id = v_module_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'module_id', v_module_id,
    'feature_code', p_feature_code,
    'status', 'paused',
    'paused_at', NOW(),
    'reason', p_reason
  );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 5. FEATURE REACTIVATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION reactivate_feature(
  p_school_id UUID,
  p_feature_code TEXT,
  p_activated_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module_id UUID;
  v_price DECIMAL(10,2);
  v_frequency TEXT;
  v_next_billing DATE;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_result JSONB;
BEGIN
  -- Get module ID
  SELECT id INTO v_module_id
  FROM school_modules
  WHERE school_id = p_school_id AND feature_code = p_feature_code;
  
  IF v_module_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Feature not found for this school'
    );
  END IF;
  
  -- Get current pricing
  SELECT 
    price_monthly, 
    billing_frequency
  INTO v_price, v_frequency
  FROM module_catalog
  WHERE code = p_feature_code;
  
  -- Calculate next billing date (first of next month)
  v_next_billing := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  
  -- Calculate expires_at (30 days from reactivation)
  v_expires_at := NOW() + INTERVAL '30 days';
  
  -- Calculate total paused days
  UPDATE school_modules
  SET total_paused_days = total_paused_days + 
    EXTRACT(DAY FROM (NOW() - COALESCE(paused_at, NOW())))
  WHERE id = v_module_id;
  
  -- Update module status
  UPDATE school_modules
  SET 
    status = 'active',
    status_updated_at = NOW(),
    paused_at = NULL,
    paused_reason = NULL,
    grace_period_ends_at = NULL,
    price_at_activation = v_price,
    billing_frequency = v_frequency,
    next_billing_date = v_next_billing,
    expires_at = v_expires_at,
    activated_at = NOW(),
    activated_by = p_activated_by,
    reactivation_count = reactivation_count + 1
  WHERE id = v_module_id;
  
  -- Create billing record for current month
  INSERT INTO feature_billing_history (
    school_id,
    feature_code,
    amount,
    billing_month,
    status
  ) VALUES (
    p_school_id,
    p_feature_code,
    v_price,
    DATE_TRUNC('month', CURRENT_DATE),
    'paid'
  );
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'module_id', v_module_id,
    'feature_code', p_feature_code,
    'status', 'active',
    'price', v_price,
    'next_billing_date', v_next_billing,
    'expires_at', v_expires_at,
    'reactivation_count', (SELECT reactivation_count FROM school_modules WHERE id = v_module_id)
  );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 6. FEATURE REMOVAL FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION remove_feature(
  p_school_id UUID,
  p_feature_code TEXT,
  p_effective_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module_id UUID;
  v_effective DATE;
  v_result JSONB;
BEGIN
  -- Get module ID
  SELECT id INTO v_module_id
  FROM school_modules
  WHERE school_id = p_school_id AND feature_code = p_feature_code;
  
  IF v_module_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Feature not found for this school'
    );
  END IF;
  
  -- Set effective date to next billing cycle if not provided
  IF p_effective_date IS NULL THEN
    v_effective := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  ELSE
    v_effective := p_effective_date;
  END IF;
  
  -- Mark for removal
  UPDATE school_modules
  SET 
    removal_requested_at = NOW(),
    removal_effective_date = v_effective
  WHERE id = v_module_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'module_id', v_module_id,
    'feature_code', p_feature_code,
    'status', 'removal_pending',
    'removal_requested_at', NOW(),
    'removal_effective_date', v_effective
  );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 7. MONTHLY INVOICE GENERATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_monthly_invoices(p_billing_month DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_billing_month DATE;
  v_invoice_count INTEGER DEFAULT 0;
  v_total_amount DECIMAL(10,2) DEFAULT 0;
  v_school_id UUID;
  v_feature_code TEXT;
  v_amount DECIMAL(10,2);
  v_billing_id UUID;
BEGIN
  -- Default to first day of current month
  IF p_billing_month IS NULL THEN
    v_billing_month := DATE_TRUNC('month', CURRENT_DATE);
  ELSE
    v_billing_month := DATE_TRUNC('month', p_billing_month);
  END IF;
  
  -- Loop through all active features
  FOR v_school_id, v_feature_code, v_amount IN
    SELECT 
      sm.school_id,
      sm.feature_code,
      CASE sm.billing_frequency
        WHEN 'monthly' THEN mc.price_monthly
        WHEN 'termly' THEN mc.price_termly
        WHEN 'annual' THEN mc.price_annual
        ELSE mc.price_monthly
      END
    FROM school_modules sm
    JOIN module_catalog mc ON mc.code = sm.feature_code
    WHERE sm.status = 'active'
      AND sm.next_billing_date <= v_billing_month
  LOOP
    -- Check if billing record already exists
    SELECT id INTO v_billing_id
    FROM feature_billing_history
    WHERE school_id = v_school_id
      AND feature_code = v_feature_code
      AND billing_month = v_billing_month;
    
    -- Insert if not exists
    IF v_billing_id IS NULL THEN
      INSERT INTO feature_billing_history (
        school_id,
        feature_code,
        amount,
        billing_month,
        status
      ) VALUES (
        v_school_id,
        v_feature_code,
        v_amount,
        v_billing_month,
        'pending'
      );
      
      v_invoice_count := v_invoice_count + 1;
      v_total_amount := v_total_amount + v_amount;
      
      -- Update next billing date
      UPDATE school_modules
      SET next_billing_date = v_billing_month + INTERVAL '1 month'
      WHERE school_id = v_school_id AND feature_code = v_feature_code;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'billing_month', v_billing_month,
    'invoices_generated', v_invoice_count,
    'total_amount', v_total_amount
  );
END;
$$;

-- ============================================================================
-- 8. GRACE PERIOD CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_grace_periods()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module_id UUID;
  v_paused_count INTEGER DEFAULT 0;
BEGIN
  -- Find features in grace period that have expired
  FOR v_module_id IN
    SELECT id
    FROM school_modules
    WHERE status = 'active'
      AND grace_period_ends_at IS NOT NULL
      AND grace_period_ends_at < NOW()
  LOOP
    -- Pause the feature
    UPDATE school_modules
    SET 
      status = 'paused',
      status_updated_at = NOW(),
      paused_at = NOW(),
      paused_reason = 'Payment overdue - grace period expired',
      grace_period_ends_at = NULL,
      reactivation_count = reactivation_count + 1
    WHERE id = v_module_id;
    
    v_paused_count := v_paused_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'features_paused', v_paused_count,
    'checked_at', NOW()
  );
END;
$$;

-- ============================================================================
-- 9. PAYMENT REMINDER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION send_payment_reminders(p_days_before INTEGER DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reminder_count INTEGER DEFAULT 0;
  v_school_id UUID;
  v_feature_code TEXT;
  v_next_billing DATE;
  v_days_until INTEGER;
BEGIN
  -- Get billing settings
  DECLARE reminder_days INTEGER[];
  BEGIN
    SELECT COALESCE(reminder_days, ARRAY[30, 15, 7, 3, 1])
    INTO reminder_days
    FROM billing_settings
    WHERE school_id IS NULL;
  END;
  
  -- If specific days provided, use that
  IF p_days_before IS NOT NULL THEN
    reminder_days := ARRAY[p_days_before];
  END IF;
  
  -- Loop through reminder days
  FOREACH v_days_before IN ARRAY reminder_days
  LOOP
    -- Find features with billing due in X days
    FOR v_school_id, v_feature_code, v_next_billing IN
      SELECT 
        sm.school_id,
        sm.feature_code,
        sm.next_billing_date
      FROM school_modules sm
      WHERE sm.status = 'active'
        AND sm.next_billing_date = CURRENT_DATE + v_days_before
    LOOP
      -- Insert notification (would be sent via Edge Function)
      INSERT INTO notifications (
        school_id,
        user_id,
        type,
        title,
        message,
        channel,
        status,
        data
      ) VALUES (
        v_school_id,
        (SELECT user_id FROM school_members WHERE school_id = v_school_id AND role_id = (SELECT id FROM roles WHERE key = 'school_admin') LIMIT 1),
        'fee_reminder',
        'Payment Reminder',
        'Payment for feature ' || v_feature_code || ' is due in ' || v_days_before || ' days',
        'email',
        'pending',
        jsonb_build_object(
          'feature_code', v_feature_code,
          'days_until_due', v_days_before,
          'due_date', v_next_billing
        )
      );
      
      v_reminder_count := v_reminder_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'reminders_sent', v_reminder_count,
    'checked_at', NOW()
  );
END;
$$;

-- ============================================================================
-- 10. EXECUTE FEATURE REMOVALS
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_feature_removals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_removal_count INTEGER DEFAULT 0;
  v_module_id UUID;
BEGIN
  -- Find features marked for removal where effective date has passed
  FOR v_module_id IN
    SELECT id
    FROM school_modules
    WHERE removal_requested_at IS NOT NULL
      AND removal_effective_date <= CURRENT_DATE
      AND status != 'removed'
  LOOP
    -- Remove the feature
    UPDATE school_modules
    SET 
      status = 'removed',
      status_updated_at = NOW(),
      removal_requested_at = NULL,
      removal_effective_date = NULL
    WHERE id = v_module_id;
    
    v_removal_count := v_removal_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'features_removed', v_removal_count,
    'checked_at', NOW()
  );
END;
$$;

-- ============================================================================
-- 11. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION activate_feature IS 'Activates a feature for a school with billing setup';
COMMENT ON FUNCTION pause_feature IS 'Pauses a feature for a school with reason tracking';
COMMENT ON FUNCTION reactivate_feature IS 'Reactivates a paused feature for a school';
COMMENT ON FUNCTION remove_feature IS 'Marks a feature for removal on effective date';
COMMENT ON FUNCTION generate_monthly_invoices IS 'Generates billing records for all active features';
COMMENT ON FUNCTION check_grace_periods IS 'Pauses features that have exceeded grace period';
COMMENT ON FUNCTION send_payment_reminders IS 'Sends payment reminders based on billing settings';
COMMENT ON FUNCTION execute_feature_removals IS 'Executes scheduled feature removals';
COMMENT ON VIEW school_feature_lifecycle IS 'Complete view of feature lifecycle per school';
