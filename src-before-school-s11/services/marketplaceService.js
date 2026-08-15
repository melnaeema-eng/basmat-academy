import { supabase } from "./supabase";

export async function getCourseReviews(courseId) {
  const { data, error } = await supabase.rpc("get_course_reviews_public", { p_course_id: courseId });
  if (error) throw error;
  return data || [];
}

export async function getMyReview(courseId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase
    .from("course_reviews")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveMyReview(courseId, rating, reviewText) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("LOGIN_REQUIRED");
  const { data, error } = await supabase
    .from("course_reviews")
    .upsert({
      user_id: session.user.id,
      course_id: courseId,
      rating: Number(rating),
      review_text: reviewText?.trim() || null,
      is_published: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,course_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function isCourseWishlisted(courseId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;
  const { data, error } = await supabase
    .from("course_wishlist")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function toggleWishlist(courseId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("LOGIN_REQUIRED");
  const userId = session.user.id;
  const { data: existing, error: readError } = await supabase
    .from("course_wishlist")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (readError) throw readError;

  if (existing) {
    const { error } = await supabase.from("course_wishlist").delete().eq("id", existing.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("course_wishlist").insert({ user_id: userId, course_id: courseId });
  if (error) throw error;
  return true;
}

export async function getMyWishlist() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase
    .from("course_wishlist")
    .select("id,created_at,courses(*)")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
