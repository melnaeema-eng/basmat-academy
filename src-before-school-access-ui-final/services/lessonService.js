import { supabase } from './supabase';

export async function getLessonsByCourse(courseId, { includeUnpublished = false } = {}) {
  let query = supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_number', { ascending: true });

  if (!includeUnpublished) query = query.eq('is_published', true);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createLesson(lesson) {
  const { data, error } = await supabase
    .from('lessons')
    .insert(lesson)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLesson(id, lesson) {
  const { data, error } = await supabase
    .from('lessons')
    .update(lesson)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLesson(id) {
  const { error } = await supabase.from('lessons').delete().eq('id', id);
  if (error) throw error;
}

export async function getLessonProgress(userId, courseId) {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed_at, lessons!inner(course_id)')
    .eq('user_id', userId)
    .eq('lessons.course_id', courseId);

  if (error) throw error;
  return data ?? [];
}

export async function setLessonCompleted({ lessonId, userId, completed }) {
  if (completed) {
    const { error } = await supabase
      .from('lesson_progress')
      .upsert(
        { lesson_id: lessonId, user_id: userId, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_id' }
      );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('lesson_progress')
      .delete()
      .eq('lesson_id', lessonId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}

export async function updateEnrollmentProgress(courseId, userId, progress) {
  const { error } = await supabase
    .from('enrollments')
    .update({ progress })
    .eq('course_id', courseId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function uploadLessonVideo({ courseId, file }) {
  if (!file) throw new Error('اختر ملف فيديو أولاً');
  const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
  if (!isMp4) throw new Error('يسمح حاليًا بملفات MP4 فقط');

  const maxBytes = 50 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error('حجم الفيديو أكبر من 50MB');

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');
  const path = `${courseId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from('course-videos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'video/mp4',
    });

  if (error) throw error;

  const { data } = supabase.storage.from('course-videos').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function deleteLessonVideo(path) {
  if (!path) return;
  const { error } = await supabase.storage.from('course-videos').remove([path]);
  if (error) throw error;
}
