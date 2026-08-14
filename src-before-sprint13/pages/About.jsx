import MainLayout from "../layouts/MainLayout";
import { useTranslation } from "react-i18next";

export default function About() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="font-semibold text-orange-600">
              {t("about.badge")}
            </span>

            <h1 className="mt-3 text-4xl font-bold text-gray-900">
              {t("about.title")}
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-gray-600">
              {t("about.description")}
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                {t("about.vision.title")}
              </h2>

              <p className="mt-4 leading-8 text-gray-600">
                {t("about.vision.description")}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                {t("about.mission.title")}
              </h2>

              <p className="mt-4 leading-8 text-gray-600">
                {t("about.mission.description")}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                {t("about.values.title")}
              </h2>

              <p className="mt-4 leading-8 text-gray-600">
                {t("about.values.description")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}