import { supabase } from "@/lib/supabase/client";
import type { AttendanceSettings, AttendanceSession, AttendanceRecord, AttendanceSummary } from "@/lib/supabase/types";

// ============================================================================
// ATTENDANCE SETTINGS
// ============================================================================

export async function getAttendanceSettings(schoolId: string): Promise<AttendanceSettings | null> {
  const { data, error } = await supabase
    .from("attendance_settings")
    .select("*")
    .eq("school_id", schoolId)
    .single();

  if (error) throw error;
  return data;
}

export async function createAttendanceSettings(settings: Partial<AttendanceSettings>): Promise<AttendanceSettings> {
  const { data, error } = await supabase
    .from("attendance_settings")
    .insert(settings)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAttendanceSettings(id: string, updates: Partial<AttendanceSettings>): Promise<AttendanceSettings> {
  const { data, error } = await supabase
    .from("attendance_settings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// ATTENDANCE SESSIONS
// ============================================================================

export async function getAttendanceSessions(schoolId: string, filters?: {
  classId?: string;
  teacherId?: string;
  date?: string;
  status?: string;
}): Promise<AttendanceSession[]> {
  let query = supabase
    .from("attendance_sessions")
    .select("*")
    .eq("school_id", schoolId)
    .order("date", { ascending: false });

  if (filters?.classId) query = query.eq("class_id", filters.classId);
  if (filters?.teacherId) query = query.eq("teacher_id", filters.teacherId);
  if (filters?.date) query = query.eq("date", filters.date);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getAttendanceSession(id: string): Promise<AttendanceSession | null> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createAttendanceSession(session: Partial<AttendanceSession>): Promise<AttendanceSession> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert(session)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAttendanceSession(id: string, updates: Partial<AttendanceSession>): Promise<AttendanceSession> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAttendanceSession(id: string): Promise<void> {
  const { error } = await supabase
    .from("attendance_sessions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function submitAttendanceSession(id: string): Promise<AttendanceSession> {
  return updateAttendanceSession(id, {
    status: "submitted",
    submitted_at: new Date().toISOString(),
  });
}

// ============================================================================
// ATTENDANCE RECORDS
// ============================================================================

export async function getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("attendance_session_id", sessionId)
    .order("marked_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getStudentAttendanceRecords(studentId: string, schoolId: string, filters?: {
  startDate?: string;
  endDate?: string;
  classId?: string;
}): Promise<AttendanceRecord[]> {
  let query = supabase
    .from("attendance_records")
    .select(`
      *,
      attendance_sessions (
        id,
        date,
        class_id,
        classes (
          id,
          name
        )
      )
    `)
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .order("marked_at", { ascending: false });

  if (filters?.startDate) query = query.gte("attendance_sessions.date", filters.startDate);
  if (filters?.endDate) query = query.lte("attendance_sessions.date", filters.endDate);
  if (filters?.classId) query = query.eq("attendance_sessions.class_id", filters.classId);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createAttendanceRecord(record: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from("attendance_records")
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from("attendance_records")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkCreateAttendanceRecords(records: Partial<AttendanceRecord>[]): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .insert(records)
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================================================
// ATTENDANCE SUMMARY
// ============================================================================

export async function getAttendanceSummary(studentId: string, schoolId: string, month: number, year: number): Promise<AttendanceSummary | null> {
  const { data, error } = await supabase
    .from("attendance_summary")
    .select("*")
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .eq("month", month)
    .eq("year", year)
    .single();

  if (error) throw error;
  return data;
}

export async function getClassAttendanceSummary(classId: string, schoolId: string, month: number, year: number): Promise<AttendanceSummary[]> {
  const { data, error } = await supabase
    .from("attendance_summary")
    .select("*")
    .eq("class_id", classId)
    .eq("school_id", schoolId)
    .eq("month", month)
    .eq("year", year)
    .order("attendance_rate", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function getClassAttendanceForDate(classId: string, date: string, schoolId: string) {
  const { data, error } = await supabase
    .rpc("get_class_attendance", {
      p_class_id: classId,
      p_date: date,
      p_school_id: schoolId,
    });

  if (error) throw error;
  return data || [];
}

export async function getClassAttendanceStats(classId: string, startDate: string, endDate: string, schoolId: string) {
  const { data, error } = await supabase
    .rpc("get_class_attendance_stats", {
      p_class_id: classId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_school_id: schoolId,
    });

  if (error) throw error;
  return data?.[0] || null;
}

export async function getStudentAttendanceSummary(studentId: string, startDate: string, endDate: string, schoolId: string) {
  const { data, error } = await supabase
    .rpc("get_student_attendance_summary", {
      p_student_id: studentId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_school_id: schoolId,
    });

  if (error) throw error;
  return data?.[0] || null;
}

export async function checkAttendanceExists(schoolId: string, classId: string, date: string, period?: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("date", date)
    .eq("period", period || "")
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function getTeacherClassesToday(teacherId: string, schoolId: string, date: string) {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select(`
      *,
      classes (
        id,
        name,
        grades (
          id,
          name
        )
      )
    `)
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getSchoolAttendanceStats(schoolId: string, date: string) {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select(`
      total_students,
      present_count,
      absent_count,
      late_count,
      excused_count
    `)
    .eq("school_id", schoolId)
    .eq("date", date)
    .eq("status", "submitted");

  if (error) throw error;

  const stats = data?.reduce(
    (acc, session) => {
      acc.total_students += session.total_students;
      acc.present_count += session.present_count;
      acc.absent_count += session.absent_count;
      acc.late_count += session.late_count;
      acc.excused_count += session.excused_count;
      return acc;
    },
    { total_students: 0, present_count: 0, absent_count: 0, late_count: 0, excused_count: 0 }
  );

  return stats || { total_students: 0, present_count: 0, absent_count: 0, late_count: 0, excused_count: 0 };
}