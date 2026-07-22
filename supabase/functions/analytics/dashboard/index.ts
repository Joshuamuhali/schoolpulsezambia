/**
 * Analytics Dashboard Edge Function
 * GET: Role-aware dashboard analytics
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  successResponse,
  errorResponse,
} from "../../_shared/middleware.ts";

serve(async (req: Request) => {
  return await withMiddleware(
    req,
    async (context, supabase) => {
      const { schoolId, role } = context;

      if (req.method === "GET") {
        let analytics: any = {};

        // Common metrics for all roles
        const { data: studentCount } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "active");

        const { data: staffCount } = await supabase
          .from("staff")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("is_active", true);

        analytics.student_count = studentCount || 0;
        analytics.staff_count = staffCount || 0;

        // Role-specific analytics
        if (role === "bursar" || role === "school_admin" || role === "school_owner") {
          // Finance metrics
          const { data: financeSummary } = await supabase
            .from("daily_collection_aggregates")
            .select("total_amount")
            .eq("school_id", schoolId)
            .gte("date", new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));

          const totalCollected = financeSummary?.reduce((sum: number, row: any) => sum + Number(row.total_amount), 0) || 0;

          const { data: outstandingFees } = await supabase
            .from("student_bills")
            .select("balance")
            .eq("school_id", schoolId)
            .gt("balance", 0);

          const totalOutstanding = outstandingFees?.reduce((sum: number, row: any) => sum + Number(row.balance), 0) || 0;

          analytics.finance = {
            total_collected: totalCollected,
            total_outstanding: totalOutstanding,
          };
        }

        if (role === "academic_manager" || role === "school_admin" || role === "school_owner") {
          // Academic metrics
          const { data: attendanceRate } = await supabase
            .from("attendance_summary")
            .select("attendance_rate")
            .eq("school_id", schoolId)
            .gte("month", new Date().toISOString().slice(0, 7));

          const avgAttendance = attendanceRate?.length > 0
            ? attendanceRate.reduce((sum: number, row: any) => sum + Number(row.attendance_rate), 0) / attendanceRate.length
            : 0;

          analytics.academic = {
            average_attendance_rate: avgAttendance,
          };
        }

        if (role === "teacher" || role === "class_teacher") {
          // Teacher-specific metrics
          const { data: teacherClasses } = await supabase
            .from("teacher_assignments")
            .select("class_id, classes(name)")
            .eq("teacher_id", context.userId)
            .eq("school_id", schoolId);

          analytics.teacher = {
            assigned_classes: teacherClasses || [],
          };
        }

        return successResponse(analytics);
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "analytics" }
  );
});
