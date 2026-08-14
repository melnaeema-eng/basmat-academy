import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./ar.json";
import en from "./en.json";

const savedLanguage = localStorage.getItem("language") || "ar";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        translation: ar,
      },
      en: {
        translation: en,
      },
    },
    lng: savedLanguage,
    fallbackLng: "ar",
    interpolation: {
      escapeValue: false,
    },
  });

function updateDocumentDirection(language) {
  const isArabic = language === "ar";

  document.documentElement.lang = language;
  document.documentElement.dir = isArabic ? "rtl" : "ltr";
}

updateDocumentDirection(savedLanguage);

i18n.on("languageChanged", (language) => {
  localStorage.setItem("language", language);
  updateDocumentDirection(language);
});

export default i18n;