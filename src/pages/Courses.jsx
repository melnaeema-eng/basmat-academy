import MainLayout from "../layouts/MainLayout";
import CourseSection from "../components/CourseSection";
import { useTranslation } from "react-i18next";

export default function Courses() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <span className="font-semibold text-orange-600">
              {t("courses.badge")}
            </span>

            <h1 className="mt-3 text-4xl font-bold text-gray-900">
              {t("courses.title")}
            </h1>

            <p className="mx-auto mt-4 max-w-2xl leading-8 text-gray-600">
              {t("courses.description")}
            </p>
          </div>

          <CourseSection />
        </div>
      </section>
    </MainLayout>
  );
}