import { supabase } from "@/lib/supabase/client";
import type { GradingSystem, GradeRule, Exam, ExamSubject, StudentResult, StudentExamResult, ReportCard } from "@/lib/supabase/types";

// ============================================================================
// GRADING SYSTEMS
// ============================================================================

export async function getGradingSystems(schoolId: string): Promise<GradingSystem[]> {
  const { data, error } = await supabase
    .from("grading_systems")
    .select("*")
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getGradingSystem(id: string): Promise<GradingSystem | null> {
  const { data, error } = await supabase
    .from("grading_systems")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createGradingSystem(system: Partial<GradingSystem>): Promise<GradingSystem> {
  const { data, error } = await supabase
    .from("grading_systems")
    .insert(system)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGradingSystem(id: string, updates: Partial<GradingSystem>): Promise<GradingSystem> {
  const { data, error } = await supabase
    .from("grading_systems")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGradingSystem(id: string): Promise<void> {
  const { error } = await supabase
    .from("grading_systems")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// GRADE RULES
// ============================================================================

export async function getGradeRules(schoolId: string, gradingSystemId?: string): Promise<GradeRule[]> {
  let query = supabase
    .from("grade_rules")
    .select("*")
    .eq("school_id", schoolId)
    .order("min_score", { ascending: false });

  if (gradingSystemId) {
    query = query.eq("grading_system_id", gradingSystemId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createGradeRule(rule: Partial<GradeRule>): Promise<GradeRule> {
  const { data, error } = await supabase
    .from("grade_rules")
    .insert(rule)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGradeRule(id: string, updates: Partial<GradeRule>): Promise<GradeRule> {
  const { data, error } = await supabase
    .from("grade_rules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGradeRule(id: string): Promise<void> {
  const { error } = await supabase
    .from("grade_rules")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// EXAMS
// ============================================================================

export async function getExams(schoolId: string, filters?: {
  academicYearId?: string;
  termId?: string;
  status?: string;
}): Promise<Exam[]> {
  let query = supabase
    .from("exams")
    .select("*")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  if (filters?.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
  if (filters?.termId) query = query.eq("term_id", filters.termId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getExam(id: string): Promise<Exam | null> {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createExam(exam: Partial<Exam>): Promise<Exam> {
  const { data, error } = await supabase
    .from("exams")
    .insert(exam)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateExam(id: string, updates: Partial<Exam>): Promise<Exam> {
  const { data, error } = await supabase
    .from("exams")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await supabase
    .from("exams")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// EXAM SUBJECTS
// ============================================================================

export async function getExamSubjects(schoolId: string, examId?: string): Promise<ExamSubject[]> {
  let query = supabase
    .from("exam_subjects")
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
      ),
      staff_profiles (
        id,
        first_name,
        last_name
      )
    `)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (examId) {
    query = query.eq("exam_id", examId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getExamSubject(id: string): Promise<ExamSubject | null> {
  const { data, error } = await supabase
    .from("exam_subjects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createExamSubject(subject: Partial<ExamSubject>): Promise<ExamSubject> {
  const { data, error } = await supabase
    .from("exam_subjects")
    .insert(subject)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateExamSubject(id: string, updates: Partial<ExamSubject>): Promise<ExamSubject> {
  const { data, error } = await supabase
    .from("exam_subjects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExamSubject(id: string): Promise<void> {
  const { error } = await supabase
    .from("exam_subjects")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// STUDENT RESULTS
// ============================================================================

export async function getStudentResults(schoolId: string, examSubjectId?: string): Promise<StudentResult[]> {
  let query = supabase
    .from("student_results")
    .select(`
      *,
      students (
        id,
        full_name,
        admission_number
      )
    `)
    .eq("school_id", schoolId)
    .order("marked_at", { ascending: false });

  if (examSubjectId) {
    query = query.eq("exam_subject_id", examSubjectId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getStudentResult(id: string): Promise<StudentResult | null> {
  const { data, error } = await supabase
    .from("student_results")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createStudentResult(result: Partial<StudentResult>): Promise<StudentResult> {
  const { data, error } = await supabase
    .from("student_results")
    .insert(result)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStudentResult(id: string, updates: Partial<StudentResult>): Promise<StudentResult> {
  const { data, error } = await supabase
    .from("student_results")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkCreateStudentResults(results: Partial<StudentResult>[]): Promise<StudentResult[]> {
  const { data, error } = await supabase
    .from("student_results")
    .insert(results)
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================================================
// STUDENT EXAM RESULTS (Aggregated)
// ============================================================================

export async function getStudentExamResults(schoolId: string, examId?: string): Promise<StudentExamResult[]> {
  let query = supabase
    .from("student_exam_results")
    .select(`
      *,
      students (
        id,
        full_name,
        admission_number
      )
    `)
    .eq("school_id", schoolId)
    .order("position", { ascending: true });

  if (examId) {
    query = query.eq("exam_id", examId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function calculateExamResults(examId: string, schoolId: string): Promise<void> {
  // Get all students for this exam
  const { data: examSubjects } = await supabase
    .from("exam_subjects")
    .select("id")
    .eq("exam_id", examId)
    .eq("school_id", schoolId);

  if (!examSubjects || examSubjects.length === 0) return;

  const examSubjectIds = examSubjects.map(es => es.id);

  // Get all results for this exam
  const { data: results } = await supabase
    .from("student_results")
    .select("student_id, exam_subject_id, score")
    .in("exam_subject_id", examSubjectIds)
    .eq("school_id", schoolId);

  if (!results) return;

  // Group by student
  const studentResults: Record<string, any[]> = {};
  results.forEach(result => {
    if (!studentResults[result.student_id]) {
      studentResults[result.student_id] = [];
    }
    studentResults[result.student_id].push(result);
  });

  // Calculate results for each student
  for (const [studentId, studentMarks] of Object.entries(studentResults)) {
    const totalScore = studentMarks.reduce((sum, mark) => sum + (mark.score || 0), 0);
    
    // Get total marks from exam subjects
    const { data: examSubjectData } = await supabase
      .from("exam_subjects")
      .select("max_marks")
      .in("id", examSubjectIds)
      .eq("school_id", schoolId);

    const totalMarks = examSubjectData?.reduce((sum, es) => sum + es.max_marks, 0) || 0;
    const average = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;

    // Calculate grade
    const { data: grade } = await supabase
      .rpc("calculate_grade", {
        p_score: average,
        p_school_id: schoolId,
      });

    // Upsert student exam result
    await supabase
      .from("student_exam_results")
      .upsert({
        school_id: schoolId,
        exam_id: examId,
        student_id: studentId,
        total_marks: totalMarks,
        total_score: totalScore,
        average: Math.round(average * 100) / 100,
        overall_grade: grade,
        status: "draft",
      }, {
        onConflict: "school_id,exam_id,student_id",
      });
  }

  // Calculate positions
  await supabase
    .rpc("calculate_class_positions", {
      p_exam_id: examId,
      p_school_id: schoolId,
    });
}

// ============================================================================
// REPORT CARDS
// ============================================================================

export async function getReportCards(schoolId: string, filters?: {
  studentId?: string;
  termId?: string;
  examId?: string;
}): Promise<ReportCard[]> {
  let query = supabase
    .from("report_cards")
    .select(`
      *,
      students (
        id,
        full_name,
        admission_number
      )
    `)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (filters?.studentId) query = query.eq("student_id", filters.studentId);
  if (filters?.termId) query = query.eq("term_id", filters.termId);
  if (filters?.examId) query = query.eq("exam_id", filters.examId);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createReportCard(card: Partial<ReportCard>): Promise<ReportCard> {
  const { data, error } = await supabase
    .from("report_cards")
    .insert(card)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReportCard(id: string, updates: Partial<ReportCard>): Promise<ReportCard> {
  const { data, error } = await supabase
    .from("report_cards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function getTeacherExams(teacherId: string, schoolId: string) {
  const { data, error } = await supabase
    .from("exam_subjects")
    .select(`
      *,
      exams (
        id,
        name,
        start_date,
        end_date,
        status
      ),
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
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getExamResultsByClass(examId: string, classId: string, schoolId: string) {
  const { data, error } = await supabase
    .from("student_exam_results")
    .select(`
      *,
      students (
        id,
        full_name,
        admission_number
      )
    `)
    .eq("exam_id", examId)
    .eq("school_id", schoolId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data || [];
}