-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260129_staff_leave_attendance_contracts
-- Staff Leave, Attendance, Performance, Contracts, Documents, Separations
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. STAFF LEAVE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_leave (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,

  -- Leave details
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'maternity', 'paternity', 'compassionate', 'study', 'unpaid', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),

  -- Documentation
  reason TEXT NOT NULL,
  supporting_documents TEXT[],

  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Additional
  notes TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_staff_leave_school ON staff_leave(school_id);
CREATE INDEX idx_staff_leave_staff ON staff_leave(staff_id);
CREATE INDEX idx_staff_leave_status ON staff_leave(status);
CREATE INDEX idx_staff_leave_dates ON staff_leave(start_date, end_date);

-- ============================================================================
-- 2. STAFF ATTENDANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,

  -- Attendance details
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),

  -- Additional
  late_minutes INTEGER DEFAULT 0,
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(school_id, staff_id, attendance_date)
);

CREATE INDEX idx_staff_attendance_school ON staff_attendance(school_id);
CREATE INDEX idx_staff_attendance_staff ON staff_attendance(staff_id);
CREATE INDEX idx_staff_attendance_date ON staff_attendance(attendance_date);
CREATE INDEX idx_staff_attendance_status ON staff_attendance(status);

-- ============================================================================
-- 3. STAFF PERFORMANCE REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_performance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,

  -- Review period
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  review_date DATE NOT NULL,

  -- Reviewer
  reviewed_by UUID NOT NULL REFERENCES auth.users(id),

  -- Performance metrics
  teaching_quality INTEGER CHECK (teaching_quality BETWEEN 1 AND 5),
  punctuality INTEGER CHECK (punctuality BETWEEN 1 AND 5),
  teamwork INTEGER CHECK (teamwork BETWEEN 1 AND 5),
  communication INTEGER CHECK (communication BETWEEN 1 AND 5),
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),

  -- Review content
  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  comments TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged', 'completed')),

  -- Acknowledgment
  acknowledged_at TIMESTAMPTZ,
  staff_comments TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_performance_school ON staff_performance_reviews(school_id);
CREATE INDEX idx_staff_performance_staff ON staff_performance_reviews(staff_id);
CREATE INDEX idx_staff_performance_reviewer ON staff_performance_reviews(reviewed_by);
CREATE INDEX idx_staff_performance_date ON staff_performance_reviews(review_date);
CREATE INDEX idx_staff_performance_status ON staff_performance_reviews(status);

-- ============================================================================
-- 4. STAFF CONTRACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,

  -- Contract details
  contract_type TEXT NOT NULL CHECK (contract_type IN ('permanent', 'contract', 'temporary', 'internship')),
  contract_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,

  -- Employment terms
  position TEXT NOT NULL,
  department TEXT,
  salary_amount DECIMAL(10, 2),
  salary_currency TEXT DEFAULT 'USD',
  working_hours_per_week INTEGER,

  -- Leave entitlement
  annual_leave_days INTEGER DEFAULT 21,
  sick_leave_days INTEGER DEFAULT 10,

  -- Documentation
  contract_document_url TEXT,
  supporting_documents TEXT[],

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),

  -- Additional
  terms_and_conditions TEXT,
  notes TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(school_id, contract_number)
);

CREATE INDEX idx_staff_contracts_school ON staff_contracts(school_id);
CREATE INDEX idx_staff_contracts_staff ON staff_contracts(staff_id);
CREATE INDEX idx_staff_contracts_status ON staff_contracts(status);
CREATE INDEX idx_staff_contracts_dates ON staff_contracts(start_date, end_date);

-- ============================================================================
-- 5. STAFF DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,

  -- Document details
  document_type TEXT NOT NULL CHECK (document_type IN ('cv', 'certificate', 'qualification', 'id_copy', 'passport', 'visa', 'contract', 'other')),
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,

  -- Metadata
  description TEXT,
  expiry_date DATE,
  issue_date DATE,
  issuing_authority TEXT,

  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'archived')),

  -- Audit
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_documents_school ON staff_documents(school_id);
CREATE INDEX idx_staff_documents_staff ON staff_documents(staff_id);
CREATE INDEX idx_staff_documents_type ON staff_documents(document_type);
CREATE INDEX idx_staff_documents_status ON staff_documents(status);
CREATE INDEX idx_staff_documents_expiry ON staff_documents(expiry_date);

-- ============================================================================
-- 6. STAFF SEPARATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_separations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,

  -- Separation details
  separation_type TEXT NOT NULL CHECK (separation_type IN ('resignation', 'termination', 'retirement', 'contract_end', 'mutual_agreement')),
  separation_date DATE NOT NULL,
  last_working_date DATE NOT NULL,

  -- Reason
  reason TEXT NOT NULL,
  detailed_reason TEXT,

  -- Clearance
  notice_period_days INTEGER,
  notice_period_start DATE,
  notice_period_end DATE,
  served_notice_period BOOLEAN DEFAULT TRUE,

  -- Clearance checklist
  equipment_returned BOOLEAN DEFAULT FALSE,
  library_books_returned BOOLEAN DEFAULT FALSE,
  outstanding_dues_cleared BOOLEAN DEFAULT FALSE,
  exit_interview_completed BOOLEAN DEFAULT FALSE,

  -- Final settlement
  final_salary_amount DECIMAL(10, 2),
  final_salary_paid BOOLEAN DEFAULT FALSE,
  final_salary_paid_date DATE,
  benefits_cleared BOOLEAN DEFAULT FALSE,

  -- Documentation
  resignation_letter_url TEXT,
  exit_interview_document_url TEXT,
  clearance_certificate_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'in_progress', 'completed', 'cancelled')),

  -- Additional
  rehire_eligible BOOLEAN DEFAULT TRUE,
  rehire_notes TEXT,
  notes TEXT,

  -- Audit
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_separation_dates CHECK (last_working_date >= separation_date)
);

CREATE INDEX idx_staff_separations_school ON staff_separations(school_id);
CREATE INDEX idx_staff_separations_staff ON staff_separations(staff_id);
CREATE INDEX idx_staff_separations_status ON staff_separations(status);
CREATE INDEX idx_staff_separations_dates ON staff_separations(separation_date, last_working_date);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all staff tables
ALTER TABLE staff_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_separations ENABLE ROW LEVEL SECURITY;

-- STAFF LEAVE POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_staff_leave"
  ON staff_leave FOR ALL
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

-- Staff: Can view own leave records
CREATE POLICY "staff_view_own_leave"
  ON staff_leave FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher', 'school_admin', 'principal')
      )
    )
    AND staff_id IN (
      SELECT id FROM staff_profiles WHERE id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- STAFF ATTENDANCE POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_staff_attendance"
  ON staff_attendance FOR ALL
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

-- Staff: Can view own attendance
CREATE POLICY "staff_view_own_attendance"
  ON staff_attendance FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher', 'school_admin', 'principal')
      )
    )
    AND staff_id IN (
      SELECT id FROM staff_profiles WHERE id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- STAFF PERFORMANCE REVIEWS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_staff_performance"
  ON staff_performance_reviews FOR ALL
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

-- Staff: Can view own performance reviews
CREATE POLICY "staff_view_own_performance"
  ON staff_performance_reviews FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher', 'school_admin', 'principal')
      )
    )
    AND staff_id IN (
      SELECT id FROM staff_profiles WHERE id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- STAFF CONTRACTS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_staff_contracts"
  ON staff_contracts FOR ALL
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

-- Staff: Can view own contracts
CREATE POLICY "staff_view_own_contracts"
  ON staff_contracts FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher', 'school_admin', 'principal')
      )
    )
    AND staff_id IN (
      SELECT id FROM staff_profiles WHERE id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- STAFF DOCUMENTS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_staff_documents"
  ON staff_documents FOR ALL
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

-- Staff: Can view own documents
CREATE POLICY "staff_view_own_documents"
  ON staff_documents FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (
        SELECT id FROM roles WHERE key IN ('teacher', 'school_admin', 'principal')
      )
    )
    AND staff_id IN (
      SELECT id FROM staff_profiles WHERE id IN (
        SELECT staff_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- STAFF SEPARATIONS POLICIES

-- School Admin: Full access
CREATE POLICY "school_admin_manage_staff_separations"
  ON staff_separations FOR ALL
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

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- 8.1 Calculate leave days
CREATE OR REPLACE FUNCTION calculate_leave_days(p_start_date DATE, p_end_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN (p_end_date - p_start_date + 1);
END;
$$;

-- 8.2 Get staff leave balance
CREATE OR REPLACE FUNCTION get_staff_leave_balance(
  p_staff_id UUID,
  p_school_id UUID,
  p_leave_type TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total_allocated INTEGER;
  v_total_used INTEGER;
BEGIN
  -- Get allocated days (from contract or default)
  SELECT COALESCE(annual_leave_days, 21) INTO v_total_allocated
  FROM staff_contracts
  WHERE staff_id = p_staff_id
    AND school_id = p_school_id
    AND status = 'active'
  LIMIT 1;

  IF v_total_allocated IS NULL THEN
    v_total_allocated := 21; -- Default
  END IF;

  -- Get used days
  SELECT COALESCE(SUM(total_days), 0) INTO v_total_used
  FROM staff_leave
  WHERE staff_id = p_staff_id
    AND school_id = p_school_id
    AND leave_type = p_leave_type
    AND status IN ('approved', 'completed')
    AND EXTRACT(YEAR FROM start_date) = p_year;

  RETURN v_total_allocated - v_total_used;
END;
$$;

-- 8.3 Get staff attendance summary
CREATE OR REPLACE FUNCTION get_staff_attendance_summary(
  p_staff_id UUID,
  p_school_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_days INTEGER,
  present_days INTEGER,
  absent_days INTEGER,
  late_days INTEGER,
  leave_days INTEGER,
  attendance_percentage DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_days,
    COUNT(CASE WHEN status = 'present' THEN 1 END)::INTEGER as present_days,
    COUNT(CASE WHEN status = 'absent' THEN 1 END)::INTEGER as absent_days,
    COUNT(CASE WHEN status = 'late' THEN 1 END)::INTEGER as late_days,
    COUNT(CASE WHEN status = 'on_leave' THEN 1 END)::INTEGER as leave_days,
    ROUND(
      (COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END)::DECIMAL / COUNT(*)) * 100,
      2
    ) as attendance_percentage
  FROM staff_attendance
  WHERE staff_id = p_staff_id
    AND school_id = p_school_id
    AND attendance_date BETWEEN p_start_date AND p_end_date
  GROUP BY staff_id, school_id;
END;
$$;

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Update timestamps for staff_leave
CREATE TRIGGER update_staff_leave_updated_at
  BEFORE UPDATE ON staff_leave
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for staff_attendance
CREATE TRIGGER update_staff_attendance_updated_at
  BEFORE UPDATE ON staff_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for staff_performance_reviews
CREATE TRIGGER update_staff_performance_reviews_updated_at
  BEFORE UPDATE ON staff_performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for staff_contracts
CREATE TRIGGER update_staff_contracts_updated_at
  BEFORE UPDATE ON staff_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for staff_documents
CREATE TRIGGER update_staff_documents_updated_at
  BEFORE UPDATE ON staff_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamps for staff_separations
CREATE TRIGGER update_staff_separations_updated_at
  BEFORE UPDATE ON staff_separations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE staff_leave IS 'Staff leave management and tracking';
COMMENT ON TABLE staff_attendance IS 'Staff daily attendance records';
COMMENT ON TABLE staff_performance_reviews IS 'Staff performance review records';
COMMENT ON TABLE staff_contracts IS 'Staff employment contracts';
COMMENT ON TABLE staff_documents IS 'Staff document storage and management';
COMMENT ON TABLE staff_separations IS 'Staff separation and offboarding workflow';

-- ============================================================================
-- 11. GRANTS
-- ============================================================================

GRANT ALL ON staff_leave TO authenticated;
GRANT ALL ON staff_attendance TO authenticated;
GRANT ALL ON staff_performance_reviews TO authenticated;
GRANT ALL ON staff_contracts TO authenticated;
GRANT ALL ON staff_documents TO authenticated;
GRANT ALL ON staff_separations TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE staff_leave_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE staff_attendance_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE staff_performance_reviews_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE staff_contracts_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE staff_documents_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE staff_separations_id_seq TO authenticated;