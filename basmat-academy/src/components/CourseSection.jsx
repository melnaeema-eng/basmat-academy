import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CourseCard from "./CourseCard";
import { getCourses } from "../services/courseService";

export default function CourseSection() {
  const { t } = useTranslation();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setError("");

        const data = await getCourses();
        setCourses(data || []);
      } catch (err) {
        console.error(err);
        setError(t("home.coursesSection.loadError"));
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, [t]);

  return (
    <section className="py-20 bg-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center text-blue-700 mb-12">
          {t("home.coursesSection.title")}
        </h2>

        {loading && (
          <p className="text-center text-gray-600">
            {t("home.coursesSection.loading")}
          </p>
        )}

        {!loading && error && (
          <p className="text-center text-red-600">{error}</p>
        )}

        {!loading && !error && courses.length === 0 && (
          <p className="text-center text-gray-600">
            {t("home.coursesSection.empty")}
          </p>
        )}

        {!loading && !error && courses.length > 0 && (
          <div className="grid md:grid-cols-3 gap-8">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}