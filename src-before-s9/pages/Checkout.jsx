import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaBuildingColumns, FaCreditCard, FaPaypal, FaShieldHalved, FaUpload } from "react-icons/fa6";
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
  const { i18n } = useTranslation();
  const ar = i18n.language?.startsWith("ar");
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
  const [rejectedPayment, setRejectedPayment] = useState(null);
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
        const rejected = previous.find((p) => p.status === "rejected" && p.method === "bank_transfer");
        setPendingPayment(pending || null);
        setRejectedPayment(pending ? null : (rejected || null));
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
      setRejectedPayment(null);
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
      <main className="min-h-screen bg-[#f7f9fc] py-10" dir={ar ? "rtl" : "ltr"}><div className="academy-container max-w-6xl">
        <div className="grid gap-7 lg:grid-cols-[1fr_380px]">
          <section className="academy-card p-5 md:p-7">
            <h1 className="academy-title mb-2 text-3xl">{ar ? "إتمام التسجيل والدفع" : "Checkout & Enrollment"}</h1>
            <p className="mb-6 text-slate-600">{ar ? "اختر وسيلة الدفع المناسبة. لن يتم فتح الدورة المدفوعة قبل تأكيد الدفع." : "Choose your payment method. Paid course access opens only after payment confirmation."}</p>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("bank_transfer")}
                className={`rounded-xl border p-4 text-right font-bold ${method === "bank_transfer" ? "border-orange-500 bg-orange-50" : "border-slate-200"}`}
              >
                <span className="flex items-center gap-2"><FaBuildingColumns />{ar ? "تحويل بنكي — الراجحي" : "Al Rajhi Bank Transfer"}</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("paypal")}
                className={`rounded-xl border p-4 text-right font-bold ${method === "paypal" ? "border-orange-500 bg-orange-50" : "border-slate-200"}`}
              >
                <span className="flex items-center gap-2"><FaPaypal />PayPal</span>
              </button>
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-500 sm:col-span-2">
                <div className="flex items-center gap-2 font-bold text-slate-700"><FaCreditCard />{ar ? "mada / Cards / STC Pay" : "mada / Cards / STC Pay"}</div>
                <p className="mt-1 text-xs">{ar ? "جاهزة للتفعيل عند استلام بيانات Merchant Gateway من البنك." : "Ready to activate when Merchant Gateway credentials are available."}</p>
              </div>
            </div>

            {method === "bank_transfer" && (
              <div>
                {pendingPayment ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
                    <h2 className="font-bold text-amber-900">{ar ? "تم استلام طلب التحويل" : "Transfer request received"}</h2>
                    <p className="mt-2 text-sm text-amber-800">{ar ? "الحالة: بانتظار مراجعة الإدارة. بعد الموافقة ستظهر الدورة تلقائيًا في «دوراتي»." : "Status: awaiting admin review. After approval, the course will appear automatically in My Courses."}</p>
                  </div>
                ) : (
                  <>
                    {rejectedPayment && (
                      <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-5 text-red-900">
                        <h2 className="font-bold">{ar ? "تم رفض الإيصال السابق" : "Previous receipt was rejected"}</h2>
                        <p className="mt-2 text-sm">{ar ? "السبب: " : "Reason: "}{rejectedPayment.admin_note || (ar ? "لم يتم تسجيل سبب الرفض" : "No rejection reason recorded")}</p>
                        <p className="mt-2 text-sm font-semibold">{ar ? "يمكنك رفع إيصال جديد الآن، وسيبقى الإيصال السابق محفوظًا." : "You can upload a new receipt now; the previous attempt remains in history."}</p>
                      </div>
                    )}
                    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-8">
                      <div><b>{ar ? "البنك" : "Bank"}:</b> {bankName}</div>
                      <div><b>{ar ? "اسم الحساب" : "Account Name"}:</b> {accountName || (ar ? "يُضاف في ملف .env" : "Set in .env")}</div>
                      <div><b>IBAN:</b> <span dir="ltr">{iban || (ar ? "يُضاف في ملف .env" : "Set in .env")}</span></div>
                      <div><b>{ar ? "رقم الحساب" : "Account Number"}:</b> <span dir="ltr">{accountNumber || (ar ? "يُضاف في ملف .env" : "Set in .env")}</span></div>
                      <div><b>{ar ? "المبلغ المطلوب" : "Amount Due"}:</b> <span dir="ltr">{amount.toFixed(2)} SAR</span></div>
                    </div>

                    <form onSubmit={submitBankTransfer} className="space-y-4">
                      <label className="block">
                        <span className="mb-2 block font-semibold">{ar ? "رقم مرجع التحويل (اختياري)" : "Transfer Reference (optional)"}</span>
                        <input
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          className="w-full rounded-lg border p-3"
                          placeholder={ar ? "مثال: رقم العملية من تطبيق البنك" : "Example: bank transaction reference"}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block font-semibold">{ar ? "إيصال التحويل *" : "Transfer Receipt *"}</span>
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
                        {submitting ? (ar ? "جاري الإرسال..." : "Submitting...") : (ar ? "إرسال الإيصال للمراجعة" : "Submit Receipt for Review")}
                      </button>
                      <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-6 text-emerald-800"><FaShieldHalved className="mt-1 shrink-0"/><span>{ar ? "بيانات الدفع والمراجعة محفوظة داخل النظام، ولا يتم فتح الدورة قبل اعتماد العملية." : "Payment review is recorded securely; course access is not opened before approval."}</span></div>
                    </form>
                  </>
                )}
              </div>
            )}

            {method === "paypal" && (
              <div>
                {!paypalClientId ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
                    {ar ? "PayPal جاهز في النظام لكنه يحتاج" : "PayPal is ready in the system but requires"} <b>VITE_PAYPAL_CLIENT_ID</b> {ar ? "ومفاتيح PayPal Sandbox في Supabase قبل ظهوره." : "and PayPal Sandbox secrets in Supabase before it can be used."}
                  </div>
                ) : (
                  <>
                    <div ref={paypalContainer} className="min-h-12" />
                    {submitting && <p className="mt-3 text-sm">{ar ? "جاري تأكيد الدفع..." : "Confirming payment..."}</p>}
                  </>
                )}
                {paypalError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">{paypalError}</p>}
              </div>
            )}

            {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
          </section>

          <aside className="h-fit rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">{ar ? "ملخص الطلب" : "Order Summary"}</h2>
            {course?.image && <img src={course.image} alt={course.title} className="mb-4 aspect-video w-full rounded-xl object-cover" />}
            <div className="font-bold text-slate-900">{course?.title}</div>
            <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold">
              <span>{ar ? "الإجمالي" : "Total"}</span>
              <span dir="ltr">{amount.toFixed(2)} SAR</span>
            </div>
          </aside>
        </div>
      </div></main>
    </MainLayout>
  );
}
