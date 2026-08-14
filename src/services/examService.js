import { supabase } from './supabase';

export async function getPublishedExamsForCourse(courseId) {
  const { data, error } = await supabase.from('exams').select('id,course_id,title,description,passing_score,max_attempts,is_final,is_published,duration_minutes,randomize_questions,show_answers_after_submit,created_at').eq('course_id', courseId).eq('is_published', true).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function getExamForStudent(examId) {
  const { data, error } = await supabase.rpc('get_exam_for_student', { p_exam_id: examId });
  if (error) throw error;
  return data;
}

export async function submitExam(examId, answers) {
  const { data, error } = await supabase.rpc('submit_exam_attempt', { p_exam_id: examId, p_answers: answers });
  if (error) throw error;
  return data;
}

export async function getMyExamAttempts(courseId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase.from('exam_attempts').select('*, exams!inner(id,course_id,title,passing_score)').eq('user_id', session.user.id).eq('exams.course_id', courseId).order('submitted_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminGetExams(courseId) {
  const { data, error } = await supabase.from('exams').select('*, exam_questions(*)').eq('course_id', courseId).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function adminCreateExam(payload) {
  const { data, error } = await supabase.from('exams').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function adminUpdateExam(id, payload) {
  const { data, error } = await supabase.from('exams').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function adminDeleteExam(id) {
  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) throw error;
}

export async function adminAddQuestion(payload) {
  const { data, error } = await supabase.from('exam_questions').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function adminDeleteQuestion(id) {
  const { error } = await supabase.from('exam_questions').delete().eq('id', id);
  if (error) throw error;
}

export async function adminGetAttempts(courseId) {
  const { data, error } = await supabase.from('exam_attempts').select('*, exams!inner(id,course_id,title)').eq('exams.course_id', courseId).order('submitted_at', { ascending: false });
  if (error) throw error;
  const attempts = data || [];
  const ids = [...new Set(attempts.map((x) => x.user_id))];
  if (!ids.length) return attempts;
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id,full_name,email').in('id', ids);
  if (profileError) throw profileError;
  const map = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  return attempts.map((a) => ({ ...a, profiles: map[a.user_id] || null }));
}
