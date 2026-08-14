import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { getCourseById } from "../../services/adminCourseService";
import { supabase } from "../../services/supabase";

export default function ViewCourse() {
  const { i18n } = useTranslation();
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [stats, setStats] = useState({
    lessons: 0,
    exams: 0,
    enrollments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCourse();
  }, [id]);

  async function loadCourse() {
    try {
      setLoading(true);
      setError("");

      const courseData = await getCourseById(id);
      setCourse(courseData);

      const [lessonsResult, examsResult, enrollmentsResult] =
        await Promise.all([
          supabase
            .from("lessons")
            .select("id", { count: "exact", head: true })
            .eq("course_id", id),

          supabase
            .from("exams")
            .select("id", { count: "exact", head: true })
            .eq("course_id", id),

          supabase
            .from("enrollments")
            .select("id", { count: "exact", head: true })
            .eq("course_id", id),
        ]);

      setStats({
        lessons: lessonsResult.count || 0,
        exams: examsResult.count || 0,
        enrollments: enrollmentsResult.count || 0,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "تعذر تحميل تفاصيل الدورة");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-xl">
        جاري تحميل تفاصيل الدورة...
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-red-700">
        {error || "الدورة غير موجودة"}
      </div>
    );
  }

  const typeLabel =
    course.course_type === "live"
      ? "Live"
      : course.course_type === "hybrid"
        ? "Hybrid"
        : "Recorded";

  return (
    <div dir={i18n.language?.startsWith("ar") ? "rtl" : "ltr"} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#08284d]">
            {course.title}
          </h1>
          <p className="mt-1 text-gray-500">
            عرض وإدارة تفاصيل الدورة
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/edit-course/${course.id}`}
            className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
          >
            ✏️ تعديل
          </Link>

          <Link
            to={`/admin/courses/${course.id}/lessons`}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            📚 الدروس
          </Link>

          <Link
            to={`/admin/courses/${course.id}/exams`}
            className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            📝 الاختبارات
          </Link>

          <Link
            to="/admin/courses"
            className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
          >
            ← الدورات
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <img
              src={
                course.image ||
                "https://placehold.co/800x450?text=Course"
              }
              alt={course.title}
              className="aspect-video w-full object-cover"
            />

            <div className="space-y-3 p-5 text-sm">
              <Info label="المدرب" value={course.instructor || "—"} />
              <Info label="التصنيف" value={course.category || "—"} />
              <Info label="المستوى" value={course.level || "—"} />
              <Info label="المدة" value={course.duration || "—"} />
              <Info label="نوع الدورة" value={typeLabel} />
              <Info
                label="السعر"
                value={
                  Number(course.price || 0) > 0
                    ? `${course.price} ر.س`
                    : "مجاني"
                }
              />
              <Info
                label="الحالة"
                value={course.status || "Published"}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="الدروس" value={stats.lessons} icon="📚" />
            <StatCard title="الاختبارات" value={stats.exams} icon="📝" />
            <StatCard title="التسجيلات" value={stats.enrollments} icon="👨‍🎓" />
          </div>

          <div className="academy-card p-6">
            <h2 className="mb-3 text-xl font-bold">وصف الدورة</h2>
            <p className="whitespace-pre-line leading-8 text-gray-700">
              {course.description || "لا يوجد وصف للدورة."}
            </p>
          </div>

          <div className="academy-card p-6">
            <h2 className="mb-4 text-xl font-bold">إدارة محتوى الدورة</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to={`/admin/courses/${course.id}/lessons`}
                className="rounded-xl border p-4 hover:bg-green-50"
              >
                <div className="font-bold">📚 إدارة الدروس</div>
                <div className="mt-1 text-sm text-gray-500">
                  إضافة الفيديوهات والنصوص والملفات وترتيب الدروس.
                </div>
              </Link>

              <Link
                to={`/admin/courses/${course.id}/exams`}
                className="rounded-xl border p-4 hover:bg-purple-50"
              >
                <div className="font-bold">📝 إدارة الاختبارات</div>
                <div className="mt-1 text-sm text-gray-500">
                  إنشاء الاختبارات والأسئلة ودرجات النجاح.
                </div>
              </Link>

              <Link
                to={`/courses/${course.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border p-4 hover:bg-blue-50"
              >
                <div className="font-bold">🌐 معاينة صفحة الطالب</div>
                <div className="mt-1 text-sm text-gray-500">
                  فتح صفحة الدورة العامة كما يراها الطالب.
                </div>
              </Link>

              <Link
                to={`/admin/edit-course/${course.id}`}
                className="rounded-xl border p-4 hover:bg-orange-50"
              >
                <div className="font-bold">✏️ تعديل بيانات الدورة</div>
                <div className="mt-1 text-sm text-gray-500">
                  تعديل السعر والصورة والمدرب والنوع والوصف.
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-sm text-gray-500">{title}</div>
      <div className="mt-1 text-3xl font-bold text-[#08284d]">
        {value}
      </div>
    </div>
  );
}