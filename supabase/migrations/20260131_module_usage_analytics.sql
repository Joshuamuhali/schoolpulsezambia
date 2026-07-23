-- ============================================================================
-- MODULE USAGE ANALYTICS SYSTEM
-- Tracks which schools use which features, usage patterns, and revenue
-- ============================================================================

-- ============================================================================
-- 1. MODULE USAGE TABLE (Tracks daily usage per school per module)
-- ============================================================================

CREATE TABLE IF NOT EXISTS module_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  module_code TEXT REFERENCES module_catalog(code) ON DELETE CASCADE,
  total_actions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  first_used_at TIMESTAMPTZ DEFAULT NOW(),
  daily_actions JSONB DEFAULT '{}'::jsonb,  -- {"2026-07-23": 45, "2026-07-22": 52}
  weekly_actions JSONB DEFAULT '{}'::jsonb, -- {"week_29": 320, "week_30": 380}
  monthly_actions JSONB DEFAULT '{}'::jsonb, -- {"2026-07": 1800, "2026-06": 1500}
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active', -- active, inactive, paused
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, module_code)
);

-- ============================================================================
-- 2. MODULE USAGE LOG (Detailed action log for analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS module_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  module_code TEXT REFERENCES module_catalog(code) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g., "attendance_taken", "exam_created", "student_added"
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
  session_id TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. FEATURE ADOPTION METRICS (Tracks when schools adopt features)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_adoption_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  module_code TEXT REFERENCES module_catalog(code) ON DELETE CASCADE,
  adoption_date DATE DEFAULT CURRENT_DATE,
  adoption_rate DECIMAL(5,2), -- Percentage of schools using this feature
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  engagement_score DECIMAL(5,2), -- 0-100 score based on usage frequency
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, module_code, adoption_date)
);

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_module_usage_school_id ON module_usage(school_id);
CREATE INDEX IF NOT EXISTS idx_module_usage_module_code ON module_usage(module_code);
CREATE INDEX IF NOT EXISTS idx_module_usage_is_active ON module_usage(is_active);
CREATE INDEX IF NOT EXISTS idx_module_usage_log_school_id ON module_usage_log(school_id);
CREATE INDEX IF NOT EXISTS idx_module_usage_log_module_code ON module_usage_log(module_code);
CREATE INDEX IF NOT EXISTS idx_module_usage_log_created_at ON module_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_adoption_school_id ON feature_adoption_metrics(school_id);
CREATE INDEX IF NOT EXISTS idx_feature_adoption_module_code ON feature_adoption_metrics(module_code);

-- ============================================================================
-- 5. ANALYTICS VIEWS
-- ============================================================================

-- 5.1 Feature Usage Summary (Per Feature)
CREATE OR REPLACE VIEW feature_usage_summary AS
SELECT 
  mc.code,
  mc.name,
  mc.category,
  mc.price_monthly,
  mc.price_termly,
  mc.price_annual,
  -- School usage
  COUNT(DISTINCT mu.school_id) as schools_using,
  COUNT(DISTINCT mu.school_id) FILTER (WHERE mu.status = 'active') as active_schools,
  -- Revenue
  COALESCE(SUM(mu.total_actions), 0) as total_revenue,
  -- Usage
  COALESCE(SUM(mu.total_actions), 0) as total_actions,
  COALESCE(AVG(mu.total_actions), 0) as avg_actions,
  -- Status
  mc.is_active,
  mc.display_order
FROM module_catalog mc
LEFT JOIN module_usage mu ON mu.module_code = mc.code AND mu.is_active = true
GROUP BY mc.code, mc.name, mc.category, mc.price_monthly, mc.price_termly, mc.price_annual, mc.is_active, mc.display_order
ORDER BY mc.category, mc.display_order;

-- 5.2 School Feature Usage (Per School)
CREATE OR REPLACE VIEW school_feature_usage AS
SELECT 
  s.id as school_id,
  s.name as school_name,
  s.state as school_status,
  s.subscription_status,
  mc.code as feature_code,
  mc.name as feature_name,
  mc.category,
  -- Module status
  mu.status as module_status,
  mu.is_active as enabled,
  mc.price_monthly as price_paid,
  mu.first_used_at as activated_at,
  -- Usage
  COALESCE(mu.total_actions, 0) as total_actions,
  COALESCE(mu.unique_users, 0) as unique_users,
  mu.last_used_at,
  -- Revenue
  mc.price_monthly as revenue
FROM schools s
CROSS JOIN module_catalog mc
LEFT JOIN module_usage mu ON mu.school_id = s.id AND mu.module_code = mc.code
WHERE mc.is_active = true
ORDER BY s.name, mc.category, mc.display_order;

-- 5.3 Revenue By Feature
CREATE OR REPLACE VIEW revenue_by_feature AS
SELECT 
  mc.code,
  mc.name,
  mc.category,
  mc.price_monthly,
  COUNT(DISTINCT mu.school_id) as schools_using,
  COUNT(DISTINCT mu.school_id) * mc.price_monthly as potential_monthly_revenue,
  COALESCE(SUM(mu.total_actions), 0) as actual_collected,
  (COUNT(DISTINCT mu.school_id) * mc.price_monthly - COALESCE(SUM(mu.total_actions), 0)) as outstanding
FROM module_catalog mc
LEFT JOIN module_usage mu ON mu.module_code = mc.code AND mu.is_active = true AND mu.status = 'active'
GROUP BY mc.code, mc.name, mc.category, mc.price_monthly
ORDER BY potential_monthly_revenue DESC;

-- 5.4 Feature Adoption Rate
CREATE OR REPLACE VIEW feature_adoption AS
SELECT 
  mc.code,
  mc.name,
  mc.category,
  mc.price_monthly,
  COUNT(DISTINCT s.id) as total_schools,
  COUNT(DISTINCT mu.school_id) as schools_using,
  ROUND(COUNT(DISTINCT mu.school_id)::DECIMAL / NULLIF(COUNT(DISTINCT s.id), 0) * 100, 2) as adoption_rate,
  COALESCE(SUM(mu.total_actions), 0) as total_usage
FROM module_catalog mc
CROSS JOIN schools s
LEFT JOIN module_usage mu ON mu.module_code = mc.code AND mu.is_active = true AND mu.status = 'active'
GROUP BY mc.code, mc.name, mc.category, mc.price_monthly
ORDER BY adoption_rate DESC;

-- ============================================================================
-- 6. RPC FUNCTIONS FOR ANALYTICS
-- ============================================================================

-- 6.1 Get platform-wide module adoption stats
CREATE OR REPLACE FUNCTION get_platform_module_adoption()
RETURNS TABLE (
  code TEXT,
  name TEXT,
  category TEXT,
  price_monthly DECIMAL,
  schools_using BIGINT,
  active_schools BIGINT,
  total_revenue BIGINT,
  total_actions BIGINT,
  avg_actions NUMERIC,
  adoption_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fus.code,
    fus.name,
    fus.category,
    fus.price_monthly,
    fus.schools_using,
    fus.active_schools,
    fus.total_revenue,
    fus.total_actions,
    fus.avg_actions,
    CASE 
      WHEN COUNT(DISTINCT s.id) > 0 THEN ROUND(fus.schools_using::DECIMAL / COUNT(DISTINCT s.id) * 100, 2)
      ELSE 0
    END as adoption_rate
  FROM feature_usage_summary fus
  CROSS JOIN (SELECT COUNT(*) as count FROM schools WHERE state = 'active') s
  WHERE fus.is_active = true
  ORDER BY fus.category, fus.display_order;
END;
$$ LANGUAGE plpgsql;

-- 6.2 Get school adoption summary
CREATE OR REPLACE FUNCTION get_school_adoption_summary()
RETURNS TABLE (
  school_id UUID,
  school_name TEXT,
  modules_subscribed BIGINT,
  modules_active BIGINT,
  total_module_actions BIGINT,
  adoption_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as school_id,
    s.name as school_name,
    COUNT(DISTINCT mu.module_code) as modules_subscribed,
    COUNT(DISTINCT mu.module_code) FILTER (WHERE mu.status = 'active') as modules_active,
    COALESCE(SUM(mu.total_actions), 0) as total_module_actions,
    CASE 
      WHEN COUNT(DISTINCT mu.module_code) FILTER (WHERE mu.status = 'active') = 0 THEN '⚠️ Inactive'
      WHEN COALESCE(SUM(mu.total_actions), 0) > 1000 THEN '✅ Active'
      WHEN COALESCE(SUM(mu.total_actions), 0) > 100 THEN '📈 Growing'
      ELSE '🔍 New'
    END as adoption_status
  FROM schools s
  LEFT JOIN module_usage mu ON mu.school_id = s.id
  GROUP BY s.id, s.name
  ORDER BY modules_active DESC, total_module_actions DESC;
END;
$$ LANGUAGE plpgsql;

-- 6.3 Track module usage (call this from frontend on each action)
CREATE OR REPLACE FUNCTION track_module_usage(
  p_school_id UUID,
  p_module_code TEXT,
  p_user_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_week TEXT := 'week_' || EXTRACT(WEEK FROM NOW())::TEXT;
  v_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  -- Log the action
  INSERT INTO module_usage_log (school_id, module_code, user_id, action, metadata)
  VALUES (p_school_id, p_module_code, p_user_id, p_action, p_metadata);

  -- Update or insert module_usage
  INSERT INTO module_usage (school_id, module_code, total_actions, unique_users, last_used_at, daily_actions, weekly_actions, monthly_actions)
  VALUES (p_school_id, p_module_code, 1, 1, NOW(), 
          jsonb_build_object(v_today::TEXT, 1),
          jsonb_build_object(v_week, 1),
          jsonb_build_object(v_month, 1))
  ON CONFLICT (school_id, module_code) 
  DO UPDATE SET
    total_actions = module_usage.total_actions + 1,
    last_used_at = NOW(),
    daily_actions = jsonb_set(
      COALESCE(module_usage.daily_actions, '{}'::jsonb),
      ARRAY[v_today::TEXT],
      (COALESCE((module_usage.daily_actions::jsonb ->> v_today::TEXT)::INTEGER, 0) + 1)::TEXT::jsonb
    ),
    weekly_actions = jsonb_set(
      COALESCE(module_usage.weekly_actions, '{}'::jsonb),
      ARRAY[v_week],
      (COALESCE((module_usage.weekly_actions::jsonb ->> v_week)::INTEGER, 0) + 1)::TEXT::jsonb
    ),
    monthly_actions = jsonb_set(
      COALESCE(module_usage.monthly_actions, '{}'::jsonb),
      ARRAY[v_month],
      (COALESCE((module_usage.monthly_actions::jsonb ->> v_month)::INTEGER, 0) + 1)::TEXT::jsonb
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON module_usage TO authenticated;
GRANT SELECT ON module_usage_log TO authenticated;
GRANT SELECT ON feature_adoption_metrics TO authenticated;
GRANT SELECT ON feature_usage_summary TO authenticated;
GRANT SELECT ON school_feature_usage TO authenticated;
GRANT SELECT ON revenue_by_feature TO authenticated;
GRANT SELECT ON feature_adoption TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_module_adoption() TO authenticated;
GRANT EXECUTE ON FUNCTION get_school_adoption_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION track_module_usage(UUID, TEXT, UUID, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- 8. RELOAD POSTGREST SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';