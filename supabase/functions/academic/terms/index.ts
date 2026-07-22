/**
 * Academic Terms Edge Function
 * GET: List terms for a school
 * POST: Create term
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  successResponse,
  errorResponse,
} from "../../_shared/middleware.ts";

serve(async (req: Request) => {
  return await withMiddleware(req, async (context, supabase) => {
    const { schoolId } = context;
    const url = new URL(req.url);
    const academicYearId = url.searchParams.get("academic_year_id");

    if (req.method === "GET") {
      let query = supabase
        .from("terms")
        .select("*")
        .eq("school_id", schoolId);

      if (academicYearId) {
        query = query.eq("academic_year_id", academicYearId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      return successResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { name, academic_year_id, start_date, end_date } = body;

      // Validate date range is within academic year
      const { data: year } = await supabase
        .from("academic_years")
        .select("start_date, end_date")
        .eq("id", academic_year_id)
        .single();

      if (year) {
        if (start_date < year.start_date || end_date > year.end_date) {
          return errorResponse(
            "INVALID_DATE_RANGE",
            "Term dates must be within academic year range",
            400
          );
        }
      }

      const { data, error } = await supabase
        .from("terms")
        .insert({
          school_id: schoolId,
          name,
          academic_year_id,
          start_date,
          end_date,
        })
        .select()
        .single();

      if (error) throw error;

      return successResponse(data, undefined, 201);
    }

    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  });
});
