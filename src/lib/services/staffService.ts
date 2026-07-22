import { supabase } from "@/lib/supabase/client";
import type { StaffProfile, TeacherAssignment, StaffInvitation } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

export interface TeacherInvitation {
  id: string;
  school_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  specialization?: string;
  qualifications?: string;
  employment_type: "permanent" | "contract" | "temporary" | "intern" | "volunteer";
  token: string;
  expires_at: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  sent_at: string;
  accepted_at?: string;
  invited_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherAssignmentNew {
  id: string;
  school_id: string;
  teacher_id: string;
  grade_id?: string;
  class_id?: string;
  subject_id?: string;
  academic_year_id?: string;
  term_id?: string;
  assignment_type: "class_teacher" | "subject_teacher" | "assistant_teacher" | "relief_teacher";
  status: "active" | "inactive" | "pending" | "archived";
  growth_model: "fixed" | "floating" | "hybrid";
  is_primary: boolean;
  priority: number;
  workload_percentage: number;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherProgression {
  id: string;
  school_id: string;
  teacher_id: string;
  current_academic_year_id?: string;
  current_grade_id?: string;
  current_class_id?: string;
  next_academic_year_id?: string;
  next_grade_id?: string;
  next_class_id?: string;
  student_ids: string[];
  status: "active" | "pending" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface SchoolTeacherSettings {
  id: string;
  school_id: string;
  default_growth_model: "fixed" | "floating" | "hybrid";
  auto_assign_on_accept: boolean;
  notify_principal_on_registration: boolean;
  require_principal_approval: boolean;
  auto_promote_teachers: boolean;
  auto_assign_new_students: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STAFF PROFILES
// ============================================================================

export async function getStaffProfiles(schoolId: string): Promise<StaffProfile[]> {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("school_id", schoolId)
    .order("first_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getStaffProfile(id: string): Promise<StaffProfile | null> {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createStaffProfile(profile: Partial<StaffProfile>): Promise<StaffProfile> {
  const { data, error } = await supabase
    .from("staff_profiles")
    .insert(profile)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStaffProfile(id: string, updates: Partial<StaffProfile>): Promise<StaffProfile> {
  const { data, error } = await supabase
    .from("staff_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStaffProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from("staff_profiles")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// TEACHER ASSIGNMENTS
// ============================================================================

export async function getTeacherAssignments(schoolId: string, teacherId?: string): Promise<TeacherAssignment[]> {
  let query = supabase
    .from("teacher_assignments")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (teacherId) {
    query = query.eq("teacher_id", teacherId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getTeacherAssignmentsByClass(classId: string): Promise<TeacherAssignment[]> {
  const { data, error } = await supabase
    .from("teacher_assignments")
    .select("*")
    .eq("class_id", classId)
    .eq("is_active", true);

  if (error) throw error;
  return data || [];
}

export async function assignTeacherToClass(assignment: Partial<TeacherAssignment>): Promise<TeacherAssignment> {
  const { data, error } = await supabase
    .from("teacher_assignments")
    .insert(assignment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTeacherAssignment(id: string, updates: Partial<TeacherAssignment>): Promise<TeacherAssignment> {
  const { data, error } = await supabase
    .from("teacher_assignments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeTeacherAssignment(id: string): Promise<void> {
  const { error } = await supabase
    .from("teacher_assignments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// STAFF INVITATIONS
// ============================================================================

export async function getStaffInvitations(schoolId: string): Promise<StaffInvitation[]> {
  const { data, error } = await supabase
    .from("staff_invitations")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createStaffInvitation(invitation: Partial<StaffInvitation>): Promise<StaffInvitation> {
  const { data, error } = await supabase
    .from("staff_invitations")
    .insert(invitation)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelStaffInvitation(id: string): Promise<void> {
  const { error } = await supabase
    .from("staff_invitations")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function getStaffWithUserAccount(schoolId: string) {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select(`
      *,
      profiles!left (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq("school_id", schoolId)
    .order("first_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getTeacherWorkload(teacherId: string, schoolId: string) {
  const { data, error } = await supabase
    .from("teacher_assignments")
    .select(`
      *,
      classes (
        id,
        name,
        grades (
          id,
          name
        )
      ),
      subjects (
        id,
        name
      )
    `)
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId)
    .eq("is_active", true);

  if (error) throw error;
  return data || [];
}

export async function getAvailableTeachers(schoolId: string, classId?: string, subjectId?: string) {
  let query = supabase
    .from("staff_profiles")
    .select("*")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .or("position.ilike.%teacher%,position.ilike.%administrator%")
    .order("first_name", { ascending: true });

  // Exclude teachers already assigned to this class/subject combination
  if (classId && subjectId) {
    const { data: existingAssignments } = await supabase
      .from("teacher_assignments")
      .select("teacher_id")
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("is_active", true);

    if (existingAssignments && existingAssignments.length > 0) {
      const assignedTeacherIds = existingAssignments.map(a => a.teacher_id);
      query = query.not("id", "in", `(${assignedTeacherIds.join(",")})`);
    }
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getStaffCountByPosition(schoolId: string) {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("position, status")
    .eq("school_id", schoolId)
    .eq("status", "active");

  if (error) throw error;

  // Group by position
  const counts: Record<string, number> = {};
  data?.forEach((staff) => {
    const position = staff.position || "Other";
    counts[position] = (counts[position] || 0) + 1;
  });

  return counts;
}

export async function searchStaff(schoolId: string, searchTerm: string): Promise<StaffProfile[]> {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("school_id", schoolId)
    .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .order("first_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateStaffStatus(id: string, status: "active" | "inactive" | "on_leave" | "terminated"): Promise<StaffProfile> {
  const updates: Partial<StaffProfile> = { status };

  if (status === "terminated") {
    updates.termination_date = new Date().toISOString().split("T")[0];
  }

  const { data, error } = await supabase
    .from("staff_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// TEACHER INVITATIONS (NEW)
// ============================================================================

/**
 * Send teacher invitation
 */
export async function sendTeacherInvitation(
  schoolId: string,
  email: string,
  firstName: string,
  lastName: string,
  phone?: string,
  specialization?: string,
  qualifications?: string,
  employmentType: "permanent" | "contract" | "temporary" | "intern" | "volunteer" = "permanent",
  invitedBy?: string
): Promise<TeacherInvitation> {
  // Generate token
  const { data: tokenData } = await (supabase as any).rpc("generate_teacher_invitation_token");
  const token = tokenData;

  const { data, error } = await (supabase as any)
    .from("teacher_invitations")
    .insert({
      school_id: schoolId,
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      specialization,
      qualifications,
      employment_type: employmentType,
      token,
      invited_by: invitedBy,
    } as any)
    .select()
    .single();

  if (error) throw error;

  // Send invitation email
  try {
    const { sendTeacherInvitationEmail } = await import("./emailService");
    const { data: schoolData } = await supabase
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .single();

    await sendTeacherInvitationEmail({
      to: email,
      teacherName: `${firstName} ${lastName}`,
      schoolName: schoolData?.name || "School",
      specialization,
      employmentType,
      token,
      invitedBy: invitedBy || "School Administration",
    });
  } catch (emailError) {
    console.error("Failed to send invitation email:", emailError);
    // Don't throw - invitation is created, email can be resent
  }

  return data as TeacherInvitation;
}

/**
 * Validate teacher invitation token
 */
export async function validateTeacherInvitationToken(token: string): Promise<TeacherInvitation | null> {
  const { data, error } = await (supabase as any).rpc("validate_teacher_invitation_token", {
    p_token: token,
  } as any);

  if (error || !data || (data as any[]).length === 0) return null;
  return (data as any[])[0] as TeacherInvitation;
}

/**
 * Accept teacher invitation (during registration)
 */
export async function acceptTeacherInvitation(token: string, userId: string): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc("accept_teacher_invitation", {
    p_token: token,
    p_user_id: userId,
  } as any);

  if (error) throw error;
  return data as boolean;
}

/**
 * Resend teacher invitation
 */
export async function resendTeacherInvitation(invitationId: string): Promise<TeacherInvitation> {
  // Generate new token
  const { data: tokenData } = await (supabase as any).rpc("generate_teacher_invitation_token");
  const token = tokenData;

  const { data, error } = await (supabase as any)
    .from("teacher_invitations")
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
  return data as TeacherInvitation;
}

/**
 * Cancel teacher invitation
 */
export async function cancelTeacherInvitation(invitationId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("teacher_invitations")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", invitationId);

  if (error) throw error;
}

/**
 * Get teacher invitations for school
 */
export async function getTeacherInvitations(
  schoolId: string,
  status?: "pending" | "accepted" | "expired" | "cancelled"
): Promise<TeacherInvitation[]> {
  let query = supabase
    .from("teacher_invitations")
    .select("*")
    .eq("school_id", schoolId)
    .order("sent_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TeacherInvitation[];
}

/**
 * Get teacher invitation statistics
 */
export async function getTeacherInvitationStats(schoolId: string): Promise<{
  total: number;
  pending: number;
  accepted: number;
  expired: number;
}> {
  const { data, error } = await (supabase as any).rpc("get_teacher_invitation_stats", {
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
 * Get pending teachers for assignment
 */
export async function getPendingTeachers(schoolId: string): Promise<any[]> {
  const { data, error } = await (supabase as any).rpc("get_pending_teachers", {
    p_school_id: schoolId,
  } as any);

  if (error) throw error;
  return (data ?? []) as any[];
}

// ============================================================================
// TEACHER ASSIGNMENTS (NEW)
// ============================================================================

/**
 * Create teacher assignment
 */
export async function createTeacherAssignment(
  schoolId: string,
  teacherId: string,
  gradeId?: string,
  classId?: string,
  subjectId?: string,
  academicYearId?: string,
  assignmentType: "class_teacher" | "subject_teacher" | "assistant_teacher" | "relief_teacher" = "subject_teacher",
  growthModel: "fixed" | "floating" | "hybrid" = "floating",
  createdBy?: string
): Promise<TeacherAssignmentNew> {
  const { data, error } = await (supabase as any).rpc("create_teacher_assignment", {
    p_school_id: schoolId,
    p_teacher_id: teacherId,
    p_grade_id: gradeId,
    p_class_id: classId,
    p_subject_id: subjectId,
    p_academic_year_id: academicYearId,
    p_assignment_type: assignmentType,
    p_growth_model: growthModel,
    p_created_by: createdBy,
  } as any);

  if (error) throw error;
  return data as TeacherAssignmentNew;
}

/**
 * Get teacher's assigned students
 */
export async function getTeacherAssignedStudents(teacherId: string, academicYearId: string): Promise<any[]> {
  const { data, error } = await (supabase as any).rpc("get_teacher_assigned_students", {
    p_teacher_id: teacherId,
    p_academic_year_id: academicYearId,
  } as any);

  if (error) throw error;
  return (data ?? []) as any[];
}

/**
 * Get teacher workload for school
 */
export async function getTeacherWorkloadForSchool(schoolId: string, academicYearId: string): Promise<any[]> {
  const { data, error } = await (supabase as any).rpc("get_teacher_workload", {
    p_school_id: schoolId,
    p_academic_year_id: academicYearId,
  } as any);

  if (error) throw error;
  return (data ?? []) as any[];
}

/**
 * Get teacher assignments (new schema)
 */
export async function getTeacherAssignmentsNew(
  schoolId: string,
  teacherId?: string,
  academicYearId?: string
): Promise<TeacherAssignmentNew[]> {
  let query = supabase
    .from("teacher_assignments")
    .select("*, staff_profiles(*), grades(*), classes(*), subjects(*)")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (teacherId) {
    query = query.eq("teacher_id", teacherId);
  }

  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TeacherAssignmentNew[];
}

/**
 * Update teacher assignment
 */
export async function updateTeacherAssignmentNew(
  assignmentId: string,
  updates: Partial<TeacherAssignmentNew>
): Promise<TeacherAssignmentNew> {
  const { data, error } = await (supabase as any)
    .from("teacher_assignments")
    .update(updates as any)
    .eq("id", assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data as TeacherAssignmentNew;
}

/**
 * Remove teacher assignment
 */
export async function removeTeacherAssignmentNew(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from("teacher_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) throw error;
}

// ============================================================================
// SCHOOL TEACHER SETTINGS
// ============================================================================

/**
 * Get school teacher settings
 */
export async function getSchoolTeacherSettings(schoolId: string): Promise<SchoolTeacherSettings | null> {
  const { data, error } = await supabase
    .from("school_teacher_settings")
    .select("*")
    .eq("school_id", schoolId)
    .single();

  if (error) return null;
  return data as SchoolTeacherSettings;
}

/**
 * Update school teacher settings
 */
export async function updateSchoolTeacherSettings(
  schoolId: string,
  updates: Partial<SchoolTeacherSettings>
): Promise<SchoolTeacherSettings> {
  const { data, error } = await (supabase as any)
    .from("school_teacher_settings")
    .update(updates as any)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw error;
  return data as SchoolTeacherSettings;
}

// ============================================================================
// TEACHER PROGRESSION
// ============================================================================

/**
 * Get teacher progression
 */
export async function getTeacherProgression(teacherId: string): Promise<TeacherProgression[]> {
  const { data, error } = await supabase
    .from("teacher_progression")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TeacherProgression[];
}

/**
 * Create teacher progression record
 */
export async function createTeacherProgression(
  schoolId: string,
  teacherId: string,
  currentAcademicYearId?: string,
  currentGradeId?: string,
  currentClassId?: string,
  nextAcademicYearId?: string,
  nextGradeId?: string,
  nextClassId?: string,
  studentIds?: string[]
): Promise<TeacherProgression> {
  const { data, error } = await (supabase as any)
    .from("teacher_progression")
    .insert({
      school_id: schoolId,
      teacher_id: teacherId,
      current_academic_year_id: currentAcademicYearId,
      current_grade_id: currentGradeId,
      current_class_id: currentClassId,
      next_academic_year_id: nextAcademicYearId,
      next_grade_id: nextGradeId,
      next_class_id: nextClassId,
      student_ids: studentIds || [],
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as TeacherProgression;
}