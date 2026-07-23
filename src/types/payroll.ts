// Payroll Types
export type PayrollStatus = 'pending' | 'processed' | 'paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'mobile_money';
export type EmploymentType = 'permanent' | 'contract' | 'temporary' | 'intern';
export type PayslipStatus = 'generated' | 'sent' | 'viewed' | 'downloaded';

export interface PayrollRecord {
  id: string;
  school_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  staff_id: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  other_allowances: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_pay: number;
  bonus: number;
  commission: number;
  tax_deduction: number;
  pension_deduction: number;
  health_insurance: number;
  loan_deduction: number;
  other_deductions: number;
  advance_payment: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: PayrollStatus;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  paid_at?: string;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    position?: string;
    department?: string;
    email?: string;
  };
  approved_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface Payslip {
  id: string;
  school_id: string;
  payroll_record_id: string;
  payslip_number: string;
  generated_at: string;
  staff_name: string;
  staff_position?: string;
  staff_department?: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  basic_salary: number;
  total_allowances: number;
  total_deductions: number;
  gross_pay: number;
  net_pay: number;
  currency: string;
  status: PayslipStatus;
  generated_by: string;
  created_at: string;
  
  // Joined fields
  payroll_record?: PayrollRecord;
  generated_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface PayrollSettings {
  id: string;
  school_id: string;
  tax_rate_percentage: number;
  tax_threshold: number;
  pension_rate_percentage: number;
  pension_employer_match_percentage: number;
  overtime_rate_multiplier: number;
  currency: string;
  default_payment_method: PaymentMethod;
  auto_process: boolean;
  processing_day: number;
  updated_by?: string;
  updated_at: string;
}

export interface SalaryStructure {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  position: string;
  department?: string;
  employment_type?: EmploymentType;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  other_allowances: number;
  is_active: boolean;
  effective_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

_export interface CreatePayrollRecordInput {
  period_start: string;
  period_end: string;
  pay_date: string;
  staff_id: string;
  basic_salary: number;
  housing_allowance?: number;
  transport_allowance?: number;
  medical_allowance?: number;
  other_allowances?: number;
  overtime_hours?: number;
  overtime_rate?: number;
  bonus?: number;
  commission?: number;
  tax_deduction?: number;
  pension_deduction?: number;
  health_insurance?: number;
  loan_deduction?: number;
  other_deductions?: number;
  advance_payment?: number;
  payment_method?: PaymentMethod;
  notes?: string;
}

export interface UpdatePayrollRecordInput {
  basic_salary?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  medical_allowance?: number;
  other_allowances?: number;
  overtime_hours?: number;
  overtime_rate?: number;
  bonus?: number;
  commission?: number;
  tax_deduction?: number;
  pension_deduction?: number;
  health_insurance?: number;
  loan_deduction?: number;
  other_deductions?: number;
  advance_payment?: number;
  status?: PayrollStatus;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  approval_notes?: string;
  notes?: string;
}

export interface CreateSalaryStructureInput {
  name: string;
  description?: string;
  position: string;
  department?: string;
  employment_type?: EmploymentType;
  basic_salary: number;
  housing_allowance?: number;
  transport_allowance?: number;
  medical_allowance?: number;
  other_allowances?: number;
  effective_date?: string;
}

export interface UpdateSalaryStructureInput {
  name?: string;
  description?: string;
  position?: string;
  department?: string;
  employment_type?: EmploymentType;
  basic_salary?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  medical_allowance?: number;
  other_allowances?: number;
  is_active?: boolean;
  effective_date?: string;
}

export interface PayrollSummary {
  total_records: number;
  total_gross_pay: number;
  total_net_pay: number;
  total_deductions: number;
  pending_count: number;
  processed_count: number;
  paid_count: number;
}
