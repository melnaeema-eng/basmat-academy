import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

export default function Dashboard() {
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [studentsResult, coursesResult] = await Promise.all([
        supabase
          .from("students")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("courses")
          .select("*", { count: "exact", head: true }),
      ]);

      if (studentsResult.error) {
        throw studentsResult.error;
      }

      if (coursesResult.error) {
        throw coursesResult.error;
      }

      setStats({
        students: studentsResult.count ?? 0,
        courses: coursesResult.count ?? 0,
      });
    } catch (error) {
      console.error("Dashboard statistics error:", error);

      setErrorMessage(
        error.message || "حدث خطأ أثناء تحميل إحصائيات لوحة التحكم"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            لوحة التحكم
          </h1>

          <p className="text-gray-500 mt-2">
            نظرة عامة على بيانات الأكاديمية
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboardStats}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg disabled:opacity-60"
        >
          {loading ? "جاري التحديث..." : "تحديث"}
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 bg-red-100 text-red-700 rounded-lg p-4">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-medium">
                إجمالي الطلاب
              </p>

              <h2 className="text-4xl font-bold text-gray-800 mt-3">
                {loading ? "..." : stats.students}
              </h2>
            </div>

            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-2xl">
              👨‍🎓
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-5">
            العدد الفعلي من جدول students
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-medium">
                إجمالي الدورات
              </p>

              <h2 className="text-4xl font-bold text-gray-800 mt-3">
                {loading ? "..." : stats.courses}
              </h2>
            </div>

            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">
              📚
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-5">
            العدد الفعلي من جدول courses
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-medium">
                المدربون
              </p>

              <h2 className="text-4xl font-bold text-gray-800 mt-3">
                0
              </h2>
            </div>

            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
              👨‍🏫
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-5">
            سيتم ربطه لاحقًا
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-medium">
                التسجيلات
              </p>

              <h2 className="text-4xl font-bold text-gray-800 mt-3">
                0
              </h2>
            </div>

            <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
              📝
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-5">
            سيتم ربطه عند إنشاء جدول التسجيلات
          </p>
        </div>
      </div>
    </div>
  );
}