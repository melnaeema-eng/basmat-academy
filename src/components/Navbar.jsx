import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaSearch,
  FaUser,
  FaBars,
  FaChevronDown,
  FaBookOpen,
  FaCertificate,
  FaUserCircle,
  FaSignOutAlt,
  FaTachometerAlt,
  FaUsers,
} from "react-icons/fa";

import logo from "../assets/images/logo.png";
import { supabase } from "../services/supabase";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isArabic = i18n.language?.startsWith("ar");

  useEffect(() => {
    getCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);
      setProfile(null);

      if (currentUser) {
        await getProfile(currentUser);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function getCurrentUser() {
    try {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      setUser(currentUser);
      setProfile(null);

      if (currentUser) {
        await getProfile(currentUser);
      }
    } catch (error) {
      console.error("خطأ في قراءة المستخدم:", error.message);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function getProfile(currentUser) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setProfile({
        full_name:
          data?.full_name ||
          currentUser.user_metadata?.full_name ||
          currentUser.email?.split("@")[0] ||
          t("navbar.user"),

        email: data?.email || currentUser.email || "",

        role:
          data?.role ||
          currentUser.user_metadata?.role ||
          "student",
      });
    } catch (error) {
      console.error("خطأ في قراءة الملف الشخصي:", error.message);

      setProfile({
        full_name:
          currentUser.user_metadata?.full_name ||
          currentUser.email?.split("@")[0] ||
          t("navbar.user"),

        email: currentUser.email || "",

        role: currentUser.user_metadata?.role || "student",
      });
    }
  }

 async function handleLogout() {
  try {
    setLoading(true);

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      throw error;
    }

    setUser(null);
    setProfile(null);
    setDropdownOpen(false);
    setMobileMenuOpen(false);

    window.location.replace("/login");
  } catch (error) {
    console.error("خطأ أثناء تسجيل الخروج:", error.message);
    alert(t("navbar.logoutError"));
    setLoading(false);
  }
}

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    t("navbar.user");

  const firstLetter = displayName.trim().charAt(0).toUpperCase();

  const isAdmin = profile?.role === "admin";

  const navLinkClass = ({ isActive }) =>
    isActive
      ? "text-orange-500 font-semibold"
      : "text-slate-700 hover:text-orange-500 transition-colors";

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 min-h-20 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img
            src={logo}
            alt="Basmat Alnawabigh"
            className="w-14 h-14 object-contain"
          />

          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-slate-900">
              {t("navbar.brand")}
            </h1>

            <p className="text-xs text-gray-500">
              Engineering • Technology • Academy
            </p>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          <NavLink to="/" className={navLinkClass}>
            {t("navbar.home")}
          </NavLink>

          <NavLink to="/courses" className={navLinkClass}>
            {t("navbar.courses")}
          </NavLink>

          <NavLink to="/about" className={navLinkClass}>
            {t("navbar.about")}
          </NavLink>

          <NavLink to="/contact" className={navLinkClass}>
            {t("navbar.contact")}
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <button
            type="button"
            aria-label={t("navbar.search")}
            className="text-xl text-slate-700 hover:text-orange-500 transition-colors"
          >
            <FaSearch />
          </button>

          {!loading && !user && (
            <>
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-2 text-slate-700 hover:text-orange-500 transition-colors"
              >
                <FaUser />
                {t("navbar.login")}
              </Link>

              <Link
                to="/register"
                className="hidden sm:inline-flex bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg transition-colors"
              >
                {t("navbar.register")}
              </Link>
            </>
          )}

          {!loading && user && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                  {firstLetter}
                </div>

                <div
                  className={`hidden md:block ${
                    isArabic ? "text-right" : "text-left"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {displayName}
                  </p>

                  <p className="text-xs text-gray-500">
                    {isAdmin ? t("navbar.admin") : t("navbar.student")}
                  </p>
                </div>

                <FaChevronDown
                  className={`text-xs transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div
                  className={`absolute mt-3 w-64 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden ${
                    isArabic ? "left-0" : "right-0"
                  }`}
                >
                  <div className="px-4 py-4 border-b bg-slate-50">
                    <p className="font-semibold text-slate-900">
                      {displayName}
                    </p>

                    <p className="text-sm text-gray-500 truncate" dir="ltr">
                      {profile?.email || user?.email}
                    </p>
                  </div>

                  <div className="py-2">
                    {isAdmin ? (
                      <>
                        <DropdownLink
                          to="/admin/dashboard"
                          icon={<FaTachometerAlt />}
                          label={t("navbar.dashboard")}
                          onClick={() => setDropdownOpen(false)}
                        />

                        <DropdownLink
                          to="/admin/courses"
                          icon={<FaBookOpen />}
                          label={t("navbar.manageCourses")}
                          onClick={() => setDropdownOpen(false)}
                        />

                        <DropdownLink
                          to="/admin/students"
                          icon={<FaUsers />}
                          label={t("navbar.manageStudents")}
                          onClick={() => setDropdownOpen(false)}
                        />
                      </>
                    ) : (
                      <>
                        <DropdownLink
                          to="/my-courses"
                          icon={<FaBookOpen />}
                          label={t("navbar.myCourses")}
                          onClick={() => setDropdownOpen(false)}
                        />

                        <DropdownLink
                          to="/certificates"
                          icon={<FaCertificate />}
                          label={t("navbar.certificates")}
                          onClick={() => setDropdownOpen(false)}
                        />

                        <DropdownLink
                          to="/profile"
                          icon={<FaUserCircle />}
                          label={t("navbar.profile")}
                          onClick={() => setDropdownOpen(false)}
                        />
                      </>
                    )}
                  </div>

                  <div className="border-t py-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FaSignOutAlt />
                      {t("navbar.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            aria-label={t("navbar.menu")}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden text-2xl text-slate-700 hover:text-orange-500"
          >
            <FaBars />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-white px-4 py-4 shadow-md">
          <nav className="flex flex-col gap-4">
            <NavLink
              to="/"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("navbar.home")}
            </NavLink>

            <NavLink
              to="/courses"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("navbar.courses")}
            </NavLink>

            <NavLink
              to="/about"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("navbar.about")}
            </NavLink>

            <NavLink
              to="/contact"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("navbar.contact")}
            </NavLink>

            {!user && (
              <div className="flex flex-col gap-3 pt-4 border-t">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-slate-700"
                >
                  <FaUser />
                  {t("navbar.login")}
                </Link>

                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center bg-orange-500 text-white py-2 rounded-lg"
                >
                  {t("navbar.register")}
                </Link>
              </div>
            )}

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 pt-4 border-t"
              >
                <FaSignOutAlt />
                {t("navbar.logout")}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function DropdownLink({ to, icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}