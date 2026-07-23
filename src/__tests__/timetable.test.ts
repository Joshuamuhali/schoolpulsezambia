import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { supabase } from '@/lib/supabase/client';

describe('Timetable Feature - School Isolation', () => {
  let schoolA: any;
  let schoolB: any;
  let teacherA: any;
  let teacherB: any;

  beforeAll(async () => {
    schoolA = await createTestSchool('school_a');
    schoolB = await createTestSchool('school_b');
    teacherA = await createTestTeacher(schoolA.id);
    teacherB = await createTestTeacher(schoolB.id);
    await subscribeToFeature(schoolA.id, 'timetable');
    await subscribeToFeature(schoolB.id, 'timetable');
  });

  afterAll(async () => {
    await cleanupTestSchool(schoolA.id);
    await cleanupTestSchool(schoolB.id);
  });

  it('School A cannot access School B timetable entries', async () => {
    await loginAsUser(teacherA.id);

    // Create entry in School A
    const classA = await createTestClass(schoolA.id);
    const subjectA = await createTestSubject(schoolA.id);
    const academicYear = await createAcademicYear(schoolA.id);
    const term = await createTerm(schoolA.id, academicYear.id);

    await supabase
      .from('timetable_entries')
      .insert({
        school_id: schoolA.id,
        class_id: classA.id,
        subject_id: subjectA.id,
        teacher_id: teacherA.id,
        academic_year_id: academicYear.id,
        term_id: term.id,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
      });

    // Try to access School B entries
    const { data, error } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('school_id', schoolB.id);

    expect(data).toHaveLength(0);
    expect(error).toBeNull();
  });

  it('Teacher can only create entries for their own school', async () => {
    await loginAsUser(teacherA.id);

    const classB = await createTestClass(schoolB.id);
    const subjectB = await createTestSubject(schoolB.id);

    const { error } = await supabase
      .from('timetable_entries')
      .insert({
        school_id: schoolB.id,
        class_id: classB.id,
        subject_id: subjectB.id,
        teacher_id: teacherA.id,
        academic_year_id: 'year_id',
        term_id: 'term_id',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
      });

    expect(error).toBeTruthy();
  });
});

describe('Timetable Feature - Conflict Detection', () => {
  let school: any;
  let teacher: any;

  beforeAll(async () => {
    school = await createTestSchool('conflict_school');
    teacher = await createTestTeacher(school.id);
    await subscribeToFeature(school.id, 'timetable');
  });

  afterAll(async () => {
    await cleanupTestSchool(school.id);
  });

  it('Detects teacher conflict when teacher has overlapping classes', async () => {
    await loginAsUser(teacher.id);

    const class1 = await createTestClass(school.id);
    const class2 = await createTestClass(school.id);
    const subject = await createTestSubject(school.id);
    const academicYear = await createAcademicYear(school.id);
    const term = await createTerm(school.id, academicYear.id);

    // Create first entry
    await supabase
      .from('timetable_entries')
      .insert({
        school_id: school.id,
        class_id: class1.id,
        subject_id: subject.id,
        teacher_id: teacher.id,
        academic_year_id: academicYear.id,
        term_id: term.id,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
      });

    // Create overlapping entry for same teacher
    const { data, error } = await supabase
      .from('timetable_entries')
      .insert({
        school_id: school.id,
        class_id: class2.id,
        subject_id: subject.id,
        teacher_id: teacher.id,
        academic_year_id: academicYear.id,
        term_id: term.id,
        day_of_week: 1,
        start_time: '09:30',
        end_time: '10:30',
      });

    // Should succeed but create conflict record
    expect(error).toBeNull();

    // Check for conflict
    const conflicts = await supabase
      .from('timetable_conflicts')
      .select('*')
      .eq('school_id', school.id);

    expect(conflicts.data.length).toBeGreaterThan(0);
  });

  it('Detects room conflict when room is double-booked', async () => {
    await loginAsUser(teacher.id);

    const class1 = await createTestClass(school.id);
    const class2 = await createTestClass(school.id);
    const subject = await createTestSubject(school.id);
    const academicYear = await createAcademicYear(school.id);
    const term = await createTerm(school.id, academicYear.id);

    // Create first entry
    await supabase
      .from('timetable_entries')
      .insert({
        school_id: school.id,
        class_id: class1.id,
        subject_id: subject.id,
        teacher_id: teacher.id,
        academic_year_id: academicYear.id,
        term_id: term.id,
        day_of_week: 2,
        start_time: '09:00',
        end_time: '10:00',
        room_number: 'Room 101',
      });

    // Create overlapping entry for same room
    const { data, error } = await supabase
      .from('timetable_entries')
      .insert({
        school_id: school.id,
        class_id: class2.id,
        subject_id: subject.id,
        teacher_id: teacher.id,
        academic_year_id: academicYear.id,
        term_id: term.id,
        day_of_week: 2,
        start_time: '09:30',
        end_time: '10:30',
        room_number: 'Room 101',
      });

    expect(error).toBeNull();

    // Check for room conflict
    const conflicts = await supabase
      .from('timetable_conflicts')
      .select('*')
      .eq('school_id', school.id)
      .eq('conflict_type', 'room_conflict');

    expect(conflicts.data.length).toBeGreaterThan(0);
  });
});

describe('Timetable Feature - Role-Based Access', () => {
  let school: any;
  let admin: any;
  let teacher: any;
  let student: any;

  beforeAll(async () => {
    school = await createTestSchool('rbac_school');
    admin = await createTestAdmin(school.id);
    teacher = await createTestTeacher(school.id);
    student = await createTestStudent(school.id);
    await subscribeToFeature(school.id, 'timetable');
  });

  afterAll(async () => {
    await cleanupTestSchool(school.id);
  });

  it('School admin has full access to timetable entries', async () => {
    await loginAsUser(admin.id);

    const { data, error } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('school_id', school.id);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('Teacher can view timetable for their classes', async () => {
    await loginAsUser(teacher.id);

    const classId = await createTestClass(school.id);
    await assignTeacherToClass(teacher.id, classId);

    const { data, error } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('class_id', classId);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('Student can view timetable for their class', async () => {
    await loginAsUser(student.id);

    const classId = await createTestClass(school.id);
    await assignStudentToClass(student.id, classId);

    const subject = await createTestSubject(school.id);
    const academicYear = await createAcademicYear(school.id);
    const term = await createTerm(school.id, academicYear.id);

    await supabase
      .from('timetable_entries')
      .insert({
        school_id: school.id,
        class_id: classId,
        subject_id: subject.id,
        academic_year_id: academicYear.id,
        term_id: term.id,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
      });

    const { data, error } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('class_id', classId);

    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });
});

describe('Timetable Feature - Lifecycle', () => {
  let school: any;
  let admin: any;

  beforeAll(async () => {
    school = await createTestSchool('lifecycle_school');
    admin = await createTestAdmin(school.id);
  });

  afterAll(async () => {
    await cleanupTestSchool(school.id);
  });

  it('Feature not subscribed - returns error', async () => {
    await loginAsUser(admin.id);

    const { error } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('school_id', school.id);

    expect(error).toBeTruthy();
  });

  it('Feature paused - returns error', async () => {
    await subscribeToFeature(school.id, 'timetable');
    await pauseFeature(school.id, 'timetable');

    await loginAsUser(admin.id);

    const { error } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('school_id', school.id);

    expect(error).toBeTruthy();
  });

  it('Feature active - allows access', async () => {
    await activateFeature(school.id, 'timetable');

    await loginAsUser(admin.id);

    const { data, error } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('school_id', school.id);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('Timetable Feature - CRUD Operations', () => {
  let school: any;
  let teacher: any;

  beforeAll(async () => {
    school = await createTestSchool('crud_school');
    teacher = await createTestTeacher(school.id);
    await subscribeToFeature(school.id, 'timetable');
  });

  afterAll(async () => {
    await cleanupTestSchool(school.id);
  });

  it('Create timetable entry - success', async () => {
    await loginAsUser(teacher.id);

    const classId = await createTestClass(school.id);
    const subjectId = await createTestSubject(school.id);
    const academicYearId = await createAcademicYear(school.id);
    const termId = await createTerm(school.id, academicYearId);

    const { data, error } = await supabase
      .from('timetable_entries')
      .insert({
        school_id: school.id,
        class_id: classId,
        subject_id: subjectId,
        teacher_id: teacher.id,
        academic_year_id: academicYearId,
        term_id: termId,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('Read timetable entry - success', async () => {
    await loginAsUser(teacher.id);

    const entry = await createTestTimetableEntry(school.id, teacher.id);

    const { data, error } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('id', entry.id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('Update timetable entry - success', async () => {
    await loginAsUser(teacher.id);

    const entry = await createTestTimetableEntry(school.id, teacher.id);

    const { data, error } = await supabase
      .from('timetable_entries')
      .update({ start_time: '10:00', end_time: '11:00' })
      .eq('id', entry.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.start_time).toBe('10:00:00');
  });

  it('Delete timetable entry - success', async () => {
    await loginAsUser(teacher.id);

    const entry = await createTestTimetableEntry(school.id, teacher.id);

    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('id', entry.id);

    expect(error).toBeNull();
  });
});

// Helper functions
async function createTestSchool(name: string) {
  const { data } = await supabase
    .from('schools')
    .insert({ name, subdomain: name })
    .select()
    .single();
  return data;
}

async function createTestTeacher(schoolId: string) {
  const { data } = await supabase
    .from('staff_profiles')
    .insert({
      school_id: schoolId,
      first_name: 'Test',
      last_name: 'Teacher',
      email: `teacher@${schoolId}.com`,
    })
    .select()
    .single();
  
  // Create profile
  await supabase
    .from('profiles')
    .insert({
      id: data.id,
      email: data.email,
      full_name: `${data.first_name} ${data.last_name}`,
      staff_id: data.id,
    });
  
  return data;
}

async function createTestStudent(schoolId: string) {
  const { data } = await supabase
    .from('students')
    .insert({
      school_id: schoolId,
      admission_number: 'TEST001',
      full_name: 'Test Student',
    })
    .select()
    .single();
  return data;
}

async function createTestAdmin(schoolId: string) {
  const { data } = await supabase
    .from('profiles')
    .insert({ email: `admin@${schoolId}.com`, full_name: 'Test Admin' })
    .select()
    .single();
  return data;
}

async function loginAsUser(userId: string) {
  await supabase.auth.setSession({
    access_token: 'mock_token',
    refresh_token: 'mock_refresh',
    user: { id: userId } as any,
  });
}

async function subscribeToFeature(schoolId: string, featureCode: string) {
  await supabase
    .from('school_modules')
    .insert({
      school_id: schoolId,
      feature_code: featureCode,
      status: 'active',
    });
}

async function pauseFeature(schoolId: string, featureCode: string) {
  await supabase
    .from('school_modules')
    .update({ status: 'paused' })
    .eq('school_id', schoolId)
    .eq('feature_code', featureCode);
}

async function activateFeature(schoolId: string, featureCode: string) {
  await supabase
    .from('school_modules')
    .update({ status: 'active' })
    .eq('school_id', schoolId)
    .eq('feature_code', featureCode);
}

async function cleanupTestSchool(schoolId: string) {
  await supabase.from('schools').delete().eq('id', schoolId);
}

async function createTestClass(schoolId: string) {
  const gradeId = await createTestGrade(schoolId);
  const academicYearId = await createAcademicYear(schoolId);
  const { data } = await supabase
    .from('classes')
    .insert({
      school_id: schoolId,
      grade_id: gradeId,
      academic_year_id: academicYearId,
      name: 'Test Class',
    })
    .select()
    .single();
  return data.id;
}

async function createTestGrade(schoolId: string) {
  const { data } = await supabase
    .from('grades')
    .insert({ school_id: schoolId, name: 'Grade 1', level: 1 })
    .select()
    .single();
  return data.id;
}

async function createTestSubject(schoolId: string) {
  const { data } = await supabase
    .from('subjects')
    .insert({ school_id: schoolId, name: 'Math', code: 'MATH' })
    .select()
    .single();
  return data.id;
}

async function createAcademicYear(schoolId: string) {
  const { data } = await supabase
    .from('academic_years')
    .insert({ school_id: schoolId, name: '2026' })
    .select()
    .single();
  return data.id;
}

async function createTerm(schoolId: string, academicYearId: string) {
  const { data } = await supabase
    .from('terms')
    .insert({
      school_id: schoolId,
      academic_year_id: academicYearId,
      name: 'Term 1',
      start_date: '2026-01-01',
      end_date: '2026-04-30',
    })
    .select()
    .single();
  return data.id;
}

async function assignTeacherToClass(teacherId: string, classId: string) {
  await supabase.from('classes').update({ class_teacher_id: teacherId }).eq('id', classId);
}

async function assignStudentToClass(studentId: string, classId: string) {
  await supabase.from('students').update({ class_id: classId }).eq('id', studentId);
}

async function createTestTimetableEntry(schoolId: string, teacherId: string) {
  const classId = await createTestClass(schoolId);
  const subjectId = await createTestSubject(schoolId);
  const academicYearId = await createAcademicYear(schoolId);
  const termId = await createTerm(schoolId, academicYearId);

  const { data } = await supabase
    .from('timetable_entries')
    .insert({
      school_id: schoolId,
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId,
      academic_year_id: academicYearId,
      term_id: termId,
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:00',
    })
    .select()
    .single();
  return data;
}
