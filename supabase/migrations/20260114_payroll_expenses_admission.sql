-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260114_payroll_expenses_admission
--
-- Three major financial modules:
-- 1. Payroll Management - Staff salary processing and payment tracking
-- 2. Expense Management - School operational expense tracking
-- 3. Admission Policy - Financial clearance and readmission rules
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. PAYROLL MODULE
-- ============================================================================

-- 1.1 EMPLOYEES TABLE (extends staff with payroll-specific info)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  
  -- Employment details
  employee_number TEXT UNIQUE,
  employment_type TEXT NOT NULL DEFAULT 'permanent' CHECK (employment_type IN ('permanent', 'contract', 'temporary', 'intern')),
  department TEXT,
  job_title TEXT,
  date_of_joining DATE NOT NULL,
  contract_start_date DATE,
  contract_end_date DATE,
  
  -- Banking details (for salary payments)
  bank_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  mobile_money_number TEXT,
  
  -- Tax and statutory
  kra_pin TEXT, -- Kenya Revenue Authority PIN
  nssf_number TEXT, -- National Social Security Fund
  nhif_number TEXT, -- National Hospital Insurance Fund
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  termination_date DATE,
  termination_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_id, staff_id)
);

CREATE INDEX idx_employees_school ON employees(school_id);
CREATE INDEX idx_employees_staff ON employees(staff_id);
CREATE INDEX idx_employees_active ON employees(is_active);

-- 1.2 SALARY COMPONENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS salary_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Component details
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  component_type TEXT NOT NULL CHECK (component_type IN ('earning', 'deduction')),
  category TEXT NOT NULL CHECK (category IN ('basic', 'allowance', 'benefit', 'tax', 'deduction', 'statutory')),
  
  -- Calculation method
  calculation_type TEXT NOT NULL DEFAULT 'fixed' CHECK (calculation_type IN ('fixed', 'percentage', 'formula')),
  value DECIMAL(10, 2),
  percentage_of DECIMAL(10, 2), -- percentage of basic salary
  formula TEXT, -- for formula-based calculations
  
  -- Tax treatment
  is_taxable BOOLEAN DEFAULT TRUE,
  is_pensionable BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_mandatory BOOLEAN DEFAULT FALSE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_id, code)
);

CREATE INDEX idx_salary_components_school ON salary_components(school_id);
CREATE INDEX idx_salary_components_type ON salary_components(component_type);

-- 1.3 EMPLOYEE SALARY ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_salary_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salary_component_id UUID NOT NULL REFERENCES salary_components(id) ON DELETE CASCADE,
  
  -- Assignment details
  amount DECIMAL(10, 2) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(employee_id, salary_component_id, effective_date)
);

CREATE INDEX idx_employee_salary_assignments_employee ON employee_salary_assignments(employee_id);
CREATE INDEX idx_employee_salary_assignments_component ON employee_salary_assignments(salary_component_id);

-- 1.4 PAYROLL PERIODS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Period details
  period_name TEXT NOT NULL, -- e.g., "January 2026"
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'approved', 'paid', 'cancelled')),
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_id, period_start, period_end)
);

CREATE INDEX idx_payroll_periods_school ON payroll_periods(school_id);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX idx_payroll_periods_dates ON payroll_periods(period_start, period_end);

-- 1.5 PAYROLL TABLE (individual payroll records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Earnings
  basic_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  allowances JSONB DEFAULT '[]', -- [{name, amount}]
  gross_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Deductions
  deductions JSONB DEFAULT '[]', -- [{name, amount, type}]
  total_deductions DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Tax calculations
  taxable_income DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paye_tax DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Pay As You Earn
  nssf_deduction DECIMAL(10, 2) NOT NULL DEFAULT 0,
  nhif_deduction DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Net pay
  net_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Payment status
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed')),
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'mobile_money', 'cash', 'cheque')),
  payment_reference TEXT,
  payment_date DATE,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(payroll_period_id, employee_id)
);

CREATE INDEX idx_payroll_school ON payroll(school_id);
CREATE INDEX idx_payroll_period ON payroll(payroll_period_id);
CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_payroll_status ON payroll(payment_status);

-- 1.6 PAYROLL PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payroll_id UUID NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'mobile_money', 'cash', 'cheque')),
  payment_reference TEXT,
  payment_date DATE NOT NULL,
  
  -- Transaction details
  transaction_id TEXT,
  bank_name TEXT,
  account_number TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  
  -- Proof
  proof_of_payment_url TEXT,
  
  -- Audit
  processed_by UUID NOT NULL REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payroll_payments_school ON payroll_payments(school_id);
CREATE INDEX idx_payroll_payments_payroll ON payroll_payments(payroll_id);
CREATE INDEX idx_payroll_payments_status ON payroll_payments(status);

-- 1.7 PAYSLIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payroll_id UUID NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Payslip details
  payslip_number TEXT UNIQUE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Summary
  basic_salary DECIMAL(10, 2) NOT NULL,
  total_allowances DECIMAL(10, 2) NOT NULL,
  gross_salary DECIMAL(10, 2) NOT NULL,
  total_deductions DECIMAL(10, 2) NOT NULL,
  net_salary DECIMAL(10, 2) NOT NULL,
  
  -- Detailed breakdown
  earnings JSONB DEFAULT '[]',
  deductions JSONB DEFAULT '[]',
  
  -- Distribution
  is_emailed BOOLEAN DEFAULT FALSE,
  emailed_at TIMESTAMPTZ,
  is_downloaded BOOLEAN DEFAULT FALSE,
  downloaded_at TIMESTAMPTZ,
  
  -- Audit
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payslips_school ON payslips(school_id);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_payroll ON payslips(payroll_id);

-- ============================================================================
-- 2. EXPENSE MANAGEMENT MODULE
-- ============================================================================

-- 2.1 EXPENSE CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Category details
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES expense_categories(id),
  
  -- Budget
  monthly_budget DECIMAL(12, 2),
  annual_budget DECIMAL(12, 2),
  
  -- Approval requirements
  requires_approval BOOLEAN DEFAULT FALSE,
  approval_threshold DECIMAL(10, 2),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_id, code)
);

CREATE INDEX idx_expense_categories_school ON expense_categories(school_id);
CREATE INDEX idx_expense_categories_parent ON expense_categories(parent_category_id);

-- 2.2 VENDORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Vendor details
  name TEXT NOT NULL,
  vendor_type TEXT NOT NULL, -- supplier, contractor, service_provider
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  
  -- Business details
  kra_pin TEXT,
  registration_number TEXT,
  
  -- Banking details
  bank_name TEXT,
  bank_account_number TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_preferred BOOLEAN DEFAULT FALSE,
  rating DECIMAL(2, 1), -- 1-5 stars
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_school ON vendors(school_id);
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_active ON vendors(is_active);

-- 2.3 EXPENSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Expense details
  expense_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  
  -- Categorization
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  vendor_id UUID REFERENCES vendors(id),
  
  -- Amount
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  
  -- Payment
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque', 'credit')),
  payment_reference TEXT,
  payment_date DATE,
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Attachments
  receipt_url TEXT,
  invoice_url TEXT,
  attachments JSONB DEFAULT '[]',
  
  -- Recurring
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  next_due_date DATE,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_school ON expenses(school_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_vendor ON expenses(vendor_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_submitted ON expenses(submitted_by);

-- 2.4 EXPENSE APPROVALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS expense_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  
  -- Approval details
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approval_level INTEGER NOT NULL DEFAULT 1,
  
  -- Decision
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  
  -- Timestamps
  reviewed_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(expense_id, approver_id, approval_level)
);

CREATE INDEX idx_expense_approvals_expense ON expense_approvals(expense_id);
CREATE INDEX idx_expense_approvals_approver ON expense_approvals(approver_id);
CREATE INDEX idx_expense_approvals_status ON expense_approvals(status);

-- ============================================================================
-- 3. ADMISSION POLICY MODULE
-- ============================================================================

-- 3.1 ACADEMIC TERMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Term details
  term_name TEXT NOT NULL, -- e.g., "Term 1", "Term 2", "Term 3"
  term_number INTEGER NOT NULL,
  academic_year TEXT NOT NULL, -- e.g., "2025/2026"
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  
  -- Admission settings
  is_open_for_admission BOOLEAN DEFAULT FALSE,
  admission_deadline DATE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_id, term_number, academic_year)
);

CREATE INDEX idx_academic_terms_school ON academic_terms(school_id);
CREATE INDEX idx_academic_terms_year ON academic_terms(academic_year);
CREATE INDEX idx_academic_terms_status ON academic_terms(status);

-- 3.2 ADMISSION POLICIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS admission_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Policy details
  policy_name TEXT NOT NULL,
  description TEXT,
  
  -- Financial clearance requirements
  require_previous_balance_cleared BOOLEAN DEFAULT TRUE,
  admission_threshold_percentage DECIMAL(5, 2) NOT NULL DEFAULT 40.00, -- % of current term fee
  
  -- Carry forward settings
  carry_forward_outstanding BOOLEAN DEFAULT TRUE,
  
  -- Admission control
  auto_admit_on_payment BOOLEAN DEFAULT TRUE,
  allow_principal_override BOOLEAN DEFAULT TRUE,
  allow_finance_override BOOLEAN DEFAULT TRUE,
  
  -- Notification settings
  notify_on_pending_admission BOOLEAN DEFAULT TRUE,
  notify_on_admission BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admission_policies_school ON admission_policies(school_id);
CREATE INDEX idx_admission_policies_active ON admission_policies(is_active);

-- 3.3 STUDENT PROMOTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Promotion details
  from_class_id UUID REFERENCES classes(id),
  to_class_id UUID REFERENCES classes(id),
  from_term_id UUID REFERENCES academic_terms(id),
  to_term_id UUID REFERENCES academic_terms(id),
  
  -- Academic status
  academic_status TEXT NOT NULL DEFAULT 'promoted' CHECK (academic_status IN ('promoted', 'repeated', 'graduated', 'transferred')),
  
  -- Financial status
  previous_term_outstanding DECIMAL(10, 2) DEFAULT 0,
  current_term_fee DECIMAL(10, 2) DEFAULT 0,
  total_due DECIMAL(10, 2) DEFAULT 0,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  
  -- Admission status
  admission_status TEXT NOT NULL DEFAULT 'pending' CHECK (admission_status IN ('pending', 'admitted', 'rejected', 'deferred')),
  admission_date DATE,
  admitted_by UUID REFERENCES auth.users(id),
  
  -- Override
  is_override BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  override_by UUID REFERENCES auth.users(id),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  promoted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, to_term_id)
);

CREATE INDEX idx_student_promotions_school ON student_promotions(school_id);
CREATE INDEX idx_student_promotions_student ON student_promotions(student_id);
CREATE INDEX idx_student_promotions_term ON student_promotions(to_term_id);
CREATE INDEX idx_student_promotions_status ON student_promotions(admission_status);

-- 3.4 STUDENT BALANCES TABLE (tracks outstanding amounts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  
  -- Fee details
  term_fee DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
  outstanding_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Previous term carry forward
  previous_term_outstanding DECIMAL(10, 2) DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'cleared', 'overdue')),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, term_id)
);

CREATE INDEX idx_student_balances_school ON student_balances(school_id);
CREATE INDEX idx_student_balances_student ON student_balances(student_id);
CREATE INDEX idx_student_balances_term ON student_balances(term_id);
CREATE INDEX idx_student_balances_status ON student_balances(status);

-- 3.5 ADMISSION PAYMENTS TABLE (tracks payments toward admission threshold)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admission_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  student_balance_id UUID NOT NULL REFERENCES student_balances(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  payment_date DATE NOT NULL,
  
  -- Allocation
  allocated_to_previous BOOLEAN DEFAULT FALSE,
  allocated_to_current BOOLEAN DEFAULT FALSE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  
  -- Proof
  proof_of_payment_url TEXT,
  
  -- Audit
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admission_payments_school ON admission_payments(school_id);
CREATE INDEX idx_admission_payments_student ON admission_payments(student_id);
CREATE INDEX idx_admission_payments_term ON admission_payments(term_id);
CREATE INDEX idx_admission_payments_balance ON admission_payments(student_balance_id);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- 4.1 Calculate employee gross salary
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_employee_gross_salary(p_employee_id UUID)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_school_id UUID;
  v_basic_salary DECIMAL(10, 2);
  v_total_allowances DECIMAL(10, 2);
BEGIN
  -- Get school_id
  SELECT school_id INTO v_school_id FROM employees WHERE id = p_employee_id;
  
  -- Get basic salary
  SELECT COALESCE(esa.amount, 0) INTO v_basic_salary
  FROM employee_salary_assignments esa
  JOIN salary_components sc ON sc.id = esa.salary_component_id
  WHERE esa.employee_id = p_employee_id
    AND sc.component_type = 'basic'
    AND sc.is_active = TRUE
    AND (esa.end_date IS NULL OR esa.end_date >= CURRENT_DATE)
  LIMIT 1;
  
  -- Get total allowances
  SELECT COALESCE(SUM(esa.amount), 0) INTO v_total_allowances
  FROM employee_salary_assignments esa
  JOIN salary_components sc ON sc.id = esa.salary_component_id
  WHERE esa.employee_id = p_employee_id
    AND sc.component_type = 'allowance'
    AND sc.is_active = TRUE
    AND (esa.end_date IS NULL OR esa.end_date >= CURRENT_DATE);
  
  RETURN COALESCE(v_basic_salary, 0) + v_total_allowances;
END;
$$;

-- 4.2 Calculate payroll deductions
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_payroll_deductions(
  p_employee_id UUID,
  p_gross_salary DECIMAL(10, 2),
  p_taxable_income DECIMAL(10, 2)
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_school_id UUID;
  v_deductions JSONB := '[]';
  v_component RECORD;
  v_deduction_amount DECIMAL(10, 2);
BEGIN
  -- Get school_id
  SELECT school_id INTO v_school_id FROM employees WHERE id = p_employee_id;
  
  -- Loop through all active deduction components
  FOR v_component IN
    SELECT sc.*, esa.amount as fixed_amount
    FROM salary_components sc
    JOIN employee_salary_assignments esa ON esa.salary_component_id = sc.id
    WHERE sc.school_id = v_school_id
      AND sc.component_type = 'deduction'
      AND sc.is_active = TRUE
      AND esa.employee_id = p_employee_id
      AND (esa.end_date IS NULL OR esa.end_date >= CURRENT_DATE)
  LOOP
    -- Calculate deduction amount
    IF v_component.calculation_type = 'fixed' THEN
      v_deduction_amount := v_component.fixed_amount;
    ELSIF v_component.calculation_type = 'percentage' THEN
      IF v_component.is_taxable THEN
        v_deduction_amount := (p_taxable_income * v_component.percentage_of) / 100;
      ELSE
        v_deduction_amount := (p_gross_salary * v_component.percentage_of) / 100;
      END IF;
    ELSE
      v_deduction_amount := 0;
    END IF;
    
    -- Add to deductions array
    v_deductions := v_deductions || jsonb_build_object(
      'name', v_component.name,
      'code', v_component.code,
      'amount', ROUND(v_deduction_amount, 2),
      'type', v_component.category
    );
  END LOOP;
  
  RETURN v_deductions;
END;
$$;

-- 4.3 Calculate student admission status
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_student_admission_status(
  p_student_id UUID,
  p_term_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_school_id UUID;
  v_policy admission_policies%ROWTYPE;
  v_balance student_balances%ROWTYPE;
  v_required_amount DECIMAL(10, 2);
  v_total_paid DECIMAL(10, 2);
BEGIN
  -- Get school_id
  SELECT school_id INTO v_school_id FROM students WHERE id = p_student_id;
  
  -- Get active admission policy
  SELECT * INTO v_policy
  FROM admission_policies
  WHERE school_id = v_school_id
    AND is_active = TRUE
  LIMIT 1;
  
  -- If no policy, admit by default
  IF v_policy IS NULL THEN
    RETURN 'admitted';
  END IF;
  
  -- Get student balance for this term
  SELECT * INTO v_balance
  FROM student_balances
  WHERE student_id = p_student_id
    AND term_id = p_term_id;
  
  -- If no balance record, admit by default
  IF v_balance IS NULL THEN
    RETURN 'admitted';
  END IF;
  
  -- Calculate required amount
  v_required_amount := (v_balance.term_fee * v_policy.admission_threshold_percentage) / 100;
  
  -- Get total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM admission_payments
  WHERE student_balance_id = v_balance.id
    AND status = 'completed';
  
  -- Check if previous balance is cleared (if required)
  IF v_policy.require_previous_balance_cleared AND v_balance.previous_term_outstanding > 0 THEN
    -- Check if previous balance is fully paid
    IF v_balance.previous_term_outstanding > v_total_paid THEN
      RETURN 'pending';
    END IF;
  END IF;
  
  -- Check if threshold is met
  IF v_total_paid >= v_required_amount THEN
    RETURN 'admitted';
  ELSE
    RETURN 'pending';
  END IF;
END;
$$;

-- 4.4 Auto-admit student when payment threshold is met
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_admit_student_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_school_id UUID;
  v_policy admission_policies%ROWTYPE;
  v_balance student_balances%ROWTYPE;
  v_required_amount DECIMAL(10, 2);
  v_total_paid DECIMAL(10, 2);
  v_admission_status TEXT;
BEGIN
  -- Only process completed payments
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Get school_id
  SELECT school_id INTO v_school_id FROM students WHERE id = NEW.student_id;
  
  -- Get active admission policy
  SELECT * INTO v_policy
  FROM admission_policies
  WHERE school_id = v_school_id
    AND is_active = TRUE
    AND auto_admit_on_payment = TRUE
  LIMIT 1;
  
  -- If no auto-admit policy, exit
  IF v_policy IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get student balance
  SELECT * INTO v_balance
  FROM student_balances
  WHERE id = NEW.student_balance_id;
  
  -- Calculate required amount
  v_required_amount := (v_balance.term_fee * v_policy.admission_threshold_percentage) / 100;
  
  -- Get total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM admission_payments
  WHERE student_balance_id = NEW.student_balance_id
    AND status = 'completed';
  
  -- Check if admission criteria are met
  v_admission_status := calculate_student_admission_status(NEW.student_id, NEW.term_id);
  
  -- Update admission status if criteria met
  IF v_admission_status = 'admitted' THEN
    UPDATE student_promotions
    SET admission_status = 'admitted',
        admission_date = CURRENT_DATE,
        admitted_by = NEW.recorded_by,
        updated_at = NOW()
    WHERE student_id = NEW.student_id
      AND to_term_id = NEW.term_id
      AND admission_status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4.5 Calculate total expenses for a period
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_total_expenses(
  p_school_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS DECIMAL(12, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total DECIMAL(12, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM expenses
  WHERE school_id = p_school_id
    AND expense_date BETWEEN p_start_date AND p_end_date
    AND status NOT IN ('cancelled', 'rejected');
  
  RETURN v_total;
END;
$$;

-- 4.6 Calculate expenses by category
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_expenses_by_category(
  p_school_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  total_amount DECIMAL(12, 2),
  transaction_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.id as category_id,
    ec.name as category_name,
    COALESCE(SUM(e.amount), 0) as total_amount,
    COUNT(e.id) as transaction_count
  FROM expense_categories ec
  LEFT JOIN expenses e ON e.category_id = ec.id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.status NOT IN ('cancelled', 'rejected')
  WHERE ec.school_id = p_school_id
    AND ec.is_active = TRUE
  GROUP BY ec.id, ec.name
  ORDER BY total_amount DESC;
END;
$$;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- 5.1 Update timestamps for employees
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.2 Update timestamps for salary_components
CREATE TRIGGER update_salary_components_updated_at
  BEFORE UPDATE ON salary_components
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.3 Update timestamps for employee_salary_assignments
CREATE TRIGGER update_employee_salary_assignments_updated_at
  BEFORE UPDATE ON employee_salary_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.4 Update timestamps for payroll_periods
CREATE TRIGGER update_payroll_periods_updated_at
  BEFORE UPDATE ON payroll_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.5 Update timestamps for payroll
CREATE TRIGGER update_payroll_updated_at
  BEFORE UPDATE ON payroll
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.6 Update timestamps for payroll_payments
CREATE TRIGGER update_payroll_payments_updated_at
  BEFORE UPDATE ON payroll_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.7 Update timestamps for expense_categories
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.8 Update timestamps for vendors
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.9 Update timestamps for expenses
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.10 Update timestamps for expense_approvals
CREATE TRIGGER update_expense_approvals_updated_at
  BEFORE UPDATE ON expense_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.11 Update timestamps for academic_terms
CREATE TRIGGER update_academic_terms_updated_at
  BEFORE UPDATE ON academic_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.12 Update timestamps for admission_policies
CREATE TRIGGER update_admission_policies_updated_at
  BEFORE UPDATE ON admission_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.13 Update timestamps for student_promotions
CREATE TRIGGER update_student_promotions_updated_at
  BEFORE UPDATE ON student_promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.14 Update timestamps for student_balances
CREATE TRIGGER update_student_balances_updated_at
  BEFORE UPDATE ON student_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.15 Update timestamps for admission_payments
CREATE TRIGGER update_admission_payments_updated_at
  BEFORE UPDATE ON admission_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.16 Auto-admit trigger on admission payments
CREATE TRIGGER trigger_auto_admit_on_payment
  AFTER INSERT OR UPDATE ON admission_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_admit_student_on_payment();

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- 6.1 Employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage employees"
  ON employees FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.2 Salary Components
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage salary components"
  ON salary_components FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.3 Employee Salary Assignments
ALTER TABLE employee_salary_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage salary assignments"
  ON employee_salary_assignments FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.4 Payroll Periods
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage payroll periods"
  ON payroll_periods FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.5 Payroll
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage payroll"
  ON payroll FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.6 Payroll Payments
ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage payroll payments"
  ON payroll_payments FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.7 Payslips
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage payslips"
  ON payslips FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.8 Expense Categories
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage expense categories"
  ON expense_categories FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.9 Vendors
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage vendors"
  ON vendors FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.10 Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage expenses"
  ON expenses FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.11 Expense Approvals
ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage expense approvals"
  ON expense_approvals FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.12 Academic Terms
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage academic terms"
  ON academic_terms FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.13 Admission Policies
ALTER TABLE admission_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage admission policies"
  ON admission_policies FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.14 Student Promotions
ALTER TABLE student_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage student promotions"
  ON student_promotions FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.15 Student Balances
ALTER TABLE student_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage student balances"
  ON student_balances FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6.16 Admission Payments
ALTER TABLE admission_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can manage admission payments"
  ON admission_payments FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND is_master = TRUE
    )
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON employees TO authenticated;
GRANT ALL ON salary_components TO authenticated;
GRANT ALL ON employee_salary_assignments TO authenticated;
GRANT ALL ON payroll_periods TO authenticated;
GRANT ALL ON payroll TO authenticated;
GRANT ALL ON payroll_payments TO authenticated;
GRANT ALL ON payslips TO authenticated;
GRANT ALL ON expense_categories TO authenticated;
GRANT ALL ON vendors TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON expense_approvals TO authenticated;
GRANT ALL ON academic_terms TO authenticated;
GRANT ALL ON admission_policies TO authenticated;
GRANT ALL ON student_promotions TO authenticated;
GRANT ALL ON student_balances TO authenticated;
GRANT ALL ON admission_payments TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE employees IS 'Employee records extending staff with payroll-specific information';
COMMENT ON TABLE salary_components IS 'Configurable salary components (earnings and deductions)';
COMMENT ON TABLE employee_salary_assignments IS 'Employee-specific salary component assignments';
COMMENT ON TABLE payroll_periods IS 'Payroll processing periods';
COMMENT ON TABLE payroll IS 'Individual payroll records per employee per period';
COMMENT ON TABLE payroll_payments IS 'Payment transactions for payroll';
COMMENT ON TABLE payslips IS 'Generated payslips for employees';
COMMENT ON TABLE expense_categories IS 'Expense categories with budget tracking';
COMMENT ON TABLE vendors IS 'Vendor/supplier management';
COMMENT ON TABLE expenses IS 'School expense records';
COMMENT ON TABLE expense_approvals IS 'Multi-level expense approval workflow';
COMMENT ON TABLE academic_terms IS 'Academic term definitions';
COMMENT ON TABLE admission_policies IS 'School admission policies and rules';
COMMENT ON TABLE student_promotions IS 'Student promotion and admission tracking';
COMMENT ON TABLE student_balances IS 'Student fee balances per term';
COMMENT ON TABLE admission_payments IS 'Payments toward admission threshold';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================