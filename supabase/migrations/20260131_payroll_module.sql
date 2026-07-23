-- Payroll Management - Staff payroll processing and payslips
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  housing_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  medical_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_hours INTEGER NOT NULL DEFAULT 0,
  overtime_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_pay NUMERIC(12,2) GENERATED ALWAYS AS (overtime_hours * overtime_rate) STORED,
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  pension_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  health_insurance NUMERIC(12,2) NOT NULL DEFAULT 0,
  loan_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_payment NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_pay NUMERIC(12,2) GENERATED ALWAYS AS (basic_salary + housing_allowance + transport_allowance + medical_allowance + other_allowances + overtime_pay + bonus + commission) STORED,
  total_deductions NUMERIC(12,2) GENERATED ALWAYS AS (tax_deduction + pension_deduction + health_insurance + loan_deduction + other_deductions + advance_payment) STORED,
  net_pay NUMERIC(12,2) GENERATED ALWAYS AS (gross_pay - total_deductions) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'mobile_money')),
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, staff_id, period_start, period_end)
);

CREATE INDEX idx_payroll_records_school ON payroll_records(school_id);
CREATE INDEX idx_payroll_records_staff ON payroll_records(staff_id);
CREATE INDEX idx_payroll_records_period ON payroll_records(period_start, period_end);
CREATE INDEX idx_payroll_records_status ON payroll_records(status);

CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payroll_record_id UUID NOT NULL REFERENCES payroll_records(id) ON DELETE CASCADE,
  payslip_number TEXT NOT NULL UNIQUE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_name TEXT NOT NULL,
  staff_position TEXT,
  staff_department TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL,
  total_allowances NUMERIC(12,2) NOT NULL,
  total_deductions NUMERIC(12,2) NOT NULL,
  gross_pay NUMERIC(12,2) NOT NULL,
  net_pay NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'viewed', 'downloaded')),
  generated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payslips_school ON payslips(school_id);
CREATE INDEX idx_payslips_payroll_record ON payslips(payroll_record_id);
CREATE INDEX idx_payslips_number ON payslips(payslip_number);

CREATE TABLE IF NOT EXISTS payroll_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  tax_rate_percentage NUMERIC(5,2) NOT NULL DEFAULT 10,
  tax_threshold NUMERIC(12,2) NOT NULL DEFAULT 0,
  pension_rate_percentage NUMERIC(5,2) NOT NULL DEFAULT 5,
  pension_employer_match_percentage NUMERIC(5,2) NOT NULL DEFAULT 5,
  overtime_rate_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.5,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  default_payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  auto_process BOOLEAN NOT NULL DEFAULT FALSE,
  processing_day INTEGER NOT NULL DEFAULT 25,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id)
);

CREATE INDEX idx_payroll_settings_school ON payroll_settings(school_id);

CREATE TABLE IF NOT EXISTS salary_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position TEXT NOT NULL,
  department TEXT,
  employment_type TEXT CHECK (employment_type IN ('permanent', 'contract', 'temporary', 'intern')),
  basic_salary NUMERIC(12,2) NOT NULL,
  housing_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  medical_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salary_structures_school ON salary_structures(school_id);
CREATE INDEX idx_salary_structures_position ON salary_structures(position);
CREATE INDEX idx_salary_structures_active ON salary_structures(is_active) WHERE is_active = TRUE;

-- RLS Policies
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_admin_manage_payroll_records" ON payroll_records FOR ALL TO authenticated
USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar'))))
WITH CHECK (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar'))));

CREATE POLICY "staff_view_own_payroll_records" ON payroll_records FOR SELECT TO authenticated
USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('teacher', 'staff'))) AND staff_id IN (SELECT staff_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "platform_admin_manage_payroll_records" ON payroll_records FOR ALL TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "school_admin_manage_payslips" ON payslips FOR ALL TO authenticated
USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar'))))
WITH CHECK (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar'))));

CREATE POLICY "staff_view_own_payslips" ON payslips FOR SELECT TO authenticated
USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('teacher', 'staff'))) AND payroll_record_id IN (SELECT id FROM payroll_records WHERE staff_id IN (SELECT staff_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "platform_admin_manage_payslips" ON payslips FOR ALL TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "school_admin_manage_payroll_settings" ON payroll_settings FOR ALL TO authenticated
USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar'))))
WITH CHECK (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar'))));

CREATE POLICY "platform_admin_manage_payroll_settings" ON payroll_settings FOR ALL TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "school_admin_manage_salary_structures" ON salary_structures FOR ALL TO authenticated
USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar'))))
WITH CHECK (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('school_admin', 'principal', 'bursar'))));

CREATE POLICY "staff_view_salary_structures" ON salary_structures FOR SELECT TO authenticated
USING (school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM roles WHERE key IN ('teacher', 'staff'))) AND is_active = TRUE);

CREATE POLICY "platform_admin_manage_salary_structures" ON salary_structures FOR ALL TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_payroll_records_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_payroll_records_updated_at BEFORE UPDATE ON payroll_records FOR EACH ROW EXECUTE FUNCTION update_payroll_records_updated_at();

CREATE OR REPLACE FUNCTION update_payroll_settings_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_payroll_settings_updated_at BEFORE UPDATE ON payroll_settings FOR EACH ROW EXECUTE FUNCTION update_payroll_settings_updated_at();

CREATE OR REPLACE FUNCTION update_salary_structures_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_salary_structures_updated_at BEFORE UPDATE ON salary_structures FOR EACH ROW EXECUTE FUNCTION update_salary_structures_updated_at();

-- Helper function to generate payslip number
CREATE OR REPLACE FUNCTION generate_payslip_number(school_id UUID) RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  sequence_num INTEGER;
  payslip_num TEXT;
BEGIN
  prefix := 'PAY';
  SELECT COALESCE(MAX(CAST(SUBSTRING(payslip_number FROM 5) AS INTEGER)), 0) + 1 INTO sequence_num
  FROM payslips WHERE school_id = school_id;
  payslip_num := prefix || LPAD(sequence_num::TEXT, 6, '0');
  RETURN payslip_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate payroll summary
CREATE OR REPLACE FUNCTION get_payroll_summary(school_id UUID, period_start DATE, period_end DATE)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_records', COUNT(*),
    'total_gross_pay', SUM(gross_pay),
    'total_net_pay', SUM(net_pay),
    'total_deductions', SUM(total_deductions),
    'pending_count', COUNT(*) FILTER (WHERE status = 'pending'),
    'processed_count', COUNT(*) FILTER (WHERE status = 'processed'),
    'paid_count', COUNT(*) FILTER (WHERE status = 'paid')
  )
  INTO result
  FROM payroll_records
  WHERE school_id = school_id
  AND period_start = period_start
  AND period_end = period_end;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
