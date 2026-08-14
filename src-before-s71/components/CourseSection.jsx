import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CourseCard from "./CourseCard";
import { getCourses } from "../services/courseService";

export default function CourseSection() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCourses()
      .then((data) => setCourses(data || []))
      .catch((err) => setError(err.message || t("courseDetails.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <section className="academy-section bg-[#f7f9fc]">
      <div className="academy-container">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="academy-eyebrow">{t("homeV2.featured")}</span>
            <h2 className="academy-title mt-3 text-3xl">{t("homeV2.featuredTitle")}</h2>
          </div>
          <Link to="/courses" className="font-extrabold text-[#16865a] hover:text-[#f97316]">
            {t("common.browse")} →
          </Link>
        </div>

        {loading ? (
          <div className="academy-card p-8 text-center">{t("common.loading")}</div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-5 text-red-700">{error}</div>
        ) : courses.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        ) : (
          <div className="academy-card p-8 text-center text-slate-500">{t("common.noResults")}</div>
        )}
      </div>
    </section>
  );
}
