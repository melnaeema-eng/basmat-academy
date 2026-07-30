import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function CourseCard({ course }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const isArabic = i18n.language === "ar";

  const title =
    (isArabic ? course.title_ar : course.title_en) ||
    course.title ||
    t("course.untitled");

  const category =
    (isArabic ? course.category_ar : course.category_en) ||
    course.category ||
    "";

  function handleDetails() {
    navigate(`/courses/${course.id}`);
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition">
      <div className="h-48 overflow-hidden">
        <img
          src={
            course.image ||
            "https://placehold.co/600x400?text=Course"
          }
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-800">
          {title}
        </h3>

        {category && (
          <p className="text-gray-500 mt-2">
            {category}
          </p>
        )}

        {course.instructor && (
          <p className="mt-4 text-gray-700">
            👨‍🏫 {course.instructor}
          </p>
        )}

        <div className="flex justify-between items-center gap-4 mt-6">
          <span className="text-orange-600 font-bold text-xl">
            {Number(course.price) > 0
              ? `${course.price} ${t("course.currency")}`
              : t("course.free")}
          </span>

          <button
            type="button"
            onClick={handleDetails}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition"
          >
            {t("course.details")}
          </button>
        </div>
      </div>
    </div>
  );
}