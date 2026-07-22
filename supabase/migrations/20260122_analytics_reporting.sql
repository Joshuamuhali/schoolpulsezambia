-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260122_analytics_reporting
-- School Analytics & Reporting Module
-- - Analytics summary tables and views
-- - Alerts and insights system
-- - Report generation support
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. ANALYTICS ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Alert details
  type TEXT NOT NULL CHECK (type IN ('attendance', 'finance', 'academic', 'staff', 'general')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Related data
  related_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  related_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  related_grade_id UUID REFERENCES grades(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_alerts_school ON analytics_alerts(school_id);
CREATE INDEX idx_analytics_alerts_status ON analytics_alerts(status);
CREATE INDEX idx_analytics_alerts_severity ON analytics_alerts(severity);
CREATE INDEX idx_analytics_alerts_type ON analytics_alerts(type);
CREATE INDEX idx_analytics_alerts_created_at ON analytics_alerts(created_at DESC);

-- ============================================================================
-- 2. REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Report details
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('student', 'academic', 'attendance', 'finance', 'staff', 'custom')),
  format TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv')),
  
  -- Filters
  filters JSONB DEFAULT '{}',
  date_range_start DATE,
  date_range_end DATE,
  
  -- Generated report
  file_url TEXT,
  file_size INTEGER,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_school ON reports(school_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_generated_by ON reports(generated_by);

-- ============================================================================
-- 3. DASHBOARD WIDGETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Widget details
  widget_type TEXT NOT NULL CHECK (widget_type IN ('card', 'chart', 'table', 'metric')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Configuration
  config JSONB NOT NULL DEFAULT '{}',
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 4,
  height INTEGER DEFAULT 2,
  
  -- Visibility
  is_visible BOOLEAN DEFAULT TRUE,
  visible_roles TEXT[] DEFAULT ARRAY['director', 'principal', 'bursar', 'teacher'],
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboard_widgets_school ON dashboard_widgets(school_id);
CREATE INDEX idx_dashboard_widgets_visible ON dashboard_widgets(is_visible) WHERE is_visible = TRUE;

-- ============================================================================
-- 4. ANALYTICS CACHE TABLE (for performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Cache key
  cache_key TEXT NOT NULL,
  analytics_type TEXT NOT NULL,
  
  -- Cached data
  data JSONB NOT NULL,
  
  -- Metadata
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, cache_key)
);

CREATE INDEX idx_analytics_cache_school ON analytics_cache(school_id);
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);

-- ============================================================================
-- 5. DATABASE VIEWS FOR ANALYTICS
-- ============================================================================

-- 5.1 Student enrollment summary view
CREATE OR REPLACE VIEW student_enrollment_summary AS
SELECT 
  s.school_id,
  s.grade_id,
  g.name as grade_name,
  COUNT(*) as total_students,
  COUNT(CASE WHEN s.gender = 'M' THEN 1 END) as male_students,
  COUNT(CASE WHEN s.gender = 'F' THEN 1 END) as female_students,
  COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_students,
  COUNT(CASE WHEN s.status = 'inactive' THEN 1 END) as inactive_students
FROM students s
JOIN grades g ON g.id = s.grade_id
GROUP BY s.school_id, s.grade_id, g.name;

-- 5.2 Attendance summary view
CREATE OR REPLACE VIEW attendance_summary_view AS
SELECT 
  ar.school_id,
  s.grade_id,
  g.name as grade_name,
  s.class_id,
  c.name as class_name,
  COUNT(DISTINCT ar.student_id) as total_students,
  COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
  COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
  COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
  COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) as excused_count,
  ROUND(
    COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(DISTINCT ar.student_id), 0) * 100,
    2
  ) as attendance_rate
FROM attendance_records ar
JOIN students s ON s.id = ar.student_id
JOIN grades g ON g.id = s.grade_id
LEFT JOIN classes c ON c.id = s.class_id
GROUP BY ar.school_id, s.grade_id, g.name, s.class_id, c.name;

-- 5.3 Academic performance summary view
CREATE OR REPLACE VIEW academic_performance_summary AS
SELECT 
  sr.school_id,
  s.grade_id,
  g.name as grade_name,
  s.class_id,
  c.name as class_name,
  es.subject_id,
  sub.name as subject_name,
  COUNT(DISTINCT sr.student_id) as students_count,
  ROUND(AVG(sr.score), 2) as average_score,
  COUNT(CASE WHEN sr.score >= es.pass_marks THEN 1 END) as passed_count,
  COUNT(CASE WHEN sr.score < es.pass_marks THEN 1 END) as failed_count,
  ROUND(
    COUNT(CASE WHEN sr.score >= es.pass_marks THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(DISTINCT sr.student_id), 0) * 100,
    2
  ) as pass_rate
FROM student_results sr
JOIN exam_subjects es ON es.id = sr.exam_subject_id
JOIN students s ON s.id = sr.student_id
JOIN grades g ON g.id = s.grade_id
LEFT JOIN classes c ON c.id = s.class_id
JOIN subjects sub ON sub.id = es.subject_id
WHERE sr.status = 'published'
GROUP BY sr.school_id, s.grade_id, g.name, s.class_id, c.name, es.subject_id, sub.name;

-- 5.4 Finance summary view
CREATE OR REPLACE VIEW finance_summary_view AS
SELECT 
  sb.school_id,
  s.grade_id,
  g.name as grade_name,
  s.class_id,
  c.name as class_name,
  COUNT(DISTINCT sb.student_id) as total_students,
  SUM(sb.total_amount) as total_fees,
  SUM(sb.amount_paid) as total_paid,
  SUM(sb.balance) as total_balance,
  COUNT(CASE WHEN sb.status IN ('unpaid', 'overdue') THEN 1 END) as overdue_count,
  ROUND(
    SUM(sb.amount_paid)::DECIMAL / NULLIF(SUM(sb.total_amount), 0) * 100,
    2
  ) as collection_rate
FROM student_bills sb
JOIN students s ON s.id = sb.student_id
JOIN grades g ON g.id = s.grade_id
LEFT JOIN classes c ON c.id = s.class_id
GROUP BY sb.school_id, s.grade_id, g.name, s.class_id, c.name;

-- 5.5 Staff workload summary view
CREATE OR REPLACE VIEW staff_workload_summary AS
SELECT 
  sp.school_id,
  sp.id as staff_id,
  sp.full_name as staff_name,
  sp.position,
  COUNT(DISTINCT ta.class_id) as classes_count,
  COUNT(DISTINCT ta.subject_id) as subjects_count,
  COUNT(DISTINCT s.id) as students_count
FROM staff_profiles sp
LEFT JOIN teacher_assignments ta ON ta.teacher_id = sp.id AND ta.is_active = TRUE
LEFT JOIN students s ON s.class_id = ta.class_id AND s.status = 'active'
GROUP BY sp.school_id, sp.id, sp.full_name, sp.position;

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- 6.1 Get school analytics overview
CREATE OR REPLACE FUNCTION get_school_analytics_overview(p_school_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'total_students', (SELECT COUNT(*) FROM students WHERE school_id = p_school_id AND status = 'active'),
    'total_teachers', (SELECT COUNT(*) FROM staff_profiles WHERE school_id = p_school_id AND status = 'active'),
    'total_classes', (SELECT COUNT(*) FROM classes WHERE school_id = p_school_id AND is_active = TRUE),
    'attendance_rate', (
      SELECT ROUND(
        COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM attendance_records
      WHERE school_id = p_school_id
        AND date >= CURRENT_DATE - INTERVAL '30 days'
    ),
    'fee_collection_rate', (
      SELECT ROUND(
        COALESCE(SUM(amount_paid), 0)::DECIMAL / NULLIF(SUM(total_amount), 0) * 100,
        2
      )
      FROM student_bills
      WHERE school_id = p_school_id
    ),
    'total_fees_expected', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM student_bills
      WHERE school_id = p_school_id
    ),
    'total_fees_collected', (
      SELECT COALESCE(SUM(amount_paid), 0)
      FROM student_bills
      WHERE school_id = p_school_id
    ),
    'total_fees_outstanding', (
      SELECT COALESCE(SUM(balance), 0)
      FROM student_bills
      WHERE school_id = p_school_id
    ),
    'average_academic_performance', (
      SELECT ROUND(AVG(score), 2)
      FROM student_results sr
      JOIN exam_subjects es ON es.id = sr.exam_subject_id
      WHERE sr.school_id = p_school_id
        AND sr.status = 'published'
    )
  );
$$;

-- 6.2 Get attendance analytics
CREATE OR REPLACE FUNCTION get_attendance_analytics(
  p_school_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'overall_rate', (
      SELECT ROUND(
        COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM attendance_records
      WHERE school_id = p_school_id
        AND date BETWEEN p_start_date AND p_end_date
    ),
    'total_days', (
      SELECT COUNT(DISTINCT date)
      FROM attendance_records
      WHERE school_id = p_school_id
        AND date BETWEEN p_start_date AND p_end_date
    ),
    'total_records', (
      SELECT COUNT(*)
      FROM attendance_records
      WHERE school_id = p_school_id
        AND date BETWEEN p_start_date AND p_end_date
    ),
    'present_count', (
      SELECT COUNT(*)
      FROM attendance_records
      WHERE school_id = p_school_id
        AND date BETWEEN p_start_date AND p_end_date
        AND status = 'present'
    ),
    'absent_count', (
      SELECT COUNT(*)
      FROM attendance_records
      WHERE school_id = p_school_id
        AND date BETWEEN p_start_date AND p_end_date
        AND status = 'absent'
    ),
    'late_count', (
      SELECT COUNT(*)
      FROM attendance_records
      WHERE school_id = p_school_id
        AND date BETWEEN p_start_date AND p_end_date
        AND status = 'late'
    ),
    'excused_count', (
      SELECT COUNT(*)
      FROM attendance_records
      WHERE school_id = p_school_id
        AND date BETWEEN p_start_date AND p_end_date
        AND status = 'excused'
    )
  );
$$;

-- 6.3 Get academic analytics
CREATE OR REPLACE FUNCTION get_academic_analytics(
  p_school_id UUID,
  p_exam_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'average_score', (
      SELECT ROUND(AVG(score), 2)
      FROM student_results sr
      JOIN exam_subjects es ON es.id = sr.exam_subject_id
      WHERE sr.school_id = p_school_id
        AND sr.status = 'published'
        AND (p_exam_id IS NULL OR es.exam_id = p_exam_id)
    ),
    'pass_rate', (
      SELECT ROUND(
        COUNT(CASE WHEN sr.score >= es.pass_marks THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM student_results sr
      JOIN exam_subjects es ON es.id = sr.exam_subject_id
      WHERE sr.school_id = p_school_id
        AND sr.status = 'published'
        AND (p_exam_id IS NULL OR es.exam_id = p_exam_id)
    ),
    'total_exams', (
      SELECT COUNT(DISTINCT es.exam_id)
      FROM student_results sr
      JOIN exam_subjects es ON es.id = sr.exam_subject_id
      WHERE sr.school_id = p_school_id
        AND sr.status = 'published'
    ),
    'subject_performance', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'subject_id', sub.id,
          'subject_name', sub.name,
          'average_score', ROUND(AVG(sr.score), 2),
          'pass_rate', ROUND(
            COUNT(CASE WHEN sr.score >= es.pass_marks THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100,
            2
          )
        )
      )
      FROM student_results sr
      JOIN exam_subjects es ON es.id = sr.exam_subject_id
      JOIN subjects sub ON sub.id = es.subject_id
      WHERE sr.school_id = p_school_id
        AND sr.status = 'published'
        AND (p_exam_id IS NULL OR es.exam_id = p_exam_id)
      GROUP BY sub.id, sub.name
    )
  );
$$;

-- 6.4 Get finance analytics
CREATE OR REPLACE FUNCTION get_finance_analytics(
  p_school_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'total_expected', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM student_bills
      WHERE school_id = p_school_id
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    ),
    'total_collected', (
      SELECT COALESCE(SUM(amount_paid), 0)
      FROM student_bills
      WHERE school_id = p_school_id
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    ),
    'total_outstanding', (
      SELECT COALESCE(SUM(balance), 0)
      FROM student_bills
      WHERE school_id = p_school_id
    ),
    'collection_rate', (
      SELECT ROUND(
        COALESCE(SUM(amount_paid), 0)::DECIMAL / NULLIF(SUM(total_amount), 0) * 100,
        2
      )
      FROM student_bills
      WHERE school_id = p_school_id
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    ),
    'overdue_count', (
      SELECT COUNT(*)
      FROM student_bills
      WHERE school_id = p_school_id
        AND status IN ('unpaid', 'overdue')
    ),
    'payment_methods', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'method', p.method,
          'total', SUM(p.amount)
        )
      )
      FROM payments p
      JOIN student_bills sb ON sb.id = p.invoice_id
      WHERE sb.school_id = p_school_id
        AND (p_start_date IS NULL OR p.payment_date >= p_start_date)
        AND (p_end_date IS NULL OR p.payment_date <= p_end_date)
      GROUP BY p.method
    )
  );
$$;

-- 6.5 Detect attendance alerts
CREATE OR REPLACE FUNCTION detect_attendance_alerts(p_school_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Find students with attendance below 70%
  INSERT INTO analytics_alerts (school_id, type, title, description, severity, related_student_id, metadata)
  SELECT 
    p_school_id,
    'attendance',
    'Low Attendance Alert: ' || s.full_name,
    s.full_name || ' has attendance below 70% in the last 30 days (' || 
    ROUND(
      COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(*), 0) * 100,
      2
    ) || '%)',
    'high',
    s.id,
    jsonb_build_object(
      'attendance_rate', ROUND(
        COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100,
        2
      ),
      'absent_days', COUNT(CASE WHEN ar.status = 'absent' THEN 1 END),
      'total_days', COUNT(*)
    )
  FROM students s
  JOIN attendance_records ar ON ar.student_id = s.id
  WHERE s.school_id = p_school_id
    AND s.status = 'active'
    AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY s.id, s.full_name
  HAVING COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100 < 70
  ON CONFLICT DO NOTHING;
END;
$$;

-- 6.6 Detect finance alerts
CREATE OR REPLACE FUNCTION detect_finance_alerts(p_school_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Find classes with high outstanding fees
  INSERT INTO analytics_alerts (school_id, type, title, description, severity, related_class_id, metadata)
  SELECT 
    p_school_id,
    'finance',
    'High Outstanding Fees: ' || c.name,
    c.name || ' has K' || COALESCE(SUM(sb.balance), 0)::TEXT || ' in outstanding fees',
    CASE 
      WHEN SUM(sb.balance) > 100000 THEN 'high'
      WHEN SUM(sb.balance) > 50000 THEN 'medium'
      ELSE 'low'
    END,
    s.class_id,
    jsonb_build_object(
      'outstanding_amount', COALESCE(SUM(sb.balance), 0),
      'students_count', COUNT(DISTINCT sb.student_id)
    )
  FROM student_bills sb
  JOIN students s ON s.id = sb.student_id
  JOIN classes c ON c.id = s.class_id
  WHERE s.school_id = p_school_id
    AND sb.balance > 0
  GROUP BY s.class_id, c.name
  HAVING SUM(sb.balance) > 10000
  ON CONFLICT DO NOTHING;
END;
$$;

-- 6.7 Detect academic alerts
CREATE OR REPLACE FUNCTION detect_academic_alerts(p_school_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Find subjects with declining performance
  INSERT INTO analytics_alerts (school_id, type, title, description, severity, metadata)
  SELECT 
    p_school_id,
    'academic',
    'Performance Drop: ' || sub.name,
    sub.name || ' average score dropped significantly compared to previous exam',
    'medium',
    jsonb_build_object(
      'subject_id', sub.id,
      'subject_name', sub.name,
      'current_average', current_avg.avg_score,
      'previous_average', previous_avg.avg_score,
      'drop_percentage', ROUND((current_avg.avg_score - previous_avg.avg_score), 2)
    )
  FROM subjects sub
  JOIN exam_subjects es ON es.subject_id = sub.id
  JOIN student_results sr ON sr.exam_subject_id = es.id
  JOIN (
    SELECT es.subject_id, AVG(sr.score) as avg_score
    FROM student_results sr
    JOIN exam_subjects es ON es.id = sr.exam_subject_id
    WHERE sr.school_id = p_school_id
      AND sr.status = 'published'
      AND es.exam_id IN (
        SELECT id FROM exams WHERE school_id = p_school_id ORDER BY created_at DESC LIMIT 1
      )
    GROUP BY es.subject_id
  ) current_avg ON current_avg.subject_id = sub.id
  JOIN (
    SELECT es.subject_id, AVG(sr.score) as avg_score
    FROM student_results sr
    JOIN exam_subjects es ON es.id = sr.exam_subject_id
    WHERE sr.school_id = p_school_id
      AND sr.status = 'published'
      AND es.exam_id IN (
        SELECT id FROM exams WHERE school_id = p_school_id ORDER BY created_at DESC LIMIT 1 OFFSET 1
      )
    GROUP BY es.subject_id
  ) previous_avg ON previous_avg.subject_id = sub.id
  WHERE (current_avg.avg_score - previous_avg.avg_score) < -10
  ON CONFLICT DO NOTHING;
END;
$$;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

CREATE TRIGGER update_analytics_alerts_updated_at
  BEFORE UPDATE ON analytics_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_cache_updated_at
  BEFORE UPDATE ON analytics_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- ANALYTICS ALERTS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_alerts"
  ON analytics_alerts FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar')
      )
    )
  );

-- Teachers: Can view alerts for their classes
CREATE POLICY "teacher_view_class_alerts"
  ON analytics_alerts FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
    AND related_class_id IN (
      SELECT class_id FROM teacher_assignments WHERE teacher_id = auth.uid()
    )
  );

-- REPORTS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_reports"
  ON reports FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar')
      )
    )
  );

-- Teachers: Can view reports for their classes
CREATE POLICY "teacher_view_class_reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher')
      )
    )
  );

-- DASHBOARD WIDGETS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_widgets"
  ON dashboard_widgets FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal')
      )
    )
  );

-- All authenticated users: Can view widgets
CREATE POLICY "users_view_widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
    AND is_visible = TRUE
  );

-- ANALYTICS CACHE POLICIES

-- System: Can manage cache
CREATE POLICY "system_manage_cache"
  ON analytics_cache FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar', 'teacher')
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar', 'teacher')
      )
    )
  );

-- ============================================================================
-- 9. GRANTS
-- ============================================================================

GRANT ALL ON analytics_alerts TO authenticated;
GRANT ALL ON reports TO authenticated;
GRANT ALL ON dashboard_widgets TO authenticated;
GRANT ALL ON analytics_cache TO authenticated;

GRANT SELECT ON student_enrollment_summary TO authenticated;
GRANT SELECT ON attendance_summary_view TO authenticated;
GRANT SELECT ON academic_performance_summary TO authenticated;
GRANT SELECT ON finance_summary_view TO authenticated;
GRANT SELECT ON staff_workload_summary TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE analytics_alerts_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE reports_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE dashboard_widgets_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE analytics_cache_id_seq TO authenticated;

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE analytics_alerts IS 'Automated alerts and insights for school management';
COMMENT ON TABLE reports IS 'Generated reports with export functionality';
COMMENT ON TABLE dashboard_widgets IS 'Customizable dashboard widgets';
COMMENT ON TABLE analytics_cache IS 'Cache for analytics queries to improve performance';

COMMENT ON VIEW student_enrollment_summary IS 'Student enrollment statistics by grade';
COMMENT ON VIEW attendance_summary_view IS 'Attendance statistics by grade and class';
COMMENT ON VIEW academic_performance_summary IS 'Academic performance by grade, class, and subject';
COMMENT ON VIEW finance_summary_view IS 'Financial summary by grade and class';
COMMENT ON VIEW staff_workload_summary IS 'Staff workload and assignment summary';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================