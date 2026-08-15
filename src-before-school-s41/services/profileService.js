import { supabase } from './supabase';

export async function getMyProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) throw error;
  return { ...data, auth_email: session.user.email };
}

export async function updateMyProfile(values) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('يجب تسجيل الدخول');
  const payload = {
    full_name: values.full_name?.trim() || null,
    phone: values.phone?.trim() || null,
    city: values.city?.trim() || null,
    bio: values.bio?.trim() || null,
    avatar_url: values.avatar_url || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('profiles').update(payload).eq('id', session.user.id).select().single();
  if (error) throw error;
  return data;
}

export async function uploadProfileAvatar(file) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('يجب تسجيل الدخول');
  if (!file) throw new Error('اختر صورة');
  if (!file.type?.startsWith('image/')) throw new Error('الملف يجب أن يكون صورة');
  if (file.size > 3 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 3MB');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('profile-avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('profile-avatars').getPublicUrl(path);
  return data.publicUrl;
}
