import { supabase } from '@/lib/supabase/client';
import {
  PayrollRecord,
  Payslip,
  PayrollSettings,
  SalaryStructure,
  CreatePayrollRecordInput,
  UpdatePayrollRecordInput,
  CreateSalaryStructureInput,
  UpdateSalaryStructureInput,
  PayrollSummary,
} from '@/types/payroll';

async function checkFeatureSubscription(schoolId: string, featureCode: string = 'payroll') {
  const { data: feature, error } = await supabase
    .from('school_modules')
    .select('status')
    .eq('school_id', schoolId)
    .eq('feature_code', featureCode)
    .single();

  if (error || !feature) {
    throw new Error('Feature not subscribed');
  }

  if (feature.status === 'paused') {
    throw new Error('Feature is paused');
  }

  if (feature.status === 'expired') {
    throw new Error('Feature is expired');
  }

  if (feature.status === 'pending') {
    throw new Error('Feature is pending activation');
  }

  if (feature.status === 'removed') {
    throw new Error('Feature has been removed');
  }

  return feature;
}

export async function getPayrollRecords(
  schoolId: string,
  filters?: {
    staff_id?: string;
    status?: string;
    period_start?: string;
    period_end?: string;
  }
): Promise<PayrollRecord[]> {
  await checkFeatureSubscription(schoolId);

  let query = supabase
    .from('payroll_records')
    .select(`
      *,
      staff:staff_profiles(id, first_name, last_name, position, department, email),
      approved_by_profile:profiles(id, full_name, email),
      created_by_profile:profiles(id, full_name, email)
    `)
    .eq('school_id', schoolId);

  if (filters?.staff_id) {
    query = query.eq('staff_id', filters.staff_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.period_start) {
    query = query.gte('period_start', filters.period_start);
  }

  if (filters?.period_end) {
    query = query.lte('period_end', filters.period_end);
  }

  query = query.order('period_start', { ascending: false }).order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getPayrollRecord(
  id: string,
  schoolId: string
): Promise<PayrollRecord> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('payroll_records')
    .select(`
      *,
      staff:staff_profiles(id, first_name, last_name, position, department, email),
      approved_by_profile:profiles(id, full_name, email),
      created_by_profile:profiles(id, full_name, email)
    `)
    .eq('id', id)
    .eq('school_id', schoolId)
    .single();

  if (error) throw error;
  return data;
}

export async function createPayrollRecord(
  input: CreatePayrollRecordInput,
  schoolId: string,
  userId: string
): Promise<PayrollRecord> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('payroll_records')
    .insert({
      ...input,
      school_id: schoolId,
      created_by: userId,
    })
    .select(`
      *,
      staff:staff_profiles(id, first_name, last_name, position, department, email),
      approved_by_profile:profiles(id, full_name, email),
      created_by_profile:profiles(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePayrollRecord(
  id: string,
  input: UpdatePayrollRecordInput,
  schoolId: string
): Promise<PayrollRecord> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('payroll_records')
    .update(input)
    .eq('id', id)
    .eq('school_id', schoolId)
    .select(`
      *,
      staff:staff_profiles(id, first_name, last_name, position, department, email),
      approved_by_profile:profiles(id, full_name, email),
      created_by_profile:profiles(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deletePayrollRecord(
  id: string,
  schoolId: string
): Promise<void> {
  await checkFeatureSubscription(schoolId);

  const { error } = await supabase
    .from('payroll_records')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId);

  if (error) throw error;
}

export async function approvePayrollRecord(
  id: string,
  approvalNotes: string,
  schoolId: string,
  userId: string
): Promise<PayrollRecord> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('payroll_records')
    .update({
      status: 'processed',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      approval_notes: approvalNotes,
    })
    .eq('id', id)
    .eq('school_id', schoolId)
    .select(`
      *,
      staff:staff_profiles(id, first_name, last_name, position, department, email),
      approved_by_profile:profiles(id, full_name, email),
      created_by_profile:profiles(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function markPayrollAsPaid(
  id: string,
  paymentMethod: string,
  paymentReference: string,
  schoolId: string
): Promise<PayrollRecord> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('payroll_records')
    .update({
      status: 'paid',
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      paid_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('school_id', schoolId)
    .select(`
      *,
      staff:staff_profiles(id, first_name, last_name, position, department, email),
      approved_by_profile:profiles(id, full_name, email),
      created_by_profile:profiles(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function getPayslips(
  schoolId: string,
  filters?: {
    payroll_record_id?: string;
    status?: string;
  }
): Promise<Payslip[]> {
  await checkFeatureSubscription(schoolId);

  let query = supabase
    .from('payslips')
    .select(`
      *,
      payroll_record:payroll_records(*),
      generated_by_profile:profiles(id, full_name, email)
    `)
    .eq('school_id', schoolId);

  if (filters?.payroll_record_id) {
    query = query.eq('payroll_record_id', filters.payroll_record_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('generated_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getPayslip(
  id: string,
  schoolId: string
): Promise<Payslip> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('payslips')
    .select(`
      *,
      payroll_record:payroll_records(*),
      generated_by_profile:profiles(id, full_name, email)
    `)
    .eq('id', id)
    .eq('school_id', schoolId)
    .single();

  if (error) throw error;
  return data;
}

export async function generatePayslip(
  payrollRecordId: string,
  schoolId: string,
  userId: string
): Promise<Payslip> {
  await checkFeatureSubscription(schoolId);

  // Get payroll record
  const { data: payrollRecord, error: payrollError } = await supabase
    .from('payroll_records')
    .select(`
      *,
      staff:staff_profiles(id, first_name, last_name, position, department)
    `)
    .eq('id', payrollRecordId)
    .eq('school_id', schoolId)
    .single();

  if (payrollError) throw payrollError;

  // Generate payslip number
  const { data: payslipNumber, error: numberError } = await supabase.rpc('generate_payslip_number', {
    school_id: schoolId,
  });

  if (numberError) throw numberError;

  // Calculate totals
  const totalAllowances = 
    payrollRecord.housing_allowance + 
    payrollRecord.transport_allowance + 
    payrollRecord.medical_allowance + 
    payrollRecord.other_allowances;

  // Create payslip
  const { data, error } = await supabase
    .from('payslips')
    .insert({
      school_id: schoolId,
      payroll_record_id: payrollRecordId,
      payslip_number: payslipNumber,
      staff_name: `${payrollRecord.staff.first_name} ${payrollRecord.staff.last_name}`,
      staff_position: payrollRecord.staff.position,
      staff_department: payrollRecord.staff.department,
      period_start: payrollRecord.period_start,
      period_end: payrollRecord.period_end,
      pay_date: payrollRecord.pay_date,
      basic_salary: payrollRecord.basic_salary,
      total_allowances: totalAllowances,
      total_deductions: payrollRecord.total_deductions,
      gross_pay: payrollRecord.gross_pay,
      net_pay: payrollRecord.net_pay,
      generated_by: userId,
    })
    .select(`
      *,
      payroll_record:payroll_records(*),
      generated_by_profile:profiles(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function getPayrollSettings(schoolId: string): Promise<PayrollSettings> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('payroll_settings')
    .select('*')
    .eq('school_id', schoolId)
    .single();

  if (error) {
    // If no settings exist, create default
    const { data: newSettings, error: createError } = await supabase
      .from('payroll_settings')
      .insert({
        school_id: schoolId,
      })
      .select()
      .single();

    if (createError) throw createError;
    return newSettings;
  }

  return data;
}

export async function updatePayrollSettings(
  input: Partial<PayrollSettings>,
  schoolId: string,
  userId: string
): Promise<PayrollSettings> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('payroll_settings')
    .update({
      ...input,
      updated_by: userId,
    })
    .eq('school_id', schoolId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSalaryStructures(
  schoolId: string,
  filters?: {
    position?: string;
    department?: string;
    employment_type?: string;
    is_active?: boolean;
  }
): Promise<SalaryStructure[]> {
  await checkFeatureSubscription(schoolId);

  let query = supabase
    .from('salary_structures')
    .select('*')
    .eq('school_id', schoolId);

  if (filters?.position) {
    query = query.eq('position', filters.position);
  }

  if (filters?.department) {
    query = query.eq('department', filters.department);
  }

  if (filters?.employment_type) {
    query = query.eq('employment_type', filters.employment_type);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getSalaryStructure(
  id: string,
  schoolId: string
): Promise<SalaryStructure> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('salary_structures')
    .select('*')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single();

  if (error) throw error;
  return data;
}

export async function createSalaryStructure(
  input: CreateSalaryStructureInput,
  schoolId: string,
  userId: string
): Promise<SalaryStructure> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('salary_structures')
    .insert({
      ...input,
      school_id: schoolId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSalaryStructure(
  id: string,
  input: UpdateSalaryStructureInput,
  schoolId: string
): Promise<SalaryStructure> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('salary_structures')
    .update(input)
    .eq('id', id)
    .eq('school_id', schoolId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSalaryStructure(
  id: string,
  schoolId: string
): Promise<void> {
  await checkFeatureSubscription(schoolId);

  const { error } = await supabase
    .from('salary_structures')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId);

  if (error) throw error;
}

export async function getPayrollSummary(
  schoolId: string,
  periodStart: string,
  periodEnd: string
): Promise<PayrollSummary> {
  const { data, error } = await supabase.rpc('get_payroll_summary', {
    school_id: schoolId,
    period_start: periodStart,
    period_end: periodEnd,
  });

  if (error) throw error;
  return data as PayrollSummary;
}
