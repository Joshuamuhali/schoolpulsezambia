/**
 * Features Edge Function
 * Platform admin feature catalog management
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  successResponse,
  errorResponse,
} from "../_shared/middleware.ts";

serve(async (req: Request) => {
  return await withMiddleware(
    req,
    async (context, supabase) => {
      const { schoolId, userId } = context;

      // GET /features - List all features
      if (req.method === "GET") {
        const url = new URL(req.url);
        const category = url.searchParams.get("category");
        const include_inactive = url.searchParams.get("include_inactive") === "true";

        let query = supabase
          .from("module_catalog")
          .select("*")
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        if (category) {
          query = query.eq("category", category);
        }

        if (!include_inactive) {
          query = query.eq("is_active", true);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching features:", error);
          return errorResponse("FETCH_FAILED", "Failed to fetch features", 500);
        }

        return successResponse({ features: data });
      }

      // POST /features - Create new feature (Platform admin only)
      if (req.method === "POST") {
        const body = await req.json();
        const { code, name, description, category, monthly_price, setup_fee, is_core, is_active } = body;

        if (!code || !name || !category || monthly_price === undefined) {
          return errorResponse("VALIDATION_ERROR", "Missing required fields", 400);
        }

        const { data, error } = await supabase
          .from("module_catalog")
          .insert({
            code,
            name,
            description: description || "",
            category,
            monthly_price,
            setup_fee: setup_fee || 0,
            is_core: is_core || false,
            is_active: is_active ?? true,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating feature:", error);
          return errorResponse("CREATE_FAILED", "Failed to create feature", 500);
        }

        return successResponse({ feature: data }, undefined, 201);
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "features", requirePermission: "features:manage" }
  );
});