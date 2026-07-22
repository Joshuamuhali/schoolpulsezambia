/**
 * Staff Assignments Edge Function
 * GET: List teacher assignments
 * POST: Create teacher assignment (emits class.teacher_assigned event)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  successResponse,
  errorResponse,
} from "../../_shared/middleware.ts";
import { emitEvent } from "../../_shared/dispatcher.ts";

serve(async (req: Request) => {
  return await withMiddleware(
    req,
    async (context, supabase) => {
      const { schoolId, userId } = context;

      if (req.method === "GET") {
        const url = new URL(req.url);
        const teacherId = url.searchParams.get("teacher_id");

        let query = supabase
          .from("teacher_assignments")
          .select("*, classes(name, grades(name)), subjects(name)")
          .eq("school_id", schoolId);

        if (teacherId) {
          query = query.eq("teacher_id", teacherId);
        } else if (context.role === "teacher") {
          // Teachers can only see their own assignments
          query = query.eq("teacher_id", userId);
        }

        const { data, error } = await query.order("assigned_at", { ascending: false });

        if (error) throw error;

        return successResponse(data);
      }

      if (req.method === "POST") {
        const body = await req.json();
        const { teacher_id, class_id, subject_id, academic_year_id } = body;

        // Create assignment
        const { data, error } = await supabase
          .from("teacher_assignments")
          .insert({
            school_id: schoolId,
            teacher_id,
            class_id,
            subject_id,
            academic_year_id,
            assigned_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // Emit class.teacher_assigned event
        await emitEvent(supabase, schoolId, "class.teacher_assigned", {
          class_id,
          teacher_id,
        });

        return successResponse(data, undefined, 201);
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "teachers", requirePermission: "staff:manage_assignments" }
  );
});
