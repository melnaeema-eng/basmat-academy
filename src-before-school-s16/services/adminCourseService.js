import { supabase } from "./supabase";

export async function getAllCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function getCourseById(id) {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function updateCourse(id, course) {
  const { error } = await supabase
    .from("courses")
    .update(course)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteCourse(id) {
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id);

  if (error) throw error;
}