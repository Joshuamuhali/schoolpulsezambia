/**
 * Attendance Sessions Edge Function
 * GET: List attendance sessions
 * POST: Submit attendance (idempotent, emits attendance.marked_absent event)
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
      const url = new URL(req.url);
      const classId = url.searchParams.get("class_id");
      const date = url.searchParams.get("date");

      if (req.method === "GET") {
        let query = supabase
          .from("attendance_sessions")
          .select("*, attendance_records(*)")
          .eq("school_id", schoolId);

        if (classId) query = query.eq("class_id", classId);
        if (date) query = query.eq("date", date);

        const { data, error } = await query.order("date", { ascending: false });

        if (error) throw error;

        return successResponse(data);
      }

      if (req.method === "POST") {
        const body = await req.json();
        const { class_id, date, records } = body;

        // Check idempotency key
        const idempotencyKey = req.headers.get("Idempotency-Key");
        if (idempotencyKey) {
          const { data: existing } = await supabase
            .from("attendance_sessions")
            .select("*")
            .eq("idempotency_key", idempotencyKey)
            .single();

          if (existing) {
            return successResponse(existing);
          }
        }

        // Verify teacher owns class
        const hasAccess = await supabase.rpc("assert_teacher_owns_class", {
          p_class_id: class_id,
        });

        if (!hasAccess) {
          return errorResponse("PERMISSION_DENIED", "You don't have access to this class", 403);
        }

        // Create attendance session
        const { data: session, error: sessionError } = await supabase
          .from("attendance_sessions")
          .insert({
            school_id: schoolId,
            class_id,
            date,
            recorded_by: userId,
            idempotency_key: idempotencyKey,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // Create attendance records
        const recordsToInsert = records.map((record: any) => ({
          school_id: schoolId,
          session_id: session.id,
          student_id: record.student_id,
          status: record.status,
          remarks: record.remarks,
        }));

        const { error: recordsError } = await supabase
          .from("attendance_records")
          .insert(recordsToInsert);

        if (recordsError) throw recordsError;

        // Emit events for absent students
        const absentStudents = records.filter((r: any) => r.status === "absent");
        for (const student of absentStudents) {
          await emitEvent(supabase, schoolId, "attendance.marked_absent", {
            student_id: student.student_id,
            date,
            class_id,
          });
        }

        return successResponse(session, undefined, 201);
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "attendance", requirePermission: "attendance:record" }
  );
});
