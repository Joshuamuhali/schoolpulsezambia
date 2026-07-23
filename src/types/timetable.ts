// Timetable Types
export type TimetableEntryType = 'regular' | 'exam' | 'assembly' | 'break' | 'lunch' | 'sports' | 'activity';
export type TimetableTemplateType = 'weekly' | 'daily' | 'exam' | 'event';
export type ConflictType = 'teacher_conflict' | 'room_conflict' | 'class_conflict';

export interface TimetableEntry {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  teacher_id?: string;
  academic_year_id: string;
  term_id: string;
  day_of_week: number; // 1-7 (Monday-Sunday)
  start_time: string;
  end_time: string;
  room_number?: string;
  building?: string;
  entry_type: TimetableEntryType;
  is_active: boolean;
  notes?: string;
  color_hex?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  class?: {
    id: string;
    name: string;
    grade_id: string;
  };
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
}

export interface TimetableConflict {
  id: string;
  school_id: string;
  entry_id: string;
  conflict_type: ConflictType;
  conflicting_entry_id?: string;
  description: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  detected_at: string;
  created_at: string;
  
  // Joined fields
  entry?: TimetableEntry;
  conflicting_entry?: TimetableEntry;
  resolved_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface TimetableTemplate {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  academic_year_id?: string;
  template_type: TimetableTemplateType;
  is_default: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  entries?: TimetableTemplateEntry[];
}

export interface TimetableTemplateEntry {
  id: string;
  school_id: string;
  template_id: string;
  subject_id?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  entry_type: TimetableEntryType;
  room_number?: string;
  notes?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
}

export interface CreateTimetableEntryInput {
  class_id: string;
  subject_id: string;
  teacher_id?: string;
  academic_year_id: string;
  term_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
  building?: string;
  entry_type?: TimetableEntryType;
  notes?: string;
  color_hex?: string;
}

export interface UpdateTimetableEntryInput {
  subject_id?: string;
  teacher_id?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  room_number?: string;
  building?: string;
  entry_type?: TimetableEntryType;
  is_active?: boolean;
  notes?: string;
  color_hex?: string;
}

export interface CreateTimetableTemplateInput {
  name: string;
  description?: string;
  academic_year_id?: string;
  template_type?: TimetableTemplateType;
  is_default?: boolean;
}

export interface UpdateTimetableTemplateInput {
  name?: string;
  description?: string;
  template_type?: TimetableTemplateType;
  is_default?: boolean;
}

export interface CreateTimetableTemplateEntryInput {
  template_id: string;
  subject_id?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  entry_type?: TimetableEntryType;
  room_number?: string;
  notes?: string;
  display_order?: number;
}

export interface WeeklyTimetable {
  day_of_week: number;
  entries: Array<{
    id: string;
    subject_id: string;
    subject_name: string;
    teacher_id?: string;
    teacher_name?: string;
    start_time: string;
    end_time: string;
    room_number?: string;
    building?: string;
    entry_type: string;
    color_hex?: string;
  }>;
}

export interface ConflictCheckResult {
  teacher_conflict: boolean;
  room_conflict: boolean;
  total_conflicts: number;
}
