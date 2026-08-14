import { supabase } from "./supabase";

export async function uploadCourseImage(file) {
  if (!file) return null;

  const fileExt = file.name.split(".").pop();

  const fileName = `${Date.now()}.${fileExt}`;

  const filePath = `courses/${fileName}`;

  const { error } = await supabase.storage
    .from("course-images")
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("course-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}