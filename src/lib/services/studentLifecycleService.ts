/**
 * Student Lifecycle Service
 * Handles student transfers, withdrawals, promotions, re-enrollments, and archiving
 */

import { supabase } from "@/lib/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface StudentTransfer {
  id: string;
  school_id: string;
  student_id: string;
  transfer_type: "incoming" | "outgoing" | "internal";
  from_school_id?: string;
  to_school_id?: string;
  from_grade_id?: string;
  to_grade_id?: string;
  from_class_id?: string;
  to_class_id?: string;
  academic_year_id?: string;
  term_id?: string;
  transfer_date: string;
  effective_date: string;
  reason?: string;
  notes?: string;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  transfer_documents?: string[];
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentWithdrawal {
  id: string;
  school_id: string;
  student_id: string;
  withdrawal_date: string;
  effective_date: string;
  reason: string;
  reason_category: "academic" | "financial" | "disciplinary" | "medical" | "relocation" | "other";
  academic_year_id?: string;
  term_id?: string;
  grade_id?: string;
  class_id?: string;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  fees_cleared: boolean;
  books_returned: boolean;
  library_cleared: boolean;
  other_clearances: Record<string, any>;
  withdrawal_documents?: string[];
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentPromotion {
  id: string;
  school_id: string;
  student_id: string;
  from_grade_id?: string;
  to_grade_id?: string;
  from_class_id?: string;
  to_class_id?: string;
  from_academic_year_id?: string;
  to_academic_year_id?: string;
  promotion_date: string;
  overall_grade?: string;
  attendance_percentage?: number;
  remarks?: string;
  status: "pending" | "promoted" | "retained" | "conditional" | "graduated";
  retention_reason?: string;
  retention_period?: "term" | "semester" | "year";
  graduated_at?: string;
  certificate_number?: string;
  certificate_issued: boolean;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentReenrollment {
  id: string;
  school_id: string;
  student_id: string;
  reenrollment_date: string;
  academic_year_id?: string;
  grade_id?: string;
  class_id?: string;
  previous_academic_year_id?: string;
  absence_reason?: string;
  absence_duration_months?: number;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  fees_paid: boolean;
  fee_amount?: number;
  fee_payment_date?: string;
  reenrollment_documents?: string[];
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentArchive {
  id: string;
  school_id: string;
  student_id: string;
  archive_date: string;
  archive_reason?: string;
  student_snapshot: Record<string, any>;
  enrollment_snapshot?: Record<string, any>;
  academic_snapshot?: Record<string, any>;
  financial_snapshot?: Record<string, any>;
  status: "archived" | "restored" | "deleted";
  restored_at?: string;
  restored_by?: string;
  archived_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentDocument {
  id: string;
  school_id: string;
  student_id: string;
  document_type: "birth_certificate" | "medical_record" | "report_card" | "transfer_certificate" | "id_card" | "photo" | "other";
  document_name: string;
  document_url: string;
  file_size?: number;
  file_type?: string;
  description?: string;
  expiry_date?: string;
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  status: "active" | "expired" | "revoked" | "archived";
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STUDENT TRANSFERS
// ============================================================================

/**
 * Create student transfer
 */
export async function createStudentTransfer(
  schoolId: string,
  studentId: string,
  transferType: "incoming" | "outgoing" | "internal",
  transferData: Partial<StudentTransfer>
): Promise<StudentTransfer> {
  const { data, error } = await (supabase as any)
    .from("student_transfers")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      transfer_type: transferType,
      ...transferData,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as StudentTransfer;
}

/**
 * Get student transfers
 */
export async function getStudentTransfers(
  schoolId: string,
  status?: "pending" | "approved" | "rejected" | "completed" | "cancelled"
): Promise<StudentTransfer[]> {
  let query = supabase
    .from("student_transfers")
    .select("*, students(first_name, last_name, admission_number)")
    .eq("school_id", schoolId)
    .order("transfer_date", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StudentTransfer[];
}

/**
 * Approve student transfer
 */
export async function approveStudentTransfer(
  transferId: string,
  approvedBy: string
): Promise<StudentTransfer> {
  const { data, error } = await (supabase as any)
    .from("student_transfers")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", transferId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentTransfer;
}

/**
 * Reject student transfer
 */
export async function rejectStudentTransfer(
  transferId: string,
  rejectionReason: string
): Promise<StudentTransfer> {
  const { data, error } = await (supabase as any)
    .from("student_transfers")
    .update({
      status: "rejected",
      rejection_reason,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", transferId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentTransfer;
}

// ============================================================================
// STUDENT WITHDRAWALS
// ============================================================================

/**
 * Create student withdrawal
 */
export async function createStudentWithdrawal(
  schoolId: string,
  studentId: string,
  withdrawalData: Partial<StudentWithdrawal>
): Promise<StudentWithdrawal> {
  const { data, error } = await (supabase as any)
    .from("student_withdrawals")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      ...withdrawalData,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as StudentWithdrawal;
}

/**
 * Get student withdrawals
 */
export async function getStudentWithdrawals(
  schoolId: string,
  status?: "pending" | "approved" | "rejected" | "completed" | "cancelled"
): Promise<StudentWithdrawal[]> {
  let query = supabase
    .from("student_withdrawals")
    .select("*, students(first_name, last_name, admission_number)")
    .eq("school_id", schoolId)
    .order("withdrawal_date", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StudentWithdrawal[];
}

/**
 * Approve student withdrawal
 */
export async function approveStudentWithdrawal(
  withdrawalId: string,
  approvedBy: string
): Promise<StudentWithdrawal> {
  const { data, error } = await (supabase as any)
    .from("student_withdrawals")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", withdrawalId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentWithdrawal;
}

/**
 * Update withdrawal clearance status
 */
export async function updateWithdrawalClearance(
  withdrawalId: string,
  updates: {
    fees_cleared?: boolean;
    books_returned?: boolean;
    library_cleared?: boolean;
    other_clearances?: Record<string, any>;
  }
): Promise<StudentWithdrawal> {
  const { data, error } = await (supabase as any)
    .from("student_withdrawals")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", withdrawalId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentWithdrawal;
}

// ============================================================================
// STUDENT PROMOTIONS
// ============================================================================

/**
 * Create student promotion
 */
export async function createStudentPromotion(
  schoolId: string,
  studentId: string,
  promotionData: Partial<StudentPromotion>
): Promise<StudentPromotion> {
  const { data, error } = await (supabase as any)
    .from("student_promotions")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      ...promotionData,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as StudentPromotion;
}

/**
 * Get student promotions
 */
export async function getStudentPromotions(
  schoolId: string,
  academicYearId?: string,
  status?: "pending" | "promoted" | "retained" | "conditional" | "graduated"
): Promise<StudentPromotion[]> {
  let query = supabase
    .from("student_promotions")
    .select("*, students(first_name, last_name, admission_number)")
    .eq("school_id", schoolId)
    .order("promotion_date", { ascending: false });

  if (academicYearId) {
    query = query.eq("to_academic_year_id", academicYearId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StudentPromotion[];
}

/**
 * Promote students in batch
 */
export async function promoteStudentsBatch(
  schoolId: string,
  fromAcademicYearId: string,
  toAcademicYearId: string,
  promotionDate: string
): Promise<number> {
  const { data, error } = await (supabase as any).rpc("promote_students_batch", {
    p_school_id: schoolId,
    p_from_academic_year_id: fromAcademicYearId,
    p_to_academic_year_id: toAcademicYearId,
    p_promotion_date: promotionDate,
  } as any);

  if (error) throw error;
  return data as number;
}

/**
 * Approve student promotion
 */
export async function approveStudentPromotion(
  promotionId: string,
  approvedBy: string
): Promise<StudentPromotion> {
  const { data, error } = await (supabase as any)
    .from("student_promotions")
    .update({
      status: "promoted",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", promotionId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentPromotion;
}

/**
 * Retain student
 */
export async function retainStudent(
  promotionId: string,
  retentionReason: string,
  retentionPeriod: "term" | "semester" | "year",
  approvedBy: string
): Promise<StudentPromotion> {
  const { data, error } = await (supabase as any)
    .from("student_promotions")
    .update({
      status: "retained",
      retention_reason: retentionReason,
      retention_period: retentionPeriod,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", promotionId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentPromotion;
}

/**
 * Graduate student
 */
export async function graduateStudent(
  promotionId: string,
  certificateNumber: string,
  approvedBy: string
): Promise<StudentPromotion> {
  const { data, error } = await (supabase as any)
    .from("student_promotions")
    .update({
      status: "graduated",
      certificate_number: certificateNumber,
      certificate_issued: true,
      graduated_at: new Date().toISOString(),
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", promotionId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentPromotion;
}

// ============================================================================
// STUDENT RE-ENROLLMENTS
// ============================================================================

/**
 * Create student re-enrollment
 */
export async function createStudentReenrollment(
  schoolId: string,
  studentId: string,
  reenrollmentData: Partial<StudentReenrollment>
): Promise<StudentReenrollment> {
  const { data, error } = await (supabase as any)
    .from("student_reenrollments")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      ...reenrollmentData,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as StudentReenrollment;
}

/**
 * Get student re-enrollments
 */
export async function getStudentReenrollments(
  schoolId: string,
  academicYearId?: string,
  status?: "pending" | "approved" | "rejected" | "completed" | "cancelled"
): Promise<StudentReenrollment[]> {
  let query = supabase
    .from("student_reenrollments")
    .select("*, students(first_name, last_name, admission_number)")
    .eq("school_id", schoolId)
    .order("reenrollment_date", { ascending: false });

  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StudentReenrollment[];
}

/**
 * Approve student re-enrollment
 */
export async function approveStudentReenrollment(
  reenrollmentId: string,
  approvedBy: string
): Promise<StudentReenrollment> {
  const { data, error } = await (supabase as any)
    .from("student_reenrollments")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", reenrollmentId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentReenrollment;
}

// ============================================================================
// STUDENT ARCHIVING
// ============================================================================

/**
 * Archive student
 */
export async function archiveStudent(
  schoolId: string,
  studentId: string,
  archiveReason: string,
  archivedBy: string
): Promise<StudentArchive> {
  // Get student data snapshot
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  const { data, error } = await (supabase as any)
    .from("student_archives")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      archive_date: new Date().toISOString().split("T")[0],
      archive_reason: archiveReason,
      student_snapshot: student,
      archived_by: archivedBy,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as StudentArchive;
}

/**
 * Get student archives
 */
export async function getStudentArchives(
  schoolId: string,
  status?: "archived" | "restored" | "deleted"
): Promise<StudentArchive[]> {
  let query = supabase
    .from("student_archives")
    .select("*")
    .eq("school_id", schoolId)
    .order("archive_date", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StudentArchive[];
}

// ============================================================================
// STUDENT DOCUMENTS
// ============================================================================

/**
 * Upload student document
 */
export async function uploadStudentDocument(
  schoolId: string,
  studentId: string,
  documentData: Partial<StudentDocument>
): Promise<StudentDocument> {
  const { data, error } = await (supabase as any)
    .from("student_documents")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      ...documentData,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as StudentDocument;
}

/**
 * Get student documents
 */
export async function getStudentDocuments(
  studentId: string,
  documentType?: "birth_certificate" | "medical_record" | "report_card" | "transfer_certificate" | "id_card" | "photo" | "other"
): Promise<StudentDocument[]> {
  let query = supabase
    .from("student_documents")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (documentType) {
    query = query.eq("document_type", documentType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StudentDocument[];
}

/**
 * Verify student document
 */
export async function verifyStudentDocument(
  documentId: string,
  verifiedBy: string
): Promise<StudentDocument> {
  const { data, error } = await (supabase as any)
    .from("student_documents")
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_by: verifiedBy,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", documentId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentDocument;
}

/**
 * Delete student document
 */
export async function deleteStudentDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from("student_documents")
    .delete()
    .eq("id", documentId);

  if (error) throw error;
}

// ============================================================================
// STUDENT ID GENERATION
// ============================================================================

/**
 * Generate student ID
 */
export async function generateStudentId(
  schoolId: string,
  academicYearId: string,
  gradeId: string
): Promise<string> {
  const { data, error } = await (supabase as any).rpc("generate_student_id", {
    p_school_id: schoolId,
    p_academic_year_id: academicYearId,
    p_grade_id: gradeId,
  } as any);

  if (error) throw error;
  return data as string;
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const studentLifecycleService = {
  // Transfers
  createStudentTransfer,
  getStudentTransfers,
  approveStudentTransfer,
  rejectStudentTransfer,

  // Withdrawals
  createStudentWithdrawal,
  getStudentWithdrawals,
  approveStudentWithdrawal,
  updateWithdrawalClearance,

  // Promotions
  createStudentPromotion,
  getStudentPromotions,
  promoteStudentsBatch,
  approveStudentPromotion,
  retainStudent,
  graduateStudent,

  // Re-enrollments
  createStudentReenrollment,
  getStudentReenrollments,
  approveStudentReenrollment,

  // Archives
  archiveStudent,
  getStudentArchives,

  // Documents
  uploadStudentDocument,
  getStudentDocuments,
  verifyStudentDocument,
  deleteStudentDocument,

  // ID Generation
  generateStudentId,
};
