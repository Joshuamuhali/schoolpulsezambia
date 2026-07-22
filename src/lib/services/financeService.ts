/**
 * Finance Service
 * Handles student invoices, payments, fee structures, and financial transactions
 */

import { supabase } from "@/lib/supabase/client";
import type {
  FeeStructure,
  StudentInvoice,
  StudentPayment,
  PaymentAllocation,
  FinancialTransaction,
  ApprovalWorkflow,
  Notification,
  AuditLog
} from "@/lib/supabase/types";

// ============================================================================
// FEE STRUCTURES
// ============================================================================

export async function getFeeStructures(schoolId: string): Promise<FeeStructure[]> {
  const { data, error } = await supabase
    .from("school_fee_structures")
    .select("*")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .order("fee_type", { ascending: true });

  if (error) throw error;
  return data as FeeStructure[];
}

export async function createFeeStructure(schoolId: string, feeStructure: Omit<FeeStructure, "id" | "school_id" | "created_at" | "updated_at">): Promise<FeeStructure> {
  const { data, error } = await supabase
    .from("school_fee_structures")
    .insert({
      ...feeStructure,
      school_id: schoolId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FeeStructure;
}

export async function updateFeeStructure(id: string, updates: Partial<FeeStructure>): Promise<FeeStructure> {
  const { data, error } = await supabase
    .from("school_fee_structures")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as FeeStructure;
}

export async function deleteFeeStructure(id: string): Promise<void> {
  const { error } = await supabase
    .from("school_fee_structures")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// STUDENT INVOICES
// ============================================================================

export async function getStudentInvoices(schoolId: string, filters?: {
  studentId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<StudentInvoice[]> {
  let query = supabase
    .from("student_invoices")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (filters?.studentId) query = query.eq("student_id", filters.studentId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.startDate) query = query.gte("period_start", filters.startDate);
  if (filters?.endDate) query = query.lte("period_end", filters.endDate);

  const { data, error } = await query;

  if (error) throw error;
  return data as StudentInvoice[];
}

export async function getStudentInvoice(id: string): Promise<StudentInvoice | null> {
  const { data, error } = await supabase
    .from("student_invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as StudentInvoice;
}

export async function createStudentInvoice(
  schoolId: string,
  invoice: Omit<StudentInvoice, "id" | "school_id" | "invoice_number" | "amount_paid" | "balance" | "status" | "created_by" | "created_at" | "updated_at">
): Promise<StudentInvoice> {
  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(schoolId);

  const { data, error } = await supabase
    .from("student_invoices")
    .insert({
      ...invoice,
      school_id: schoolId,
      invoice_number: invoiceNumber,
      amount_paid: 0,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as StudentInvoice;
}

export async function updateStudentInvoice(id: string, updates: Partial<StudentInvoice>): Promise<StudentInvoice> {
  const { data, error } = await supabase
    .from("student_invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as StudentInvoice;
}

export async function cancelStudentInvoice(id: string, reason: string, cancelledBy: string): Promise<void> {
  const { error } = await supabase
    .from("student_invoices")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// STUDENT PAYMENTS
// ============================================================================

export async function getStudentPayments(schoolId: string, filters?: {
  studentId?: string;
  invoiceId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<StudentPayment[]> {
  let query = supabase
    .from("student_payments")
    .select("*")
    .eq("school_id", schoolId)
    .order("payment_date", { ascending: false });

  if (filters?.studentId) query = query.eq("student_id", filters.studentId);
  if (filters?.invoiceId) query = query.eq("invoice_id", filters.invoiceId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.startDate) query = query.gte("payment_date", filters.startDate);
  if (filters?.endDate) query = query.lte("payment_date", filters.endDate);

  const { data, error } = await query;

  if (error) throw error;
  return data as StudentPayment[];
}

export async function getStudentPayment(id: string): Promise<StudentPayment | null> {
  const { data, error } = await supabase
    .from("student_payments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as StudentPayment;
}

export async function createStudentPayment(
  schoolId: string,
  payment: Omit<StudentPayment, "id" | "school_id" | "status" | "submitted_by" | "created_at" | "updated_at">,
  submittedBy: string
): Promise<StudentPayment> {
  const { data, error } = await supabase
    .from("student_payments")
    .insert({
      ...payment,
      school_id: schoolId,
      status: "pending",
      submitted_by: submittedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data as StudentPayment;
}

export async function approveStudentPayment(paymentId: string, approvedBy: string): Promise<void> {
  const { error } = await supabase.rpc("approve_student_payment", {
    p_payment_id: paymentId,
    p_approved_by: approvedBy,
  });

  if (error) throw error;
}

export async function rejectStudentPayment(paymentId: string, rejectionReason: string): Promise<void> {
  const { error } = await supabase.rpc("reject_student_payment", {
    p_payment_id: paymentId,
    p_rejection_reason: rejectionReason,
  });

  if (error) throw error;
}

// ============================================================================
// PAYMENT ALLOCATIONS
// ============================================================================

export async function allocatePaymentToInvoices(
  paymentId: string,
  allocations: Array<{ invoiceId: string; amount: number }>,
  schoolId: string
): Promise<void> {
  // Delete existing allocations
  await supabase
    .from("payment_allocations")
    .delete()
    .eq("payment_id", paymentId);

  // Create new allocations
  const { error } = await supabase
    .from("payment_allocations")
    .insert(
      allocations.map((alloc) => ({
        payment_id: paymentId,
        invoice_id: alloc.invoiceId,
        amount: alloc.amount,
        school_id: schoolId,
      }))
    );

  if (error) throw error;
}

// ============================================================================
// FINANCIAL TRANSACTIONS
// ============================================================================

export async function getFinancialTransactions(
  schoolId: string,
  filters?: {
    type?: string;
    category?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<FinancialTransaction[]> {
  let query = supabase
    .from("financial_transactions")
    .select("*")
    .eq("school_id", schoolId)
    .order("transaction_date", { ascending: false });

  if (filters?.type) query = query.eq("transaction_type", filters.type);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.startDate) query = query.gte("transaction_date", filters.startDate);
  if (filters?.endDate) query = query.lte("transaction_date", filters.endDate);

  const { data, error } = await query;

  if (error) throw error;
  return data as FinancialTransaction[];
}

export async function getFinancialSummary(schoolId: string, startDate: string, endDate: string): Promise<{
  totalIncome: number;
  totalPayments: number;
  totalInvoices: number;
  outstandingBalance: number;
  overdueAmount: number;
  byCategory: Record<string, number>;
}> {
  const { data, error } = await supabase.rpc("get_financial_summary", {
    p_school_id: schoolId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data as any;
}

// ============================================================================
// APPROVAL WORKFLOWS
// ============================================================================

export async function getApprovalWorkflows(schoolId: string, filters?: {
  status?: string;
  entityType?: string;
}): Promise<ApprovalWorkflow[]> {
  let query = supabase
    .from("approval_workflows")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.entityType) query = query.eq("entity_type", filters.entityType);

  const { data, error } = await query;

  if (error) throw error;
  return data as ApprovalWorkflow[];
}

export async function createApprovalWorkflow(workflow: Omit<ApprovalWorkflow, "id" | "created_at" | "updated_at">): Promise<ApprovalWorkflow> {
  const { data, error } = await supabase
    .from("approval_workflows")
    .insert(workflow)
    .select()
    .single();

  if (error) throw error;
  return data as ApprovalWorkflow;
}

export async function updateApprovalWorkflow(id: string, updates: Partial<ApprovalWorkflow>): Promise<ApprovalWorkflow> {
  const { data, error } = await supabase
    .from("approval_workflows")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ApprovalWorkflow;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function getNotifications(userId: string, filters?: {
  isRead?: boolean;
  schoolId?: string;
}): Promise<Notification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .or(`user_id.eq.${userId},recipient_type.eq.admin`)
    .order("created_at", { ascending: false });

  if (filters?.isRead !== undefined) query = query.eq("is_read", filters.isRead);
  if (filters?.schoolId) query = query.eq("school_id", filters.schoolId);

  const { data, error } = await query;

  if (error) throw error;
  return data as Notification[];
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export async function getAuditLogs(schoolId: string, filters?: {
  entityType?: string;
  action?: string;
  performedBy?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AuditLog[]> {
  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("school_id", schoolId)
    .order("performed_at", { ascending: false });

  if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters?.action) query = query.eq("action", filters.action);
  if (filters?.performedBy) query = query.eq("performed_by", filters.performedBy);
  if (filters?.startDate) query = query.gte("performed_at", filters.startDate);
  if (filters?.endDate) query = query.lte("performed_at", filters.endDate);

  const { data, error } = await query;

  if (error) throw error;
  return data as AuditLog[];
}

export async function createAuditLog(
  schoolId: string,
  entityType: AuditLog["entity_type"],
  entityId: string,
  action: AuditLog["action"],
  options?: {
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    description?: string;
    reason?: string;
    performedBy?: string;
    metadata?: Record<string, any>;
  }
): Promise<AuditLog> {
  const { data, error } = await (supabase as any).rpc("create_audit_log", {
    p_school_id: schoolId,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_action: action,
    p_old_values: options?.oldValues || null,
    p_new_values: options?.newValues || null,
    p_description: options?.description || null,
    p_performed_by: options?.performedBy || (await supabase.auth.getUser()).data.user?.id,
    p_metadata: options?.metadata || {},
  });

  if (error) throw error;
  
  // Fetch the created audit log
  const { data: log, error: fetchError } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("id", data)
    .single();

  if (fetchError) throw fetchError;
  return log as AuditLog;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateInvoiceNumber(schoolId: string): Promise<string> {
  const { data, error } = await supabase.rpc("generate_invoice_number", {
    p_school_id: schoolId,
  });

  if (error) throw error;
  return data as string;
}

// ============================================================================
// REPORTS
// ============================================================================

export async function getPaymentReport(
  schoolId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalPayments: number;
  totalAmount: number;
  byMethod: Record<string, { count: number; amount: number }>;
  byStatus: Record<string, { count: number; amount: number }>;
  dailyTotals: Array<{ date: string; count: number; amount: number }>;
}> {
  const { data, error } = await supabase.rpc("get_payment_report", {
    p_school_id: schoolId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data as any;
}

export async function getInvoiceReport(
  schoolId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  byStatus: Record<string, { count: number; amount: number }>;
}> {
  const { data, error } = await supabase.rpc("get_invoice_report", {
    p_school_id: schoolId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data as any;
}