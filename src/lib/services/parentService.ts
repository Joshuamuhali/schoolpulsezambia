/**
 * Parent Service
 * Complete parent portal functionality with child linking, dashboard data, and notifications
 */

import { supabase } from "@/lib/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface ParentProfile {
  id: string;
  school_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  relationship: "mother" | "father" | "guardian" | "grandparent" | "other";
  occupation?: string;
  address?: string;
  national_id?: string;
  status: "active" | "inactive" | "pending";
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  notification_preferences: {
    sms: boolean;
    email: boolean;
    in_app: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface ChildInfo {
  student_id: string;
  student_name: string;
  admission_number: string;
  grade_id: string;
  grade_name: string;
  class_id?: string;
  class_name?: string;
  class_teacher_id?: string;
  class_teacher_name?: string;
}

export interface AttendanceSummary {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_percentage: number;
}

export interface FeeSummary {
  total_fees: number;
  total_paid: number;
  balance: number;
  overdue_count: number;
}

export interface LatestResult {
  exam_id: string;
  exam_name: string;
  term_id: string;
  term_name: string;
  academic_year_id: string;
  average: number;
  overall_grade: string;
  position?: number;
  published_at: string;
}

export interface Announcement {
  id: string;
  school_id: string;
  title: string;
  message: string;
  summary?: string;
  audience: "all" | "parents" | "staff" | "specific_class" | "specific_grade";
  target_class_ids?: string[];
  target_grade_ids?: string[];
  target_role_keys?: string[];
  priority: "low" | "normal" | "high" | "urgent";
  category: "general" | "academic" | "financial" | "event" | "urgent" | "holiday";
  publish_at: string;
  expire_at?: string;
  status: "draft" | "published" | "archived";
  attachment_urls?: string[];
  created_by: string;
  published_by?: string;
  published_at?: string;
  archived_by?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  school_id: string;
  user_id: string;
  type: "attendance_alert" | "fee_reminder" | "exam_notification" | "result_published" | "announcement" | "payment_receipt" | "general" | "system";
  title: string;
  message: string;
  data?: Record<string, any>;
  channel: "sms" | "email" | "in_app" | "push";
  status: "pending" | "sent" | "delivered" | "failed" | "read";
  related_student_id?: string;
  related_announcement_id?: string;
  related_payment_id?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  failure_reason?: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  school_id?: string;
  type: string;
  name: string;
  description?: string;
  sms_template?: string;
  email_subject?: string;
  email_body?: string;
  in_app_title?: string;
  in_app_message?: string;
  available_variables?: string[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParentInvitation {
  id: string;
  school_id: string;
  student_id: string;
  parent_email: string;
  parent_first_name: string;
  parent_last_name: string;
  relationship: "mother" | "father" | "guardian" | "grandparent" | "other";
  token: string;
  expires_at: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  sent_at: string;
  accepted_at?: string;
  invited_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentGuardian {
  id: string;
  school_id: string;
  student_id: string;
  parent_id: string;
  relationship: "mother" | "father" | "guardian" | "grandparent" | "other";
  is_primary: boolean;
  is_emergency_contact: boolean;
  can_pickup: boolean;
  priority_order: number;
  receive_attendance_alerts: boolean;
  receive_fee_reminders: boolean;
  receive_result_notifications: boolean;
  receive_announcements: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PARENT PROFILE MANAGEMENT
// ============================================================================

/**
 * Get current parent profile
 */
export async function getCurrentParentProfile(): Promise<ParentProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("parent_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (error) return null;
  return data as ParentProfile;
}

/**
 * Get parent profile by user ID
 */
export async function getParentProfile(userId: string): Promise<ParentProfile | null> {
  const { data, error } = await supabase
    .from("parent_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as ParentProfile;
}

/**
 * Get parent profile by ID
 */
export async function getParentProfileById(profileId: string): Promise<ParentProfile | null> {
  const { data, error } = await supabase
    .from("parent_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (error) return null;
  return data as ParentProfile;
}

/**
 * Create parent profile
 */
export async function createParentProfile(
  profile: Omit<ParentProfile, "id" | "created_at" | "updated_at">
): Promise<ParentProfile> {
  const { data, error } = await supabase
    .from("parent_profiles")
    .insert(profile)
    .select()
    .single();

  if (error) throw error;
  return data as ParentProfile;
}

/**
 * Update parent profile
 */
export async function updateParentProfile(
  userId: string,
  updates: Partial<ParentProfile>
): Promise<ParentProfile> {
  const { data, error } = await supabase
    .from("parent_profiles")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as ParentProfile;
}

/**
 * Get all parent profiles for a school
 */
export async function getSchoolParentProfiles(schoolId: string): Promise<ParentProfile[]> {
  const { data, error } = await supabase
    .from("parent_profiles")
    .select("*")
    .eq("school_id", schoolId)
    .order("last_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ParentProfile[];
}

/**
 * Verify parent profile
 */
export async function verifyParentProfile(
  profileId: string,
  verifiedBy: string
): Promise<ParentProfile> {
  const { data, error } = await supabase
    .from("parent_profiles")
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_by: verifiedBy,
    })
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw error;
  return data as ParentProfile;
}

// ============================================================================
// CHILD MANAGEMENT
// ============================================================================

/**
 * Get parent's children
 */
export async function getParentChildren(userId: string): Promise<ChildInfo[]> {
  const { data, error } = await supabase.rpc("get_parent_children", {
    p_parent_user_id: userId,
  });

  if (error) throw error;
  return (data ?? []) as ChildInfo[];
}

/**
 * Get child details with full information
 */
export async function getChildDetails(studentId: string): Promise<any> {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      classes (
        name,
        grades (name, id)
      ),
      student_guardians (
        is_primary,
        guardian:guardians (*)
      )
    `)
    .eq("id", studentId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Link child to parent (by school admin)
 */
export async function linkChildToParent(
  studentId: string,
  guardianId: string,
  isPrimary: boolean = false
): Promise<void> {
  const { error } = await supabase.from("student_guardians").insert({
    student_id: studentId,
    guardian_id: guardianId,
    is_primary: isPrimary,
  });

  if (error) throw error;
}

/**
 * Unlink child from parent
 */
export async function unlinkChildFromParent(studentId: string, guardianId: string): Promise<void> {
  const { error } = await supabase
    .from("student_guardians")
    .delete()
    .eq("student_id", studentId)
    .eq("guardian_id", guardianId);

  if (error) throw error;
}

/**
 * Request child linking (by parent)
 */
export async function requestChildLinking(
  studentId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  // Get student details
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("school_id, full_name")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return { success: false, message: "Student not found" };
  }

  // Get or create guardian record
  const { data: existingGuardian } = await supabase
    .from("guardians")
    .select("id")
    .eq("user_id", userId)
    .eq("school_id", student.school_id)
    .single();

  let guardianId = existingGuardian?.id;

  if (!guardianId) {
    // Get parent profile
    const { data: parentProfile } = await supabase
      .from("parent_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!parentProfile) {
      return { success: false, message: "Parent profile not found" };
    }

    // Create guardian record
    const { data: newGuardian, error: guardianError } = await supabase
      .from("guardians")
      .insert({
        school_id: student.school_id,
        user_id: userId,
        full_name: `${parentProfile.first_name} ${parentProfile.last_name}`,
        phone: parentProfile.phone,
        email: parentProfile.email,
        relationship: parentProfile.relationship,
        address: parentProfile.address,
        national_id: parentProfile.national_id,
      })
      .select("id")
      .single();

    if (guardianError) {
      return { success: false, message: "Failed to create guardian record" };
    }

    guardianId = newGuardian.id;
  }

  // Check if already linked
  const { data: existingLink } = await supabase
    .from("student_guardians")
    .select("id")
    .eq("student_id", studentId)
    .eq("guardian_id", guardianId)
    .single();

  if (existingLink) {
    return { success: false, message: "Already linked to this student" };
  }

  // Create link
  const { error: linkError } = await supabase.from("student_guardians").insert({
    student_id: studentId,
    guardian_id: guardianId,
    is_primary: false,
  });

  if (linkError) {
    return { success: false, message: "Failed to link student" };
  }

  return { success: true, message: `Successfully linked to ${student.full_name}` };
}

// ============================================================================
// DASHBOARD DATA
// ============================================================================

/**
 * Get parent dashboard data
 */
export async function getParentDashboard(userId: string): Promise<{
  children: ChildInfo[];
  attendanceSummaries: Map<string, AttendanceSummary>;
  feeSummaries: Map<string, FeeSummary>;
  latestResults: Map<string, LatestResult[]>;
  unreadNotifications: number;
}> {
  // Get children
  const children = await getParentChildren(userId);

  // Initialize maps
  const attendanceSummaries = new Map<string, AttendanceSummary>();
  const feeSummaries = new Map<string, FeeSummary>();
  const latestResults = new Map<string, LatestResult[]>();

  // Fetch data for each child
  for (const child of children) {
    // Attendance summary
    try {
      const { data: attendance } = await supabase.rpc("get_parent_attendance_summary", {
        p_student_id: child.student_id,
      });
      if (attendance && attendance.length > 0) {
        attendanceSummaries.set(child.student_id, attendance[0] as AttendanceSummary);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }

    // Fee summary
    try {
      const { data: fees } = await supabase.rpc("get_parent_fee_summary", {
        p_student_id: child.student_id,
      });
      if (fees && fees.length > 0) {
        feeSummaries.set(child.student_id, fees[0] as FeeSummary);
      }
    } catch (error) {
      console.error("Error fetching fees:", error);
    }

    // Latest results
    try {
      const { data: results } = await supabase.rpc("get_parent_latest_results", {
        p_student_id: child.student_id,
      });
      if (results) {
        latestResults.set(child.student_id, results as LatestResult[]);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    }
  }

  // Get unread notification count
  const { data: unreadCount } = await supabase.rpc("get_parent_unread_count", {
    p_user_id: userId,
  });

  return {
    children,
    attendanceSummaries,
    feeSummaries,
    latestResults,
    unreadNotifications: unreadCount || 0,
  };
}

// ============================================================================
// ATTENDANCE
// ============================================================================

/**
 * Get attendance records for a student
 */
export async function getStudentAttendance(
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  let query = supabase
    .from("attendance_records")
    .select(`
      *,
      classes (name),
      grades (name)
    `)
    .eq("student_id", studentId)
    .order("date", { ascending: false });

  if (startDate) {
    query = query.gte("date", startDate);
  }

  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Get attendance statistics for a student
 */
export async function getStudentAttendanceStats(
  studentId: string,
  period?: "week" | "month" | "term" | "year"
): Promise<AttendanceSummary> {
  let dateFilter: Date;
  const now = new Date();

  switch (period) {
    case "week":
      dateFilter = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      dateFilter = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "term":
      dateFilter = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case "year":
      dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      dateFilter = new Date(now.setMonth(now.getMonth() - 1));
  }

  const { data, error } = await supabase.rpc("get_parent_attendance_summary", {
    p_student_id: studentId,
  });

  if (error) throw error;
  return (data?.[0] || {
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    late_days: 0,
    excused_days: 0,
    attendance_percentage: 0,
  }) as AttendanceSummary;
}

// ============================================================================
// RESULTS
// ============================================================================

/**
 * Get exam results for a student
 */
export async function getStudentResults(studentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("student_exam_results")
    .select(`
      *,
      exams (
        id,
        name,
        start_date,
        end_date,
        published_at,
        term_id,
        terms (
          id,
          name,
          academic_year_id,
          academic_years (
            id,
            name
          )
        )
      )
    `)
    .eq("student_id", studentId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get detailed results for a specific exam
 */
export async function getExamDetails(studentId: string, examId: string): Promise<any> {
  const { data, error } = await supabase
    .from("student_results")
    .select(`
      *,
      exam_subjects (
        id,
        subjects (name, code),
        max_marks,
        pass_marks
      )
    `)
    .eq("student_id", studentId)
    .eq("exam_subjects.exam_id", examId)
    .order("exam_subjects.subjects.name");

  if (error) throw error;
  return data;
}

// ============================================================================
// FEES
// ============================================================================

/**
 * Get fee details for a student
 */
export async function getStudentFees(studentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("student_bills")
    .select(`
      *,
      bill_items (
        id,
        description,
        amount,
        fee_type
      ),
      payments (
        id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        status
      )
    `)
    .eq("student_id", studentId)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get fee summary for a student
 */
export async function getStudentFeeSummary(studentId: string): Promise<FeeSummary> {
  const { data, error } = await supabase.rpc("get_parent_fee_summary", {
    p_student_id: studentId,
  });

  if (error) throw error;
  return (data?.[0] || {
    total_fees: 0,
    total_paid: 0,
    balance: 0,
    overdue_count: 0,
  }) as FeeSummary;
}

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

/**
 * Get announcements for parent
 */
export async function getAnnouncements(
  schoolId: string,
  userId: string,
  limit: number = 50
): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("school_id", schoolId)
    .eq("status", "published")
    .lte("publish_at", new Date().toISOString())
    .or(`expire_at.is.null,expire_at.gt.${new Date().toISOString()}`)
    .order("publish_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Announcement[];
}

/**
 * Get announcement by ID
 */
export async function getAnnouncement(announcementId: string): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", announcementId)
    .single();

  if (error) return null;
  return data as Announcement;
}

/**
 * Mark announcement as read
 */
export async function markAnnouncementAsRead(
  announcementId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.from("announcement_reads").insert({
    announcement_id: announcementId,
    user_id: userId,
  });

  if (error) {
    // Ignore duplicate key errors
    if (error.code !== "23505") {
      throw error;
    }
  }
}

/**
 * Get unread announcements count
 */
export async function getUnreadAnnouncementsCount(
  schoolId: string,
  userId: string
): Promise<number> {
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id")
    .eq("school_id", schoolId)
    .eq("status", "published")
    .lte("publish_at", new Date().toISOString());

  if (!announcements || announcements.length === 0) return 0;

  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", userId)
    .in(
      "announcement_id",
      announcements.map((a) => a.id)
    );

  const readIds = new Set(reads?.map((r) => r.announcement_id) || []);
  return announcements.filter((a) => !readIds.has(a.id)).length;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Get notifications for user
 */
export async function getNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as Notification[];
}

/**
 * Get unread notifications
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .is("read_at", null)
    .in("status", ["pending", "sent", "delivered"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Notification[];
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

/**
 * Create notification
 */
export async function createNotification(
  notification: Omit<Notification, "id" | "created_at" | "updated_at">
): Promise<Notification> {
  const { data, error } = await supabase
    .from("notifications")
    .insert(notification)
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
}

/**
 * Get notification templates
 */
export async function getNotificationTemplates(schoolId?: string): Promise<NotificationTemplate[]> {
  let query = supabase
    .from("notification_templates")
    .select("*")
    .eq("is_active", true)
    .order("type");

  if (schoolId) {
    query = query.or(`school_id.is.null,school_id.eq.${schoolId}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NotificationTemplate[];
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    sms?: boolean;
    email?: boolean;
    in_app?: boolean;
  }
): Promise<ParentProfile> {
  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("notification_preferences")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    throw new Error("Parent profile not found");
  }

  const updatedPreferences = {
    ...profile.notification_preferences,
    ...preferences,
  };

  const { data, error } = await supabase
    .from("parent_profiles")
    .update({
      notification_preferences: updatedPreferences,
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as ParentProfile;
}

// ============================================================================
// PARENT INVITATIONS
// ============================================================================

/**
 * Send parent invitation
 */
export async function sendParentInvitation(
  schoolId: string,
  studentId: string,
  parentEmail: string,
  parentFirstName: string,
  parentLastName: string,
  relationship: "mother" | "father" | "guardian" | "grandparent" | "other",
  invitedBy: string
): Promise<ParentInvitation> {
  // Generate token
  const { data: tokenData } = await (supabase as any).rpc("generate_invitation_token");
  const token = tokenData;

  const { data, error } = await (supabase as any)
    .from("parent_invitations")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      parent_email: parentEmail,
      parent_first_name: parentFirstName,
      parent_last_name: parentLastName,
      relationship,
      token,
      invited_by: invitedBy,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as ParentInvitation;
}

/**
 * Validate invitation token
 */
export async function validateInvitationToken(token: string): Promise<ParentInvitation | null> {
  const { data, error } = await (supabase as any).rpc("validate_invitation_token", {
    p_token: token,
  } as any);

  if (error || !data || (data as any[]).length === 0) return null;
  return (data as any[])[0] as ParentInvitation;
}

/**
 * Accept invitation (during registration)
 */
export async function acceptInvitation(token: string, userId: string): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc("accept_invitation", {
    p_token: token,
    p_user_id: userId,
  } as any);

  if (error) throw error;
  return data as boolean;
}

/**
 * Resend invitation
 */
export async function resendInvitation(invitationId: string): Promise<ParentInvitation> {
  // Generate new token
  const { data: tokenData } = await (supabase as any).rpc("generate_invitation_token");
  const token = tokenData;

  const { data, error } = await (supabase as any)
    .from("parent_invitations")
    .update({
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", invitationId)
    .select()
    .single();

  if (error) throw error;
  return data as ParentInvitation;
}

/**
 * Cancel invitation
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("parent_invitations")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", invitationId);

  if (error) throw error;
}

/**
 * Get invitations for school
 */
export async function getSchoolInvitations(
  schoolId: string,
  status?: "pending" | "accepted" | "expired" | "cancelled"
): Promise<ParentInvitation[]> {
  let query = supabase
    .from("parent_invitations")
    .select("*, students(first_name, last_name, admission_number)")
    .eq("school_id", schoolId)
    .order("sent_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ParentInvitation[];
}

/**
 * Get invitation statistics
 */
export async function getInvitationStats(schoolId: string): Promise<{
  total: number;
  pending: number;
  accepted: number;
  expired: number;
}> {
  const { data, error } = await (supabase as any).rpc("get_invitation_stats", {
    p_school_id: schoolId,
  } as any);

  if (error) throw error;
  return data as {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
  };
}

/**
 * Get invitations for a student
 */
export async function getStudentInvitations(studentId: string): Promise<ParentInvitation[]> {
  const { data, error } = await supabase
    .from("parent_invitations")
    .select("*")
    .eq("student_id", studentId)
    .order("sent_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ParentInvitation[];
}

// ============================================================================
// STUDENT GUARDIANS
// ============================================================================

/**
 * Get student guardians
 */
export async function getStudentGuardians(studentId: string): Promise<StudentGuardian[]> {
  const { data, error } = await supabase
    .from("student_guardians")
    .select("*, parent_profiles(*)")
    .eq("student_id", studentId)
    .order("is_primary", { ascending: false })
    .order("priority_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as StudentGuardian[];
}

/**
 * Create guardian link
 */
export async function createGuardianLink(
  schoolId: string,
  studentId: string,
  parentId: string,
  relationship: "mother" | "father" | "guardian" | "grandparent" | "other",
  isPrimary: boolean = false,
  isEmergencyContact: boolean = false
): Promise<StudentGuardian> {
  const { data, error } = await (supabase as any)
    .from("student_guardians")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      parent_id: parentId,
      relationship,
      is_primary: isPrimary,
      is_emergency_contact: isEmergencyContact,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as StudentGuardian;
}

/**
 * Update guardian link
 */
export async function updateGuardianLink(
  guardianLinkId: string,
  updates: Partial<StudentGuardian>
): Promise<StudentGuardian> {
  const { data, error } = await (supabase as any)
    .from("student_guardians")
    .update(updates as any)
    .eq("id", guardianLinkId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentGuardian;
}

/**
 * Remove guardian link
 */
export async function removeGuardianLink(guardianLinkId: string): Promise<void> {
  const { error } = await supabase
    .from("student_guardians")
    .delete()
    .eq("id", guardianLinkId);

  if (error) throw error;
}

/**
 * Get parent's children using new schema
 */
export async function getParentChildrenNew(parentId: string): Promise<any[]> {
  const { data, error } = await (supabase as any).rpc("get_parent_children", {
    p_parent_id: parentId,
  } as any);

  if (error) throw error;
  return (data ?? []) as any[];
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const parentService = {
  // Parent profiles
  getCurrentParentProfile,
  getParentProfile,
  getParentProfileById,
  createParentProfile,
  updateParentProfile,
  getSchoolParentProfiles,
  verifyParentProfile,

  // Children
  getParentChildren,
  getParentChildrenNew,
  getChildDetails,
  linkChildToParent,
  unlinkChildFromParent,
  requestChildLinking,

  // Dashboard
  getParentDashboard,

  // Attendance
  getStudentAttendance,
  getStudentAttendanceStats,

  // Results
  getStudentResults,
  getExamDetails,

  // Fees
  getStudentFees,
  getStudentFeeSummary,

  // Announcements
  getAnnouncements,
  getAnnouncement,
  markAnnouncementAsRead,
  getUnreadAnnouncementsCount,

  // Notifications
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  getNotificationTemplates,

  // Preferences
  updateNotificationPreferences,

  // Parent Invitations
  sendParentInvitation,
  validateInvitationToken,
  acceptInvitation,
  resendInvitation,
  cancelInvitation,
  getSchoolInvitations,
  getInvitationStats,
  getStudentInvitations,

  // Student Guardians
  getStudentGuardians,
  createGuardianLink,
  updateGuardianLink,
  removeGuardianLink,
};