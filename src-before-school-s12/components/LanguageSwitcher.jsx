import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaGlobe, FaChevronDown, FaCheck } from "react-icons/fa";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const currentLanguage = i18n.language?.startsWith("en") ? "en" : "ar";

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function changeLanguage(language) {
    await i18n.changeLanguage(language);
    setOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-orange-500 transition-colors"
        aria-label={t("navbar.language")}
      >
        <FaGlobe />

        <span className="hidden md:inline">
          {currentLanguage === "ar"
            ? t("navbar.arabic")
            : t("navbar.english")}
        </span>

        <FaChevronDown
          className={`text-xs transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute end-0 mt-3 w-44 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50">
          <button
            type="button"
            onClick={() => changeLanguage("ar")}
            className="w-full flex items-center justify-between px-4 py-3 text-slate-700 hover:bg-orange-50 hover:text-orange-600"
          >
            <span>العربية</span>
            {currentLanguage === "ar" && <FaCheck />}
          </button>

          <button
            type="button"
            onClick={() => changeLanguage("en")}
            className="w-full flex items-center justify-between px-4 py-3 text-slate-700 hover:bg-orange-50 hover:text-orange-600"
          >
            <span>English</span>
            {currentLanguage === "en" && <FaCheck />}
          </button>
        </div>
      )}
    </div>
  );
}