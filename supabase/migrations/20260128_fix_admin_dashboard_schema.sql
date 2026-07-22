-- ============================================================================
-- FIX ALL ADMIN DASHBOARD SCHEMA ISSUES
-- ============================================================================

-- 1. FIX PROFILES TABLE - Add missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'staff';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. FIX SCHOOL_MEMBERS TABLE - Add missing columns
ALTER TABLE school_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. FIX AUDIT_LOGS TABLE - Rename actor_id to user_id if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actor_id') THEN
        ALTER TABLE audit_logs RENAME COLUMN actor_id TO user_id;
    END IF;
END $$;

-- 4. FIX FEATURES TABLE - Add pricing columns
ALTER TABLE features ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE features ADD COLUMN IF NOT EXISTS quarterly_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE features ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE features ADD COLUMN IF NOT EXISTS setup_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE features ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE features ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE features ADD COLUMN IF NOT EXISTS category TEXT;

-- 5. FIX SCHOOL_SUBSCRIPTIONS TABLE - Add missing columns
ALTER TABLE school_subscriptions ADD COLUMN IF NOT EXISTS setup_fee_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE school_subscriptions ADD COLUMN IF NOT EXISTS selected_modules UUID[] DEFAULT '{}';
ALTER TABLE school_subscriptions ADD COLUMN IF NOT EXISTS total_monthly_cost DECIMAL(10,2) DEFAULT 0;

-- 6. CREATE SYSTEM_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
    ('setup_fee', '{"amount": 3500, "currency": "ZMW"}', 'One-time setup fee for new schools'),
    ('currency', '"ZMW"', 'Default currency'),
    ('payment_methods', '["bank_transfer", "airtel_money", "mtn_momo", "cash"]', 'Available payment methods')
ON CONFLICT (key) DO NOTHING;

-- 7. CREATE SUBSCRIPTION_STATS RPC FUNCTION
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS TABLE (
    total_schools BIGINT,
    active_schools BIGINT,
    trial_schools BIGINT,
    pending_payment BIGINT,
    total_revenue DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM schools)::BIGINT,
        (SELECT COUNT(*) FROM schools WHERE status = 'active')::BIGINT,
        (SELECT COUNT(*) FROM schools WHERE status = 'trial')::BIGINT,
        (SELECT COUNT(*) FROM subscription_payments WHERE status = 'pending')::BIGINT,
        (SELECT COALESCE(SUM(amount), 0) FROM subscription_payments WHERE status = 'verified')::DECIMAL;
END;
$$;

-- 8. CREATE FEATURE_STATS RPC FUNCTION
CREATE OR REPLACE FUNCTION get_feature_stats()
RETURNS TABLE (
    total_features BIGINT,
    active_features BIGINT,
    paid_features BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM features)::BIGINT,
        (SELECT COUNT(*) FROM features WHERE status = 'active')::BIGINT,
        (SELECT COUNT(*) FROM features WHERE is_paid = true)::BIGINT;
END;
$$;

-- 9. CREATE PAYMENT_STATS RPC FUNCTION
CREATE OR REPLACE FUNCTION get_payment_stats()
RETURNS TABLE (
    pending_count BIGINT,
    verified_count BIGINT,
    rejected_count BIGINT,
    total_amount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM subscription_payments WHERE status = 'pending')::BIGINT,
        (SELECT COUNT(*) FROM subscription_payments WHERE status = 'verified')::BIGINT,
        (SELECT COUNT(*) FROM subscription_payments WHERE status = 'rejected')::BIGINT,
        (SELECT COALESCE(SUM(amount), 0) FROM subscription_payments WHERE status = 'verified')::DECIMAL;
END;
$$;

-- 10. CREATE RLS POLICIES FOR SYSTEM_SETTINGS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to system_settings" ON system_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow admin write access to system_settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 11. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_school_members_status ON school_members(status);
CREATE INDEX IF NOT EXISTS idx_features_category ON features(category);
CREATE INDEX IF NOT EXISTS idx_features_is_paid ON features(is_paid);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_school_subscriptions_setup_fee_paid ON school_subscriptions(setup_fee_paid);

-- 12. GRANT PERMISSIONS
GRANT ALL ON system_settings TO authenticated;
GRANT ALL ON system_settings TO anon;

-- 13. COMMENTS
COMMENT ON TABLE system_settings IS 'System-wide settings and configuration';
COMMENT ON COLUMN profiles.status IS 'User status: active, inactive, suspended';
COMMENT ON COLUMN profiles.user_type IS 'User type: admin, teacher, parent, student';
COMMENT ON COLUMN school_members.status IS 'Membership status: active, inactive';
COMMENT ON COLUMN features.monthly_price IS 'Monthly subscription price in ZMW';
COMMENT ON COLUMN features.setup_price IS 'One-time setup fee in ZMW';
COMMENT ON COLUMN school_subscriptions.setup_fee_paid IS 'Whether the setup fee has been paid';
COMMENT ON COLUMN school_subscriptions.selected_modules IS 'Array of selected feature IDs';
COMMENT ON COLUMN school_subscriptions.total_monthly_cost IS 'Total monthly cost of selected modules';