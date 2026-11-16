import { supabase } from "./supabase";

export async function uploadCourseImage(file) {
  if (!file) return null;

  const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  if(!types[file.type])throw new Error('اختر صورة JPG أو PNG أو WebP / Choose JPG, PNG or WebP');
  if(file.size>5*1024*1024)throw new Error('الحد الأقصى 5MB / Maximum 5MB');
  const filePath = `courses/${crypto.randomUUID()}.${types[file.type]}`;

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
