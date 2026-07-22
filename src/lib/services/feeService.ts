/**
 * Fee Service
 * Complete fee management with categories, structures, student bills, and payments
 */

import { supabase } from "@/lib/supabase/client";

// Cast supabase to any to avoid TypeScript strict typing issues
const db = supabase as any;

// ============================================================================
// INTERFACES
// ============================================================================

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

export interface Payment {
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

// ============================================================================
// FEE CATEGORIES
// ============================================================================

export async function getFeeCategories(schoolId: string): Promise<FeeCategory[]> {
  const { data, error } = await supabase
    .from("fee_categories")
    .select("*")
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data as FeeCategory[];
}

export async function createFeeCategory(params: {
  school_id: string;
  name: string;
  description?: string;
}): Promise<FeeCategory> {
  const { data, error } = await supabase
    .from("fee_categories")
    .insert(params as any)
    .select()
    .single();

  if (error) throw error;
  return data as FeeCategory;
}

export async function updateFeeCategory(id: string, updates: Record<string, any>): Promise<FeeCategory> {
  const { data, error } = await (supabase as any)
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

// ============================================================================
// FEE STRUCTURES
// ============================================================================

export async function getFeeStructures(schoolId: string, filters?: {
  grade_id?: string;
  term_id?: string;
}): Promise<FeeStructure[]> {
  let query = supabase
    .from("fee_structures")
    .select("*, grades(name), fee_categories(name), terms(name)")
    .eq("school_id", schoolId);

  if (filters?.grade_id) {
    query = query.eq("grade_id", filters.grade_id);
  }
  if (filters?.term_id) {
    query = query.eq("term_id", filters.term_id);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data as FeeStructure[];
}

export async function createFeeStructure(params: {
  school_id: string;
  grade_id: string;
  fee_category_id: string;
  term_id: string;
  amount: number;
  due_date?: string;
}): Promise<FeeStructure> {
  const { data, error } = await supabase
    .from("fee_structures")
    .insert(params as any)
    .select()
    .single();

  if (error) throw error;
  return data as FeeStructure;
}

export async function updateFeeStructure(id: string, updates: Record<string, any>): Promise<FeeStructure> {
  const { data, error } = await (supabase as any)
    .from("fee_structures")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as FeeStructure;
}

// ============================================================================
// STUDENT BILLS
// ============================================================================

export async function getStudentBills(schoolId: string, filters?: {
  student_id?: string;
  term_id?: string;
  status?: string;
}): Promise<StudentBill[]> {
  let query = supabase
    .from("student_bills")
    .select("*, students(full_name, admission_number), terms(name)")
    .eq("school_id", schoolId);

  if (filters?.student_id) {
    query = query.eq("student_id", filters.student_id);
  }
  if (filters?.term_id) {
    query = query.eq("term_id", filters.term_id);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data as StudentBill[];
}

export async function createStudentBill(params: {
  school_id: string;
  student_id: string;
  term_id: string;
  total_amount: number;
  due_date?: string;
}): Promise<StudentBill> {
  const { data, error } = await supabase
    .from("student_bills")
    .insert({
      ...params,
      paid_amount: 0,
      balance: params.total_amount,
      status: "unpaid",
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as StudentBill;
}

// ============================================================================
// PAYMENTS
// ============================================================================

export async function getPayments(schoolId: string, filters?: {
  student_id?: string;
  bill_id?: string;
  status?: string;
}): Promise<Payment[]> {
  let query = supabase
    .from("payments")
    .select("*, students(full_name, admission_number)")
    .eq("school_id", schoolId);

  if (filters?.student_id) {
    query = query.eq("student_id", filters.student_id);
  }
  if (filters?.bill_id) {
    query = query.eq("bill_id", filters.bill_id);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data as Payment[];
}

export async function createPayment(params: {
  school_id: string;
  student_id: string;
  bill_id: string;
  amount: number;
  payment_method: string;
  reference?: string;
  recorded_by: string;
}): Promise<Payment> {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      ...params,
      status: "verified",
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as Payment;
}

// ============================================================================
// FEE REPORTS
// ============================================================================

export async function getFeeCollectionSummary(schoolId: string, termId?: string) {
  let query = supabase
    .from("student_bills")
    .select("*")
    .eq("school_id", schoolId);

  if (termId) {
    query = query.eq("term_id", termId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const totalBilled = data.reduce((sum: number, bill: any) => sum + Number(bill.total_amount), 0);
  const totalCollected = data.reduce((sum: number, bill: any) => sum + Number(bill.paid_amount), 0);
  const totalOutstanding = data.reduce((sum: number, bill: any) => sum + Number(bill.balance), 0);

  return {
    total_billed: totalBilled,
    total_collected: totalCollected,
    total_outstanding: totalOutstanding,
    collection_rate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
  };
}

// Alias for backward compatibility
export const getFeeSummary = getFeeCollectionSummary;

export async function getOutstandingFeesReport(schoolId: string, termId?: string): Promise<StudentBill[]> {
  let query = supabase
    .from("student_bills")
    .select("*, students(full_name, admission_number), terms(name)")
    .eq("school_id", schoolId)
    .gt("balance", 0)
    .order("due_date", { ascending: true });

  if (termId) {
    query = query.eq("term_id", termId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as StudentBill[];
}

export async function getPaymentHistory(schoolId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*, students(full_name, admission_number), student_bills(terms(name))")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as Payment[];
}
