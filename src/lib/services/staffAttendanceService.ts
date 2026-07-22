/**
 * Staff Attendance Service
 * Handles staff attendance tracking and reporting
 */

import { supabase } from "@/lib/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface StaffAttendance {
  id: string;
  school_id: string;
  staff_id: string;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: "present" | "absent" | "late" | "half_day" | "on_leave";
  late_minutes: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  staff_profiles?: {
    first_name: string;
    last_name: string;
    employee_number: string;
  };
}

export interface CreateStaffAttendanceInput {
  schoolId: string;
  staffId: string;
  attendanceDate: string;
  status: StaffAttendance["status"];
  checkInTime?: string;
  checkOutTime?: string;
  lateMinutes?: number;
  notes?: string;
}

export interface UpdateStaffAttendanceInput {
  status?: StaffAttendance["status"];
  checkInTime?: string;
  checkOutTime?: string;
  lateMinutes?: number;
  notes?: string;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  attendancePercentage: number;
}

// ============================================================================
// STAFF ATTENDANCE CRUD
// ============================================================================

/**
 * Create staff attendance record
 */
export async function createStaffAttendance(input: CreateStaffAttendanceInput): Promise<StaffAttendance> {
  const { data, error } = await supabase
    .from("staff_attendance")
    .insert({
      school_id: input.schoolId,
      staff_id: input.staffId,
      attendance_date: input.attendanceDate,
      status: input.status,
      check_in_time: input.checkInTime,
      check_out_time: input.checkOutTime,
      late_minutes: input.lateMinutes || 0,
      notes: input.notes,
    } as never)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffAttendance;
}

/**
 * Bulk create attendance records
 */
export async function bulkCreateStaffAttendance(
  schoolId: string,
  staffIds: string[],
  attendanceDate: string,
  status: StaffAttendance["status"] = "present"
): Promise<StaffAttendance[]> {
  const records = staffIds.map((staffId) => ({
    school_id: schoolId,
    staff_id: staffId,
    attendance_date: attendanceDate,
    status,
    late_minutes: 0,
  }));

  const { data, error } = await supabase
    .from("staff_attendance")
    .insert(records as never)
    .select("*, staff_profiles(first_name, last_name, employee_number)");

  if (error) throw error;
  return (data ?? []) as StaffAttendance[];
}

/**
 * Get staff attendance records
 */
export async function getStaffAttendance(
  schoolId: string,
  filters?: {
    staffId?: string;
    status?: StaffAttendance["status"];
    startDate?: string;
    endDate?: string;
  }
): Promise<StaffAttendance[]> {
  let query = supabase
    .from("staff_attendance")
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .eq("school_id", schoolId)
    .order("attendance_date", { ascending: false });

  if (filters?.staffId) {
    query = query.eq("staff_id", filters.staffId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.startDate) {
    query = query.gte("attendance_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("attendance_date", filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StaffAttendance[];
}

/**
 * Get staff attendance by ID
 */
export async function getStaffAttendanceById(attendanceId: string): Promise<StaffAttendance> {
  const { data, error } = await supabase
    .from("staff_attendance")
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .eq("id", attendanceId)
    .single();

  if (error) throw error;
  return data as StaffAttendance;
}

/**
 * Update staff attendance
 */
export async function updateStaffAttendance(
  attendanceId: string,
  updates: UpdateStaffAttendanceInput
): Promise<StaffAttendance> {
  const { data, error } = await supabase
    .from("staff_attendance")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", attendanceId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffAttendance;
}

/**
 * Delete staff attendance
 */
export async function deleteStaffAttendance(attendanceId: string): Promise<void> {
  const { error } = await supabase
    .from("staff_attendance")
    .delete()
    .eq("id", attendanceId);

  if (error) throw error;
}

// ============================================================================
// ATTENDANCE SUMMARY
// ============================================================================

/**
 * Get staff attendance summary
 */
export async function getStaffAttendanceSummary(
  staffId: string,
  schoolId: string,
  startDate: string,
  endDate: string
): Promise<AttendanceSummary> {
  const { data, error } = await supabase.rpc("get_staff_attendance_summary", {
    p_staff_id: staffId,
    p_school_id: schoolId,
    p_start_date: startDate,
    p_end_date: endDate,
  } as never);

  if (error) throw error;
  const summary = data as AttendanceSummary;

  return {
    totalDays: summary.totalDays || 0,
    presentDays: summary.presentDays || 0,
    absentDays: summary.absentDays || 0,
    lateDays: summary.lateDays || 0,
    leaveDays: summary.leaveDays || 0,
    attendancePercentage: summary.attendancePercentage || 0,
  };
}

/**
 * Get all staff attendance summaries
 */
export async function getAllStaffAttendanceSummaries(
  schoolId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  staffId: string;
  staffName: string;
  employeeNumber: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  attendancePercentage: number;
}>> {
  const { data, error } = await supabase.rpc("get_all_staff_attendance_summaries", {
    p_school_id: schoolId,
    p_start_date: startDate,
    p_end_date: endDate,
  } as never);

  if (error) throw error;
  return data as Array<{
    staffId: string;
    staffName: string;
    employeeNumber: string;
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    leaveDays: number;
    attendancePercentage: number;
  }>;
}

// ============================================================================
// ATTENDANCE STATISTICS
// ============================================================================

/**
 * Get attendance statistics for a school
 */
export async function getAttendanceStatistics(
  schoolId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  onLeaveCount: number;
  averageAttendance: number;
  byDate: Record<string, number>;
  byStaff: Record<string, number>;
}> {
  let query = supabase
    .from("staff_attendance")
    .select("status, attendance_date, staff_id")
    .eq("school_id", schoolId);

  if (startDate) {
    query = query.gte("attendance_date", startDate);
  }
  if (endDate) {
    query = query.lte("attendance_date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const records = data as StaffAttendance[];

  const byDate: Record<string, number> = {};
  const byStaff: Record<string, number> = {};

  records.forEach((record) => {
    // By date
    byDate[record.attendance_date] = (byDate[record.attendance_date] || 0) + 1;

    // By staff
    byStaff[record.staff_id] = (byStaff[record.staff_id] || 0) + 1;
  });

  const totalRecords = records.length;
  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const halfDayCount = records.filter((r) => r.status === "half_day").length;
  const onLeaveCount = records.filter((r) => r.status === "on_leave").length;

  const averageAttendance = totalRecords > 0
    ? ((presentCount + lateCount) / totalRecords) * 100
    : 0;

  return {
    totalRecords,
    presentCount,
    absentCount,
    lateCount,
    halfDayCount,
    onLeaveCount,
    averageAttendance,
    byDate,
    byStaff,
  };
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const staffAttendanceService = {
  // CRUD
  createStaffAttendance,
  bulkCreateStaffAttendance,
  getStaffAttendance,
  getStaffAttendanceById,
  updateStaffAttendance,
  deleteStaffAttendance,

  // Summary
  getStaffAttendanceSummary,
  getAllStaffAttendanceSummaries,

  // Statistics
  getAttendanceStatistics,
};