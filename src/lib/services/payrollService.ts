import { supabase } from '../supabase/client';
import type { 
  Employee, 
  SalaryComponent, 
  EmployeeSalaryAssignment,
  PayrollPeriod,
  Payroll,
  PayrollPayment,
  Payslip
} from '../supabase/types';

// ============================================================================
// EMPLOYEE MANAGEMENT
// ============================================================================

export async function createEmployee(schoolId: string, data: {
  staff_id: string;
  employee_number?: string;
  employment_type: 'permanent' | 'contract' | 'temporary' | 'intern';
  department?: string;
  job_title?: string;
  date_of_joining: string;
  contract_start_date?: string;
  contract_end_date?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  mobile_money_number?: string;
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
}) {
  const { data: employee, error } = await supabase
    .from('employees')
    .insert({
      school_id: schoolId,
      ...data,
    })
    .select()
    .single();

  if (error) throw error;
  return employee as Employee;
}

export async function getEmployees(schoolId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Employee[];
}

export async function getEmployeeById(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Employee;
}

export async function updateEmployee(id: string, updates: Partial<Employee>) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Employee;
}

export async function terminateEmployee(id: string, terminationDate: string, reason: string) {
  const { data, error } = await supabase
    .from('employees')
    .update({
      is_active: false,
      termination_date: terminationDate,
      termination_reason: reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Employee;
}

// ============================================================================
// SALARY COMPONENTS
// ============================================================================

export async function createSalaryComponent(schoolId: string, data: {
  name: string;
  code: string;
  description?: string;
  component_type: 'earning' | 'deduction';
  category: 'basic' | 'allowance' | 'benefit' | 'tax' | 'deduction' | 'statutory';
  calculation_type: 'fixed' | 'percentage' | 'formula';
  value?: number;
  percentage_of?: number;
  formula?: string;
  is_taxable?: boolean;
  is_pensionable?: boolean;
  is_mandatory?: boolean;
}) {
  const { data: component, error } = await supabase
    .from('salary_components')
    .insert({
      school_id: schoolId,
      ...data,
      is_taxable: data.is_taxable ?? true,
      is_pensionable: data.is_pensionable ?? true,
      is_mandatory: data.is_mandatory ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return component as SalaryComponent;
}

export async function getSalaryComponents(schoolId: string) {
  const { data, error } = await supabase
    .from('salary_components')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('component_type', { ascending: true });

  if (error) throw error;
  return data as SalaryComponent[];
}

export async function updateSalaryComponent(id: string, updates: Partial<SalaryComponent>) {
  const { data, error } = await supabase
    .from('salary_components')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SalaryComponent;
}

export async function deleteSalaryComponent(id: string) {
  const { error } = await supabase
    .from('salary_components')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// EMPLOYEE SALARY ASSIGNMENTS
// ============================================================================

export async function assignSalaryComponent(employeeId: string, data: {
  salary_component_id: string;
  amount: number;
  effective_date: string;
  end_date?: string;
}) {
  const { data: employee } = await supabase
    .from('employees')
    .select('school_id')
    .eq('id', employeeId)
    .single();

  if (!employee) throw new Error('Employee not found');

  const { data: assignment, error } = await supabase
    .from('employee_salary_assignments')
    .insert({
      school_id: employee.school_id,
      employee_id: employeeId,
      ...data,
    })
    .select()
    .single();

  if (error) throw error;
  return assignment as EmployeeSalaryAssignment;
}

export async function getEmployeeSalaryAssignments(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_salary_assignments')
    .select('*, salary_components(*)')
    .eq('employee_id', employeeId)
    .or('end_date.is.null,end_date.gte.current_date')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateSalaryAssignment(id: string, updates: Partial<EmployeeSalaryAssignment>) {
  const { data, error } = await supabase
    .from('employee_salary_assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeSalaryAssignment;
}

// ============================================================================
// PAYROLL PERIODS
// ============================================================================

export async function createPayrollPeriod(schoolId: string, userId: string, data: {
  period_name: string;
  period_start: string;
  period_end: string;
  payment_date: string;
}) {
  const { data: period, error } = await supabase
    .from('payroll_periods')
    .insert({
      school_id: schoolId,
      created_by: userId,
      ...data,
    })
    .select()
    .single();

  if (error) throw error;
  return period as PayrollPeriod;
}

export async function getPayrollPeriods(schoolId: string) {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('school_id', schoolId)
    .order('period_start', { ascending: false });

  if (error) throw error;
  return data as PayrollPeriod[];
}

export async function updatePayrollPeriod(id: string, updates: Partial<PayrollPeriod>) {
  const { data, error } = await supabase
    .from('payroll_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PayrollPeriod;
}

export async function approvePayrollPeriod(id: string, userId: string) {
  const { data, error } = await supabase
    .from('payroll_periods')
    .update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PayrollPeriod;
}

// ============================================================================
// PAYROLL PROCESSING
// ============================================================================

export async function processPayroll(schoolId: string, payrollPeriodId: string, employeeId: string) {
  // Get employee details
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single();

  if (!employee) throw new Error('Employee not found');

  // Get salary assignments
  const { data: assignments } = await supabase
    .from('employee_salary_assignments')
    .select('*, salary_components(*)')
    .eq('employee_id', employeeId)
    .or('end_date.is.null,end_date.gte.current_date');

  if (!assignments || assignments.length === 0) {
    throw new Error('No salary assignments found for employee');
  }

  // Calculate basic salary and allowances
  let basicSalary = 0;
  const allowances: { name: string; amount: number }[] = [];
  const deductions: { name: string; amount: number; type: string }[] = [];
  let totalDeductions = 0;
  let taxableIncome = 0;

  for (const assignment of assignments) {
    const component = assignment.salary_components as SalaryComponent;
    const amount = Number(assignment.amount);

    if (component.component_type === 'earning') {
      if (component.category === 'basic') {
        basicSalary = amount;
        taxableIncome = amount;
      } else {
        allowances.push({ name: component.name, amount });
        if (component.is_taxable) {
          taxableIncome += amount;
        }
      }
    } else if (component.component_type === 'deduction') {
      let deductionAmount = amount;
      
      // Calculate percentage-based deductions
      if (component.calculation_type === 'percentage') {
        const baseAmount = component.is_taxable ? taxableIncome : (basicSalary + allowances.reduce((sum, a) => sum + a.amount, 0));
        deductionAmount = (baseAmount * component.percentage_of!) / 100;
      }

      deductions.push({
        name: component.name,
        amount: Math.round(deductionAmount * 100) / 100,
        type: component.category,
      });
      totalDeductions += deductionAmount;
    }
  }

  // Calculate statutory deductions (simplified - in production, use proper tax tables)
  const grossSalary = basicSalary + allowances.reduce((sum, a) => sum + a.amount, 0);
  const payeTax = Math.round((taxableIncome * 0.2) * 100) / 100; // 20% PAYE (simplified)
  const nssfDeduction = Math.round((basicSalary * 0.05) * 100) / 100; // 5% NSSF
  const nhifDeduction = Math.round((basicSalary * 0.025) * 100) / 100; // 2.5% NHIF

  totalDeductions += payeTax + nssfDeduction + nhifDeduction;
  const netSalary = grossSalary - totalDeductions;

  // Create payroll record
  const { data: payroll, error } = await supabase
    .from('payroll')
    .insert({
      school_id: schoolId,
      payroll_period_id: payrollPeriodId,
      employee_id: employeeId,
      basic_salary: basicSalary,
      allowances,
      gross_salary: Math.round(grossSalary * 100) / 100,
      deductions: [...deductions, { name: 'PAYE', amount: payeTax, type: 'tax' }, { name: 'NSSF', amount: nssfDeduction, type: 'statutory' }, { name: 'NHIF', amount: nhifDeduction, type: 'statutory' }],
      total_deductions: Math.round(totalDeductions * 100) / 100,
      taxable_income: taxableIncome,
      paye_tax: payeTax,
      nssf_deduction: nssfDeduction,
      nhif_deduction: nhifDeduction,
      net_salary: Math.round(netSalary * 100) / 100,
    })
    .select()
    .single();

  if (error) throw error;
  return payroll as Payroll;
}

export async function getPayrollRecords(schoolId: string, payrollPeriodId?: string) {
  let query = supabase
    .from('payroll')
    .select('*, employees(*), payroll_periods(*)')
    .eq('school_id', schoolId);

  if (payrollPeriodId) {
    query = query.eq('payroll_period_id', payrollPeriodId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data as (Payroll & { employees: any; payroll_periods: any })[];
}

export async function updatePayrollPayment(id: string, updates: {
  payment_status?: 'pending' | 'processing' | 'paid' | 'failed';
  payment_method?: 'bank_transfer' | 'mobile_money' | 'cash' | 'cheque';
  payment_reference?: string;
  payment_date?: string;
}) {
  const { data, error } = await supabase
    .from('payroll')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Payroll;
}

// ============================================================================
// PAYROLL PAYMENTS
// ============================================================================

export async function createPayrollPayment(schoolId: string, data: {
  payroll_id: string;
  amount: number;
  payment_method: 'bank_transfer' | 'mobile_money' | 'cash' | 'cheque';
  payment_reference?: string;
  payment_date: string;
  transaction_id?: string;
  bank_name?: string;
  account_number?: string;
  proof_of_payment_url?: string;
  notes?: string;
}) {
  const { data: payment, error } = await supabase
    .from('payroll_payments')
    .insert({
      school_id: schoolId,
      processed_by: (await supabase.auth.getUser()).data.user?.id,
      ...data,
    })
    .select()
    .single();

  if (error) throw error;
  return payment as PayrollPayment;
}

export async function getPayrollPayments(payrollId: string) {
  const { data, error } = await supabase
    .from('payroll_payments')
    .select('*')
    .eq('payroll_id', payrollId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PayrollPayment[];
}

export async function verifyPayrollPayment(id: string, userId: string) {
  const { data, error } = await supabase
    .from('payroll_payments')
    .update({
      status: 'completed',
      verified_by: userId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PayrollPayment;
}

// ============================================================================
// PAYSLIPS
// ============================================================================

export async function generatePayslip(schoolId: string, payrollId: string, employeeId: string) {
  const { data: payroll } = await supabase
    .from('payroll')
    .select('*, payroll_periods(*)')
    .eq('id', payrollId)
    .single();

  if (!payroll) throw new Error('Payroll record not found');

  const payslipNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  const { data: payslip, error } = await supabase
    .from('payslips')
    .insert({
      school_id: schoolId,
      payroll_id: payrollId,
      employee_id: employeeId,
      payslip_number: payslipNumber,
      period_start: payroll.payroll_periods.period_start,
      period_end: payroll.payroll_periods.period_end,
      basic_salary: payroll.basic_salary,
      total_allowances: payroll.allowances.reduce((sum: number, a: any) => sum + a.amount, 0),
      gross_salary: payroll.gross_salary,
      total_deductions: payroll.total_deductions,
      net_salary: payroll.net_salary,
      earnings: payroll.allowances,
      deductions: payroll.deductions,
      generated_by: (await supabase.auth.getUser()).data.user?.id || '',
    })
    .select()
    .single();

  if (error) throw error;
  return payslip as Payslip;
}

export async function getPayslips(employeeId: string) {
  const { data, error } = await supabase
    .from('payslips')
    .select('*, payroll_periods(*)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as (Payslip & { payroll_periods: any })[];
}

export async function markPayslipAsEmailed(id: string) {
  const { data, error } = await supabase
    .from('payslips')
    .update({
      is_emailed: true,
      emailed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Payslip;
}

// ============================================================================
// PAYROLL REPORTS
// ============================================================================

export async function getPayrollSummary(schoolId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('payroll')
    .select('*, payroll_periods(*)')
    .eq('school_id', schoolId)
    .gte('payroll_periods.period_start', startDate)
    .lte('payroll_periods.period_end', endDate);

  if (error) throw error;

  const totalGross = data.reduce((sum, p) => sum + p.gross_salary, 0);
  const totalDeductions = data.reduce((sum, p) => sum + p.total_deductions, 0);
  const totalNet = data.reduce((sum, p) => sum + p.net_salary, 0);

  return {
    records: data,
    summary: {
      totalEmployees: data.length,
      totalGross: Math.round(totalGross * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
    },
  };
}

export async function getEmployeePayrollHistory(employeeId: string) {
  const { data, error } = await supabase
    .from('payroll')
    .select('*, payroll_periods(*)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as (Payroll & { payroll_periods: any })[];
}