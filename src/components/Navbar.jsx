import { Link, NavLink } from "react-router-dom";
import { FaSearch, FaUser, FaBars } from "react-icons/fa";
import logo from "../assets/images/logo.png";

export default function Navbar() {
  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Basmat Alnawabigh"
            className="w-14 h-14 object-contain"
          />

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              بصمة النوابغ
            </h1>

            <p className="text-xs text-gray-500">
              Engineering • Technology • Academy
            </p>
          </div>
        </Link>

        {/* Menu */}
        <nav className="hidden lg:flex items-center gap-8">

          <NavLink to="/" className="hover:text-orange-500">
            الرئيسية
          </NavLink>

          <NavLink to="/courses" className="hover:text-orange-500">
            الدورات
          </NavLink>

          <NavLink to="/about" className="hover:text-orange-500">
            من نحن
          </NavLink>

          <NavLink to="/contact" className="hover:text-orange-500">
            تواصل معنا
          </NavLink>

        </nav>

        {/* Right */}
        <div className="flex items-center gap-4">

          <button className="text-xl hover:text-orange-500">
            <FaSearch />
          </button>

          <Link
            to="/login"
            className="flex items-center gap-2 text-slate-700 hover:text-orange-500"
          >
            <FaUser />
            دخول
          </Link>

          <Link
            to="/register"
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg"
          >
            إنشاء حساب
          </Link>

          <button className="lg:hidden text-2xl">
            <FaBars />
          </button>

        </div>

      </div>
    </header>
  );
}