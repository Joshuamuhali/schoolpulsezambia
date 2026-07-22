-- ============================================================================
-- NO FREE MODULES SYSTEM MIGRATION
-- All modules require payment. No exceptions.
-- ============================================================================

-- ============================================================================
-- UPDATE FEATURES TABLE WITH PRICING COLUMNS
-- ============================================================================

ALTER TABLE features
ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quarterly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS setup_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge TEXT;

-- Update existing features to be paid
UPDATE features SET is_paid = TRUE WHERE is_paid IS NULL;

-- ============================================================================
-- CREATE SYSTEM_SETTINGS TABLE
-- ============================================================================

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
    ('payment_methods', '["bank_transfer", "airtel_money", "mtn_momo", "cash"]', 'Available payment methods'),
    ('subscription_periods', '["monthly", "quarterly", "yearly"]', 'Available subscription periods')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- CREATE FEATURE_PRICING_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    
    -- Pricing changes
    old_monthly_price DECIMAL(10,2),
    new_monthly_price DECIMAL(10,2),
    old_quarterly_price DECIMAL(10,2),
    new_quarterly_price DECIMAL(10,2),
    old_yearly_price DECIMAL(10,2),
    new_yearly_price DECIMAL(10,2),
    old_setup_price DECIMAL(10,2),
    new_setup_price DECIMAL(10,2),
    
    -- Metadata
    changed_by UUID REFERENCES auth.users(id),
    change_reason TEXT,
    effective_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CREATE FEATURE_DEPENDENCIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    requires_feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    
    -- Dependency type
    dependency_type TEXT NOT NULL DEFAULT 'required' CHECK (dependency_type IN ('required', 'optional', 'recommended')),
    
    -- Metadata
    description TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate dependencies
    UNIQUE(feature_id, requires_feature_id)
);

-- ============================================================================
-- UPDATE SCHOOL_FEATURES TABLE
-- ============================================================================

ALTER TABLE school_features
ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
ADD COLUMN IF NOT EXISTS price_paid DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_features_category ON features(category);
CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
CREATE INDEX IF NOT EXISTS idx_features_is_visible ON features(is_visible);
CREATE INDEX IF NOT EXISTS idx_features_display_order ON features(display_order);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

CREATE INDEX IF NOT EXISTS idx_feature_pricing_history_feature_id ON feature_pricing_history(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_pricing_history_effective_date ON feature_pricing_history(effective_date);

CREATE INDEX IF NOT EXISTS idx_feature_dependencies_feature_id ON feature_dependencies(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_dependencies_requires_feature_id ON feature_dependencies(requires_feature_id);

CREATE INDEX IF NOT EXISTS idx_school_features_billing_period ON school_features(billing_period);
CREATE INDEX IF NOT EXISTS idx_school_features_subscription_end_date ON school_features(subscription_end_date);

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================

-- System Settings: Admin can manage, all can view
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view system settings" ON system_settings
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM school_members
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Feature Pricing History: Admin can view, schools can view own
ALTER TABLE feature_pricing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view pricing history" ON feature_pricing_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM school_members
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Schools can view pricing history" ON feature_pricing_history
    FOR SELECT USING (true);

-- Feature Dependencies: Admin can manage, all can view
ALTER TABLE feature_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view feature dependencies" ON feature_dependencies
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage feature dependencies" ON feature_dependencies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM school_members
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================================================
-- SEED 24 PAID MODULES WITH PRICING
-- ============================================================================

-- Clear existing features to avoid conflicts
DELETE FROM feature_dependencies;
DELETE FROM feature_pricing_history;
DELETE FROM school_features;
DELETE FROM features;

INSERT INTO features (name, code, description, category, icon, monthly_price, quarterly_price, yearly_price, setup_price, is_paid, is_core, display_order, badge, status, is_visible) VALUES
-- Core Modules (Required — All Paid)
('Student Management', 'students', 'Complete student management including enrollment, transfers, and records. Track student profiles, guardians, and academic history.', 'Core', '👨‍🎓', 250, 675, 2400, 0, true, true, 1, 'REQUIRED', 'active', true),
('Staff Management', 'staff', 'Manage teaching and non-teaching staff. Track profiles, assignments, and employment history.', 'Core', '👨‍🏫', 200, 540, 1920, 0, true, true, 2, 'REQUIRED', 'active', true),
('Class Management', 'classes', 'Create and manage classes, grades, and subjects. Configure academic structure and class assignments.', 'Core', '📚', 150, 405, 1440, 0, true, true, 3, 'REQUIRED', 'active', true),
('Academic Setup', 'academic_setup', 'Configure academic years, terms, and the complete academic calendar for your school.', 'Core', '📅', 100, 270, 960, 0, true, true, 4, 'REQUIRED', 'active', true),
('User Management', 'users', 'Manage all user accounts including teachers, parents, and staff with role-based access control.', 'Core', '👥', 100, 270, 960, 0, true, true, 5, 'REQUIRED', 'active', true),

-- Academic Modules (Paid)
('Attendance Management', 'attendance', 'Daily attendance tracking with bulk entry, parent notifications, and comprehensive reports. Includes absence tracking and analytics.', 'Academic', '📋', 250, 675, 2400, 0, true, false, 6, 'Popular', 'active', true),
('Exams & Results', 'exams', 'Complete exam management including grade setting, marks entry, result calculation, and report card generation. Supports custom grading systems.', 'Academic', '📝', 200, 540, 1920, 0, true, false, 7, NULL, 'active', true),
('Timetable Management', 'timetable', 'Visual timetable builder with conflict detection, teacher availability, and room allocation. Supports multiple schedule views.', 'Academic', '⏰', 150, 405, 1440, 0, true, false, 8, 'NEW', 'active', true),
('Homework Management', 'homework', 'Assign, track, and grade homework. Includes parent visibility, submission tracking, and due date reminders.', 'Academic', '📄', 120, 324, 1152, 0, true, false, 9, NULL, 'active', true),

-- Financial Modules (Paid)
('Finance Management', 'finance', 'Complete financial management including fee structures, student billing, payment tracking, expense management, and financial reports.', 'Financial', '💰', 300, 810, 2880, 0, true, false, 10, NULL, 'active', true),
('Payroll', 'payroll', 'Staff salary management including basic pay, allowances, deductions, tax calculation, and payslip generation.', 'Financial', '💳', 400, 1080, 3840, 0, true, false, 11, 'NEW', 'active', true),
('Budget Management', 'budget', 'School budgeting and financial planning. Track budget vs actual spending with variance reporting.', 'Financial', '📊', 150, 405, 1440, 0, true, false, 12, NULL, 'active', true),

-- Communication Modules (Paid)
('Parent Portal', 'parents', 'Parent access to student information including attendance, results, fees, announcements, and teacher messaging.', 'Communication', '👨‍👩‍👧', 150, 405, 1440, 0, true, false, 13, NULL, 'active', true),
('SMS Notifications', 'sms', 'Send SMS alerts to parents for attendance, fees, exams, and announcements. Includes template management and delivery tracking.', 'Communication', '📱', 180, 486, 1728, 0, true, false, 14, 'Popular', 'active', true),
('Email Notifications', 'email', 'Send email communications including receipts, confirmations, newsletters, and announcements. Includes template management and analytics.', 'Communication', '✉️', 120, 324, 1152, 0, true, false, 15, NULL, 'active', true),

-- Analytics Modules (Paid)
('Analytics & Reports', 'analytics', 'Advanced analytics including predictive insights, custom reports, dashboards, and data visualization. Includes early warning system.', 'Analytics', '📊', 200, 540, 1920, 0, true, false, 16, NULL, 'active', true),
('Predictive Insights', 'predictive', 'AI-powered student performance prediction, at-risk identification, and intervention recommendations.', 'Analytics', '🔮', 350, 945, 3360, 0, true, false, 17, 'NEW', 'active', true),

-- Operations Modules (Paid)
('Library Management', 'library', 'Complete library management including book catalog, loans, reservations, fines, and reports. Supports barcode and digital catalog.', 'Operations', '📖', 100, 270, 960, 0, true, false, 18, NULL, 'active', true),
('Health Records', 'health', 'Student health management including medical records, allergies, vaccinations, incidents, and parent notifications.', 'Operations', '🏥', 100, 270, 960, 0, true, false, 19, NULL, 'active', true),
('Behavior Management', 'behavior', 'Track student behavior including positive recognition, discipline records, referrals, and parent communication.', 'Operations', '📊', 100, 270, 960, 0, true, false, 20, NULL, 'active', true),
('Inventory Management', 'inventory', 'School asset and inventory tracking including purchase, maintenance, assignment, and reporting.', 'Operations', '📦', 80, 216, 768, 0, true, false, 21, NULL, 'active', true),
('Event Management', 'events', 'Manage school events, registrations, volunteers, and calendar. Includes event promotion and attendance tracking.', 'Operations', '🎪', 80, 216, 768, 0, true, false, 22, NULL, 'active', true),
('Facility Management', 'facilities', 'Manage school facilities, room bookings, maintenance requests, and facility usage tracking.', 'Operations', '🏫', 80, 216, 768, 0, true, false, 23, NULL, 'active', true),
('Visitor Management', 'visitors', 'Track and manage school visitors with check-in/out, digital badges, and visitor history.', 'Operations', '🚪', 60, 162, 576, 0, true, false, 24, NULL, 'active', true);

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate module cost
CREATE OR REPLACE FUNCTION calculate_module_cost(
    p_module_ids UUID[],
    p_period TEXT DEFAULT 'monthly'
)
RETURNS JSONB AS $$
DECLARE
    v_setup_fee DECIMAL;
    v_subtotal DECIMAL;
    v_discount DECIMAL;
    v_total DECIMAL;
    v_total_with_discount DECIMAL;
    v_savings DECIMAL;
    v_price_key TEXT;
BEGIN
    -- Get setup fee from system settings
    SELECT (value->>'amount')::DECIMAL INTO v_setup_fee
    FROM system_settings
    WHERE key = 'setup_fee';
    
    -- Set price key based on period
    v_price_key := CASE 
        WHEN p_period = 'quarterly' THEN 'quarterly_price'
        WHEN p_period = 'yearly' THEN 'yearly_price'
        ELSE 'monthly_price'
    END;
    
    -- Calculate subtotal
    SELECT COALESCE(SUM(
        CASE v_price_key
            WHEN 'monthly_price' THEN monthly_price
            WHEN 'quarterly_price' THEN quarterly_price
            WHEN 'yearly_price' THEN yearly_price
        END
    ), 0) INTO v_subtotal
    FROM features
    WHERE id = ANY(p_module_ids);
    
    -- Calculate discount
    v_discount := CASE 
        WHEN p_period = 'quarterly' THEN v_subtotal * 0.10
        WHEN p_period = 'yearly' THEN v_subtotal * 0.20
        ELSE 0
    END;
    
    -- Calculate totals
    v_total := v_setup_fee + v_subtotal;
    v_total_with_discount := v_total - v_discount;
    v_savings := v_discount;
    
    RETURN jsonb_build_object(
        'setup_fee', v_setup_fee,
        'subtotal', v_subtotal,
        'discount', v_discount,
        'total', v_total,
        'total_with_discount', v_total_with_discount,
        'savings', v_savings,
        'period', p_period,
        'module_count', array_length(p_module_ids, 1)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get system settings
CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_object_agg(key, value)
    FROM system_settings;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
