import { supabase } from '../supabase/client';
import type { 
  AcademicTerm,
  AdmissionPolicy,
  StudentPromotion,
  StudentBalance,
  AdmissionPayment
} from '../supabase/types';

// ============================================================================
// ACADEMIC TERMS
// ============================================================================

export async function createAcademicTerm(schoolId: string, data: {
  term_name: string;
  term_number: number;
  academic_year: string;
  start_date: string;
  end_date: string;
  is_open_for_admission?: boolean;
  admission_deadline?: string;
}) {
  const { data: term, error } = await supabase
    .from('academic_terms')
    .insert({
      school_id: schoolId,
      ...data,
      status: 'upcoming',
    })
    .select()
    .single();

  if (error) throw error;
  return term as AcademicTerm;
}

export async function getAcademicTerms(schoolId: string) {
  const { data, error } = await supabase
    .from('academic_terms')
    .select('*')
    .eq('school_id', schoolId)
    .order('academic_year', { ascending: false })
    .order('term_number', { ascending: false });

  if (error) throw error;
  return data as AcademicTerm[];
}

export async function getActiveTerm(schoolId: string) {
  const { data, error } = await supabase
    .from('academic_terms')
    .select('*')
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as AcademicTerm | null;
}

export async function updateAcademicTerm(id: string, updates: Partial<AcademicTerm>) {
  const { data, error } = await supabase
    .from('academic_terms')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AcademicTerm;
}

// ============================================================================
// ADMISSION POLICIES
// ============================================================================

export async function createAdmissionPolicy(schoolId: string, data: {
  policy_name: string;
  description?: string;
  require_previous_balance_cleared?: boolean;
  admission_threshold_percentage?: number;
  carry_forward_outstanding?: boolean;
  auto_admit_on_payment?: boolean;
  allow_principal_override?: boolean;
  allow_finance_override?: boolean;
  notify_on_pending_admission?: boolean;
  notify_on_admission?: boolean;
}) {
  const { data: policy, error } = await supabase
    .from('admission_policies')
    .insert({
      school_id: schoolId,
      ...data,
      require_previous_balance_cleared: data.require_previous_balance_cleared ?? true,
      admission_threshold_percentage: data.admission_threshold_percentage ?? 40,
      carry_forward_outstanding: data.carry_forward_outstanding ?? true,
      auto_admit_on_payment: data.auto_admit_on_payment ?? true,
      allow_principal_override: data.allow_principal_override ?? true,
      allow_finance_override: data.allow_finance_override ?? true,
      notify_on_pending_admission: data.notify_on_pending_admission ?? true,
      notify_on_admission: data.notify_on_admission ?? true,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return policy as AdmissionPolicy;
}

export async function getAdmissionPolicies(schoolId: string) {
  const { data, error } = await supabase
    .from('admission_policies')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AdmissionPolicy[];
}

export async function getActiveAdmissionPolicy(schoolId: string) {
  const { data, error } = await supabase
    .from('admission_policies')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as AdmissionPolicy | null;
}

export async function updateAdmissionPolicy(id: string, updates: Partial<AdmissionPolicy>) {
  const { data, error } = await supabase
    .from('admission_policies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AdmissionPolicy;
}

// ============================================================================
// STUDENT PROMOTIONS
// ============================================================================

export async function promoteStudent(schoolId: string, userId: string, data: {
  student_id: string;
  from_class_id?: string;
  to_class_id: string;
  from_term_id?: string;
  to_term_id: string;
  academic_status: 'promoted' | 'repeated' | 'graduated' | 'transferred';
  previous_term_outstanding: number;
  current_term_fee: number;
  notes?: string;
}) {
  const totalDue = data.previous_term_outstanding + data.current_term_fee;

  const { data: promotion, error } = await supabase
    .from('student_promotions')
    .insert({
      school_id: schoolId,
      promoted_by: userId,
      ...data,
      total_due: totalDue,
      amount_paid: 0,
      admission_status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return promotion as StudentPromotion;
}

export async function getStudentPromotions(schoolId: string, filters?: {
  to_term_id?: string;
  admission_status?: string;
  student_id?: string;
}) {
  let query = supabase
    .from('student_promotions')
    .select('*, students(*), from_class:classes!from_class_id(name), to_class:classes!to_class_id(name)')
    .eq('school_id', schoolId);

  if (filters?.to_term_id) {
    query = query.eq('to_term_id', filters.to_term_id);
  }
  if (filters?.admission_status) {
    query = query.eq('admission_status', filters.admission_status);
  }
  if (filters?.student_id) {
    query = query.eq('student_id', filters.student_id);
  }

  const { data, error } = query.order('created_at', { ascending: false });

  if (error) throw error;
  return data as (StudentPromotion & { 
    students: any; 
    from_class: { name: string } | null; 
    to_class: { name: string } | null;
  })[];
}

export async function getStudentPromotion(studentId: string, termId: string) {
  const { data, error } = await supabase
    .from('student_promotions')
    .select('*')
    .eq('student_id', studentId)
    .eq('to_term_id', termId)
    .maybeSingle();

  if (error) throw error;
  return data as StudentPromotion | null;
}

export async function updateStudentPromotion(id: string, updates: Partial<StudentPromotion>) {
  const { data, error } = await supabase
    .from('student_promotions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as StudentPromotion;
}

export async function admitStudent(id: string, userId: string) {
  const { data, error } = await supabase
    .from('student_promotions')
    .update({
      admission_status: 'admitted',
      admission_date: new Date().toISOString().split('T')[0],
      admitted_by: userId,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as StudentPromotion;
}

export async function rejectStudentAdmission(id: string, reason: string) {
  const { data, error } = await supabase
    .from('student_promotions')
    .update({
      admission_status: 'rejected',
      override_reason: reason,
      is_override: true,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as StudentPromotion;
}

// ============================================================================
// STUDENT BALANCES
// ============================================================================

export async function createStudentBalance(schoolId: string, data: {
  student_id: string;
  term_id: string;
  term_fee: number;
  previous_term_outstanding?: number;
}) {
  const { data: balance, error } = await supabase
    .from('student_balances')
    .insert({
      school_id: schoolId,
      ...data,
      amount_paid: 0,
      outstanding_balance: data.previous_term_outstanding || 0,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return balance as StudentBalance;
}

export async function getStudentBalances(schoolId: string, filters?: {
  term_id?: string;
  student_id?: string;
  status?: string;
}) {
  let query = supabase
    .from('student_balances')
    .select('*, students(*), academic_terms(*)')
    .eq('school_id', schoolId);

  if (filters?.term_id) {
    query = query.eq('term_id', filters.term_id);
  }
  if (filters?.student_id) {
    query = query.eq('student_id', filters.student_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = query.order('created_at', { ascending: false });

  if (error) throw error;
  return data as (StudentBalance & { students: any; academic_terms: any })[];
}

export async function getStudentBalance(studentId: string, termId: string) {
  const { data, error } = await supabase
    .from('student_balances')
    .select('*')
    .eq('student_id', studentId)
    .eq('term_id', termId)
    .maybeSingle();

  if (error) throw error;
  return data as StudentBalance | null;
}

export async function updateStudentBalance(id: string, updates: Partial<StudentBalance>) {
  const { data, error } = await supabase
    .from('student_balances')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as StudentBalance;
}

// ============================================================================
// ADMISSION PAYMENTS
// ============================================================================

export async function createAdmissionPayment(schoolId: string, userId: string, data: {
  student_id: string;
  term_id: string;
  student_balance_id: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_date: string;
  allocated_to_previous?: boolean;
  allocated_to_current?: boolean;
  proof_of_payment_url?: string;
  notes?: string;
}) {
  const { data: payment, error } = await supabase
    .from('admission_payments')
    .insert({
      school_id: schoolId,
      recorded_by: userId,
      ...data,
      status: 'completed',
    })
    .select()
    .single();

  if (error) throw error;
  return payment as AdmissionPayment;
}

export async function getAdmissionPayments(studentBalanceId: string) {
  const { data, error } = await supabase
    .from('admission_payments')
    .select('*')
    .eq('student_balance_id', studentBalanceId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data as AdmissionPayment[];
}

export async function getStudentAdmissionPayments(studentId: string, termId: string) {
  const { data, error } = await supabase
    .from('admission_payments')
    .select('*')
    .eq('student_id', studentId)
    .eq('term_id', termId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data as AdmissionPayment[];
}

export async function verifyAdmissionPayment(id: string, userId: string) {
  const { data, error } = await supabase
    .from('admission_payments')
    .update({
      verified_by: userId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AdmissionPayment;
}

// ============================================================================
// ADMISSION REPORTS
// ============================================================================

export async function getAdmissionSummary(schoolId: string, termId: string) {
  const { data: promotions, error: promotionsError } = await supabase
    .from('student_promotions')
    .select('*')
    .eq('school_id', schoolId)
    .eq('to_term_id', termId);

  if (promotionsError) throw promotionsError;

  const totalStudents = promotions.length;
  const admitted = promotions.filter(p => p.admission_status === 'admitted').length;
  const pending = promotions.filter(p => p.admission_status === 'pending').length;
  const rejected = promotions.filter(p => p.admission_status === 'rejected').length;
  const deferred = promotions.filter(p => p.admission_status === 'deferred').length;

  const totalDue = promotions.reduce((sum, p) => sum + p.total_due, 0);
  const totalPaid = promotions.reduce((sum, p) => sum + p.amount_paid, 0);
  const totalOutstanding = totalDue - totalPaid;

  return {
    totalStudents,
    admitted,
    pending,
    rejected,
    deferred,
    financial: {
      totalDue: Math.round(totalDue * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    },
  };
}

export async function getPendingAdmissions(schoolId: string, termId: string) {
  const { data, error } = await supabase
    .from('student_promotions')
    .select('*, students(*), academic_terms(*)')
    .eq('school_id', schoolId)
    .eq('to_term_id', termId)
    .eq('admission_status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as (StudentPromotion & { students: any; academic_terms: any })[];
}

export async function getStudentsWithOutstandingBalances(schoolId: string, termId: string) {
  const { data, error } = await supabase
    .from('student_balances')
    .select('*, students(*), academic_terms(*)')
    .eq('school_id', schoolId)
    .eq('term_id', termId)
    .gt('outstanding_balance', 0)
    .order('outstanding_balance', { ascending: false });

  if (error) throw error;
  return data as (StudentBalance & { students: any; academic_terms: any })[];
}

export async function getAdmissionPaymentHistory(studentId: string) {
  const { data, error } = await supabase
    .from('admission_payments')
    .select('*, academic_terms(*)')
    .eq('student_id', studentId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data as (AdmissionPayment & { academic_terms: any })[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function checkStudentAdmissionStatus(studentId: string, termId: string) {
  // Get student's school
  const { data: student } = await supabase
    .from('students')
    .select('school_id')
    .eq('id', studentId)
    .single();

  if (!student) {
    return { status: 'error', message: 'Student not found' };
  }

  // Get active admission policy
  const { data: policy } = await supabase
    .from('admission_policies')
    .select('*')
    .eq('school_id', student.school_id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!policy) {
    return { status: 'admitted', message: 'No admission policy configured' };
  }

  // Get student balance
  const { data: balance } = await supabase
    .from('student_balances')
    .select('*')
    .eq('student_id', studentId)
    .eq('term_id', termId)
    .maybeSingle();

  if (!balance) {
    return { status: 'admitted', message: 'No balance record found' };
  }

  // Calculate required amount
  const requiredAmount = (balance.term_fee * policy.admission_threshold_percentage) / 100;

  // Get total paid
  const { data: payments } = await supabase
    .from('admission_payments')
    .select('amount')
    .eq('student_balance_id', balance.id)
    .eq('status', 'completed');

  const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  // Check if previous balance is cleared (if required)
  if (policy.require_previous_balance_cleared && balance.previous_term_outstanding > 0) {
    if (balance.previous_term_outstanding > totalPaid) {
      return {
        status: 'pending',
        message: 'Previous term balance must be cleared',
        required: balance.previous_term_outstanding,
        paid: totalPaid,
        shortfall: balance.previous_term_outstanding - totalPaid,
      };
    }
  }

  // Check if threshold is met
  if (totalPaid >= requiredAmount) {
    return {
      status: 'admitted',
      message: 'Admission criteria met',
      required: requiredAmount,
      paid: totalPaid,
    };
  } else {
    return {
      status: 'pending',
      message: `Minimum ${policy.admission_threshold_percentage}% payment required`,
      required: requiredAmount,
      paid: totalPaid,
      shortfall: requiredAmount - totalPaid,
    };
  }
}

export async function getPendingAdmissionsList(schoolId: string) {
  const { data, error } = await supabase
    .from('student_promotions')
    .select('*, students(*), academic_terms(*)')
    .eq('school_id', schoolId)
    .eq('admission_status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as (StudentPromotion & { students: any; academic_terms: any })[];
}

export async function getAdmissionStatistics(schoolId: string, termId: string) {
  const summary = await getAdmissionSummary(schoolId, termId);
  
  const { data: balances } = await supabase
    .from('student_balances')
    .select('amount_paid, outstanding_balance, previous_term_outstanding')
    .eq('school_id', schoolId)
    .eq('term_id', termId);

  const totalPreviousOutstanding = balances?.reduce((sum, b) => sum + b.previous_term_outstanding, 0) || 0;
  const totalCurrentOutstanding = balances?.reduce((sum, b) => sum + b.outstanding_balance, 0) || 0;

  return {
    ...summary,
    totalPreviousOutstanding: Math.round(totalPreviousOutstanding * 100) / 100,
    totalCurrentOutstanding: Math.round(totalCurrentOutstanding * 100) / 100,
  };
}