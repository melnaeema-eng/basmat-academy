import { useEffect, useState } from "react";
import {
  approveBankPayment,
  createReceiptSignedUrl,
  getAdminPayments,
  rejectBankPayment,
} from "../../services/paymentService";

const statusLabel = {
  pending: "قيد المراجعة",
  paid: "مدفوع",
  failed: "فشل",
  rejected: "مرفوض",
  refunded: "مسترد",
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      setPayments(await getAdminPayments());
    } catch (e) {
      console.error("ADMIN PAYMENTS ERROR:", e);
      setError(e.message || "تعذر تحميل المدفوعات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openReceipt(payment) {
    try {
      const url = await createReceiptSignedUrl(payment.receipt_path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e.message);
    }
  }

  async function approve(payment) {
    if (!confirm(`تأكيد استلام مبلغ ${Number(payment.amount).toFixed(2)} ر.س وتسجيل الطالب في الدورة؟`)) return;
    try {
      setBusyId(payment.id);
      await approveBankPayment(payment.id);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(payment) {
    const note = prompt("سبب الرفض (إجباري):", "");
    if (note === null) return;
    if (!note.trim()) {
      alert("يجب كتابة سبب الرفض حتى يظهر للطالب.");
      return;
    }
    try {
      setBusyId(payment.id);
      await rejectBankPayment(payment.id, note);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div>جاري تحميل المدفوعات...</div>;

  return (
    <div dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">المدفوعات</h1>
          <p className="mt-1 text-slate-600">مراجعة التحويلات البنكية ومتابعة PayPal.</p>
        </div>
        <button onClick={load} className="rounded-lg border bg-white px-4 py-2">تحديث</button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-100 text-right">
            <tr>
              <th className="p-3">التاريخ</th>
              <th className="p-3">الدورة</th>
              <th className="p-3">الوسيلة</th>
              <th className="p-3">المبلغ</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">المرجع</th>
              <th className="p-3">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t align-top">
                <td className="p-3">{new Date(payment.created_at).toLocaleString("ar-SA")}</td>
                <td className="p-3 font-semibold">{payment.courses?.title || payment.course_id}</td>
                <td className="p-3">{payment.method === "bank_transfer" ? "تحويل بنكي" : "PayPal"}</td>
                <td className="p-3">{Number(payment.amount).toFixed(2)} {payment.currency}</td>
                <td className="p-3">{statusLabel[payment.status] || payment.status}</td>
                <td className="p-3">{payment.bank_reference || payment.provider_order_id || "—"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {payment.receipt_path && (
                      <button onClick={() => openReceipt(payment)} className="rounded bg-slate-700 px-3 py-1.5 text-white">الإيصال</button>
                    )}
                    {payment.method === "bank_transfer" && payment.status === "pending" && (
                      <>
                        <button disabled={busyId === payment.id} onClick={() => approve(payment)} className="rounded bg-green-600 px-3 py-1.5 text-white disabled:opacity-50">موافقة</button>
                        <button disabled={busyId === payment.id} onClick={() => reject(payment)} className="rounded bg-red-600 px-3 py-1.5 text-white disabled:opacity-50">رفض</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!payments.length && (
              <tr><td colSpan="7" className="p-8 text-center text-slate-500">لا توجد عمليات دفع بعد.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
