/**
 * Event Processor Edge Function
 * Scheduled job to process unprocessed domain events
 * Call this via Supabase cron job or external scheduler
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get unprocessed events
  const { data: events, error } = await supabase
    .from("domain_events")
    .select("*")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let failed = 0;

  for (const event of events || []) {
    try {
      await handleEvent(supabase, event);
      await supabase.rpc("process_domain_event", {
        p_event_id: event.id,
      });
      processed++;
    } catch (error: any) {
      console.error(`Failed to process event ${event.id}:`, error);
      await supabase.rpc("process_domain_event", {
        p_event_id: event.id,
        p_error: error.message,
      });
      failed++;
    }
  }

  return new Response(
    JSON.stringify({
      processed,
      failed,
      total: events?.length || 0,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});

async function handleEvent(supabase: any, event: any): Promise<void> {
  const { event_type, payload, school_id } = event;

  switch (event_type) {
    case "student.enrolled":
      await handleStudentEnrolled(supabase, school_id, payload);
      break;
    case "class.teacher_assigned":
      await handleTeacherAssigned(supabase, school_id, payload);
      break;
    case "attendance.marked_absent":
      await handleAttendanceMarkedAbsent(supabase, school_id, payload);
      break;
    case "exam.published":
      await handleExamPublished(supabase, school_id, payload);
      break;
    case "payment.recorded":
      await handlePaymentRecorded(supabase, school_id, payload);
      break;
    default:
      console.log(`No handler for event type: ${event_type}`);
  }
}

async function handleStudentEnrolled(
  supabase: any,
  schoolId: string,
  payload: { student_id: string; grade_id: string; academic_year_id: string }
): Promise<void> {
  // Check for active fee structure for this grade
  const { data: feeStructure } = await supabase
    .from("fee_structures")
    .select("*")
    .eq("school_id", schoolId)
    .eq("grade_id", payload.grade_id)
    .eq("is_active", true)
    .single();

  if (feeStructure) {
    // Create student fee record
    await supabase.from("student_fees").insert({
      school_id: schoolId,
      student_id: payload.student_id,
      fee_structure_id: feeStructure.id,
      amount_due: feeStructure.total_amount,
      amount_paid: 0,
      balance: feeStructure.total_amount,
      status: "unpaid",
    });
  }
}

async function handleTeacherAssigned(
  supabase: any,
  schoolId: string,
  payload: { class_id: string; teacher_id: string }
): Promise<void> {
  // Update teacher_assignments table
  await supabase.from("teacher_assignments").upsert({
    school_id: schoolId,
    teacher_id: payload.teacher_id,
    class_id: payload.class_id,
    assigned_at: new Date().toISOString(),
  });
}

async function handleAttendanceMarkedAbsent(
  supabase: any,
  schoolId: string,
  payload: { student_id: string; date: string; class_id: string }
): Promise<void> {
  // Queue parent notification
  const { data: guardians } = await supabase
    .from("student_guardians")
    .select("guardian_id")
    .eq("student_id", payload.student_id);

  if (guardians) {
    for (const guardian of guardians) {
      await supabase.from("notifications").insert({
        school_id: schoolId,
        user_id: guardian.guardian_id,
        type: "attendance_alert",
        title: "Attendance Alert",
        message: `Your child was marked absent on ${payload.date}`,
        status: "pending",
      });
    }
  }

  // Update attendance summary
  const month = new Date(payload.date).toISOString().slice(0, 7); // YYYY-MM
  await supabase.rpc("increment_attendance_summary", {
    p_student_id: payload.student_id,
    p_month: month,
  });
}

async function handleExamPublished(
  supabase: any,
  schoolId: string,
  payload: { exam_id: string; class_id: string }
): Promise<void> {
  // Recreate performance aggregates
  await supabase.rpc("recompute_class_performance", {
    p_class_id: payload.class_id,
  });
}

async function handlePaymentRecorded(
  supabase: any,
  schoolId: string,
  payload: { student_id: string; amount: number; balance: number }
): Promise<void> {
  // Queue parent notification
  const { data: guardians } = await supabase
    .from("student_guardians")
    .select("guardian_id")
    .eq("student_id", payload.student_id);

  if (guardians) {
    for (const guardian of guardians) {
      await supabase.from("notifications").insert({
        school_id: schoolId,
        user_id: guardian.guardian_id,
        type: "payment_received",
        title: "Payment Received",
        message: `Payment of ZK ${payload.amount} recorded. Balance: ZK ${payload.balance}`,
        status: "pending",
      });
    }
  }

  // Update daily collection aggregate
  const today = new Date().toISOString().slice(0, 10);
  await supabase.rpc("upsert_daily_collection", {
    p_school_id: schoolId,
    p_date: today,
    p_amount: payload.amount,
  });
}
