import { supabase } from '@/lib/supabase/client';
import {
  HomeworkAssignment,
  HomeworkSubmission,
  HomeworkComment,
  CreateHomeworkAssignmentInput,
  UpdateHomeworkAssignmentInput,
  CreateHomeworkSubmissionInput,
  UpdateHomeworkSubmissionInput,
  CreateHomeworkCommentInput,
  HomeworkClassStats,
  StudentHomeworkSummary,
} from '@/types/homework';

// ============================================================================
// FEATURE SUBSCRIPTION CHECK
// ============================================================================

async function checkFeatureSubscription(schoolId: string, featureCode: string = 'homework') {
  const { data: feature, error } = await supabase
    .from('school_modules')
    .select('status')
    .eq('school_id', schoolId)
    .eq('feature_code', featureCode)
    .single();

  if (error || !feature) {
    throw new Error('Feature not subscribed');
  }

  if (feature.status === 'paused') {
    throw new Error('Feature is paused');
  }

  if (feature.status === 'expired') {
    throw new Error('Feature is expired');
  }

  if (feature.status === 'pending') {
    throw new Error('Feature is pending activation');
  }

  if (feature.status === 'removed') {
    throw new Error('Feature has been removed');
  }

  return feature;
}

// ============================================================================
// HOMEWORK ASSIGNMENTS
// ============================================================================

export async function getHomeworkAssignments(
  schoolId: string,
  filters?: {
    class_id?: string;
    subject_id?: string;
    status?: string;
    academic_year_id?: string;
    term_id?: string;
  }
): Promise<HomeworkAssignment[]> {
  await checkFeatureSubscription(schoolId);

  let query = supabase
    .from('homework_assignments')
    .select(`
      *,
      subject:subjects(id, name, code),
      class:classes(id, name, grade_id),
      assigned_by_profile:profiles!homework_assignments_assigned_by_fkey(id, full_name, email)
    `)
    .eq('school_id', schoolId);

  if (filters?.class_id) {
    query = query.eq('class_id', filters.class_id);
  }

  if (filters?.subject_id) {
    query = query.eq('subject_id', filters.subject_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.academic_year_id) {
    query = query.eq('academic_year_id', filters.academic_year_id);
  }

  if (filters?.term_id) {
    query = query.eq('term_id', filters.term_id);
  }

  query = query.order('assigned_date', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getHomeworkAssignment(
  id: string,
  schoolId: string
): Promise<HomeworkAssignment> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('homework_assignments')
    .select(`
      *,
      subject:subjects(id, name, code),
      class:classes(id, name, grade_id),
      assigned_by_profile:profiles!homework_assignments_assigned_by_fkey(id, full_name, email)
    `)
    .eq('id', id)
    .eq('school_id', schoolId)
    .single();

  if (error) throw error;
  return data;
}

export async function createHomeworkAssignment(
  input: CreateHomeworkAssignmentInput,
  schoolId: string,
  userId: string
): Promise<HomeworkAssignment> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('homework_assignments')
    .insert({
      ...input,
      school_id: schoolId,
      assigned_by: userId,
    })
    .select(`
      *,
      subject:subjects(id, name, code),
      class:classes(id, name, grade_id),
      assigned_by_profile:profiles!homework_assignments_assigned_by_fkey(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateHomeworkAssignment(
  id: string,
  input: UpdateHomeworkAssignmentInput,
  schoolId: string
): Promise<HomeworkAssignment> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('homework_assignments')
    .update({
      ...input,
      ...(input.is_published && !input.published_at ? { published_at: new Date().toISOString() } : {}),
    })
    .eq('id', id)
    .eq('school_id', schoolId)
    .select(`
      *,
      subject:subjects(id, name, code),
      class:classes(id, name, grade_id),
      assigned_by_profile:profiles!homework_assignments_assigned_by_fkey(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHomeworkAssignment(
  id: string,
  schoolId: string
): Promise<void> {
  await checkFeatureSubscription(schoolId);

  const { error } = await supabase
    .from('homework_assignments')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId);

  if (error) throw error;
}

export async function publishHomeworkAssignment(
  id: string,
  schoolId: string
): Promise<HomeworkAssignment> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('homework_assignments')
    .update({
      is_published: true,
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('school_id', schoolId)
    .select(`
      *,
      subject:subjects(id, name, code),
      class:classes(id, name, grade_id),
      assigned_by_profile:profiles!homework_assignments_assigned_by_fkey(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// HOMEWORK SUBMISSIONS
// ============================================================================

export async function getHomeworkSubmissions(
  schoolId: string,
  filters?: {
    assignment_id?: string;
    student_id?: string;
    status?: string;
  }
): Promise<HomeworkSubmission[]> {
  await checkFeatureSubscription(schoolId);

  let query = supabase
    .from('homework_submissions')
    .select(`
      *,
      assignment:homework_assignments(*),
      student:students(id, admission_number, full_name, class_id),
      graded_by_profile:profiles(id, full_name, email)
    `)
    .eq('school_id', schoolId);

  if (filters?.assignment_id) {
    query = query.eq('assignment_id', filters.assignment_id);
  }

  if (filters?.student_id) {
    query = query.eq('student_id', filters.student_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('submitted_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getHomeworkSubmission(
  id: string,
  schoolId: string
): Promise<HomeworkSubmission> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('homework_submissions')
    .select(`
      *,
      assignment:homework_assignments(*),
      student:students(id, admission_number, full_name, class_id),
      graded_by_profile:profiles(id, full_name, email)
    `)
    .eq('id', id)
    .eq('school_id', schoolId)
    .single();

  if (error) throw error;
  return data;
}

export async function createHomeworkSubmission(
  input: CreateHomeworkSubmissionInput,
  schoolId: string,
  studentId: string
): Promise<HomeworkSubmission> {
  await checkFeatureSubscription(schoolId);

  // Check if assignment exists and get due date
  const { data: assignment, error: assignmentError } = await supabase
    .from('homework_assignments')
    .select('due_date')
    .eq('id', input.assignment_id)
    .single();

  if (assignmentError) throw assignmentError;

  // Check if submission is late
  const isLate = new Date(assignment.due_date) < new Date();

  const { data, error } = await supabase
    .from('homework_submissions')
    .insert({
      ...input,
      school_id: schoolId,
      student_id: studentId,
      submitted_at: new Date().toISOString(),
      status: isLate ? 'late' : 'submitted',
      is_late: isLate,
    })
    .select(`
      *,
      assignment:homework_assignments(*),
      student:students(id, admission_number, full_name, class_id),
      graded_by_profile:profiles(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateHomeworkSubmission(
  id: string,
  input: UpdateHomeworkSubmissionInput,
  schoolId: string,
  gradedBy?: string
): Promise<HomeworkSubmission> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('homework_submissions')
    .update({
      ...input,
      ...(input.points_earned && !input.graded_at ? { graded_at: new Date().toISOString() } : {}),
      ...(gradedBy ? { graded_by: gradedBy } : {}),
    })
    .eq('id', id)
    .eq('school_id', schoolId)
    .select(`
      *,
      assignment:homework_assignments(*),
      student:students(id, admission_number, full_name, class_id),
      graded_by_profile:profiles(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHomeworkSubmission(
  id: string,
  schoolId: string
): Promise<void> {
  await checkFeatureSubscription(schoolId);

  const { error } = await supabase
    .from('homework_submissions')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId);

  if (error) throw error;
}

// ============================================================================
// HOMEWORK COMMENTS
// ============================================================================

export async function getHomeworkComments(
  submissionId: string,
  schoolId: string
): Promise<HomeworkComment[]> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('homework_comments')
    .select(`
      *,
      author:profiles(id, full_name, email)
    `)
    .eq('submission_id', submissionId)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createHomeworkComment(
  input: CreateHomeworkCommentInput,
  schoolId: string,
  authorId: string,
  authorRole: 'teacher' | 'student' | 'parent'
): Promise<HomeworkComment> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('homework_comments')
    .insert({
      ...input,
      school_id: schoolId,
      author_id: authorId,
      author_role: authorRole,
    })
    .select(`
      *,
      author:profiles(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHomeworkComment(
  id: string,
  schoolId: string
): Promise<void> {
  await checkFeatureSubscription(schoolId);

  const { error } = await supabase
    .from('homework_comments')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId);

  if (error) throw error;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function getHomeworkClassStats(
  classId: string,
  academicYearId?: string
): Promise<HomeworkClassStats> {
  const { data, error } = await supabase.rpc('get_homework_class_stats', {
    class_id: classId,
    academic_year_id: academicYearId || null,
  });

  if (error) throw error;
  return data as HomeworkClassStats;
}

export async function getStudentHomeworkSummary(
  studentId: string,
  academicYearId?: string
): Promise<StudentHomeworkSummary> {
  const { data, error } = await supabase.rpc('get_student_homework_summary', {
    student_id: studentId,
    academic_year_id: academicYearId || null,
  });

  if (error) throw error;
  return data as StudentHomeworkSummary;
}

export async function isHomeworkOverdue(homeworkId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_homework_overdue', {
    homework_id: homeworkId,
  });

  if (error) throw error;
  return data;
}
