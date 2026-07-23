/**
 * School Feature by Code Edge Function
 * Manage individual school features (pause, resume, remove)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  successResponse,
  errorResponse,
} from "../../../_shared/middleware.ts";

serve(async (req: Request) => {
  return await withMiddleware(
    req,
    async (context, supabase) => {
      const { schoolId } = context;
      const url = new URL(req.url);
      const featureCode = url.pathname.split("/").pop();

      if (!featureCode) {
        return errorResponse("VALIDATION_ERROR", "Feature code is required", 400);
      }

      // GET /schools/features/:code - Get specific feature
      if (req.method === "GET") {
        const { data, error } = await supabase
          .from("school_modules")
          .select(`
            *,
            feature:module_catalog(*)
          `)
          .eq("school_id", schoolId)
          .eq("feature_code", featureCode)
          .single();

        if (error || !data) {
          return errorResponse("NOT_FOUND", "Feature not found", 404);
        }

        return successResponse({ feature: data });
      }

      // PUT /schools/features/:code - Update feature status
      if (req.method === "PUT") {
        const body = await req.json();
        const { status, enabled, reason } = body;

        // Get current feature
        const { data: current, error: fetchError } = await supabase
          .from("school_modules")
          .select("*")
          .eq("school_id", schoolId)
          .eq("feature_code", featureCode)
          .single();

        if (fetchError || !current) {
          return errorResponse("NOT_FOUND", "Feature not found", 404);
        }

        const updates: any = {};

        if (status) {
          updates.status = status;
          
          // Set timestamps based on status
          if (status === "paused") {
            updates.paused_at = new Date().toISOString();
            updates.paused_reason = reason || "Non-payment";
          } else if (status === "active") {
            updates.paused_at = null;
            updates.paused_reason = null;
            updates.grace_period_ends_at = null;
          }
        }

        if (enabled !== undefined) {
          updates.enabled = enabled;
        }

        const { data: updated, error: updateError } = await supabase
          .from("school_modules")
          .update(updates)
          .eq("school_id", schoolId)
          .eq("feature_code", featureCode)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating feature:", updateError);
          return errorResponse("UPDATE_FAILED", "Failed to update feature", 500);
        }

        return successResponse({ feature: updated });
      }

      // DELETE /schools/features/:code - Remove feature
      if (req.method === "DELETE") {
        const body = await req.json();
        const { effective_date } = body;

        const { error } = await supabase
          .from("school_modules")
          .update({
            status: "removed",
            removal_requested_at: new Date().toISOString(),
            removal_effective_date: effective_date || null,
          })
          .eq("school_id", schoolId)
          .eq("feature_code", featureCode);

        if (error) {
          console.error("Error removing feature:", error);
          return errorResponse("DELETE_FAILED", "Failed to remove feature", 500);
        }

        return successResponse({ message: "Feature removed successfully" });
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "features", requirePermission: "features:manage" }
  );
});