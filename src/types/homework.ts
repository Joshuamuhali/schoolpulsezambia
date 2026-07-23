// Homework Types
export type HomeworkAssignmentType = 'regular' | 'project' | 'group' | 'exam_prep';
export type HomeworkStatus = 'draft' | 'published' | 'closed' | 'archived';
export type SubmissionStatus = 'not_submitted' | 'submitted' | 'late' | 'graded' | 'returned';
export type CommentAuthorRole = 'teacher' | 'student' | 'parent';

export interface HomeworkAssignment {
  id: string;
  school_id: string;
  title: string;
  description?: string;
  subject_id?: string;
  class_id: string;
  academic_year_id: string;
  term_id: string;
  assigned_by?: string;
  assigned_date: string;
  due_date: string;
  max_points: number;
  assignment_type: HomeworkAssignmentType;
  status: HomeworkStatus;
  attachment_urls?: string[];
  instructions?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
  class?: {
    id: string;
    name: string;
    grade_id: string;
  };
  assigned_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  _submission_count?: number;
  _graded_count?: number;
}

export interface HomeworkSubmission {
  id: string;
  school_id: string;
  assignment_id: string;
  student_id: string;
  submitted_at?: string;
  submission_text?: string;
  attachment_urls?: string[];
  points_earned?: number;
  points_possible?: number;
  grade?: string;
  feedback?: string;
  graded_by?: string;
  graded_at?: string;
  status: SubmissionStatus;
  is_late: boolean;
  late_submission_reason?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  assignment?: HomeworkAssignment;
  student?: {
    id: string;
    admission_number: string;
    full_name: string;
    class_id?: string;
  };
  graded_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface HomeworkComment {
  id: string;
  school_id: string;
  submission_id: string;
  author_id: string;
  author_role: CommentAuthorRole;
  comment_text: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  author?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface CreateHomeworkAssignmentInput {
  title: string;
  description?: string;
  subject_id?: string;
  class_id: string;
  academic_year_id: string;
  term_id: string;
  due_date: string;
  max_points?: number;
  assignment_type?: HomeworkAssignmentType;
  attachment_urls?: string[];
  instructions?: string;
}

export interface UpdateHomeworkAssignmentInput {
  title?: string;
  description?: string;
  subject_id?: string;
  due_date?: string;
  max_points?: number;
  assignment_type?: HomeworkAssignmentType;
  attachment_urls?: string[];
  instructions?: string;
  status?: HomeworkStatus;
  is_published?: boolean;
}

export interface CreateHomeworkSubmissionInput {
  assignment_id: string;
  submission_text?: string;
  attachment_urls?: string[];
}

export interface UpdateHomeworkSubmissionInput {
  points_earned?: number;
  points_possible?: number;
  grade?: string;
  feedback?: string;
  status?: SubmissionStatus;
}

export interface CreateHomeworkCommentInput {
  submission_id: string;
  comment_text: string;
}

export interface HomeworkClassStats {
  total_assignments: number;
  total_submissions: number;
  graded_submissions: number;
  pending_submissions: number;
  late_submissions: number;
  average_score: number | null;
}

export interface StudentHomeworkSummary {
  total_assignments: number;
  submitted: number;
  graded: number;
  pending: number;
  late: number;
  average_score: number | null;
}
