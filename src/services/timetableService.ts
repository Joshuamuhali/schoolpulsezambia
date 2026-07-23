import { supabase } from '@/lib/supabase/client';
import {
  TimetableEntry,
  TimetableConflict,
  TimetableTemplate,
  TimetableTemplateEntry,
  CreateTimetableEntryInput,
  UpdateTimetableEntryInput,
  CreateTimetableTemplateInput,
  UpdateTimetableTemplateInput,
  CreateTimetableTemplateEntryInput,
  WeeklyTimetable,
  ConflictCheckResult,
} from '@/types/timetable';

// ============================================================================
// FEATURE SUBSCRIPTION CHECK
// ============================================================================

async function checkFeatureSubscription(schoolId: string, featureCode: string = 'timetable') {
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
// TIMETABLE ENTRIES
// ============================================================================

export async function getTimetableEntries(
  schoolId: string,
  filters?: {
    class_id?: string;
    subject_id?: string;
    teacher_id?: string;
    academic_year_id?: string;
    term_id?: string;
    day_of_week?: number;
    is_active?: boolean;
  }
): Promise<TimetableEntry[]> {
  await checkFeatureSubscription(schoolId);

  let query = supabase
    .from('timetable_entries')
    .select(`
      *,
      class:classes(id, name, grade_id),
      subject:subjects(id, name, code),
      teacher:staff_profiles(id, first_name, last_name, email)
    `)
    .eq('school_id', schoolId);

  if (filters?.class_id) {
    query = query.eq('class_id', filters.class_id);
  }

  if (filters?.subject_id) {
    query = query.eq('subject_id', filters.subject_id);
  }

  if (filters?.teacher_id) {
    query = query.eq('teacher_id', filters.teacher_id);
  }

  if (filters?.academic_year_id) {
    query = query.eq('academic_year_id', filters.academic_year_id);
  }

  if (filters?.term_id) {
    query = query.eq('term_id', filters.term_id);
  }

  if (filters?.day_of_week) {
    query = query.eq('day_of_week', filters.day_of_week);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  query = query.order('day_of_week', { ascending: true }).order('start_time', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getTimetableEntry(
  id: string,
  schoolId: string
): Promise<TimetableEntry> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('timetable_entries')
    .select(`
      *,
      class:classes(id, name, grade_id),
      subject:subjects(id, name, code),
      teacher:staff_profiles(id, first_name, last_name, email)
    `)
    .eq('id', id)
    .eq('school_id', schoolId)
    .single();

  if (error) throw error;
  return data;
}

export async function createTimetableEntry(
  input: CreateTimetableEntryInput,
  schoolId: string,
  userId: string
): Promise<TimetableEntry> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('timetable_entries')
    .insert({
      ...input,
      school_id: schoolId,
      created_by: userId,
    })
    .select(`
      *,
      class:classes(id, name, grade_id),
      subject:subjects(id, name, code),
      teacher:staff_profiles(id, first_name, last_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTimetableEntry(
  id: string,
  input: UpdateTimetableEntryInput,
  schoolId: string
): Promise<TimetableEntry> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('timetable_entries')
    .update(input)
    .eq('id', id)
    .eq('school_id', schoolId)
    .select(`
      *,
      class:classes(id, name, grade_id),
      subject:subjects(id, name, code),
      teacher:staff_profiles(id, first_name, last_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTimetableEntry(
  id: string,
  schoolId: string
): Promise<void> {
  await checkFeatureSubscription(schoolId);

  const { error } = await supabase
    .from('timetable_entries')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId);

  if (error) throw error;
}

// ============================================================================
// TIMETABLE CONFLICTS
// ============================================================================

export async function getTimetableConflicts(
  schoolId: string,
  filters?: {
    entry_id?: string;
    conflict_type?: string;
    is_resolved?: boolean;
  }
): Promise<TimetableConflict[]> {
  await checkFeatureSubscription(schoolId);

  let query = supabase
    .from('timetable_conflicts')
    .select(`
      *,
      entry:timetable_entries(*),
      conflicting_entry:timetable_entries(*),
      resolved_by_profile:profiles(id, full_name, email)
    `)
    .eq('school_id', schoolId);

  if (filters?.entry_id) {
    query = query.eq('entry_id', filters.entry_id);
  }

  if (filters?.conflict_type) {
    query = query.eq('conflict_type', filters.conflict_type);
  }

  if (filters?.is_resolved !== undefined) {
    query = query.eq('is_resolved', filters.is_resolved);
  }

  query = query.order('detected_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function resolveTimetableConflict(
  id: string,
  resolutionNotes: string,
  schoolId: string,
  userId: string
): Promise<TimetableConflict> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('timetable_conflicts')
    .update({
      is_resolved: true,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes,
    })
    .eq('id', id)
    .eq('school_id', schoolId)
    .select(`
      *,
      entry:timetable_entries(*),
      conflicting_entry:timetable_entries(*),
      resolved_by_profile:profiles(id, full_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// TIMETABLE TEMPLATES
// ============================================================================

export async function getTimetableTemplates(
  schoolId: string,
  filters?: {
    academic_year_id?: string;
    template_type?: string;
    is_default?: boolean;
  }
): Promise<TimetableTemplate[]> {
  await checkFeatureSubscription(schoolId);

  let query = supabase
    .from('timetable_templates')
    .select(`
      *,
      entries:timetable_template_entries(*)
    `)
    .eq('school_id', schoolId);

  if (filters?.academic_year_id) {
    query = query.eq('academic_year_id', filters.academic_year_id);
  }

  if (filters?.template_type) {
    query = query.eq('template_type', filters.template_type);
  }

  if (filters?.is_default !== undefined) {
    query = query.eq('is_default', filters.is_default);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getTimetableTemplate(
  id: string,
  schoolId: string
): Promise<TimetableTemplate> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('timetable_templates')
    .select(`
      *,
      entries:timetable_template_entries(
        *,
        subject:subjects(id, name, code)
      )
    `)
    .eq('id', id)
    .eq('school_id', schoolId)
    .single();

  if (error) throw error;
  return data;
}

export async function createTimetableTemplate(
  input: CreateTimetableTemplateInput,
  schoolId: string,
  userId: string
): Promise<TimetableTemplate> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('timetable_templates')
    .insert({
      ...input,
      school_id: schoolId,
      created_by: userId,
    })
    .select(`
      *,
      entries:timetable_template_entries(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTimetableTemplate(
  id: string,
  input: UpdateTimetableTemplateInput,
  schoolId: string
): Promise<TimetableTemplate> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('timetable_templates')
    .update(input)
    .eq('id', id)
    .eq('school_id', schoolId)
    .select(`
      *,
      entries:timetable_template_entries(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTimetableTemplate(
  id: string,
  schoolId: string
): Promise<void> {
  await checkFeatureSubscription(schoolId);

  const { error } = await supabase
    .from('timetable_templates')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId);

  if (error) throw error;
}

// ============================================================================
// TIMETABLE TEMPLATE ENTRIES
// ============================================================================

export async function createTimetableTemplateEntry(
  input: CreateTimetableTemplateEntryInput,
  schoolId: string
): Promise<TimetableTemplateEntry> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('timetable_template_entries')
    .insert({
      ...input,
      school_id: schoolId,
    })
    .select(`
      *,
      subject:subjects(id, name, code)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTimetableTemplateEntry(
  id: string,
  input: Partial<CreateTimetableTemplateEntryInput>,
  schoolId: string
): Promise<TimetableTemplateEntry> {
  await checkFeatureSubscription(schoolId);

  const { data, error } = await supabase
    .from('timetable_template_entries')
    .update(input)
    .eq('id', id)
    .eq('school_id', schoolId)
    .select(`
      *,
      subject:subjects(id, name, code)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTimetableTemplateEntry(
  id: string,
  schoolId: string
): Promise<void> {
  await checkFeatureSubscription(schoolId);

  const { error } = await supabase
    .from('timetable_template_entries')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId);

  if (error) throw error;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function getClassWeeklyTimetable(
  classId: string,
  academicYearId?: string,
  termId?: string
): Promise<WeeklyTimetable[]> {
  const { data, error } = await supabase.rpc('get_class_weekly_timetable', {
    p_class_id: classId,
    p_academic_year_id: academicYearId || null,
    p_term_id: termId || null,
  });

  if (error) throw error;
  return data;
}

export async function getTeacherWeeklySchedule(
  teacherId: string,
  academicYearId?: string,
  termId?: string
): Promise<WeeklyTimetable[]> {
  const { data, error } = await supabase.rpc('get_teacher_weekly_schedule', {
    p_teacher_id: teacherId,
    p_academic_year_id: academicYearId || null,
    p_term_id: termId || null,
  });

  if (error) throw error;
  return data;
}

export async function detectTimetableConflicts(entryId: string): Promise<ConflictCheckResult> {
  const { data, error } = await supabase.rpc('detect_timetable_conflicts', {
    p_entry_id: entryId,
  });

  if (error) throw error;
  return data as ConflictCheckResult;
}

export async function checkTeacherConflict(
  schoolId: string,
  teacherId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeEntryId?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_teacher_conflict', {
    p_school_id: schoolId,
    p_teacher_id: teacherId,
    p_day_of_week: dayOfWeek,
    p_start_time: startTime,
    p_end_time: endTime,
    p_exclude_entry_id: excludeEntryId || null,
  });

  if (error) throw error;
  return data;
}

export async function checkRoomConflict(
  schoolId: string,
  roomNumber: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeEntryId?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_room_conflict', {
    p_school_id: schoolId,
    p_room_number: roomNumber,
    p_day_of_week: dayOfWeek,
    p_start_time: startTime,
    p_end_time: endTime,
    p_exclude_entry_id: excludeEntryId || null,
  });

  if (error) throw error;
  return data;
}
