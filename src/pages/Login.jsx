import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
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

    setErrorMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (error) {
        throw error;
      }

      const user = data.user;

      if (!user) {
        throw new Error(t("login.userDataError"));
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      console.log("LOGIN USER:", user);
      console.log("LOGIN PROFILE:", profile);
      console.log("PROFILE ERROR:", profileError);

      if (profileError) {
        throw profileError;
      }

      const role = profile?.role?.trim().toLowerCase();

      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      const destination = location.state?.from?.pathname || "/";

      navigate(destination, { replace: true });
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      if (error.message === "Invalid login credentials") {
        setErrorMessage(t("login.invalidCredentials"));
      } else {
        setErrorMessage(error.message || t("login.loginError"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir={i18n.dir()}
      className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          {t("login.title")}
        </h1>

        <p className="text-center text-gray-500 mt-2 mb-7">
          {t("login.subtitle")}
        </p>

        {errorMessage && (
          <div className="mb-4 bg-red-100 text-red-700 rounded-lg p-3">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-medium text-gray-700">
              {t("login.email")}
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
            <label className="block mb-2 font-medium text-gray-700">
              {t("login.password")}
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder={t("login.passwordPlaceholder")}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold disabled:opacity-60"
          >
            {loading ? t("login.loading") : t("login.button")}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          {t("login.noAccount")} {" "}
          <Link
            to="/register"
            className="text-orange-600 font-bold hover:underline"
          >
            {t("login.createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}