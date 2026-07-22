/**
 * School Setup Service
 * Handles saving and loading school configuration data
 */

import { supabase } from "@/lib/supabase/client";

export interface SetupData {
  grades: Array<{
    id: string;
    name: string;
    level: number;
    classes: Array<{
      id: string;
      name: string;
      maxPupils: number;
    }>;
  }>;
  feeTypes: Array<{
    id: string;
    name: string;
    amount: number;
    frequency: "monthly" | "termly" | "annual";
    dueDay?: number;
    isMandatory: boolean;
  }>;
  staffTypes: Array<{
    id: string;
    name: string;
    baseSalary: number;
    payFrequency: "monthly" | "weekly" | "hourly";
  }>;
  staff: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    staffTypeId: string;
    salary?: number;
  }>;
  pupils: Array<{
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: "male" | "female";
    guardianName?: string;
    guardianPhone?: string;
    guardianEmail?: string;
    classId?: string;
  }>;
}

/**
 * Save complete school setup
 */
export async function saveCompleteSetup(schoolId: string, setupData: SetupData): Promise<void> {
  try {
    // 1. Ensure academic year and term exist
    // Fetch or create academic year
    let academicYearId: string;
    const { data: existingYears, error: yearFetchError } = await supabase
      .from("academic_years")
      .select("id")
      .eq("school_id", schoolId)
      .eq("is_current", true)
      .limit(1);

    if (yearFetchError) throw yearFetchError;

    if (existingYears && existingYears.length > 0) {
      academicYearId = existingYears[0].id;
    } else {
      const { data: newYear, error: yearCreateError } = await supabase
        .from("academic_years")
        .insert({
          school_id: schoolId,
          name: `${new Date().getFullYear()} Academic Year`,
          start_date: `${new Date().getFullYear()}-01-01`,
          end_date: `${new Date().getFullYear()}-12-31`,
          is_current: true,
        } as any)
        .select()
        .single();

      if (yearCreateError) throw yearCreateError;
      if (!newYear) throw new Error("Failed to create academic year");
      academicYearId = (newYear as any).id;
    }

    // Fetch or create term
    let termId: string;
    const { data: existingTerms, error: termFetchError } = await supabase
      .from("terms")
      .select("id")
      .eq("school_id", schoolId)
      .eq("is_current", true)
      .limit(1);

    if (termFetchError) throw termFetchError;

    if (existingTerms && existingTerms.length > 0) {
      termId = existingTerms[0].id;
    } else {
      const { data: newTerm, error: termCreateError } = await supabase
        .from("terms")
        .insert({
          school_id: schoolId,
          academic_year_id: academicYearId,
          name: "Term 1",
          start_date: `${new Date().getFullYear()}-01-01`,
          end_date: `${new Date().getFullYear()}-04-30`,
          is_current: true,
        } as any)
        .select()
        .single();

      if (termCreateError) throw termCreateError;
      if (!newTerm) throw new Error("Failed to create term");
      termId = (newTerm as any).id;
    }

    // 2. Clear existing records to ensure idempotent setup rerun
    await supabase.from("students").delete().eq("school_id", schoolId);
    await supabase.from("staff").delete().eq("school_id", schoolId);
    await supabase.from("staff_types").delete().eq("school_id", schoolId);
    await supabase.from("fee_structures").delete().eq("school_id", schoolId);
    await supabase.from("fee_categories").delete().eq("school_id", schoolId);
    await supabase.from("classes").delete().eq("school_id", schoolId);
    await supabase.from("grades").delete().eq("school_id", schoolId);

    // 3. Save Grades & Classes and track ID mappings
    const classIdMap = new Map<string, string>(); // clientClassId -> dbClassId
    const dbGradeIds: string[] = [];

    for (const grade of setupData.grades) {
      const { data: gradeData, error: gradeError } = await supabase
        .from("grades")
        .insert({
          school_id: schoolId,
          name: grade.name,
          level: grade.level,
        } as any)
        .select()
        .single();

      if (gradeError) throw gradeError;
      if (!gradeData) throw new Error("Failed to create grade");
      dbGradeIds.push((gradeData as any).id);

      if (grade.classes && grade.classes.length > 0) {
        for (const cls of grade.classes) {
          const { data: classData, error: classError } = await supabase
            .from("classes")
            .insert({
              school_id: schoolId,
              grade_id: (gradeData as any).id,
              academic_year_id: academicYearId,
              name: cls.name,
              capacity: cls.maxPupils,
            } as any)
            .select()
            .single();

          if (classError) throw classError;
          if (!classData) throw new Error("Failed to create class");
          classIdMap.set(cls.id, (classData as any).id);
        }
      }
    }

    // 4. Save Fee Categories & Structures
    for (const fee of setupData.feeTypes) {
      const { data: categoryData, error: categoryError } = await supabase
        .from("fee_categories")
        .insert({
          school_id: schoolId,
          name: fee.name,
          description: `${fee.name} Fee - Frequency: ${fee.frequency}`,
        })
        .select()
        .single();

      if (categoryError) throw categoryError;
      if (!categoryData) throw new Error("Failed to create fee category");

      // Map this fee type to all grades created in the database
      const structuresToInsert = dbGradeIds.map((gradeId) => ({
        school_id: schoolId,
        grade_id: gradeId,
        fee_category_id: (categoryData as any).id,
        term_id: termId,
        amount: fee.amount,
        due_date: fee.frequency === "monthly" 
          ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(fee.dueDay || 1).padStart(2, "0")}`
          : `${new Date().getFullYear()}-04-15`, // Default termly/annual due date
      }));

      const { error: structureError } = await supabase
        .from("fee_structures")
        .insert(structuresToInsert as any[]);

      if (structureError) throw structureError;
    }

    // 5. Save Staff Types and build ID mapping
    const staffTypeIdMap = new Map<string, string>(); // clientStaffTypeId -> dbStaffTypeId

    for (const type of setupData.staffTypes) {
      const { data: typeData, error: typeError } = await supabase
        .from("staff_types")
        .insert({
          school_id: schoolId,
          name: type.name,
          base_salary: type.baseSalary,
          pay_frequency: type.payFrequency,
        })
        .select()
        .single();

      if (typeError) throw typeError;
      if (!typeData) throw new Error("Failed to create staff type");
      staffTypeIdMap.set(type.id, (typeData as any).id);
    }

    // 6. Save Staff Members
    if (setupData.staff && setupData.staff.length > 0) {
      const staffInserts = setupData.staff.map((member) => {
        const dbStaffTypeId = staffTypeIdMap.get(member.staffTypeId);
        if (!dbStaffTypeId) {
          throw new Error(`Failed to resolve database ID for staff type: ${member.staffTypeId}`);
        }
        return {
          school_id: schoolId,
          staff_type_id: dbStaffTypeId,
          first_name: member.firstName,
          last_name: member.lastName,
          email: member.email || null,
          phone: member.phone || null,
          salary: member.salary || null,
          status: "active",
        };
      });

      const { error: staffError } = await supabase.from("staff").insert(staffInserts as any[]);
      if (staffError) throw staffError;
    }

    // 7. Save Pupils (Students)
    if (setupData.pupils && setupData.pupils.length > 0) {
      const pupilInserts = setupData.pupils.map((pupil) => {
        let dbClassId: string | null = null;
        if (pupil.classId) {
          dbClassId = classIdMap.get(pupil.classId) || null;
        }

        // Admission number needs to be unique. We generate one if not provided.
        const admissionNum = `ADM-${String(Math.floor(100000 + Math.random() * 900000))}`;

        return {
          school_id: schoolId,
          class_id: dbClassId,
          admission_number: admissionNum,
          full_name: `${pupil.firstName} ${pupil.lastName}`,
          gender: pupil.gender === "male" ? "M" : "F",
          date_of_birth: pupil.dateOfBirth || null,
          status: "active",
          // Extra columns for convenience
          guardian_name: pupil.guardianName || null,
          guardian_phone: pupil.guardianPhone || null,
          guardian_email: pupil.guardianEmail || null,
        };
      });

      const { error: pupilError } = await supabase.from("students").insert(pupilInserts as any[]);
      if (pupilError) throw pupilError;
    }
  } catch (error) {
    console.error("Error saving setup:", error);
    throw error;
  }
}

/**
 * Load complete school setup (Read-only verification helper)
 */
export async function loadCompleteSetup(schoolId: string): Promise<any> {
  try {
    const { data: grades } = await supabase
      .from("grades")
      .select("*, classes(*)")
      .eq("school_id", schoolId);

    const { data: feeTypes } = await supabase
      .from("fee_categories")
      .select("*")
      .eq("school_id", schoolId);

    const { data: staffTypes } = await supabase
      .from("staff_types")
      .select("*")
      .eq("school_id", schoolId);

    const { data: staff } = await supabase
      .from("staff")
      .select("*")
      .eq("school_id", schoolId);

    const { data: pupils } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId);

    return {
      grades: grades || [],
      feeTypes: feeTypes || [],
      staffTypes: staffTypes || [],
      staff: staff || [],
      pupils: pupils || [],
    };
  } catch (error) {
    console.error("Error loading setup:", error);
    throw error;
  }
}