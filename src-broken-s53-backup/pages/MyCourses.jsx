import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { getCurrentUser, getMyEnrollments } from "../services/enrollmentService";

export default function MyCourses() {
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [items, setItems] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        if (!user) { setNeedsLogin(true); return; }
        setItems(await getMyEnrollments(user.id));
      } catch (error) {
        console.error("MY COURSES ERROR:", error);
        setErrorMessage(error.message || "تعذر تحميل دوراتك");
      } finally { setLoading(false); }
    }
    load();
  }, []);

  if (needsLogin) return <Navigate to="/login" replace />;

  return (
    <MainLayout>
      <main dir="rtl" className="min-h-screen bg-[#f7f9fc] px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900">دوراتي</h1>
          <p className="mt-2 text-gray-500">الدورات التي سجلت بها</p>
          {loading && <p className="mt-8">جاري التحميل...</p>}
          {errorMessage && <div className="mt-8 rounded-xl bg-red-100 p-4 text-red-700">{errorMessage}</div>}
          {!loading && !errorMessage && items.length === 0 && (
            <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
              <p>لم تسجل في أي دورة بعد.</p>
              <Link to="/courses" className="mt-4 inline-block rounded-lg bg-orange-500 px-5 py-2 font-semibold text-white">تصفح الدورات</Link>
            </div>
          )}
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const course = item.courses;
              if (!course) return null;
              return (
                <article key={item.id} className="overflow-hidden academy-card-sm">
                  <img src={course.image || "https://placehold.co/600x360?text=Course"} alt={course.title || "Course"} className="h-48 w-full object-cover" />
                  <div className="p-5">
                    <h2 className="text-xl font-bold text-gray-900">{course.title_ar || course.title || course.title_en || "دورة"}</h2>
                    <p className="mt-3 text-sm text-gray-500">التقدم: {item.progress ?? 0}%</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full bg-orange-500" style={{ width: `${item.progress ?? 0}%` }} /></div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {(course.course_type || "recorded") === "recorded" ? (
                        <Link to={`/learn/${course.id}`} className="inline-block rounded-lg bg-[#08284d] px-4 py-2 font-semibold text-white">ابدأ التعلم</Link>
                      ) : (
                        <Link to={`/courses/${course.id}`} className="inline-block rounded-lg bg-[#08284d] px-4 py-2 font-semibold text-white">فتح الدورة</Link>
                      )}
                      <Link to={`/exams/${course.id}`} className="inline-block rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white">الاختبارات</Link>
                      <Link to={`/completion/${course.id}`} className="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white">الإكمال</Link>
                      {(item.progress ?? 0) === 100 && <Link to="/certificates" className="inline-block rounded-lg bg-green-600 px-4 py-2 font-semibold text-white">الشهادة</Link>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
