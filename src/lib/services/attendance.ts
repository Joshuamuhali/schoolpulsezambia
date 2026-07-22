/**
 * Service: attendance — aligned to real schema.
 * attendance: id, school_id, student_id, class_id, date, status
 * UNIQUE(student_id, date) — only one record per student per day
 */
import { supabase } from "@/lib/supabase/client";
import type { AttendanceStatus } from "@/lib/supabase/types";

export interface AttendanceStudentRow {
  id: string;
  full_name: string;
  admission_number: string | null;
  status: AttendanceStatus | null;
  attendance_id: string | null;
}

export async function fetchClassAttendance(
  schoolId: string,
  classId: string,
  date: string
): Promise<AttendanceStudentRow[]> {
  // Get active students in class
  const { data: students, error: sErr } = await supabase
    .from("students")
    .select("id, full_name, admission_number")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("status", "active")
    .order("full_name");

  if (sErr) throw sErr;

  // Get existing attendance for that date
  const { data: existing, error: aErr } = await supabase
    .from("attendance")
    .select("id, student_id, status")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("date", date);

  if (aErr) throw aErr;

  const existingMap = new Map(
    (existing ?? []).map((r: { student_id: string; id: string; status: AttendanceStatus }) => [
      r.student_id,
      { attendance_id: r.id, status: r.status },
    ])
  );

  return (students ?? []).map((s: { id: string; full_name: string; admission_number: string | null }) => ({
    id: s.id,
    full_name: s.full_name,
    admission_number: s.admission_number,
    ...(existingMap.get(s.id) ?? { attendance_id: null, status: null }),
  }));
}

export async function submitBulkAttendance(
  records: {
    school_id: string;
    class_id: string;
    student_id: string;
    date: string;
    status: AttendanceStatus;
  }[]
) {
  const { error } = await supabase
    .from("attendance")
    .upsert(records, { onConflict: "student_id,date" });

  if (error) throw error;
}

export async function fetchDailyAttendanceSummary(schoolId: string, date: string) {
  const { data, error } = await supabase
    .from("attendance")
    .select("status")
    .eq("school_id", schoolId)
    .eq("date", date);

  if (error) throw error;

  const records = data ?? [];
  return {
    present: records.filter((r: { status: string }) => r.status === "present").length,
    absent:  records.filter((r: { status: string }) => r.status === "absent").length,
    late:    records.filter((r: { status: string }) => r.status === "late").length,
    total:   records.length,
  };
}

export async function fetchClasses(schoolId: string) {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, grades(name)")
    .eq("school_id", schoolId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function fetchStudentAttendance(
  studentId: string,
  limit: number = 30
) {
  const { data, error } = await supabase
    .from("attendance")
    .select(`
      *,
      classes(name, grades(name))
    `)
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function fetchAttendanceReport(
  schoolId: string,
  startDate: string,
  endDate: string,
  classId?: string
) {
  let query = supabase
    .from("attendance")
    .select(`
      *,
      students(full_name, admission_number),
      classes(name, grades(name))
    `)
    .eq("school_id", schoolId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (classId) {
    query = query.eq("class_id", classId);
  }

  const { data, error } = await query.order("date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchAttendanceSummaryByDateRange(
  schoolId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from("attendance")
    .select("status, date")
    .eq("school_id", schoolId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) throw error;

  const records = data ?? [];
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const excused = records.filter((r) => r.status === "excused").length;

  return {
    total,
    present,
    absent,
    late,
    excused,
    attendanceRate: total > 0 ? ((present / total) * 100).toFixed(1) : "0",
  };
}

export async function fetchClassAttendanceStats(
  schoolId: string,
  classId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from("attendance")
    .select("status, student_id")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) throw error;

  const records = data ?? [];
  const uniqueStudents = new Set(records.map((r) => r.student_id)).size;
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;

  return {
    totalStudents: uniqueStudents,
    totalRecords: total,
    present,
    absent,
    late,
    attendanceRate: total > 0 ? ((present / total) * 100).toFixed(1) : "0",
  };
}
