/**
 * Service: finance — aligned to real schema.
 * Uses: fee_categories, fee_structures, student_bills, payments
 * fee_categories: id, school_id, name, description
 * fee_structures: id, school_id, grade_id, fee_category_id, term_id, amount, due_date
 * student_bills: id, school_id, student_id, term_id, total_amount, paid_amount, balance, status, due_date
 * payments: id, school_id, student_id, bill_id, amount, payment_method, reference, status, recorded_by
 */
import { supabase } from "@/lib/supabase/client";
import type { Invoice, Payment } from "@/lib/supabase/types";

export interface FeeCategory {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface FeeStructure {
  id: string;
  school_id: string;
  grade_id: string;
  fee_category_id: string;
  term_id: string;
  amount: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  grades?: { name: string };
  fee_categories?: { name: string };
  terms?: { name: string };
}

export interface StudentBill {
  id: string;
  school_id: string;
  student_id: string;
  term_id: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  students?: { full_name: string; admission_number: string | null };
  terms?: { name: string };
}

export interface PaymentRecord {
  id: string;
  school_id: string;
  student_id: string;
  bill_id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  status: string;
  recorded_by: string;
  created_at: string;
  students?: { full_name: string; admission_number: string | null };
}

export interface InvoiceRow extends Invoice {
  students?: { full_name: string; admission_number: string | null } | null;
}

// Fee Categories
export async function getFeeCategories(schoolId: string): Promise<FeeCategory[]> {
  const { data, error } = await supabase
    .from("fee_categories")
    .select("*")
    .eq("school_id", schoolId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function createFeeCategory(
  schoolId: string,
  name: string,
  description?: string
): Promise<FeeCategory> {
  const { data, error } = await supabase
    .from("fee_categories")
    .insert({ school_id: schoolId, name, description })
    .select()
    .single();

  if (error) throw error;
  return data as FeeCategory;
}

export async function updateFeeCategory(id: string, updates: Partial<FeeCategory>): Promise<FeeCategory> {
  const { data, error } = await supabase
    .from("fee_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as FeeCategory;
}

export async function deleteFeeCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("fee_categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Fee Structures
export async function getFeeStructures(schoolId: string): Promise<FeeStructure[]> {
  const { data, error } = await supabase
    .from("fee_structures")
    .select(`
      *,
      grades(name),
      fee_categories(name),
      terms(name)
    `)
    .eq("school_id", schoolId)
    .order("grades(name)");

  if (error) throw error;
  return data ?? [];
}

export async function getFeeStructuresByGrade(schoolId: string, gradeId: string): Promise<FeeStructure[]> {
  const { data, error } = await supabase
    .from("fee_structures")
    .select(`
      *,
      fee_categories(name),
      terms(name)
    `)
    .eq("school_id", schoolId)
    .eq("grade_id", gradeId);

  if (error) throw error;
  return data ?? [];
}

export async function createFeeStructure(
  schoolId: string,
  gradeId: string,
  feeCategoryId: string,
  termId: string,
  amount: number,
  dueDate?: string
): Promise<FeeStructure> {
  const { data, error } = await supabase
    .from("fee_structures")
    .insert({
      school_id: schoolId,
      grade_id: gradeId,
      fee_category_id: feeCategoryId,
      term_id: termId,
      amount,
      due_date: dueDate,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FeeStructure;
}

export async function updateFeeStructure(id: string, updates: Partial<FeeStructure>): Promise<FeeStructure> {
  const { data, error } = await supabase
    .from("fee_structures")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as FeeStructure;
}

export async function deleteFeeStructure(id: string): Promise<void> {
  const { error } = await supabase
    .from("fee_structures")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Student Bills
export async function getStudentBills(schoolId: string, studentId?: string): Promise<StudentBill[]> {
  let query = supabase
    .from("student_bills")
    .select(`
      *,
      students(full_name, admission_number),
      terms(name)
    `)
    .eq("school_id", schoolId);

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createStudentBill(
  schoolId: string,
  studentId: string,
  termId: string,
  totalAmount: number,
  dueDate?: string
): Promise<StudentBill> {
  const { data, error } = await supabase
    .from("student_bills")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      term_id: termId,
      total_amount: totalAmount,
      due_date: dueDate,
    })
    .select()
    .single();

  if (error) throw error;
  return data as StudentBill;
}

export async function updateStudentBill(id: string, updates: Partial<StudentBill>): Promise<StudentBill> {
  const { data, error } = await supabase
    .from("student_bills")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as StudentBill;
}

// Payments
export async function getPayments(schoolId: string, studentId?: string): Promise<PaymentRecord[]> {
  let query = supabase
    .from("payments")
    .select(`
      *,
      students(full_name, admission_number)
    `)
    .eq("school_id", schoolId);

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function recordPayment(
  schoolId: string,
  studentId: string,
  billId: string,
  amount: number,
  paymentMethod: string,
  reference: string | null,
  recordedBy: string
): Promise<PaymentRecord> {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      bill_id: billId,
      amount,
      payment_method: paymentMethod,
      reference,
      recorded_by: recordedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PaymentRecord;
}

export async function updateBillAfterPayment(billId: string, paymentAmount: number): Promise<void> {
  const { data: bill } = await supabase
    .from("student_bills")
    .select("paid_amount, total_amount")
    .eq("id", billId)
    .single();

  if (!bill) throw new Error("Bill not found");

  const newPaidAmount = Number(bill.paid_amount) + paymentAmount;
  const newStatus = newPaidAmount >= Number(bill.total_amount) ? "paid" : "partial";

  const { error } = await supabase
    .from("student_bills")
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
    })
    .eq("id", billId);

  if (error) throw error;
}

// Reports
export async function getFeeReport(schoolId: string, startDate: string, endDate: string) {
  const { data: payments, error } = await supabase
    .from("payments")
    .select(`
      *,
      students(full_name, admission_number),
      student_bills(term_id)
    `)
    .eq("school_id", schoolId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const totalCollected = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalTransactions = payments?.length || 0;

  return {
    payments: payments ?? [],
    totalCollected,
    totalTransactions,
  };
}

export async function getOutstandingFees(schoolId: string) {
  const { data, error } = await supabase
    .from("student_bills")
    .select(`
      *,
      students(full_name, admission_number, classes(name)),
      terms(name)
    `)
    .eq("school_id", schoolId)
    .in("status", ["unpaid", "partial"])
    .order("due_date");

  if (error) throw error;

  const totalOutstanding = (data ?? []).reduce((sum, bill) => sum + Number(bill.balance), 0);

  return {
    bills: data ?? [],
    totalOutstanding,
  };
}

// Legacy functions for compatibility
export async function fetchInvoices(schoolId: string, search?: string): Promise<InvoiceRow[]> {
  let query = supabase
    .from("invoices")
    .select(`
      id, school_id, student_id, amount_due, amount_paid, status,
      students ( full_name, admission_number )
    `)
    .eq("school_id", schoolId)
    .order("status");

  if (search) {
    const { data: matched } = await supabase
      .from("students")
      .select("id")
      .eq("school_id", schoolId)
      .ilike("full_name", `%${search}%`);

    const ids = (matched ?? []).map((s: { id: string }) => s.id);
    if (ids.length === 0) return [];
    query = query.in("student_id", ids);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as InvoiceRow[];
}

export async function fetchFinanceSummary(schoolId: string) {
  const [totalRevenue, unpaidBills, overdueCount] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .eq("school_id", schoolId),

    supabase
      .from("student_bills")
      .select("total_amount, paid_amount")
      .eq("school_id", schoolId)
      .in("status", ["unpaid", "partial"]),

    supabase
      .from("student_bills")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("status", "overdue"),
  ]);

  if (totalRevenue.error)   throw totalRevenue.error;
  if (unpaidBills.error) throw unpaidBills.error;
  if (overdueCount.error)   throw overdueCount.error;

  return {
    totalRevenue: (totalRevenue.data ?? []).reduce(
      (sum: number, p: { amount: number }) => sum + Number(p.amount), 0
    ),
    pendingBalance: (unpaidBills.data ?? []).reduce(
      (sum: number, bill: { total_amount: number; paid_amount: number }) =>
        sum + (Number(bill.total_amount) - Number(bill.paid_amount)),
      0
    ),
    overdueCount: overdueCount.count ?? 0,
  };
}
