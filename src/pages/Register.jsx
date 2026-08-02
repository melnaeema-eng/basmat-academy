import { useEffect, useState } from "react";
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

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkExistingSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!isMounted) return;

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();

          const role = profile?.role?.trim().toLowerCase();

          if (role === "admin") {
            navigate("/admin/dashboard", { replace: true });
          } else {
            navigate("/", { replace: true });
          }

          return;
        }

        setCheckingSession(false);
      } catch (error) {
        console.error("REGISTER SESSION CHECK ERROR:", error);

        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    checkExistingSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      /*
       * لا ننفذ إعادة التوجيه أثناء إنشاء الحساب؛
       * handleSubmit سيتولى تسجيل الخروج والتوجيه.
       */
      if (event === "SIGNED_OUT" && !session) {
        setCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

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

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(t("register.errors.userNotCreated"));
      }

      /*
       * إذا كان تأكيد البريد غير مفعل، قد ينشئ Supabase
       * جلسة دخول مباشرة. نسجل الخروج حتى تظهر صفحة الدخول.
       */
      if (data.session) {
        const { error: signOutError } = await supabase.auth.signOut({
          scope: "local",
        });

        if (signOutError) {
          throw signOutError;
        }
      }

      setMessage(t("register.success"));

      setForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      window.setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            registered: true,
            email: form.email.trim().toLowerCase(),
          },
        });
      }, 1500);
    } catch (error) {
      console.error("REGISTER ERROR:", error);

      const errorText = error.message?.toLowerCase() || "";

      if (
        errorText.includes("already registered") ||
        errorText.includes("already exists") ||
        errorText.includes("user already registered")
      ) {
        setErrorMessage(t("register.errors.alreadyRegistered"));
      } else {
        setErrorMessage(
          error.message || t("register.errors.registerError")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div
        dir={i18n.dir()}
        className="flex min-h-screen items-center justify-center bg-gray-100"
      >
        <p className="text-gray-500">
          {i18n.language?.startsWith("ar")
            ? "جارٍ التحقق من الجلسة..."
            : "Checking session..."}
        </p>
      </div>
    );
  }

  return (
    <div
      dir={i18n.dir()}
      className="flex min-h-screen items-center justify-center bg-gray-100 px-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">
          {t("register.title")}
        </h1>

        <p className="mb-6 text-center text-gray-500">
          {t("register.subtitle")}
        </p>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block font-medium text-gray-700">
              {t("register.fullName")}
            </label>

            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder={t("register.fullNamePlaceholder")}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-gray-700">
              {t("register.email")}
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="example@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-gray-700">
              {t("register.password")}
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder={t("register.passwordPlaceholder")}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-gray-700">
              {t("register.confirmPassword")}
            </label>

            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder={t("register.confirmPasswordPlaceholder")}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? t("register.loading") : t("register.button")}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          {t("register.haveAccount")}{" "}
          <Link
            to="/login"
            replace
            className="font-bold text-orange-600 hover:underline"
          >
            {t("register.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}