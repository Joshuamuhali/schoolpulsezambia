-- ============================================================================
-- USER BLOCKING & PAYMENT SYSTEM UPDATE
-- ============================================================================

-- 1. Add payment type to school_payments
ALTER TABLE school_payments 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'subscription' 
CHECK (payment_type IN ('subscription', 'setup_fee', 'reactivation'));

-- 2. Add payment tracking fields to schools
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS setup_fee_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS setup_fee_payment_id UUID REFERENCES school_payments(id),
ADD COLUMN IF NOT EXISTS setup_fee_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS modules_payment_id UUID REFERENCES school_payments(id),
ADD COLUMN IF NOT EXISTS modules_paid_at TIMESTAMP WITH TIME ZONE;

-- 3. Create payment confirmations table
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

-- 4. Function: get_pending_confirmations
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
                   WHERE school_id = p_school_id AND payment_type = 'setup_fee' LIMIT 1)
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
                   WHERE school_id = p_school_id AND payment_type = 'modules' LIMIT 1)
      )
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Functions for Blocking
CREATE OR REPLACE FUNCTION is_user_blocked(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND is_blocked = true
  ) OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p_user_id 
    AND banned_until > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_block_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_is_blocked BOOLEAN;
  v_reason TEXT;
  v_blocked_at TIMESTAMPTZ;
  v_blocked_by UUID;
BEGIN
  SELECT 
    is_blocked,
    blocked_reason,
    blocked_at,
    blocked_by
  INTO 
    v_is_blocked,
    v_reason,
    v_blocked_at,
    v_blocked_by
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'is_blocked', COALESCE(v_is_blocked, false),
    'reason', v_reason,
    'blocked_at', v_blocked_at,
    'blocked_by', v_blocked_by
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure delete user function
CREATE OR REPLACE FUNCTION delete_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Nullify references in school_payments
  UPDATE school_payments SET reviewed_by = NULL WHERE reviewed_by = p_user_id;
  -- Nullify references in profiles (blocked_by, unblocked_by)
  UPDATE profiles SET blocked_by = NULL WHERE blocked_by = p_user_id;
  UPDATE profiles SET unblocked_by = NULL WHERE unblocked_by = p_user_id;
  -- Nullify references in blocked_users_log
  UPDATE blocked_users_log SET admin_id = NULL WHERE admin_id = p_user_id;
  -- Delete from school_members
  DELETE FROM school_members WHERE user_id = p_user_id;
  -- Delete from profiles
  DELETE FROM profiles WHERE id = p_user_id;
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefined Approve Payment Function (Phase 5 Admin Approval Actions)
CREATE OR REPLACE FUNCTION approve_payment(
  p_payment_id UUID,
  p_reviewed_by UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment school_payments%ROWTYPE;
  v_school_id UUID;
  v_module_codes TEXT[];
  v_code TEXT;
BEGIN
  -- Get payment details
  SELECT * INTO v_payment FROM school_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  
  v_school_id := v_payment.school_id;

  -- 1. Update school_payments status to 'verified'
  UPDATE school_payments
  SET status = 'verified',
      reviewed_by = p_reviewed_by,
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_payment_id;

  -- 2. Update schools state, setup fee tracking, and onboarding steps
  UPDATE schools
  SET state = 'active',
      access_state = 'active',
      subscription_status = 'active',
      onboarding_step = 5,
      onboarding_status = 'active',
      setup_fee_paid = TRUE,
      setup_fee_payment_id = p_payment_id,
      setup_fee_paid_at = NOW(),
      updated_at = NOW()
  WHERE id = v_school_id;

  -- 3. Update payment confirmations helper table
  INSERT INTO payment_confirmations (school_id, payment_type, payment_id, amount, status, updated_at)
  VALUES (v_school_id, 'setup_fee', p_payment_id, v_payment.amount, 'verified', NOW())
  ON CONFLICT (school_id, payment_type) 
  DO UPDATE SET status = 'verified', payment_id = p_payment_id, amount = v_payment.amount, updated_at = NOW();

  -- 4. Get selected module codes from school_module_selections
  SELECT module_codes INTO v_module_codes 
  FROM school_module_selections 
  WHERE school_id = v_school_id;

  -- 5. Activate all selected modules in school_modules & feature flags
  IF v_module_codes IS NOT NULL THEN
    FOREACH v_code IN ARRAY v_module_codes LOOP
      INSERT INTO school_modules (school_id, module_code, status, enabled, activated_at, activated_by, created_at, updated_at)
      VALUES (v_school_id, v_code, 'active', true, NOW(), p_reviewed_by, NOW(), NOW())
      ON CONFLICT (school_id, module_code) 
      DO UPDATE SET status = 'active', enabled = true, activated_at = NOW(), activated_by = p_reviewed_by, updated_at = NOW();

      UPDATE school_feature_flags
      SET status = 'active',
          updated_at = NOW()
      WHERE school_id = v_school_id
        AND feature_id IN (SELECT id FROM feature_catalog WHERE key = v_code OR code = v_code);
    END LOOP;
  END IF;

  -- 6. Create notification for the school admin
  INSERT INTO notifications (user_id, type, title, message, metadata)
  SELECT 
    p.id,
    'payment_approved',
    'Payment Approved - Access Granted',
    'Your onboarding payment has been approved and your selected modules are now active.',
    jsonb_build_object('payment_id', p_payment_id, 'school_id', v_school_id)
  FROM profiles p
  WHERE p.school_id = v_school_id
  LIMIT 1;

  -- 7. Log audit log
  INSERT INTO audit_logs (action, table_name, record_id, actor_id, school_id, after_state)
  VALUES (
    'approve_payment',
    'school_payments',
    p_payment_id,
    p_reviewed_by,
    v_school_id,
    jsonb_build_object('status', 'verified', 'school_activated', true)
  );
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION is_user_blocked TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_block_status TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_confirmations TO authenticated;
GRANT EXECUTE ON FUNCTION approve_payment TO authenticated;
GRANT ALL ON payment_confirmations TO authenticated;
