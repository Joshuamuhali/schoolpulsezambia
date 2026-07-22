/**
 * Parent Portal - Children Edge Function
 * GET: List parent's children with composed summary
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
      const { userId, schoolId } = context;

      if (req.method === "GET") {
        // Get guardian's linked students
        const { data: guardianships, error: guardianError } = await supabase
          .from("student_guardians")
          .select(`
            student_id,
            students (
              id,
              admission_number,
              first_name,
              last_name,
              classes (
                name,
                grades (name)
              )
            )
          `)
          .eq("guardian_id", userId)
          .eq("is_primary", true);

        if (guardianError) throw guardianError;

        // Compose summary for each child
        const children = await Promise.all(
          guardianships.map(async (guardianship: any) => {
            const student = guardianship.students;
            const studentId = student.id;

            // Get attendance summary
            const { data: attendance } = await supabase
              .from("attendance_summary")
              .select("*")
              .eq("student_id", studentId)
              .order("month", { ascending: false })
              .limit(1)
              .single();

            // Get latest exam results
            const { data: results } = await supabase
              .from("exam_results")
              .select(`
                score,
                grade,
                exam_subjects (
                  subjects (name)
                )
              `)
              .eq("student_id", studentId)
              .order("created_at", { ascending: false })
              .limit(5);

            // Get fee balance
            const { data: fees } = await supabase
              .from("student_bills")
              .select("balance, status")
              .eq("student_id", studentId)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            return {
              ...student,
              attendance: attendance || null,
              latest_results: results || [],
              fee_balance: fees?.balance || 0,
              fee_status: fees?.status || "none",
            };
          })
        );

        return successResponse(children);
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "parent_portal" }
  );
});
