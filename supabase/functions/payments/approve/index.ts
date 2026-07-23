/**
 * Payment Approval Edge Function
 * Approve/reject payments and activate features
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
      const paymentId = url.pathname.split("/").pop();

      if (!paymentId) {
        return errorResponse("VALIDATION_ERROR", "Payment ID is required", 400);
      }

      // POST /payments/approve - Approve payment and activate features
      if (req.method === "POST") {
        const body = await req.json();
        const { approved, notes } = body;

        // Get payment details
        const { data: payment, error: paymentError } = await supabase
          .from("school_payments")
          .select("*")
          .eq("id", paymentId)
          .eq("school_id", schoolId)
          .single();

        if (paymentError || !payment) {
          return errorResponse("NOT_FOUND", "Payment not found", 404);
        }

        if (payment.status !== "pending") {
          return errorResponse("INVALID_STATUS", "Payment already processed", 400);
        }

        if (approved) {
          // Update payment status
          const { error: updatePaymentError } = await supabase
            .from("school_payments")
            .update({
              status: "approved",
              reviewed_by: userId,
              reviewed_at: new Date().toISOString(),
              notes: notes || null,
            })
            .eq("id", paymentId);

          if (updatePaymentError) {
            console.error("Error updating payment:", updatePaymentError);
            return errorResponse("UPDATE_FAILED", "Failed to update payment", 500);
          }

          // Get pending features for this payment
          const { data: features, error: featuresError } = await supabase
            .from("school_modules")
            .select("*")
            .eq("school_id", schoolId)
            .eq("status", "pending");

          if (featuresError) {
            console.error("Error fetching features:", featuresError);
          }

          // Activate features
          if (features && features.length > 0) {
            const featureCodes = features.map(f => f.feature_code);
            
            const { error: activateError } = await supabase
              .from("school_modules")
              .update({
                status: "active",
                enabled: true,
                activated_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                grace_period_ends_at: null,
              })
              .eq("school_id", schoolId)
              .eq("status", "pending");

            if (activateError) {
              console.error("Error activating features:", activateError);
            }

            // Update billing history
            const { error: billingError } = await supabase
              .from("feature_billing_history")
              .update({
                status: "paid",
                payment_id: paymentId,
                updated_at: new Date().toISOString(),
              })
              .eq("school_id", schoolId)
              .eq("payment_id", paymentId);

            if (billingError) {
              console.error("Error updating billing history:", billingError);
            }

            // Emit event
            await emitEvent(supabase, schoolId, "features.activated", {
              payment_id: paymentId,
              feature_codes: featureCodes,
              amount: payment.amount,
            });
          }

          return successResponse({
            message: "Payment approved and features activated",
            features_activated: features?.length || 0,
          });
        } else {
          // Reject payment
          const { error: rejectError } = await supabase
            .from("school_payments")
            .update({
              status: "rejected",
              reviewed_by: userId,
              reviewed_at: new Date().toISOString(),
              notes: notes || "Payment rejected",
            })
            .eq("id", paymentId);

          if (rejectError) {
            console.error("Error rejecting payment:", rejectError);
            return errorResponse("UPDATE_FAILED", "Failed to reject payment", 500);
          }

          // Remove pending features
          const { error: removeError } = await supabase
            .from("school_modules")
            .delete()
            .eq("school_id", schoolId)
            .eq("status", "pending");

          if (removeError) {
            console.error("Error removing pending features:", removeError);
          }

          // Emit event
          await emitEvent(supabase, schoolId, "payment.rejected", {
            payment_id: paymentId,
            reason: notes,
          });

          return successResponse({
            message: "Payment rejected",
          });
        }
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "payments", requirePermission: "payments:approve" }
  );
});