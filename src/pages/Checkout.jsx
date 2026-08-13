import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../services/supabase";
import { getCurrentUser, getEnrollment } from "../services/enrollmentService";
import {
  capturePayPalOrder,
  createBankTransferPayment,
  createPayPalOrder,
  getMyPayments,
} from "../services/paymentService";

function loadPayPalSdk(clientId) {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve(window.paypal);
      return;
    }

    const existing = document.querySelector('script[data-basmat-paypal="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.paypal));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=SAR&intent=capture`;
    script.async = true;
    script.dataset.basmatPaypal = "true";
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error("تعذر تحميل PayPal SDK"));
    document.head.appendChild(script);
  });
}

export default function Checkout() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const paypalContainer = useRef(null);
  const paypalRendered = useRef(false);

  const [course, setCourse] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [receipt, setReceipt] = useState(null);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [paypalError, setPaypalError] = useState("");

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const bankName = import.meta.env.VITE_BANK_NAME || "مصرف الراجحي";
  const accountName = import.meta.env.VITE_BANK_ACCOUNT_NAME || "";
  const iban = import.meta.env.VITE_BANK_IBAN || "";
  const accountNumber = import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "";

  const amount = useMemo(() => Number(course?.price || 0), [course]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const currentUser = await getCurrentUser();
        if (!currentUser) {
          navigate("/login", { state: { from: `/checkout/${courseId}` } });
          return;
        }
        setUser(currentUser);

        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        const existingEnrollment = await getEnrollment(courseId, currentUser.id);
        if (existingEnrollment) {
          navigate("/my-courses", { replace: true });
          return;
        }

        if (Number(courseData.price || 0) <= 0) {
          navigate(`/courses/${courseId}`, { replace: true });
          return;
        }

        const previous = await getMyPayments(currentUser.id, courseId);
        const pending = previous.find((p) => p.status === "pending" && p.method === "bank_transfer");
        setPendingPayment(pending || null);
      } catch (e) {
        console.error("CHECKOUT LOAD ERROR:", e);
        setError(e.message || "تعذر تحميل صفحة الدفع");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [courseId, navigate]);

  useEffect(() => {
    if (method !== "paypal") {
      paypalRendered.current = false;
      return;
    }
    if (!paypalClientId || !course || !user || paypalRendered.current) return;

    let cancelled = false;

    async function renderButtons() {
      try {
        setPaypalError("");
        const paypal = await loadPayPalSdk(paypalClientId);
        if (cancelled || !paypalContainer.current) return;

        paypalContainer.current.innerHTML = "";
        await paypal.Buttons({
          createOrder: async () => createPayPalOrder(course.id),
          onApprove: async (data) => {
            setSubmitting(true);
            try {
              await capturePayPalOrder(data.orderID);
              navigate("/my-courses", { replace: true });
            } catch (e) {
              console.error("PAYPAL CAPTURE ERROR:", e);
              setPaypalError(e.message || "تمت الموافقة في PayPal لكن تعذر تأكيد العملية");
            } finally {
              setSubmitting(false);
            }
          },
          onCancel: () => setPaypalError("تم إلغاء عملية PayPal"),
          onError: (e) => {
            console.error("PAYPAL ERROR:", e);
            setPaypalError("حدث خطأ في PayPal. حاول مرة أخرى.");
          },
        }).render(paypalContainer.current);

        paypalRendered.current = true;
      } catch (e) {
        console.error("PAYPAL SDK ERROR:", e);
        setPaypalError(e.message || "تعذر تشغيل PayPal");
      }
    }

    renderButtons();
    return () => {
      cancelled = true;
    };
  }, [method, paypalClientId, course, user, navigate]);

  async function submitBankTransfer(e) {
    e.preventDefault();
    if (!receipt || !course || !user) return;

    try {
      setSubmitting(true);
      setError("");
      const payment = await createBankTransferPayment({
        course,
        user,
        file: receipt,
        bankReference: reference,
      });
      setPendingPayment(payment);
      setReceipt(null);
      setReference("");
    } catch (e) {
      console.error("BANK PAYMENT ERROR:", e);
      setError(e.message || "تعذر إرسال طلب التحويل البنكي");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <MainLayout><div className="mx-auto max-w-4xl p-8">جاري تحميل الدفع...</div></MainLayout>;
  }

  if (error && !course) {
    return <MainLayout><div className="mx-auto max-w-4xl p-8 text-red-600">{error}</div></MainLayout>;
  }

  return (
    <MainLayout>
      <main className="mx-auto max-w-5xl px-4 py-10" dir="rtl">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h1 className="mb-2 text-3xl font-bold text-slate-900">إتمام التسجيل والدفع</h1>
            <p className="mb-6 text-slate-600">اختر وسيلة الدفع المناسبة. لن يتم فتح الدورة المدفوعة قبل تأكيد الدفع.</p>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("bank_transfer")}
                className={`rounded-xl border p-4 text-right font-bold ${method === "bank_transfer" ? "border-orange-500 bg-orange-50" : "border-slate-200"}`}
              >
                🏦 تحويل بنكي — الراجحي
              </button>
              <button
                type="button"
                onClick={() => setMethod("paypal")}
                className={`rounded-xl border p-4 text-right font-bold ${method === "paypal" ? "border-orange-500 bg-orange-50" : "border-slate-200"}`}
              >
                PayPal
              </button>
            </div>

            {method === "bank_transfer" && (
              <div>
                {pendingPayment ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
                    <h2 className="font-bold text-amber-900">تم استلام طلب التحويل</h2>
                    <p className="mt-2 text-sm text-amber-800">الحالة: بانتظار مراجعة الإدارة. بعد الموافقة ستظهر الدورة تلقائيًا في «دوراتي».</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-5 rounded-xl bg-slate-50 p-5 text-sm leading-8">
                      <div><b>البنك:</b> {bankName}</div>
                      <div><b>اسم الحساب:</b> {accountName || "يُضاف في ملف .env"}</div>
                      <div><b>IBAN:</b> {iban || "يُضاف في ملف .env"}</div>
                      <div><b>رقم الحساب:</b> {accountNumber || "يُضاف في ملف .env"}</div>
                      <div><b>المبلغ المطلوب:</b> {amount.toFixed(2)} ر.س</div>
                    </div>

                    <form onSubmit={submitBankTransfer} className="space-y-4">
                      <label className="block">
                        <span className="mb-2 block font-semibold">رقم مرجع التحويل (اختياري)</span>
                        <input
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          className="w-full rounded-lg border p-3"
                          placeholder="مثال: رقم العملية من تطبيق البنك"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block font-semibold">إيصال التحويل *</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                          className="w-full rounded-lg border p-3"
                          required
                        />
                      </label>

                      <button
                        disabled={submitting}
                        className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-50"
                      >
                        {submitting ? "جاري الإرسال..." : "إرسال الإيصال للمراجعة"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {method === "paypal" && (
              <div>
                {!paypalClientId ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
                    PayPal جاهز في النظام لكنه يحتاج <b>VITE_PAYPAL_CLIENT_ID</b> ومفاتيح PayPal Sandbox في Supabase قبل ظهوره.
                  </div>
                ) : (
                  <>
                    <div ref={paypalContainer} className="min-h-12" />
                    {submitting && <p className="mt-3 text-sm">جاري تأكيد الدفع...</p>}
                  </>
                )}
                {paypalError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">{paypalError}</p>}
              </div>
            )}

            {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
          </section>

          <aside className="h-fit rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">ملخص الطلب</h2>
            {course?.image && <img src={course.image} alt={course.title} className="mb-4 aspect-video w-full rounded-xl object-cover" />}
            <div className="font-bold text-slate-900">{course?.title}</div>
            <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold">
              <span>الإجمالي</span>
              <span>{amount.toFixed(2)} ر.س</span>
            </div>
          </aside>
        </div>
      </main>
    </MainLayout>
  );
}
