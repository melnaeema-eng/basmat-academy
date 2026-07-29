import MainLayout from "../layouts/MainLayout";
import CourseSection from "../components/CourseSection";

export default function Courses() {
  return (
    <MainLayout>
      <section className="bg-gray-50 py-16" dir="rtl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <span className="font-semibold text-orange-600">تعلم وتطور</span>

            <h1 className="mt-3 text-4xl font-bold text-gray-900">
              دوراتنا التدريبية
            </h1>

            <p className="mx-auto mt-4 max-w-2xl leading-8 text-gray-600">
              اختر الدورة المناسبة وابدأ تطوير مهاراتك التقنية مع محتوى عملي
              ومدربين متخصصين.
            </p>
          </div>

          <CourseSection />
        </div>
      </section>
    </MainLayout>
  );
}