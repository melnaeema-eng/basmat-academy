import { supabase } from "./supabase";

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

export async function getEnrollment(userId, courseId) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function enrollInCourse(userId, courseId) {
  const { data, error } = await supabase
    .from("enrollments")
    .insert({ user_id: userId, course_id: courseId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMyEnrollments(userId) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("id, status, progress, enrolled_at, completed_at, course_id, courses(*)")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
