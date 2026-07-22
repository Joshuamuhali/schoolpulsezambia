/**
 * Academic Years Edge Function
 * GET: List academic years
 * POST: Create academic year
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

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return successResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { name, start_date, end_date } = body;

      // Validate only one active year
      if (body.is_active) {
        const { data: existing } = await supabase
          .from("academic_years")
          .select("id")
          .eq("school_id", schoolId)
          .eq("is_active", true)
          .single();

        if (existing) {
          return errorResponse(
            "ACTIVE_YEAR_EXISTS",
            "Only one academic year can be active at a time",
            409
          );
        }
      }

      const { data, error } = await supabase
        .from("academic_years")
        .insert({
          school_id: schoolId,
          name,
          start_date,
          end_date,
          is_active: body.is_active || false,
        })
        .select()
        .single();

      if (error) throw error;

      return successResponse(data, undefined, 201);
    }

    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  });
});
