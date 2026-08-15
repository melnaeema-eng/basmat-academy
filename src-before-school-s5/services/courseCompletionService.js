import { supabase } from "./supabase";

/**
 * A certificate is the definitive completion record for a course.
 * Once issued, the learner keeps read-only/review access to course content,
 * while exam retakes are blocked by the UI.
 */
export async function getCertifiedCourseIds(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("certificates")
    .select("course_id")
    .eq("user_id", userId);
  if (error) throw error;
  return [...new Set((data || []).map(x => x.course_id).filter(Boolean))];
}

export async function hasCourseCertificate(userId, courseId) {
  if (!userId || !courseId) return false;
  const { data, error } = await supabase
    .from("certificates")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}
