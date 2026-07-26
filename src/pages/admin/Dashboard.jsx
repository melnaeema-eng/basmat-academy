import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabase";

export default function Dashboard() {

  const [courseCount, setCourseCount] = useState(0);

  useEffect(() => {
    loadCount();
  }, []);

  async function loadCount() {
    const { count, error } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true });

    if (!error) {
      setCourseCount(count);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <h1 className="text-4xl font-bold text-blue-700 mb-8">
        لوحة التحكم
      </h1>

      <div className="grid md:grid-cols-3 gap-6">

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-gray-500">عدد الدورات</h2>

          <p className="text-4xl font-bold mt-4">
            {courseCount}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-gray-500">عدد الطلاب</h2>

          <p className="text-4xl font-bold mt-4">
            0
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-gray-500">عدد المدربين</h2>

          <p className="text-4xl font-bold mt-4">
              {courseCount}
          </p>
        </div>

      </div>

      <div className="mt-10 flex gap-4">

        <Link
          to="/admin/add-course"
          className="bg-orange-500 text-white px-6 py-3 rounded-lg"
        >
          ➕ إضافة دورة
        </Link>

        <Link
          to="/admin/courses"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          📚 إدارة الدورات
        </Link>

      </div>

    </div>
  );
}