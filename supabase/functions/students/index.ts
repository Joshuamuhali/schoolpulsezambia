/**
 * Students Edge Function
 * GET: List students with pagination
 * POST: Create student (emits student.enrolled event)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  successResponse,
  errorResponse,
} from "../_shared/middleware.ts";
import { emitEvent } from "../_shared/dispatcher.ts";

serve(async (req: Request) => {
  return await withMiddleware(
    req,
    async (context, supabase) => {
      const { schoolId } = context;
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = parseInt(url.searchParams.get("per_page") || "25");
      const search = url.searchParams.get("search");

      if (req.method === "GET") {
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        let query = supabase
          .from("students")
          .select("*, classes(name, grades(name))", { count: "exact" })
          .eq("school_id", schoolId)
          .eq("status", "active")
          .range(from, to);

        if (search) {
          query = query.ilike("full_name", `%${search}%`);
        }

        const { data, error, count } = await query.order("full_name", {
          ascending: true,
        });

        if (error) throw error;

        return successResponse(data, {
          page,
          per_page: perPage,
          total: count || 0,
        });
      }

      if (req.method === "POST") {
        const body = await req.json();
        const {
          admission_number,
          first_name,
          last_name,
          date_of_birth,
          gender,
          class_id,
          grade_id,
        } = body;

        // Create student
        const { data: student, error: studentError } = await supabase
          .from("students")
          .insert({
            school_id: schoolId,
            admission_number,
            first_name,
            last_name,
            date_of_birth,
            gender,
            status: "active",
          })
          .select()
          .single();

        if (studentError) throw studentError;

        // Create enrollment if class provided
        if (class_id && grade_id) {
          const { data: enrollment } = await supabase
            .from("student_enrollments")
            .insert({
              school_id: schoolId,
              student_id: student.id,
              class_id,
              grade_id,
              academic_year_id: body.academic_year_id,
              enrollment_date: new Date().toISOString(),
            })
            .select()
            .single();

          // Emit student.enrolled event
          await emitEvent(supabase, schoolId, "student.enrolled", {
            student_id: student.id,
            grade_id,
            class_id,
            academic_year_id: body.academic_year_id,
          });
        }

        return successResponse(student, undefined, 201);
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "students" }
  );
});
