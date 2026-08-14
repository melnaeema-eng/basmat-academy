import MainLayout from "../layouts/MainLayout";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-6">

          <div className="text-center mb-12">
            <span className="font-semibold text-orange-600">
              {t("contact.badge")}
            </span>

            <h1 className="mt-3 text-4xl font-bold text-gray-900">
              {t("contact.title")}
            </h1>

            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              {t("contact.description")}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">

            <div className="bg-white rounded-2xl shadow p-8">
              <h2 className="text-2xl font-bold mb-6">
                {t("contact.info")}
              </h2>

              <div className="space-y-4 text-gray-700">
                <p>📧 info@basmat-alnawabig.com.sa</p>
                <p>📞 <span dir="ltr" className="inline-block">+966 53 480 7359</span></p>
                <p>📍 Riyadh, Saudi Arabia</p>
              </div>
              
            </div>
<div className="mt-10">
  <iframe
    title="Basmat Alnawabigh Location"
    src="https://www.google.com/maps?q=24.5826244,46.640055&z=18&output=embed"
    width="100%"
    height="450"
    style={{ border: 0 }}
    allowFullScreen
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
    className="rounded-2xl shadow-lg"
  ></iframe>
</div>
            <div className="bg-white rounded-2xl shadow p-8">
              <h2 className="text-2xl font-bold mb-6">
                {t("contact.sendMessage")}
              </h2>

              <form className="space-y-4">

                <input
                  type="text"
                  placeholder={t("contact.name")}
                  className="w-full rounded-lg border p-3"
                />

                <input
                  type="email"
                  placeholder={t("contact.email")}
                  className="w-full rounded-lg border p-3"
                />

                <textarea
                  rows="5"
                  placeholder={t("contact.message")}
                  className="w-full rounded-lg border p-3"
                />

                <button
                  className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition"
                >
                  {t("contact.send")}
                </button>

              </form>
            </div>

          </div>
        </div>
      </section>
    </MainLayout>
  );
}