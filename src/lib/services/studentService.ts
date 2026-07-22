/**
 * Student Service (Consolidated)
 * Complete student management with transfers, medical info, and guardian linking
 */

import { supabase } from "@/lib/supabase/client";
import type { Student, Guardian, StudentTransfer, StudentImportLog } from "@/lib/supabase/types";

/**
 * Get all students for a school with pagination
 */
export async function getStudents(
  schoolId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ data: any[]; total: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from("students")
    .select(`
      *,
      classes (
        name,
        grades (name)
      )
    `, { count: "exact" })
    .eq("school_id", schoolId)
    .eq("status", "active")
    .order("full_name", { ascending: true })
    .range(from, to);

  if (error) throw error;
  return { data: data ?? [], total: count || 0 };
}

/**
 * Fetch students matching optional search
 */
export async function fetchStudents(
  schoolId: string,
  search?: string
): Promise<any[]> {
  let query = supabase
    .from("students")
    .select(`
      *,
      classes (
        name,
        grades (name)
      )
    `)
    .eq("school_id", schoolId)
    .order("full_name", { ascending: true });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,admission_number.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Get a single student by ID with full details
 */
export async function getStudent(id: string): Promise<any> {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      classes (
        name,
        grades (name)
      ),
      student_guardians (
        guardian:guardians (*),
        is_primary
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new student
 */
export async function createStudent(
  student: Omit<Student, "id" | "created_at" | "updated_at">,
  guardianIds?: string[]
): Promise<Student> {
  // Generate a random admission number if not provided
  const payload: any = {
    ...student,
    admission_number:
      student.admission_number || `ADM-${Math.floor(100000 + Math.random() * 900000)}`,
    enrollment_date: student.enrollment_date || new Date().toISOString().split("T")[0],
  };

  const { data, error } = await supabase
    .from("students")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Student creation returned no data");

  // Link guardians if provided
  if (guardianIds && guardianIds.length > 0) {
    const studentId = (data as any).id;
    const links = guardianIds.map((guardianId, index) => ({
      student_id: studentId,
      guardian_id: guardianId,
      is_primary: index === 0, // First guardian is primary
    }));

    const { error: linkError } = await supabase
      .from("student_guardians")
      .insert(links as any[]);

    if (linkError) throw linkError;
  }

  return data as Student;
};

/**
 * Update a student
 */
export async function updateStudent(
  id: string,
  updates: Partial<Student>
): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Student;
};

/**
 * Delete a student (soft delete)
 */
export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase
    .from("students")
    .update({ status: "inactive" } as any)
    .eq("id", id);

  if (error) throw error;
};

/**
 * Get students by class
 */
export async function getStudentsByClass(classId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      classes (
        name,
        grades (name)
      )
    `)
    .eq("class_id", classId)
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Search students by name or admission number
 */
export async function searchStudents(
  schoolId: string,
  query: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      classes (
        name,
        grades (name)
      )
    `)
    .eq("school_id", schoolId)
    .eq("status", "active")
    .or(`full_name.ilike.%${query}%,admission_number.ilike.%${query}%`)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Import students from CSV
 */
export async function importStudents(
  schoolId: string,
  students: Omit<Student, "id" | "created_at" | "updated_at" | "school_id">[],
  guardianIds?: string[][]
): Promise<StudentImportLog> {
  const log: Omit<import("@/lib/supabase/types").StudentImportLog, "id" | "imported_at"> = {
    school_id: schoolId,
    file_name: "CSV Import",
    total_records: students.length,
    successful_imports: 0,
    failed_imports: 0,
    errors: [],
    imported_by: (await supabase.auth.getUser()).data.user?.id || "",
  };

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    try {
      const admissionNum =
        student.admission_number || `ADM-${Math.floor(100000 + Math.random() * 900000)}`;
      
      const { data, error } = await supabase
        .from("students")
        .insert({
          ...student,
          school_id: schoolId,
          admission_number: admissionNum,
          status: "active",
          enrollment_date: student.enrollment_date || new Date().toISOString().split("T")[0],
        } as any)
        .select()
        .single();

      if (error) {
        log.errors.push({ row: i + 1, student: student.full_name, error: error.message });
        log.failed_imports++;
      } else {
        log.successful_imports++;

        // Link guardians if provided
        if (guardianIds && guardianIds[i] && guardianIds[i].length > 0) {
          const studentId = (data as any).id;
          const links = guardianIds[i].map((guardianId, index) => ({
            student_id: studentId,
            guardian_id: guardianId,
            is_primary: index === 0,
          }));

          const { error: linkError } = await supabase
            .from("student_guardians")
            .insert(links as any[]);

          if (linkError) {
            log.errors.push({
              row: i + 1,
              student: student.full_name,
              error: `Guardian linking failed: ${linkError.message}`,
            });
          }
        }
      }
    } catch (err: any) {
      log.errors.push({ row: i + 1, student: student.full_name, error: err.message });
      log.failed_imports++;
    }
  }

  // Save import log
  const { data: logData, error: logError } = await supabase
    .from("student_import_logs")
    .insert(log as any)
    .select()
    .single();

  if (logError) throw logError;

  return logData as StudentImportLog;
};

/**
 * Create guardian
 */
export async function createGuardian(guardian: Omit<Guardian, "id" | "created_at">): Promise<Guardian> {
  const { data, error } = await supabase
    .from("guardians")
    .insert(guardian as any)
    .select()
    .single();

  if (error) throw error;
  return data as Guardian;
};

/**
 * Update guardian
 */
export async function updateGuardian(id: string, updates: Partial<Guardian>): Promise<Guardian> {
  const { data, error } = await supabase
    .from("guardians")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Guardian;
};

/**
 * Link student to guardian
 */
export async function linkStudentToGuardian(
  studentId: string,
  guardianId: string,
  isPrimary: boolean = false
): Promise<void> {
  const { error } = await supabase.from("student_guardians").insert({
    student_id: studentId,
    guardian_id: guardianId,
    is_primary: isPrimary,
  } as any);

  if (error) throw error;
};

/**
 * Unlink student from guardian
 */
export async function unlinkStudentFromGuardian(studentId: string, guardianId: string): Promise<void> {
  const { error } = await supabase
    .from("student_guardians")
    .delete()
    .eq("student_id", studentId)
    .eq("guardian_id", guardianId);

  if (error) throw error;
};

/**
 * Get guardians for a student
 */
export async function getStudentGuardians(studentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("student_guardians")
    .select(`
      is_primary,
      guardian:guardians (*)
    `)
    .eq("student_id", studentId);

  if (error) throw error;
  return data ?? [];
}

/**
 * Create student transfer request
 */
export async function createStudentTransfer(
  transfer: Omit<StudentTransfer, "id" | "created_at" | "updated_at">
): Promise<StudentTransfer> {
  const { data, error } = await supabase
    .from("student_transfers")
    .insert(transfer as any)
    .select()
    .single();

  if (error) throw error;
  return data as StudentTransfer;
};

/**
 * Approve student transfer
 */
export async function approveStudentTransfer(
  transferId: string,
  approved: boolean
): Promise<StudentTransfer> {
  const updates: any = {
    status: approved ? "approved" : "cancelled",
    approved_at: new Date().toISOString(),
    approved_by: (await supabase.auth.getUser()).data.user?.id,
  };

  const { data, error } = await supabase
    .from("student_transfers")
    .update(updates)
    .eq("id", transferId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentTransfer;
};

/**
 * Complete student transfer (move student to new class)
 */
export async function completeStudentTransfer(transferId: string): Promise<StudentTransfer> {
  // Get transfer details
  const { data: transfer, error: fetchError } = await supabase
    .from("student_transfers")
    .select("*")
    .eq("id", transferId)
    .single();

  if (fetchError) throw fetchError;
  if (!transfer) throw new Error("Transfer not found");

  // Update student's class
  const { error: updateError } = await supabase
    .from("students")
    .update({
      class_id: (transfer as any).to_class_id,
      status: "active",
    } as any)
    .eq("id", (transfer as any).student_id);

  if (updateError) throw updateError;

  // Update transfer status
  const { data, error } = await supabase
    .from("student_transfers")
    .update({ status: "completed" } as any)
    .eq("id", transferId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentTransfer;
}

/**
 * Get student transfer history
 */
export async function getStudentTransfers(studentId: string): Promise<StudentTransfer[]> {
  const { data, error } = await supabase
    .from("student_transfers")
    .select("*")
    .eq("student_id", studentId)
    .order("transfer_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentTransfer[];
}

/**
 * Get pending transfers for a school
 */
export async function getPendingTransfers(schoolId: string): Promise<StudentTransfer[]> {
  const { data, error } = await supabase
    .from("student_transfers")
    .select("*")
    .eq("school_id", schoolId)
    .eq("status", "pending")
    .order("transfer_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as StudentTransfer[];
}

/**
 * Upload student photo
 */
export async function uploadStudentPhoto(
  studentId: string,
  photoFile: File
): Promise<string> {
  const fileExt = photoFile.name.split(".").pop();
  const fileName = `${studentId}.${fileExt}`;
  const filePath = `student-photos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("student-images")
    .upload(filePath, photoFile, { upsert: true });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data } = supabase.storage.from("student-images").getPublicUrl(filePath);

  // Update student record
  const { error: updateError } = await supabase
    .from("students")
    .update({ photo_url: data.publicUrl } as any)
    .eq("id", studentId);

  if (updateError) throw updateError;

  return data.publicUrl;
}

/**
 * Get import logs for a school
 */
export async function getImportLogs(schoolId: string): Promise<StudentImportLog[]> {
  const { data, error } = await supabase
    .from("student_import_logs")
    .select("*")
    .eq("school_id", schoolId)
    .order("imported_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentImportLog[];
}

// Export service
export const studentService = {
  getStudents,
  fetchStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentsByClass,
  searchStudents,
  importStudents,
  createGuardian,
  updateGuardian,
  linkStudentToGuardian,
  unlinkStudentFromGuardian,
  getStudentGuardians,
  createStudentTransfer,
  approveStudentTransfer,
  completeStudentTransfer,
  getStudentTransfers,
  getPendingTransfers,
  uploadStudentPhoto,
  getImportLogs,
};