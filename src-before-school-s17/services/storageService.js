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

export async function uploadSchoolBookFile(file) {
  if (!file) return null;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const filePath = `books/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("school-books")
    .upload(filePath, file, { upsert: false });

  if (error) throw error;

  const { data } = supabase.storage
    .from("school-books")
    .getPublicUrl(filePath);

  return {
    url: data.publicUrl,
    path: filePath,
    size: file.size,
    mime_type: file.type || null,
  };
}

export async function uploadSchoolBookCover(file) {
  if (!file) return null;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const filePath = `covers/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("school-books")
    .upload(filePath, file, { upsert: false });

  if (error) throw error;

  const { data } = supabase.storage
    .from("school-books")
    .getPublicUrl(filePath);

  return {
    url: data.publicUrl,
    path: filePath,
  };
}
