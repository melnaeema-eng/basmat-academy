import { Link, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function AdminLayout() {
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  return (
    <div className="flex min-h-screen">

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white">

        <div className="p-6 text-2xl font-bold border-b border-slate-700">
          بصمة النوابغ
        </div>

        <nav className="p-4 space-y-2">

          <Link
            to="/admin/dashboard"
            className="block p-3 rounded hover:bg-slate-700"
          >
            📊 لوحة التحكم
          </Link>

          <Link
            to="/admin/courses"
            className="block p-3 rounded hover:bg-slate-700"
          >
            📚 إدارة الدورات
          </Link>

          <Link
            to="/admin/add-course"
            className="block p-3 rounded hover:bg-slate-700"
          >
            ➕ إضافة دورة
          </Link>

          <Link
            to="/admin/students"
            className="block p-3 rounded hover:bg-slate-700"
          >
            👨‍🎓 إدارة الطلاب
          </Link>

          <Link
            to="/admin/payments"
            className="block p-3 rounded hover:bg-slate-700"
          >
            💳 المدفوعات
          </Link>

          <Link
            to="/admin/certificates"
            className="block p-3 rounded hover:bg-slate-700"
          >
            🏆 الشهادات
          </Link>

          <Link
            to="/"
            className="block p-3 rounded hover:bg-slate-700"
          >
            🌐 الموقع الرئيسي
          </Link>

          <button
            onClick={logout}
            className="w-full mt-8 bg-red-600 text-white py-2 rounded hover:bg-red-700"
          >
            تسجيل الخروج
          </button>

        </nav>

      </aside>

      {/* Content */}
      <main className="flex-1 bg-gray-100 p-8">
        <Outlet />
      </main>

    </div>
  );
}