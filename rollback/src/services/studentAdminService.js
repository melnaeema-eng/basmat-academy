import { supabase } from '../lib/supabase';

export async function getStudentsAdmin() {
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'admin')
    .order('created_at', { ascending: false });

  if (pError) throw pError;

  const ids = (profiles || []).map(p => p.id);
  if (!ids.length) return [];

  const [{ data: enrollments, error: eError }, { data: payments, error: payError }] = await Promise.all([
    supabase.from('enrollments').select('*, courses(id,title)').in('user_id', ids),
    supabase.from('payments').select('*, courses(id,title)').in('user_id', ids).order('created_at', { ascending: false }),
  ]);

  if (eError) throw eError;
  if (payError) throw payError;

  return (profiles || []).map(profile => ({
    ...profile,
    enrollments: (enrollments || []).filter(e => e.user_id === profile.id),
    payments: (payments || []).filter(p => p.user_id === profile.id),
  }));
}
