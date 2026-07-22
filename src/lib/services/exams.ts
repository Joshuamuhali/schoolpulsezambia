/**
 * Service: exams — aligned to the ACTUAL database schema.
 * Database tables:
 * - exams: id, school_id, term_id, name, exam_type, start_date, end_date, status
 * - marks: id, school_id, exam_id, student_id, subject_id, score, grade_letter, remarks
 */

import { supabase } from "@/lib/supabase/client";

/** Local simplified exam shape used for inserts/updates in this service */
export interface ExamForm {
  id?: string;
  school_id?: string;
  term_id: string;
  name: string;
  exam_type: string;
  start_date: string;
  end_date: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
}

export interface ExamRow extends ExamForm {
  id: string;
  school_id: string;
  terms?: {
    name: string;
  } | null;
}

export interface MarkRecord {
  id?: string;
  school_id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  score: number | null;
  grade_letter?: string | null;
  remarks?: string | null;
}

/**
 * Fetch all exams for a school
 */
export async function fetchExams(schoolId: string): Promise<ExamRow[]> {
  const { data, error } = await supabase
    .from("exams")
    .select(`
      id, school_id, term_id, name, exam_type, start_date, end_date, status,
      terms ( name )
    `)
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as any[];
}

/**
 * Fetch a single exam by ID
 */
export async function fetchExamById(examId: string): Promise<ExamRow> {
  const { data, error } = await supabase
    .from("exams")
    .select(`
      id, school_id, term_id, name, exam_type, start_date, end_date, status,
      terms ( name )
    `)
    .eq("id", examId)
    .single();

  if (error) throw error;
  return data as any;
}

/**
 * Create a new exam
 */
export async function createExam(
  schoolId: string,
  payload: Omit<ExamForm, "id" | "school_id">
): Promise<ExamForm> {
  const { data, error } = await supabase
    .from("exams")
    .insert({
      ...payload,
      school_id: schoolId,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as ExamForm;
}

/**
 * Update an existing exam
 */
export async function updateExam(
  examId: string,
  updates: Partial<ExamForm>
): Promise<void> {
  const { error } = await supabase
    .from("exams")
    .update(updates as any)
    .eq("id", examId);

  if (error) throw error;
}

/**
 * Delete an exam
 */
export async function deleteExam(examId: string): Promise<void> {
  const { error } = await supabase
    .from("exams")
    .delete()
    .eq("id", examId);

  if (error) throw error;
}

/**
 * Fetch all marks recorded for an exam
 */
export async function fetchMarksForExam(examId: string) {
  const { data, error } = await supabase
    .from("marks")
    .select(`
      id, school_id, exam_id, student_id, subject_id, score, grade_letter, remarks,
      students ( full_name, admission_number )
    `)
    .eq("exam_id", examId);

  if (error) throw error;
  return data ?? [];
}

/**
 * Upsert marks records in bulk
 */
export async function upsertMarks(records: MarkRecord[]) {
  const { error } = await supabase
    .from("marks")
    .upsert(records as any[], { onConflict: "exam_id,student_id,subject_id" });

  if (error) throw error;
}

/**
 * Helper to fetch school's terms (for select dropdown)
 */
export async function fetchTerms(schoolId: string) {
  const { data, error } = await supabase
    .from("terms")
    .select("id, name, is_current")
    .eq("school_id", schoolId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

/**
 * Helper to fetch school's subjects (for select dropdown)
 */
export async function fetchSubjects(schoolId: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, code")
    .eq("school_id", schoolId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

/**
 * Helper to fetch classes (for select dropdown)
 */
export async function fetchClasses(schoolId: string) {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, grade_id, grades(name)")
    .eq("school_id", schoolId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export const examService = {
  fetchExams,
  fetchExamById,
  createExam,
  updateExam,
  deleteExam,
  fetchMarksForExam,
  upsertMarks,
  fetchTerms,
  fetchSubjects,
  fetchClasses,
};
