/**
 * Billing Automation Cron Job
 * Runs daily to:
 * 1. Send payment reminders
 * 2. Start grace periods
 * 3. Pause features on non-payment
 * 4. Generate invoices
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting billing automation...");

    // Get all schools with active features
    const { data: schools, error: schoolsError } = await supabase
      .from("school_modules")
      .select("school_id, feature_code, status, grace_period_ends_at, added_at")
      .eq("status", "active")
      .not("school_id", "is", null);

    if (schoolsError) {
      console.error("Error fetching schools:", schoolsError);
      return errorResponse("FETCH_FAILED", "Failed to fetch schools", 500);
    }

    // Group by school
    const schoolMap = new Map<string, any[]>();
    schools?.forEach((feature) => {
      if (!schoolMap.has(feature.school_id)) {
        schoolMap.set(feature.school_id, []);
      }
      schoolMap.get(feature.school_id)?.push(feature);
    });

    const results = {
      reminders_sent: 0,
      grace_periods_started: 0,
      features_paused: 0,
      errors: [] as string[],
    };

    // Process each school
    for (const [schoolId, features] of schoolMap.entries()) {
      try {
        // Get billing settings for school
        const { data: settings } = await supabase
          .from("billing_settings")
          .select("*")
          .eq("school_id", schoolId)
          .single();

        const billingSettings = settings || {
          grace_period_days: 7,
          reminder_days: [30, 15, 7, 3, 1],
        };

        // Get school info
        const { data: school } = await supabase
          .from("schools")
          .select("name, admin_email")
          .eq("id", schoolId)
          .single();

        if (!school) continue;

        // Check each feature
        for (const feature of features) {
          const activatedDate = new Date(feature.added_at);
          const now = new Date();
          const daysSinceActivation = Math.floor(
            (now.getTime() - activatedDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Calculate next billing date (30 days from activation)
          const nextBillingDate = new Date(activatedDate);
          nextBillingDate.setDate(nextBillingDate.getDate() + 30);
          const daysUntilBilling = Math.floor(
            (nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Check if we need to send a reminder
          if (billingSettings.reminder_days.includes(daysUntilBilling)) {
            await sendReminder(supabase, schoolId, school, feature, daysUntilBilling);
            results.reminders_sent++;
          }

          // Check if payment is overdue (past billing date)
          if (daysUntilBilling < 0 && !feature.grace_period_ends_at) {
            // Start grace period
            const gracePeriodEnds = new Date();
            gracePeriodEnds.setDate(gracePeriodEnds.getDate() + billingSettings.grace_period_days);

            await supabase
              .from("school_modules")
              .update({
                grace_period_ends_at: gracePeriodEnds.toISOString(),
              })
              .eq("id", feature.id);

            results.grace_periods_started++;
          }

          // Check if grace period has ended
          if (feature.grace_period_ends_at) {
            const gracePeriodEnd = new Date(feature.grace_period_ends_at);
            if (now > gracePeriodEnd) {
              // Pause feature
              await supabase
                .from("school_modules")
                .update({
                  status: "paused",
                  paused_at: now.toISOString(),
                  paused_reason: "Payment overdue - grace period ended",
                  grace_period_ends_at: null,
                })
                .eq("id", feature.id);

              results.features_paused++;

              // Send notification
              await sendPauseNotification(supabase, schoolId, school, feature);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing school ${schoolId}:`, error);
        results.errors.push(`School ${schoolId}: ${error}`);
      }
    }

    console.log("Billing automation completed:", results);

    return successResponse({
      message: "Billing automation completed",
      results,
    });
  } catch (error) {
    console.error("Error in billing automation:", error);
    return errorResponse("INTERNAL_ERROR", "Billing automation failed", 500);
  }
});

async function sendReminder(
  supabase: any,
  schoolId: string,
  school: any,
  feature: any,
  daysUntilBilling: number
) {
  console.log(`Sending reminder to ${school.name} for feature ${feature.feature_code}: ${daysUntilBilling} days until billing`);

  // Create notification
  await supabase.from("notifications").insert({
    school_id: schoolId,
    type: "billing_reminder",
    title: "Payment Reminder",
    message: `Your subscription for ${feature.feature_code} will be billed in ${daysUntilBilling} days.`,
    data: {
      feature_code: feature.feature_code,
      days_until_billing: daysUntilBilling,
    },
  });

  // TODO: Send email notification
  // await sendEmail(school.admin_email, "Payment Reminder", ...);
}

async function sendPauseNotification(
  supabase: any,
  schoolId: string,
  school: any,
  feature: any
) {
  console.log(`Sending pause notification to ${school.name} for feature ${feature.feature_code}`);

  // Create notification
  await supabase.from("notifications").insert({
    school_id: schoolId,
    type: "feature_paused",
    title: "Feature Paused",
    message: `Your feature ${feature.feature_code} has been paused due to non-payment. Please make a payment to reactivate.`,
    data: {
      feature_code: feature.feature_code,
      paused_at: new Date().toISOString(),
    },
  });

  // TODO: Send email notification
  // await sendEmail(school.admin_email, "Feature Paused", ...);
}

function successResponse(data: any, message?: string, status = 200) {
  return new Response(
    JSON.stringify({ success: true, data, message }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    }
  );
}

function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: code, message }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    }
  );
}