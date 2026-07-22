/**
 * Service: dashboard — aligned to real schema.
 * Uses: students, attendance, invoices, payments
 */
import { supabase } from "@/lib/supabase/client";

export interface SchoolDashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  attendanceToday: number;
  attendanceTodayPresent: number;
  attendanceTodayTotal: number;
  revenueAllTime: number;
  unpaidInvoicesAmount: number;
}

export async function fetchSchoolDashboardStats(schoolId: string): Promise<SchoolDashboardStats> {
  const today = new Date().toISOString().split("T")[0];

  const [students, activeStudents, teachers, attendanceToday, revenue, unpaid] =
    await Promise.all([
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),

      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "active"),

      // teachers table uses school_id
      supabase
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),

      supabase
        .from("attendance")
        .select("status")
        .eq("school_id", schoolId)
        .eq("date", today),

      supabase
        .from("payments")
        .select("amount")
        .eq("school_id", schoolId),

      supabase
        .from("invoices")
        .select("amount_due, amount_paid")
        .eq("school_id", schoolId)
        .in("status", ["unpaid", "partial"]),
    ]);

  if (students.error)       throw students.error;
  if (activeStudents.error) throw activeStudents.error;
  if (teachers.error)       throw teachers.error;
  if (attendanceToday.error) throw attendanceToday.error;
  if (revenue.error)        throw revenue.error;
  if (unpaid.error)         throw unpaid.error;

  const attendanceRecords = attendanceToday.data ?? [];
  const presentCount  = attendanceRecords.filter((r: { status: string }) => r.status === "present").length;
  const totalMarked   = attendanceRecords.length;
  const attendancePct = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  const totalRevenue = (revenue.data ?? []).reduce(
    (sum: number, p: { amount: number }) => sum + Number(p.amount), 0
  );
  const unpaidAmount = (unpaid.data ?? []).reduce(
    (sum: number, inv: { amount_due: number; amount_paid: number }) =>
      sum + (Number(inv.amount_due) - Number(inv.amount_paid)),
    0
  );

  return {
    totalStudents:          students.count       ?? 0,
    activeStudents:         activeStudents.count ?? 0,
    totalTeachers:          teachers.count       ?? 0,
    attendanceToday:        attendancePct,
    attendanceTodayPresent: presentCount,
    attendanceTodayTotal:   totalMarked,
    revenueAllTime:         totalRevenue,
    unpaidInvoicesAmount:   unpaidAmount,
  };
}

export interface RecentActivityItem {
  id: string;
  action: string;
  detail: string;
  created_at: string;
}

export async function fetchRecentActivity(schoolId: string, limit = 10): Promise<RecentActivityItem[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, after_state, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((log: {
    id: string;
    action: string;
    after_state: Record<string, unknown> | null;
    created_at: string;
  }) => ({
    id: log.id,
    action: log.action,
    detail: (log.after_state as { description?: string } | null)?.description ?? log.action,
    created_at: log.created_at,
  }));
}
