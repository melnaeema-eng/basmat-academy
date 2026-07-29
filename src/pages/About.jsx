import MainLayout from "../layouts/MainLayout";

export default function About() {
  return (
    <MainLayout>
      <section className="bg-gray-50 py-20" dir="rtl">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="font-semibold text-orange-600">من نحن</span>

            <h1 className="mt-3 text-4xl font-bold text-gray-900">
              أكاديمية بصمة النوابغ
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-gray-600">
              منصة تدريب تقنية متخصصة في الاتصالات، الشبكات، الأمن السيبراني،
              الذكاء الاصطناعي، الحوسبة السحابية ومراكز البيانات. نقدم محتوى
              تدريبيًا عمليًا يساعد المتدربين على اكتساب المهارات المطلوبة في
              سوق العمل.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">رؤيتنا</h2>
              <p className="mt-4 leading-8 text-gray-600">
                أن نكون منصة تدريب تقنية رائدة في المملكة العربية السعودية
                والمنطقة.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">رسالتنا</h2>
              <p className="mt-4 leading-8 text-gray-600">
                تقديم تدريب عملي واحترافي يربط المعرفة النظرية بالتطبيقات
                الواقعية.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">قيمنا</h2>
              <p className="mt-4 leading-8 text-gray-600">
                الجودة، الاحترافية، الابتكار، المصداقية والتطوير المستمر.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}