import { useTranslation } from "react-i18next";

export default function CourseCard({ course }) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition">
      <div className="h-48 overflow-hidden">
        <img
          src={
            course.image ||
            "https://placehold.co/600x400?text=Course"
          }
          alt={course.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-bold">
          {course.title}
        </h3>

        <p className="text-gray-500 mt-2">
          {course.category}
        </p>

        <p className="mt-4">
          👨‍🏫 {course.instructor}
        </p>

        <div className="flex justify-between items-center mt-6">
          <span className="text-orange-600 font-bold text-xl">
            {course.price ? `${course.price} ر.س` : t("course.free")}
          </span>

          <button className="bg-blue-700 text-white px-4 py-2 rounded-lg">
            {t("course.details")}
          </button>
        </div>
      </div>
    </div>
  );
}