import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainLayout from "../layouts/MainLayout";
import { getCurrentUser, getMyEnrollments } from "../services/enrollmentService";

export default function MyCourses() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        if (!user) return;
        setItems(await getMyEnrollments(user.id));
      } catch (error) {
        console.error("MY COURSES ERROR:", error);
        setErrorMessage(isArabic ? "تعذر تحميل دوراتك" : "Could not load your courses");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isArabic]);

  return (
    <MainLayout>
      <main dir={i18n.dir()} className="mx-auto min-h-screen max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isArabic ? "دوراتي" : "My Courses"}
          </h1>
          <p className="mt-2 text-gray-500">
            {isArabic ? "الدورات التي سجلت فيها" : "Courses you are enrolled in"}
          </p>
        </div>

        {loading && <p className="text-gray-500">{isArabic ? "جاري التحميل..." : "Loading..."}</p>}
        {errorMessage && <div className="rounded-xl bg-red-50 p-4 text-red-700">{errorMessage}</div>}

        {!loading && !errorMessage && items.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              {isArabic ? "لم تسجل في أي دورة بعد" : "You have not enrolled in any course yet"}
            </h2>
            <Link to="/courses" className="mt-5 inline-block rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600">
              {isArabic ? "استعرض الدورات" : "Browse Courses"}
            </Link>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((enrollment) => {
            const course = enrollment.courses;
            if (!course) return null;
            const title = (isArabic ? course.title_ar : course.title_en) || course.title || (isArabic ? "دورة" : "Course");

            return (
              <article key={enrollment.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <img src={course.image || "https://placehold.co/600x360?text=Course"} alt={title} className="h-48 w-full object-cover" />
                <div className="p-5">
                  <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                  <div className="mt-4">
                    <div className="mb-2 flex justify-between text-sm text-gray-500">
                      <span>{isArabic ? "التقدم" : "Progress"}</span>
                      <span>{enrollment.progress ?? 0}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full bg-orange-500" style={{ width: `${enrollment.progress ?? 0}%` }} />
                    </div>
                  </div>
                  <Link to={`/courses/${course.id}`} className="mt-5 inline-block w-full rounded-xl bg-blue-700 px-5 py-3 text-center font-bold text-white hover:bg-blue-800">
                    {isArabic ? "فتح الدورة" : "Open Course"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </MainLayout>
  );
}
