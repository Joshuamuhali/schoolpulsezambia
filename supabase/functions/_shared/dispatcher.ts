/**
 * Domain Event Dispatcher
 * Handles emitting and processing domain events
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface EventPayload {
  [key: string]: any;
}

/**
 * Emit a domain event
 */
export async function emitEvent(
  supabase: any,
  schoolId: string,
  eventType: string,
  payload: EventPayload
): Promise<string> {
  const { data, error } = await supabase.rpc("emit_domain_event", {
    p_school_id: schoolId,
    p_event_type: eventType,
    p_payload: payload,
  });

  if (error) throw error;
  return data;
}

/**
 * Process unprocessed events
 * This would be called by a scheduled job or webhook
 */
export async function processEvents(supabase: any): Promise<void> {
  const { data: events, error } = await supabase
    .from("domain_events")
    .select("*")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw error;

  for (const event of events) {
    try {
      await handleEvent(supabase, event);
      await supabase.rpc("process_domain_event", {
        p_event_id: event.id,
      });
    } catch (error: any) {
      console.error(`Failed to process event ${event.id}:`, error);
      await supabase.rpc("process_domain_event", {
        p_event_id: event.id,
        p_error: error.message,
      });
    }
  }
}

/**
 * Handle individual events
 * Routes to appropriate handler based on event type
 */
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

/**
 * Handler: Student Enrolled
 * Triggers fee generation if fee structure exists
 */
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

/**
 * Handler: Teacher Assigned to Class
 */
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

/**
 * Handler: Attendance Marked Absent
 * Triggers parent notification and analytics update
 */
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

/**
 * Handler: Exam Published
 * Triggers analytics update
 */
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

/**
 * Handler: Payment Recorded
 * Triggers parent notification and analytics update
 */
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
