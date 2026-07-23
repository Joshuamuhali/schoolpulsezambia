-- ============================================================================
-- COMPREHENSIVE FIX: Add Missing Foreign Keys & Create Views
-- This fixes 400/406 errors across the entire application
-- ============================================================================

-- ============================================================================
-- 1. SCHOOL_PAYMENTS - Add Foreign Keys
-- ============================================================================

ALTER TABLE school_payments 
  ADD CONSTRAINT IF NOT EXISTS school_payments_school_id_fkey 
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS school_payments_reviewed_by_fkey 
    FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. SCHOOL_SUBSCRIPTIONS - Add Foreign Keys (fixes the new 400 error)
-- ============================================================================

-- First, check if the table exists and add the FK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_subscriptions') THEN
    -- Add foreign key to schools
    ALTER TABLE school_subscriptions 
      ADD CONSTRAINT IF NOT EXISTS school_subscriptions_school_id_fkey 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'school_subscriptions' AND column_name = 'updated_at') THEN
      ALTER TABLE school_subscriptions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. ROLES TABLE - Add 'key' column (frontend expects it)
-- ============================================================================

ALTER TABLE roles 
  ADD COLUMN IF NOT EXISTS key TEXT UNIQUE;

-- Populate key column from name (convert to lowercase, replace spaces with underscores)
UPDATE roles 
SET key = LOWER(REPLACE(name, ' ', '_'))
WHERE key IS NULL;

-- ============================================================================
-- 4. CREATE/REPLACE VIEWS WITH PROPER JOINS
-- ============================================================================

-- Profiles view with school and role information
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
  s.name AS school_name,
  sm.role AS user_role,
  sm.is_active AS is_active_member
FROM profiles p
LEFT JOIN schools s ON p.school_id = s.id
LEFT JOIN school_members sm ON sm.user_id = p.id AND sm.school_id = p.school_id;

-- Payments view with school and reviewer information
CREATE OR REPLACE VIEW payments_simple AS
SELECT 
  sp.id,
  sp.school_id,
  sp.amount,
  sp.currency,
  sp.status,
  sp.payment_method,
  sp.reference,
  sp.created_at,
  sp.verified_at,
  sp.reviewed_by,
  sp.reviewed_at,
  sp.rejection_reason,
  sp.admin_notes,
  s.name AS school_name,
  r.full_name AS reviewer_name
FROM school_payments sp
LEFT JOIN schools s ON sp.school_id = s.id
LEFT JOIN profiles r ON sp.reviewed_by = r.id;

-- Subscriptions view with school and plan information
CREATE OR REPLACE VIEW subscriptions_view AS
SELECT 
  ss.id,
  ss.school_id,
  ss.plan_id,
  ss.status,
  ss.current_period_start,
  ss.current_period_end,
  ss.created_at,
  ss.updated_at,
  s.name AS school_name,
  s.subdomain,
  s.access_state AS school_state,
  sp.name AS plan_name,
  sp.price_monthly,
  sp.price_annual
FROM school_subscriptions ss
LEFT JOIN schools s ON ss.school_id = s.id
LEFT JOIN subscription_plans sp ON ss.plan_id = sp.id;

-- Simpler subscriptions view for frontend
CREATE OR REPLACE VIEW school_subscriptions_view AS
SELECT 
  ss.id,
  ss.school_id,
  ss.status,
  ss.current_period_start AS start_date,
  ss.current_period_end AS expiry_date,
  s.name AS school_name,
  s.subdomain,
  s.access_state AS school_state
FROM school_subscriptions ss
LEFT JOIN schools s ON ss.school_id = s.id;

-- ============================================================================
-- 5. FIX APPROVE_PAYMENT RPC - Update school access_state
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_payment(
  p_payment_id UUID,
  p_reviewed_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment school_payments%ROWTYPE;
  v_school_id UUID;
BEGIN
  -- Get payment details
  SELECT * INTO v_payment FROM school_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  
  v_school_id := v_payment.school_id;

  -- Update payment status
  UPDATE school_payments
  SET status = 'verified',
      reviewed_by = p_reviewed_by,
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_payment_id;

  -- CRITICAL: Update school access_state to 'active'
  UPDATE schools
  SET access_state = 'active',
      updated_at = NOW()
  WHERE id = v_school_id;

  -- Create notification for the school
  INSERT INTO notifications (user_id, type, title, message, metadata)
  SELECT 
    p.id,
    'payment_approved',
    'Payment Approved - Access Granted',
    'Your onboarding payment has been approved. You can now access the system.',
    jsonb_build_object('payment_id', p_payment_id, 'school_id', v_school_id)
  FROM profiles p
  WHERE p.school_id = v_school_id
  LIMIT 1;
END;
$$;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON profiles_view TO authenticated;
GRANT SELECT ON payments_simple TO authenticated;
GRANT SELECT ON subscriptions_view TO authenticated;
GRANT SELECT ON school_subscriptions_view TO authenticated;
GRANT USAGE ON SEQUENCE roles_id_seq TO authenticated;

-- ============================================================================
-- 7. RELOAD POSTGREST SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 8. VERIFICATION QUERY (run this to confirm everything worked)
-- ============================================================================

-- Check that FKs were added
SELECT 
  'school_payments FKs' AS check_name,
  COUNT(*) AS count
FROM information_schema.table_constraints 
WHERE table_name = 'school_payments' AND constraint_type = 'FOREIGN KEY'

UNION ALL

SELECT 
  'school_subscriptions FKs' AS check_name,
  COUNT(*) AS count
FROM information_schema.table_constraints 
WHERE table_name = 'school_subscriptions' AND constraint_type = 'FOREIGN KEY'

UNION ALL

SELECT 
  'roles.key column exists' AS check_name,
  COUNT(*) AS count
FROM information_schema.columns 
WHERE table_name = 'roles' AND column_name = 'key'

UNION ALL

SELECT 
  'views created' AS check_name,
  COUNT(*) AS count
FROM information_schema.views 
WHERE table_name IN ('profiles_view', 'payments_simple', 'subscriptions_view', 'school_subscriptions_view');