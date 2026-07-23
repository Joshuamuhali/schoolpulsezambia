/**
 * School Features Edge Function
 * School feature subscription and management
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

      // GET /schools/features - Get school's features
      if (req.method === "GET") {
        const url = new URL(req.url);
        const include_pending = url.searchParams.get("include_pending") === "true";

        let query = supabase
          .from("school_modules")
          .select(`
            *,
            feature:module_catalog(*)
          `)
          .eq("school_id", schoolId)
          .order("added_at", { ascending: false });

        if (!include_pending) {
          query = query.neq("status", "removed");
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching school features:", error);
          return errorResponse("FETCH_FAILED", "Failed to fetch features", 500);
        }

        // Calculate monthly total
        const monthlyTotal = data
          ?.filter(f => f.status === "active")
          .reduce((sum, f) => sum + (f.feature?.monthly_price || 0), 0) || 0;

        return successResponse({ 
          features: data,
          monthly_total: monthlyTotal 
        });
      }

      // POST /schools/features - Subscribe to features
      if (req.method === "POST") {
        const body = await req.json();
        const { feature_codes, payment_method, reference_number, proof_url } = body;

        if (!feature_codes || !Array.isArray(feature_codes) || feature_codes.length === 0) {
          return errorResponse("VALIDATION_ERROR", "Feature codes are required", 400);
        }

        if (!payment_method || !reference_number) {
          return errorResponse("VALIDATION_ERROR", "Payment method and reference are required", 400);
        }

        // Get feature details
        const { data: features, error: featuresError } = await supabase
          .from("module_catalog")
          .select("*")
          .in("code", feature_codes)
          .eq("is_active", true);

        if (featuresError || !features || features.length === 0) {
          return errorResponse("FEATURES_NOT_FOUND", "Invalid or inactive features", 404);
        }

        // Calculate total amount
        const totalAmount = features.reduce((sum, f) => sum + f.monthly_price, 0);

        // Create payment record
        const { data: payment, error: paymentError } = await supabase
          .from("school_payments")
          .insert({
            school_id: schoolId,
            amount: totalAmount,
            payment_method,
            reference_number,
            proof_url: proof_url || null,
            status: "pending",
          })
          .select()
          .single();

        if (paymentError) {
          console.error("Error creating payment:", paymentError);
          return errorResponse("PAYMENT_FAILED", "Failed to create payment record", 500);
        }

        // Create feature subscriptions with pending status
        const subscriptions = features.map(feature => ({
          school_id: schoolId,
          feature_code: feature.code,
          status: "pending",
          enabled: false,
          price_paid: feature.monthly_price,
          activated_at: null,
          expires_at: null,
          grace_period_ends_at: null,
        }));

        const { error: subsError } = await supabase
          .from("school_modules")
          .insert(subscriptions);

        if (subsError) {
          console.error("Error creating subscriptions:", subsError);
          // Rollback payment
          await supabase.from("school_payments").delete().eq("id", payment.id);
          return errorResponse("SUBSCRIPTION_FAILED", "Failed to create subscriptions", 500);
        }

        // Create billing history records
        const billingRecords = features.map(feature => ({
          school_id: schoolId,
          feature_code: feature.code,
          amount: feature.monthly_price,
          payment_id: payment.id,
          billing_month: new Date().toISOString().split('T')[0].substring(0, 7) + '-01',
          status: "pending",
        }));

        const { error: billingError } = await supabase
          .from("feature_billing_history")
          .insert(billingRecords);

        if (billingError) {
          console.error("Error creating billing records:", billingError);
        }

        // Emit event
        await emitEvent(supabase, schoolId, "features.subscribed", {
          payment_id: payment.id,
          feature_codes,
          amount: totalAmount,
        });

        return successResponse({ 
          payment,
          features_subscribed: features.length 
        }, undefined, 201);
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "features", requirePermission: "features:subscribe" }
  );
});