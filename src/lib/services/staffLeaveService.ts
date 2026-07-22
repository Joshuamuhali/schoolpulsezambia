/**
 * Staff Leave Service
 * Handles staff leave management, approvals, and balance tracking
 */

import { supabase } from "@/lib/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface StaffLeave {
  id: string;
  school_id: string;
  staff_id: string;
  leave_type: "annual" | "sick" | "maternity" | "paternity" | "compassionate" | "study" | "unpaid" | "other";
  start_date: string;
  end_date: string;
  total_days: number;
  status: "pending" | "approved" | "rejected" | "cancelled" | "completed";
  reason: string;
  supporting_documents?: string[];
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  staff_profiles?: {
    first_name: string;
    last_name: string;
    employee_number: string;
  };
}

export interface CreateStaffLeaveInput {
  schoolId: string;
  staffId: string;
  leaveType: StaffLeave["leave_type"];
  startDate: string;
  endDate: string;
  reason: string;
  supportingDocuments?: string[];
  notes?: string;
}

export interface UpdateStaffLeaveInput {
  status?: StaffLeave["status"];
  approvedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

// ============================================================================
// STAFF LEAVE CRUD
// ============================================================================

/**
 * Create staff leave request
 */
export async function createStaffLeave(input: CreateStaffLeaveInput): Promise<StaffLeave> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const { data, error } = await supabase
    .from("staff_leave")
    .insert({
      school_id: input.schoolId,
      staff_id: input.staffId,
      leave_type: input.leaveType,
      start_date: input.startDate,
      end_date: input.endDate,
      total_days: totalDays,
      reason: input.reason,
      supporting_documents: input.supportingDocuments || [],
      notes: input.notes,
      created_by: user.id,
    } as never)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffLeave;
}

/**
 * Get staff leave records
 */
export async function getStaffLeave(
  schoolId: string,
  filters?: {
    staffId?: string;
    status?: StaffLeave["status"];
    leaveType?: StaffLeave["leave_type"];
    startDate?: string;
    endDate?: string;
  }
): Promise<StaffLeave[]> {
  let query = supabase
    .from("staff_leave")
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  if (filters?.staffId) {
    query = query.eq("staff_id", filters.staffId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.leaveType) {
    query = query.eq("leave_type", filters.leaveType);
  }
  if (filters?.startDate) {
    query = query.gte("start_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("end_date", filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StaffLeave[];
}

/**
 * Get staff leave by ID
 */
export async function getStaffLeaveById(leaveId: string): Promise<StaffLeave> {
  const { data, error } = await supabase
    .from("staff_leave")
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .eq("id", leaveId)
    .single();

  if (error) throw error;
  return data as StaffLeave;
}

/**
 * Update staff leave
 */
export async function updateStaffLeave(leaveId: string, updates: UpdateStaffLeaveInput): Promise<StaffLeave> {
  const { data, error } = await supabase
    .from("staff_leave")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", leaveId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffLeave;
}

/**
 * Approve staff leave
 */
export async function approveStaffLeave(leaveId: string): Promise<StaffLeave> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("staff_leave")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", leaveId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffLeave;
}

/**
 * Reject staff leave
 */
export async function rejectStaffLeave(leaveId: string, rejectionReason: string): Promise<StaffLeave> {
  const { data, error } = await supabase
    .from("staff_leave")
    .update({
      status: "rejected",
      rejection_reason: rejectionReason,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", leaveId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffLeave;
}

/**
 * Cancel staff leave
 */
export async function cancelStaffLeave(leaveId: string): Promise<StaffLeave> {
  const { data, error } = await supabase
    .from("staff_leave")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", leaveId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffLeave;
}

/**
 * Delete staff leave
 */
export async function deleteStaffLeave(leaveId: string): Promise<void> {
  const { error } = await supabase
    .from("staff_leave")
    .delete()
    .eq("id", leaveId);

  if (error) throw error;
}

// ============================================================================
// LEAVE BALANCE
// ============================================================================

/**
 * Get staff leave balance
 */
export async function getStaffLeaveBalance(
  staffId: string,
  schoolId: string,
  leaveType: string,
  year: number = new Date().getFullYear()
): Promise<{ allocated: number; used: number; balance: number }> {
  const { data, error } = await supabase.rpc("get_staff_leave_balance", {
    p_staff_id: staffId,
    p_school_id: schoolId,
    p_leave_type: leaveType,
    p_year: year,
  } as never);

  if (error) throw error;
  const balance = data as number;

  // Get allocated days
  const { data: contract } = await supabase
    .from("staff_contracts")
    .select("annual_leave_days, sick_leave_days")
    .eq("staff_id", staffId)
    .eq("school_id", schoolId)
    .eq("status", "active")
    .single();

  let allocated = 21; // Default
  if (contract) {
    const contractData = contract as { annual_leave_days?: number; sick_leave_days?: number };
    allocated = leaveType === "sick" ? (contractData.sick_leave_days || 10) : (contractData.annual_leave_days || 21);
  }

  return {
    allocated,
    used: allocated - balance,
    balance,
  };
}

/**
 * Get all staff leave balances
 */
export async function getAllStaffLeaveBalances(
  schoolId: string,
  year: number = new Date().getFullYear()
): Promise<Array<{
  staffId: string;
  staffName: string;
  employeeNumber: string;
  leaveType: string;
  allocated: number;
  used: number;
  balance: number;
}>> {
  const { data, error } = await supabase.rpc("get_all_staff_leave_balances", {
    p_school_id: schoolId,
    p_year: year,
  } as never);

  if (error) throw error;
  return data as Array<{
    staffId: string;
    staffName: string;
    employeeNumber: string;
    leaveType: string;
    allocated: number;
    used: number;
    balance: number;
  }>;
}

// ============================================================================
// LEAVE STATISTICS
// ============================================================================

/**
 * Get leave statistics for a school
 */
export async function getLeaveStatistics(
  schoolId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalLeaves: number;
  pendingLeaves: number;
  approvedLeaves: number;
  rejectedLeaves: number;
  byType: Record<string, number>;
  byMonth: Record<string, number>;
}> {
  let query = supabase
    .from("staff_leave")
    .select("leave_type, status, start_date")
    .eq("school_id", schoolId);

  if (startDate) {
    query = query.gte("start_date", startDate);
  }
  if (endDate) {
    query = query.lte("end_date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const leaves = data as StaffLeave[];

  const byType: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  leaves.forEach((leave) => {
    // By type
    byType[leave.leave_type] = (byType[leave.leave_type] || 0) + 1;

    // By month
    const month = new Date(leave.start_date).toISOString().slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
  });

  return {
    totalLeaves: leaves.length,
    pendingLeaves: leaves.filter((l) => l.status === "pending").length,
    approvedLeaves: leaves.filter((l) => l.status === "approved").length,
    rejectedLeaves: leaves.filter((l) => l.status === "rejected").length,
    byType,
    byMonth,
  };
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const staffLeaveService = {
  // CRUD
  createStaffLeave,
  getStaffLeave,
  getStaffLeaveById,
  updateStaffLeave,
  deleteStaffLeave,

  // Actions
  approveStaffLeave,
  rejectStaffLeave,
  cancelStaffLeave,

  // Balance
  getStaffLeaveBalance,
  getAllStaffLeaveBalances,

  // Statistics
  getLeaveStatistics,
};