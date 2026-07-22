/**
 * Exam Marks Edge Function
 * POST: Submit exam marks (idempotent, transactional)
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
      const { schoolId, userId } = context;

      if (req.method === "POST") {
        const body = await req.json();
        const { exam_subject_id, scores } = body;

        // Check idempotency key
        const idempotencyKey = req.headers.get("Idempotency-Key");
        if (idempotencyKey) {
          const { data: existing } = await supabase
            .from("exam_results")
            .select("*")
            .eq("idempotency_key", idempotencyKey)
            .limit(1);

          if (existing && existing.length > 0) {
            return successResponse(existing);
          }
        }

        // Verify teacher owns the class for this exam subject
        const { data: examSubject } = await supabase
          .from("exam_subjects")
          .select("class_id, teacher_id")
          .eq("id", exam_subject_id)
          .single();

        if (!examSubject) {
          return errorResponse("EXAM_SUBJECT_NOT_FOUND", "Exam subject not found", 404);
        }

        if (examSubject.teacher_id !== userId) {
          return errorResponse("PERMISSION_DENIED", "You don't have access to this exam", 403);
        }

        // Use Postgres function for transactional marks submission
        const { data, error } = await supabase.rpc("submit_exam_marks", {
          p_school_id: schoolId,
          p_exam_subject_id: exam_subject_id,
          p_scores: scores,
          p_recorded_by: userId,
          p_idempotency_key: idempotencyKey,
        });

        if (error) throw error;

        return successResponse(data, undefined, 201);
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "exams", requirePermission: "exams:record_marks" }
  );
});
