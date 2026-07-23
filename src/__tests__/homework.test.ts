import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { supabase } from '@/lib/supabase/client';

describe('Homework Feature - School Isolation', () => {
  let schoolA: any;
  let schoolB: any;
  let teacherA: any;
  let teacherB: any;
  let studentA: any;
  let studentB: any;

  beforeAll(async () => {
    // Setup test schools
    schoolA = await createTestSchool('school_a');
    schoolB = await createTestSchool('school_b');

    // Setup teachers
    teacherA = await createTestTeacher(schoolA.id);
    teacherB = await createTestTeacher(schoolB.id);

    // Setup students
    studentA = await createTestStudent(schoolA.id);
    studentB = await createTestStudent(schoolB.id);

    // Subscribe both schools to homework feature
    await subscribeToFeature(schoolA.id, 'homework');
    await subscribeToFeature(schoolB.id, 'homework');
  });

  afterAll(async () => {
    // Cleanup
    await cleanupTestSchool(schoolA.id);
    await cleanupTestSchool(schoolB.id);
  });

  it('School A cannot access School B homework assignments', async () => {
    // Login as School A teacher
    await loginAsUser(teacherA.id);

    // Create assignment in School A
    const assignmentA = await supabase
      .from('homework_assignments')
      .insert({
        school_id: schoolA.id,
        title: 'School A Assignment',
        class_id: 'class_a_id',
        academic_year_id: 'year_id',
        term_id: 'term_id',
        due_date: '2026-02-01',
        assigned_by: teacherA.id,
      })
      .select()
      .single();

    // Try to access School B assignments
    const { data, error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('school_id', schoolB.id);

    // Should return empty due to RLS
    expect(data).toHaveLength(0);
    expect(error).toBeNull();
  });

  it('Teacher can only create assignments for their own school', async () => {
    await loginAsUser(teacherA.id);

    // Try to create assignment for School B
    const { error } = await supabase
      .from('homework_assignments')
      .insert({
        school_id: schoolB.id,
        title: 'Cross-school Assignment',
        class_id: 'class_b_id',
        academic_year_id: 'year_id',
        term_id: 'term_id',
        due_date: '2026-02-01',
        assigned_by: teacherA.id,
      });

    // Should fail due to RLS
    expect(error).toBeTruthy();
  });

  it('Student can only submit to their own school assignments', async () => {
    await loginAsUser(studentA.id);

    // Try to submit to School B assignment
    const { error } = await supabase
      .from('homework_submissions')
      .insert({
        school_id: schoolB.id,
        assignment_id: 'school_b_assignment_id',
        student_id: studentA.id,
        submission_text: 'My submission',
      });

    // Should fail due to RLS
    expect(error).toBeTruthy();
  });
});

describe('Homework Feature - Role-Based Access', () => {
  let school: any;
  let admin: any;
  let teacher: any;
  let student: any;
  let parent: any;

  beforeAll(async () => {
    school = await createTestSchool('test_school');
    admin = await createTestAdmin(school.id);
    teacher = await createTestTeacher(school.id);
    student = await createTestStudent(school.id);
    parent = await createTestParent(school.id);
    await linkParentToStudent(parent.id, student.id);
    await subscribeToFeature(school.id, 'homework');
  });

  afterAll(async () => {
    await cleanupTestSchool(school.id);
  });

  it('School admin has full access to assignments', async () => {
    await loginAsUser(admin.id);

    const { data, error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('school_id', school.id);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('Teacher can view assignments for their classes', async () => {
    await loginAsUser(teacher.id);

    const classId = await createTestClass(school.id);
    await assignTeacherToClass(teacher.id, classId);

    const { data, error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('class_id', classId);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('Student can view published assignments for their class', async () => {
    await loginAsUser(student.id);

    const classId = await createTestClass(school.id);
    await assignStudentToClass(student.id, classId);

    const assignment = await supabase
      .from('homework_assignments')
      .insert({
        school_id: school.id,
        title: 'Test Assignment',
        class_id: classId,
        academic_year_id: 'year_id',
        term_id: 'term_id',
        due_date: '2026-02-01',
        is_published: true,
      })
      .select()
      .single();

    const { data, error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('id', assignment.data.id);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('Student cannot view unpublished assignments', async () => {
    await loginAsUser(student.id);

    const classId = await createTestClass(school.id);
    await assignStudentToClass(student.id, classId);

    const assignment = await supabase
      .from('homework_assignments')
      .insert({
        school_id: school.id,
        title: 'Unpublished Assignment',
        class_id: classId,
        academic_year_id: 'year_id',
        term_id: 'term_id',
        due_date: '2026-02-01',
        is_published: false,
      })
      .select()
      .single();

    const { data, error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('id', assignment.data.id);

    // Should fail due to RLS (unpublished)
    expect(error).toBeTruthy();
  });

  it('Parent can view assignments for their children', async () => {
    await loginAsUser(parent.id);

    const classId = await createTestClass(school.id);
    await assignStudentToClass(student.id, classId);

    const assignment = await supabase
      .from('homework_assignments')
      .insert({
        school_id: school.id,
        title: 'Parent View Assignment',
        class_id: classId,
        academic_year_id: 'year_id',
        term_id: 'term_id',
        due_date: '2026-02-01',
        is_published: true,
      })
      .select()
      .single();

    const { data, error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('id', assignment.data.id);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });
});

describe('Homework Feature - Lifecycle', () => {
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
      .from('homework_assignments')
      .select('*')
      .eq('school_id', school.id);

    // Service layer should return feature not subscribed error
    expect(error).toBeTruthy();
  });

  it('Feature paused - returns error', async () => {
    await subscribeToFeature(school.id, 'homework');
    await pauseFeature(school.id, 'homework');

    await loginAsUser(admin.id);

    const { error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('school_id', school.id);

    // Service layer should return feature paused error
    expect(error).toBeTruthy();
  });

  it('Feature expired - returns error', async () => {
    await expireFeature(school.id, 'homework');

    await loginAsUser(admin.id);

    const { error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('school_id', school.id);

    // Service layer should return feature expired error
    expect(error).toBeTruthy();
  });

  it('Feature active - allows access', async () => {
    await activateFeature(school.id, 'homework');

    await loginAsUser(admin.id);

    const { data, error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('school_id', school.id);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('Homework Feature - CRUD Operations', () => {
  let school: any;
  let teacher: any;
  let student: any;

  beforeAll(async () => {
    school = await createTestSchool('crud_school');
    teacher = await createTestTeacher(school.id);
    student = await createTestStudent(school.id);
    await subscribeToFeature(school.id, 'homework');
  });

  afterAll(async () => {
    await cleanupTestSchool(school.id);
  });

  it('Create assignment - success', async () => {
    await loginAsUser(teacher.id);

    const classId = await createTestClass(school.id);
    const academicYearId = await createAcademicYear(school.id);
    const termId = await createTerm(school.id, academicYearId);

    const { data, error } = await supabase
      .from('homework_assignments')
      .insert({
        school_id: school.id,
        title: 'Test Assignment',
        class_id: classId,
        academic_year_id: academicYearId,
        term_id: termId,
        due_date: '2026-02-01',
        assigned_by: teacher.id,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.title).toBe('Test Assignment');
  });

  it('Read assignment - success', async () => {
    await loginAsUser(teacher.id);

    const assignment = await createTestAssignment(school.id, teacher.id);

    const { data, error } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('id', assignment.id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('Update assignment - success', async () => {
    await loginAsUser(teacher.id);

    const assignment = await createTestAssignment(school.id, teacher.id);

    const { data, error } = await supabase
      .from('homework_assignments')
      .update({ title: 'Updated Title' })
      .eq('id', assignment.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.title).toBe('Updated Title');
  });

  it('Delete assignment - success', async () => {
    await loginAsUser(teacher.id);

    const assignment = await createTestAssignment(school.id, teacher.id);

    const { error } = await supabase
      .from('homework_assignments')
      .delete()
      .eq('id', assignment.id);

    expect(error).toBeNull();
  });

  it('Submit homework - success', async () => {
    await loginAsUser(student.id);

    const assignment = await createTestAssignment(school.id, teacher.id);

    const { data, error } = await supabase
      .from('homework_submissions')
      .insert({
        school_id: school.id,
        assignment_id: assignment.id,
        student_id: student.id,
        submission_text: 'My homework submission',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('Late submission - marked as late', async () => {
    await loginAsUser(student.id);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const assignment = await createTestAssignment(school.id, teacher.id, {
      due_date: pastDate.toISOString().split('T')[0],
    });

    const { data, error } = await supabase
      .from('homework_submissions')
      .insert({
        school_id: school.id,
        assignment_id: assignment.id,
        student_id: student.id,
        submission_text: 'Late submission',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.is_late).toBe(true);
    expect(data.status).toBe('late');
  });

  it('Grade submission - success', async () => {
    await loginAsUser(teacher.id);

    const assignment = await createTestAssignment(school.id, teacher.id);
    const submission = await createTestSubmission(school.id, assignment.id, student.id);

    const { data, error } = await supabase
      .from('homework_submissions')
      .update({
        points_earned: 85,
        points_possible: 100,
        grade: 'A',
        feedback: 'Good work',
        graded_by: teacher.id,
        status: 'graded',
      })
      .eq('id', submission.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.points_earned).toBe(85);
    expect(data.status).toBe('graded');
  });
});

// Helper functions (mock implementations)
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
    .from('profiles')
    .insert({ email: `teacher@${schoolId}.com`, full_name: 'Test Teacher' })
    .select()
    .single();
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

async function createTestParent(schoolId: string) {
  const { data } = await supabase
    .from('profiles')
    .insert({ email: `parent@${schoolId}.com`, full_name: 'Test Parent' })
    .select()
    .single();
  return data;
}

async function loginAsUser(userId: string) {
  // Mock login - in real tests, use supabase.auth.signInWithPassword
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

async function expireFeature(schoolId: string, featureCode: string) {
  await supabase
    .from('school_modules')
    .update({ status: 'expired' })
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
  const { data } = await supabase
    .from('classes')
    .insert({ school_id: schoolId, name: 'Test Class' })
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
    .insert({ school_id: schoolId, academic_year_id: academicYearId, name: 'Term 1' })
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

async function linkParentToStudent(parentId: string, studentId: string) {
  await supabase.from('student_guardians').insert({ student_id: studentId, guardian_id: parentId });
}

async function createTestAssignment(schoolId: string, teacherId: string, overrides: any = {}) {
  const classId = await createTestClass(schoolId);
  const academicYearId = await createAcademicYear(schoolId);
  const termId = await createTerm(schoolId, academicYearId);

  const { data } = await supabase
    .from('homework_assignments')
    .insert({
      school_id: schoolId,
      title: 'Test Assignment',
      class_id: classId,
      academic_year_id: academicYearId,
      term_id: termId,
      due_date: '2026-02-01',
      assigned_by: teacherId,
      ...overrides,
    })
    .select()
    .single();
  return data;
}

async function createTestSubmission(schoolId: string, assignmentId: string, studentId: string) {
  const { data } = await supabase
    .from('homework_submissions')
    .insert({
      school_id: schoolId,
      assignment_id: assignmentId,
      student_id: studentId,
      submission_text: 'Test submission',
    })
    .select()
    .single();
  return data;
}
