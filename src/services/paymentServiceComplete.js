import { supabase } from './supabase';

export async function getMyLatestCoursePayment(courseId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getMyPayments() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('*, courses(id,title,price)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createBankTransferPayment({ courseId, amount, receiptUrl, reference }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('يجب تسجيل الدخول');

  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: session.user.id,
      course_id: courseId,
      amount,
      method: 'bank_transfer',
      status: 'pending',
      receipt_url: receiptUrl,
      transaction_reference: reference || null,
      rejection_reason: null,
      reviewed_at: null,
      reviewed_by: null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approvePayment(payment) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('يجب تسجيل الدخول');

  const { data: updated, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      rejection_reason: null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id,
    })
    .eq('id', payment.id)
    .select()
    .single();

  if (error) throw error;

  const { error: enrollError } = await supabase
    .from('enrollments')
    .upsert({
      user_id: payment.user_id,
      course_id: payment.course_id,
      status: 'active',
      progress: 0,
    }, { onConflict: 'user_id,course_id' });

  if (enrollError) throw enrollError;

  await supabase.from('notifications').insert({
    user_id: payment.user_id,
    title: 'تم اعتماد الدفع',
    message: 'تم قبول إيصال الدفع وأصبحت الدورة متاحة لك.',
    type: 'payment_approved',
    related_payment_id: payment.id,
    related_course_id: payment.course_id,
  });

  return updated;
}

export async function rejectPayment(payment, reason) {
  const cleanReason = reason?.trim();
  if (!cleanReason) throw new Error('سبب الرفض مطلوب');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('يجب تسجيل الدخول');

  const { data: updated, error } = await supabase
    .from('payments')
    .update({
      status: 'rejected',
      rejection_reason: cleanReason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id,
    })
    .eq('id', payment.id)
    .select()
    .single();

  if (error) throw error;

  await supabase.from('notifications').insert({
    user_id: payment.user_id,
    title: 'تم رفض إيصال الدفع',
    message: `سبب الرفض: ${cleanReason}`,
    type: 'payment_rejected',
    related_payment_id: payment.id,
    related_course_id: payment.course_id,
  });

  return updated;
}
