/**
 * Analytics Service
 * Provides analytics data for school management dashboards
 */

import { supabase } from "@/lib/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface SchoolOverview {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  attendance_rate: number | null;
  fee_collection_rate: number | null;
  total_fees_expected: number;
  total_fees_collected: number;
  total_fees_outstanding: number;
  average_academic_performance: number | null;
}

export interface AttendanceAnalytics {
  overall_rate: number | null;
  total_days: number | null;
  total_records: number | null;
  present_count: number | null;
  absent_count: number | null;
  late_count: number | null;
  excused_count: number | null;
}

export interface AcademicAnalytics {
  average_score: number | null;
  pass_rate: number | null;
  total_exams: number | null;
  subject_performance: SubjectPerformance[] | null;
}

export interface SubjectPerformance {
  subject_id: string;
  subject_name: string;
  average_score: number;
  pass_rate: number;
}

export interface FinanceAnalytics {
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: number | null;
  overdue_count: number | null;
  payment_methods: PaymentMethod[] | null;
}

export interface PaymentMethod {
  method: string;
  total: number;
}

export interface AnalyticsAlert {
  id: string;
  school_id: string;
  type: "attendance" | "finance" | "academic" | "staff" | "general";
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  related_student_id?: string;
  related_class_id?: string;
  related_grade_id?: string;
  status: "active" | "acknowledged" | "resolved" | "dismissed";
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EnrollmentSummary {
  school_id: string;
  grade_id: string;
  grade_name: string;
  total_students: number;
  male_students: number;
  female_students: number;
  active_students: number;
  inactive_students: number;
}

export interface AttendanceSummary {
  school_id: string;
  grade_id: string;
  grade_name: string;
  class_id?: string;
  class_name?: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate: number;
}

export interface AcademicPerformanceSummary {
  school_id: string;
  grade_id: string;
  grade_name: string;
  class_id?: string;
  class_name?: string;
  subject_id: string;
  subject_name: string;
  students_count: number;
  average_score: number;
  passed_count: number;
  failed_count: number;
  pass_rate: number;
}

export interface FinanceSummary {
  school_id: string;
  grade_id: string;
  grade_name: string;
  class_id?: string;
  class_name?: string;
  total_students: number;
  total_fees: number;
  total_paid: number;
  total_balance: number;
  overdue_count: number;
  collection_rate: number;
}

export interface StaffWorkloadSummary {
  school_id: string;
  staff_id: string;
  staff_name: string;
  position: string;
  classes_count: number;
  subjects_count: number;
  students_count: number;
}

export interface Report {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  report_type: "student" | "academic" | "attendance" | "finance" | "staff" | "custom";
  format: "pdf" | "excel" | "csv";
  filters: Record<string, any>;
  date_range_start?: string;
  date_range_end?: string;
  file_url?: string;
  file_size?: number;
  generated_by: string;
  generated_at?: string;
  status: "pending" | "generating" | "completed" | "failed";
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

export const analyticsService = {
  /**
   * Get school overview analytics
   */
  async getSchoolOverview(schoolId: string): Promise<SchoolOverview> {
    const { data, error } = await supabase.rpc("get_school_analytics_overview", {
      p_school_id: schoolId,
    });

    if (error) throw error;
    return data as SchoolOverview;
  },

  /**
   * Get attendance analytics
   */
  async getAttendanceAnalytics(
    schoolId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceAnalytics> {
    const { data, error } = await supabase.rpc("get_attendance_analytics", {
      p_school_id: schoolId,
      p_start_date: startDate || undefined,
      p_end_date: endDate || undefined,
    });

    if (error) throw error;
    return data as AttendanceAnalytics;
  },

  /**
   * Get academic analytics
   */
  async getAcademicAnalytics(
    schoolId: string,
    examId?: string
  ): Promise<AcademicAnalytics> {
    const { data, error } = await supabase.rpc("get_academic_analytics", {
      p_school_id: schoolId,
      p_exam_id: examId || undefined,
    });

    if (error) throw error;
    return data as AcademicAnalytics;
  },

  /**
   * Get finance analytics
   */
  async getFinanceAnalytics(
    schoolId: string,
    startDate?: string,
    endDate?: string
  ): Promise<FinanceAnalytics> {
    const { data, error } = await supabase.rpc("get_finance_analytics", {
      p_school_id: schoolId,
      p_start_date: startDate || undefined,
      p_end_date: endDate || undefined,
    });

    if (error) throw error;
    return data as FinanceAnalytics;
  },

  /**
   * Get enrollment summary
   */
  async getEnrollmentSummary(schoolId: string): Promise<EnrollmentSummary[]> {
    const { data, error } = await supabase
      .from("student_enrollment_summary")
      .select("*")
      .eq("school_id", schoolId)
      .order("grade_name");

    if (error) throw error;
    return data as EnrollmentSummary[];
  },

  /**
   * Get attendance summary by grade/class
   */
  async getAttendanceSummary(schoolId: string, gradeId?: string, classId?: string): Promise<AttendanceSummary[]> {
    let query = supabase
      .from("attendance_summary_view")
      .select("*")
      .eq("school_id", schoolId)
      .order("grade_name")
      .order("class_name");

    if (gradeId) query = query.eq("grade_id", gradeId);
    if (classId) query = query.eq("class_id", classId);

    const { data, error } = await query;

    if (error) throw error;
    return data as AttendanceSummary[];
  },

  /**
   * Get academic performance summary
   */
  async getAcademicPerformanceSummary(
    schoolId: string,
    gradeId?: string,
    classId?: string,
    subjectId?: string
  ): Promise<AcademicPerformanceSummary[]> {
    let query = supabase
      .from("academic_performance_summary")
      .select("*")
      .eq("school_id", schoolId)
      .order("grade_name")
      .order("class_name")
      .order("subject_name");

    if (gradeId) query = query.eq("grade_id", gradeId);
    if (classId) query = query.eq("class_id", classId);
    if (subjectId) query = query.eq("subject_id", subjectId);

    const { data, error } = await query;

    if (error) throw error;
    return data as AcademicPerformanceSummary[];
  },

  /**
   * Get finance summary by grade/class
   */
  async getFinanceSummary(schoolId: string, gradeId?: string, classId?: string): Promise<FinanceSummary[]> {
    let query = supabase
      .from("finance_summary_view")
      .select("*")
      .eq("school_id", schoolId)
      .order("grade_name")
      .order("class_name");

    if (gradeId) query = query.eq("grade_id", gradeId);
    if (classId) query = query.eq("class_id", classId);

    const { data, error } = await query;

    if (error) throw error;
    return data as FinanceSummary[];
  },

  /**
   * Get staff workload summary
   */
  async getStaffWorkloadSummary(schoolId: string): Promise<StaffWorkloadSummary[]> {
    const { data, error } = await supabase
      .from("staff_workload_summary")
      .select("*")
      .eq("school_id", schoolId)
      .order("staff_name");

    if (error) throw error;
    return data as StaffWorkloadSummary[];
  },

  /**
   * Get analytics alerts
   */
  async getAlerts(
    schoolId: string,
    status?: string,
    type?: string,
    severity?: string
  ): Promise<AnalyticsAlert[]> {
    let query = supabase
      .from("analytics_alerts")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);
    if (severity) query = query.eq("severity", severity);

    const { data, error } = await query;

    if (error) throw error;
    return data as AnalyticsAlert[];
  },

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from("analytics_alerts")
      .update({
        status: "acknowledged",
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) throw error;
  },

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from("analytics_alerts")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) throw error;
  },

  /**
   * Dismiss alert
   */
  async dismissAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from("analytics_alerts")
      .update({ status: "dismissed" })
      .eq("id", alertId);

    if (error) throw error;
  },

  /**
   * Detect and create alerts
   */
  async detectAlerts(schoolId: string): Promise<void> {
    // Detect attendance alerts
    await supabase.rpc("detect_attendance_alerts", { p_school_id: schoolId });

    // Detect finance alerts
    await supabase.rpc("detect_finance_alerts", { p_school_id: schoolId });

    // Detect academic alerts
    await supabase.rpc("detect_academic_alerts", { p_school_id: schoolId });
  },

  // ============================================================================
  // REPORTS
  // ============================================================================

  /**
   * Get reports
   */
  async getReports(schoolId: string, reportType?: string): Promise<Report[]> {
    let query = supabase
      .from("reports")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (reportType) query = query.eq("report_type", reportType);

    const { data, error } = await query;

    if (error) throw error;
    return data as Report[];
  },

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<Report | null> {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (error) throw error;
    return data as Report;
  },

  /**
   * Create report
   */
  async createReport(report: Omit<Report, "id" | "created_at" | "updated_at">): Promise<Report> {
    const { data, error } = await supabase
      .from("reports")
      .insert(report)
      .select()
      .single();

    if (error) throw error;
    return data as Report;
  },

  /**
   * Update report
   */
  async updateReport(reportId: string, updates: Partial<Report>): Promise<Report> {
    const { data, error } = await supabase
      .from("reports")
      .update(updates)
      .eq("id", reportId)
      .select()
      .single();

    if (error) throw error;
    return data as Report;
  },

  /**
   * Delete report
   */
  async deleteReport(reportId: string): Promise<void> {
    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId);

    if (error) throw error;
  },

  // ============================================================================
  // DASHBOARD WIDGETS
  // ============================================================================

  /**
   * Get dashboard widgets
   */
  async getDashboardWidgets(schoolId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("dashboard_widgets")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_visible", true)
      .order("position_y")
      .order("position_x");

    if (error) throw error;
    return data || [];
  },

  /**
   * Create dashboard widget
   */
  async createDashboardWidget(widget: any): Promise<any> {
    const { data, error } = await supabase
      .from("dashboard_widgets")
      .insert(widget)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update dashboard widget
   */
  async updateDashboardWidget(widgetId: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from("dashboard_widgets")
      .update(updates)
      .eq("id", widgetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete dashboard widget
   */
  async deleteDashboardWidget(widgetId: string): Promise<void> {
    const { error } = await supabase
      .from("dashboard_widgets")
      .delete()
      .eq("id", widgetId);

    if (error) throw error;
  },
};