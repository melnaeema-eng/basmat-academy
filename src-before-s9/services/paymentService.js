import { supabase } from "./supabase";

export async function createBankTransferPayment({ course, user, file, bankReference = "" }) {
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");
  if (!course?.id) throw new Error("بيانات الدورة غير مكتملة");
  if (!file) throw new Error("يرجى إرفاق إيصال التحويل");

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = `${crypto.randomUUID()}.${ext}`;
  const receiptPath = `${user.id}/${course.id}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-receipts")
    .upload(receiptPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) throw uploadError;

  const amount = Number(course.price || 0);

  const { data, error } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      course_id: course.id,
      method: "bank_transfer",
      amount,
      currency: "SAR",
      status: "pending",
      receipt_path: receiptPath,
      bank_reference: bankReference.trim() || null,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from("payment-receipts").remove([receiptPath]);
    throw error;
  }

  return data;
}

export async function getMyPayments(userId, courseId) {
  if (!userId) return [];

  let query = supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAdminPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("*, courses(id,title,price)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createReceiptSignedUrl(path) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from("payment-receipts")
    .createSignedUrl(path, 300);

  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function approveBankPayment(paymentId) {
  const { data, error } = await supabase.rpc("approve_bank_payment", {
    p_payment_id: paymentId,
  });

  if (error) throw error;
  return data;
}

export async function rejectBankPayment(paymentId, note = "") {
  const { data, error } = await supabase.rpc("reject_bank_payment", {
    p_payment_id: paymentId,
    p_note: note || null,
  });

  if (error) throw error;
  return data;
}

export async function createPayPalOrder(courseId) {
  const { data, error } = await supabase.functions.invoke("create-paypal-order", {
    body: { courseId },
  });

  if (error) throw error;
  if (!data?.id) throw new Error(data?.error || "تعذر إنشاء طلب PayPal");
  return data.id;
}

export async function capturePayPalOrder(orderId) {
  const { data, error } = await supabase.functions.invoke("capture-paypal-order", {
    body: { orderId },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "تعذر تأكيد دفع PayPal");
  return data;
}
