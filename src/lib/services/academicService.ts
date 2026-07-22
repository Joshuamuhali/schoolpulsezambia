/**
 * Academic Structure Service
 * Complete academic management: years, terms, grades, classes, subjects, assignments
 */

import { supabase } from "@/lib/supabase/client";
import type {
  AcademicYear,
  Term,
  Grade,
  Class,
  Subject,
  ClassSubject,
} from "@/lib/supabase/types";

// Cast supabase to any to avoid TypeScript issues with RPC calls
const db = supabase as any;

// ============================================================================
// ACADEMIC YEARS
// ============================================================================

/**
 * Get all academic years for a school
 */
export async function getAcademicYears(schoolId: string): Promise<AcademicYear[]> {
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AcademicYear[];
}

/**
 * Get current academic year
 */
export async function getCurrentAcademicYear(schoolId: string): Promise<AcademicYear | null> {
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .eq("status", "active")
    .single();

  if (error) return null;
  return data as AcademicYear;
}

/**
 * Create academic year
 */
export async function createAcademicYear(
  year: Omit<AcademicYear, "id" | "created_at" | "updated_at" | "created_by">
): Promise<AcademicYear> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await db
    .from("academic_years")
    .insert({
      ...year,
      created_by: user?.id || "",
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as AcademicYear;
}

/**
 * Update academic year
 */
export async function updateAcademicYear(
  id: string,
  updates: Partial<AcademicYear>
): Promise<AcademicYear> {
  const { data, error } = await db
    .from("academic_years")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as AcademicYear;
}

/**
 * Set academic year as current
 */
export async function setCurrentAcademicYear(schoolId: string, yearId: string): Promise<void> {
  // First, unset all current years for this school
  await db
    .from("academic_years")
    .update({ is_current: false } as any)
    .eq("school_id", schoolId);

  // Then set the selected year as current
  const { error } = await db
    .from("academic_years")
    .update({ is_current: true, status: "active" } as any)
    .eq("id", yearId);

  if (error) throw error;
}

/**
 * Archive academic year
 */
export async function archiveAcademicYear(id: string): Promise<AcademicYear> {
  const { data, error } = await supabase
    .from("academic_years")
    .update({ status: "archived", is_current: false })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as AcademicYear;
}

// ============================================================================
// TERMS
// ============================================================================

/**
 * Get all terms for an academic year
 */
export async function getTerms(academicYearId: string): Promise<Term[]> {
  const { data, error } = await supabase
    .from("terms")
    .select("*")
    .eq("academic_year_id", academicYearId)
    .order("term_number", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Term[];
}

/**
 * Get current term for a school
 */
export async function getCurrentTerm(schoolId: string): Promise<Term | null> {
  const { data, error } = await supabase
    .from("terms")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .eq("status", "active")
    .single();

  if (error) return null;
  return data as Term;
}

/**
 * Create term
 */
export async function createTerm(term: Omit<Term, "id" | "created_at" | "updated_at">): Promise<Term> {
  const { data, error } = await db
    .from("terms")
    .insert(term as any)
    .select()
    .single();

  if (error) throw error;
  return data as Term;
}

/**
 * Update term
 */
export async function updateTerm(id: string, updates: Partial<Term>): Promise<Term> {
  const { data, error } = await db
    .from("terms")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Term;
}

/**
 * Set term as current
 */
export async function setCurrentTerm(schoolId: string, termId: string): Promise<void> {
  // Unset all current terms for this school
  await db
    .from("terms")
    .update({ is_current: false } as any)
    .eq("school_id", schoolId);

  // Set selected term as current
  const { error } = await db
    .from("terms")
    .update({ is_current: true, status: "active" } as any)
    .eq("id", termId);

  if (error) throw error;
}

// ============================================================================
// GRADES
// ============================================================================

/**
 * Get all grades for a school
 */
export async function getGrades(schoolId: string): Promise<Grade[]> {
  const { data, error } = await supabase
    .from("grades")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("level", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Grade[];
}

/**
 * Create grade
 */
export async function createGrade(grade: Omit<Grade, "id" | "created_at" | "updated_at">): Promise<Grade> {
  const { data, error } = await db
    .from("grades")
    .insert(grade as any)
    .select()
    .single();

  if (error) throw error;
  return data as Grade;
}

/**
 * Update grade
 */
export async function updateGrade(id: string, updates: Partial<Grade>): Promise<Grade> {
  const { data, error } = await db
    .from("grades")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Grade;
}

/**
 * Delete grade (soft delete)
 */
export async function deleteGrade(id: string): Promise<void> {
  const { error } = await db
    .from("grades")
    .update({ is_active: false } as any)
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// CLASSES
// ============================================================================

/**
 * Get all classes for a school
 */
export async function getClasses(schoolId: string, academicYearId?: string): Promise<Class[]> {
  let query = supabase
    .from("classes")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Class[];
}

/**
 * Get classes by grade
 */
export async function getClassesByGrade(gradeId: string, academicYearId?: string): Promise<Class[]> {
  let query = supabase
    .from("classes")
    .select("*")
    .eq("grade_id", gradeId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Class[];
}

/**
 * Create class
 */
export async function createClass(classData: Omit<Class, "id" | "created_at" | "updated_at">): Promise<Class> {
  const { data, error } = await db
    .from("classes")
    .insert(classData as any)
    .select()
    .single();

  if (error) throw error;
  return data as Class;
}

/**
 * Update class
 */
export async function updateClass(id: string, updates: Partial<Class>): Promise<Class> {
  const { data, error } = await db
    .from("classes")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Class;
}

/**
 * Delete class (soft delete)
 */
export async function deleteClass(id: string): Promise<void> {
  const { error } = await db
    .from("classes")
    .update({ is_active: false } as any)
    .eq("id", id);

  if (error) throw error;
}

/**
 * Get class with details
 */
export async function getClass(id: string): Promise<Class | null> {
  const { data, error } = await supabase
    .from("classes")
    .select(`
      *,
      grades (name, level),
      academic_years (name)
    `)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Class;
}

// ============================================================================
// SUBJECTS
// ============================================================================

/**
 * Get all subjects for a school
 */
export async function getSubjects(schoolId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Subject[];
}

/**
 * Create subject
 */
export async function createSubject(subject: Omit<Subject, "id" | "created_at" | "updated_at">): Promise<Subject> {
  const { data, error } = await db
    .from("subjects")
    .insert(subject as any)
    .select()
    .single();

  if (error) throw error;
  return data as Subject;
}

/**
 * Update subject
 */
export async function updateSubject(id: string, updates: Partial<Subject>): Promise<Subject> {
  const { data, error } = await db
    .from("subjects")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Subject;
}

/**
 * Delete subject (soft delete)
 */
export async function deleteSubject(id: string): Promise<void> {
  const { error } = await db
    .from("subjects")
    .update({ is_active: false } as any)
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// CLASS SUBJECTS (Assignments)
// ============================================================================

/**
 * Get class subjects for a class
 */
export async function getClassSubjects(classId: string): Promise<ClassSubject[]> {
  const { data, error } = await supabase
    .from("class_subjects")
    .select(`
      *,
      subjects (name, code),
      profiles (full_name)
    `)
    .eq("class_id", classId)
    .eq("is_active", true)
    .order("subjects (name)");

  if (error) throw error;
  return (data ?? []) as ClassSubject[];
}

/**
 * Get subjects for a teacher
 */
export async function getTeacherSubjects(teacherId: string, schoolId: string): Promise<ClassSubject[]> {
  const { data, error } = await supabase
    .from("class_subjects")
    .select(`
      *,
      classes (name, grades (name)),
      subjects (name, code)
    `)
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("classes (grades (level))");

  if (error) throw error;
  return (data ?? []) as ClassSubject[];
}

/**
 * Assign subject to class
 */
export async function assignSubjectToClass(
  assignment: Omit<ClassSubject, "id" | "created_at" | "updated_at">
): Promise<ClassSubject> {
  const { data, error } = await db
    .from("class_subjects")
    .insert(assignment as any)
    .select()
    .single();

  if (error) throw error;
  return data as ClassSubject;
}

/**
 * Update class subject assignment
 */
export async function updateClassSubject(
  id: string,
  updates: Partial<ClassSubject>
): Promise<ClassSubject> {
  const { data, error } = await db
    .from("class_subjects")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ClassSubject;
}

/**
 * Remove subject from class
 */
export async function removeSubjectFromClass(id: string): Promise<void> {
  const { error } = await db
    .from("class_subjects")
    .update({ is_active: false } as any)
    .eq("id", id);

  if (error) throw error;
}

/**
 * Get all class-subject assignments for a school
 */
export async function getSchoolClassSubjects(schoolId: string, academicYearId?: string): Promise<any[]> {
  let query = supabase
    .from("class_subjects")
    .select(`
      *,
      classes (name, grades (name, level)),
      subjects (name, code),
      profiles (full_name)
    `)
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("classes (grades (level))");

  if (academicYearId) {
    query = query.eq("classes.academic_year_id", academicYearId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get academic structure summary for a school
 */
export async function getAcademicStructureSummary(schoolId: string): Promise<{
  totalGrades: number;
  totalClasses: number;
  totalSubjects: number;
  totalTeachers: number;
  currentYear: AcademicYear | null;
  currentTerm: Term | null;
}> {
  const [gradesResult, classesResult, subjectsResult, classSubjectsResult, currentYear, currentTerm] = await Promise.all([
    db.from("grades").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true),
    db.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true),
    db.from("subjects").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true),
    db.from("class_subjects").select("teacher_id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true).not("teacher_id", "is", null),
    getCurrentAcademicYear(schoolId),
    getCurrentTerm(schoolId),
  ]);

  return {
    totalGrades: gradesResult.count || 0,
    totalClasses: classesResult.count || 0,
    totalSubjects: subjectsResult.count || 0,
    totalTeachers: classSubjectsResult.count || 0,
    currentYear,
    currentTerm,
  };
}

/**
 * Bulk import grades
 */
export async function bulkImportGrades(schoolId: string, grades: { name: string; level: number }[]): Promise<{ success: number; failed: number; errors: string[] }> {
  const result = { success: 0, failed: 0, errors: [] as string[] };

  for (const grade of grades) {
    try {
      await createGrade({
        school_id: schoolId,
        name: grade.name,
        level: grade.level,
        is_active: true,
      });
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`${grade.name}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Bulk import subjects
 */
export async function bulkImportSubjects(schoolId: string, subjects: { name: string; code?: string }[]): Promise<{ success: number; failed: number; errors: string[] }> {
  const result = { success: 0, failed: 0, errors: [] as string[] };

  for (const subject of subjects) {
    try {
      await createSubject({
        school_id: schoolId,
        name: subject.name,
        code: subject.code,
        is_compulsory: true,
        is_active: true,
      });
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`${subject.name}: ${error.message}`);
    }
  }

  return result;
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const academicService = {
  // Academic Years
  getAcademicYears,
  getCurrentAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  setCurrentAcademicYear,
  archiveAcademicYear,
  
  // Terms
  getTerms,
  getCurrentTerm,
  createTerm,
  updateTerm,
  setCurrentTerm,
  
  // Grades
  getGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  
  // Classes
  getClasses,
  getClassesByGrade,
  createClass,
  updateClass,
  deleteClass,
  getClass,
  
  // Subjects
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  
  // Class Subjects
  getClassSubjects,
  getTeacherSubjects,
  assignSubjectToClass,
  updateClassSubject,
  removeSubjectFromClass,
  getSchoolClassSubjects,
  
  // Helpers
  getAcademicStructureSummary,
  bulkImportGrades,
  bulkImportSubjects,
};