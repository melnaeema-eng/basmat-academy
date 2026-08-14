import { supabase } from "./supabase";

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user || null;
}

export async function getEnrollment(courseId, userId) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function enrollInCourse(courseId, userId) {
  const { data, error } = await supabase
    .from("enrollments")
    .insert({ course_id: courseId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMyEnrollments(userId) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("id, status, progress, enrolled_at, course_id, courses(*)")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
