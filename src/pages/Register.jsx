import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!form.fullName.trim()) {
      setErrorMessage("يرجى إدخال الاسم الكامل");
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage("يرجى إدخال البريد الإلكتروني");
      return;
    }

    if (form.password.length < 6) {
      setErrorMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("كلمتا المرور غير متطابقتين");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            role: "student",
          },
        },
      });

      console.log("SIGNUP DATA:", data);
      console.log("SIGNUP ERROR:", error);

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("لم يتم إنشاء المستخدم");
      }

      setMessage(
        "تم إنشاء الحساب بنجاح. سيتم تحويلك إلى صفحة تسجيل الدخول."
      );

      setForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("REGISTER ERROR:", error);

      if (
        error.message?.toLowerCase().includes("already registered") ||
        error.message?.toLowerCase().includes("already exists")
      ) {
        setErrorMessage("هذا البريد الإلكتروني مسجل مسبقًا");
      } else {
        setErrorMessage(
          error.message || "حدث خطأ أثناء إنشاء الحساب"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-100 flex items-center justify-center px-4"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          إنشاء حساب جديد
        </h1>

        <p className="text-gray-500 text-center mb-6">
          التسجيل في أكاديمية بصمة النوابغ
        </p>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-100 text-red-700 p-3">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg bg-green-100 text-green-700 p-3">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              الاسم الكامل
            </label>

            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="اكتب الاسم الكامل"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">
              البريد الإلكتروني
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="example@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">
              كلمة المرور
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="6 أحرف على الأقل"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">
              تأكيد كلمة المرور
            </label>

            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="أعد كتابة كلمة المرور"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold disabled:opacity-60"
          >
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          لديك حساب بالفعل؟{" "}
          <Link
            to="/login"
            className="text-orange-600 font-bold hover:underline"
          >
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}