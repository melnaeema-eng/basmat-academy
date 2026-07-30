import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";

export default function Register() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!form.fullName.trim()) {
      setErrorMessage(t("register.errors.fullName"));
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage(t("register.errors.email"));
      return;
    }

    if (form.password.length < 6) {
      setErrorMessage(t("register.errors.passwordLength"));
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage(t("register.errors.passwordMismatch"));
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            role: "student",
          },
        },
      });

      console.log("SIGNUP DATA:", data);
      console.log("SIGNUP ERROR:", error);

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(t("register.errors.userNotCreated"));
      }

      setMessage(t("register.success"));

      setForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("REGISTER ERROR:", error);

      if (
        error.message?.toLowerCase().includes("already registered") ||
        error.message?.toLowerCase().includes("already exists")
      ) {
        setErrorMessage(t("register.errors.alreadyRegistered"));
      } else {
        setErrorMessage(error.message || t("register.errors.registerError"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir={i18n.dir()}
      className="min-h-screen bg-gray-100 flex items-center justify-center px-4"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          {t("register.title")}
        </h1>

        <p className="text-gray-500 text-center mb-6">
          {t("register.subtitle")}
        </p>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-100 text-red-700 p-3">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg bg-green-100 text-green-700 p-3">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              {t("register.fullName")}
            </label>

            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder={t("register.fullNamePlaceholder")}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">
              {t("register.email")}
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="example@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">
              {t("register.password")}
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder={t("register.passwordPlaceholder")}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">
              {t("register.confirmPassword")}
            </label>

            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder={t("register.confirmPasswordPlaceholder")}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold disabled:opacity-60"
          >
            {loading ? t("register.loading") : t("register.button")}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          {t("register.haveAccount")} {" "}
          <Link
            to="/login"
            className="text-orange-600 font-bold hover:underline"
          >
            {t("register.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}