import { supabase } from "./supabase";

export async function getCurrentUser() {
  // Read the current session first. This avoids calling the Auth API
  // for anonymous visitors, which otherwise returns HTTP 401.
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  return data.session?.user ?? null;
}

export async function getEnrollment(courseId, userId) {
  if (!userId) return null;

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
  if (!userId) {
    throw new Error("You must sign in before enrolling.");
  }

  const { data, error } = await supabase
    .from("enrollments")
    .insert({ course_id: courseId, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMyEnrollments(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("enrollments")
    .select("id, status, progress, enrolled_at, course_id, courses(*)")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
