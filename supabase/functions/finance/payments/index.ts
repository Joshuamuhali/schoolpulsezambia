/**
 * Payments Edge Function
 * POST: Record payment (transactional, emits payment.recorded event)
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

      if (req.method === "POST") {
        const body = await req.json();
        const { student_id, amount, payment_method, reference, bill_id } = body;

        // Check idempotency key
        const idempotencyKey = req.headers.get("Idempotency-Key");
        if (idempotencyKey) {
          const { data: existing } = await supabase
            .from("payments")
            .select("*")
            .eq("idempotency_key", idempotencyKey)
            .single();

          if (existing) {
            return successResponse(existing);
          }
        }

        // Use Postgres function for transactional payment recording
        const { data, error } = await supabase.rpc("record_payment_transaction", {
          p_school_id: schoolId,
          p_student_id: student_id,
          p_bill_id: bill_id,
          p_amount: amount,
          p_payment_method: payment_method,
          p_reference: reference,
          p_recorded_by: userId,
          p_idempotency_key: idempotencyKey,
        });

        if (error) throw error;

        // Emit payment.recorded event
        await emitEvent(supabase, schoolId, "payment.recorded", {
          student_id,
          amount,
          balance: data.new_balance,
        });

        return successResponse(data, undefined, 201);
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    },
    { requireModule: "finance", requirePermission: "finance:record_payment" }
  );
});
