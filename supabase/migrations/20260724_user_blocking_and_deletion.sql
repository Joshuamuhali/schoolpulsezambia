-- ============================================================================
-- USER BLOCKING & DELETION SYSTEM - DATABASE SETUP
-- ============================================================================

-- 1. Add blocking fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS unblocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unblocked_by UUID REFERENCES auth.users(id);

-- 2. Add payment type to school_payments
ALTER TABLE school_payments 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'subscription' 
CHECK (payment_type IN ('subscription', 'setup_fee', 'reactivation'));

-- 3. Create blocked users log
DROP TABLE IF EXISTS blocked_users_log CASCADE;
CREATE TABLE blocked_users_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT CHECK (action IN ('block', 'unblock')),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create setup fee config
DROP TABLE IF EXISTS setup_fee_config CASCADE;
CREATE TABLE setup_fee_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(10,2) DEFAULT 3500.00,
  currency TEXT DEFAULT 'ZMW',
  is_active BOOLEAN DEFAULT TRUE,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO setup_fee_config (amount, currency, is_active)
VALUES (3500.00, 'ZMW', true)
ON CONFLICT (id) DO NOTHING;

-- Redefine profiles_view to include blocking and profile-level activity columns
CREATE OR REPLACE VIEW profiles_view AS
SELECT 
  p.id,
  p.school_id,
  p.full_name,
  p.email,
  p.avatar_url,
  p.phone,
  p.created_at,
  p.updated_at,
  p.is_blocked,
  p.blocked_reason,
  p.blocked_at,
  p.is_active,
  s.name AS school_name,
  sm.role AS user_role,
  sm.is_active AS is_active_member
FROM profiles p
LEFT JOIN schools s ON p.school_id = s.id
LEFT JOIN school_members sm ON sm.user_id = p.id AND sm.school_id = p.school_id;

GRANT SELECT ON profiles_view TO authenticated;

-- 5. Functions
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

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION is_user_blocked TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_block_status TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user TO authenticated;
GRANT ALL ON blocked_users_log TO authenticated;
GRANT ALL ON setup_fee_config TO authenticated;
