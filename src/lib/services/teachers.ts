/**
 * Service: teachers — aligned to real schema.
 * teachers table: id, school_id, user_id, full_name, email, phone, created_at
 */
import { supabase } from "@/lib/supabase/client";

export interface Teacher {
  id: string;
  school_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export async function fetchTeachers(schoolId: string, search?: string): Promise<Teacher[]> {
  let query = supabase
    .from("teachers")
    .select("id, school_id, user_id, full_name, email, phone, created_at")
    .eq("school_id", schoolId)
    .order("full_name");

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Teacher[];
}

export async function fetchTeacherById(teacherId: string): Promise<Teacher> {
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", teacherId)
    .single();

  if (error) throw error;
  return data as Teacher;
}

export async function createTeacher(
  schoolId: string,
  payload: Omit<Teacher, "id" | "school_id" | "created_at">
) {
  const { data, error } = await supabase
    .from("teachers")
    .insert({ ...payload, school_id: schoolId })
    .select()
    .single();

  if (error) throw error;
  return data as Teacher;
}
