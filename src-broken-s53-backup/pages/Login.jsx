import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
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

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function redirectAuthenticatedUser(user) {
      if (!user) {
        if (isMounted) {
          setCheckingSession(false);
        }

        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }
sessionStorage.removeItem("logged_out");
        const role = profile?.role?.trim().toLowerCase();

        if (!isMounted) return;

        if (role === "admin") {
          navigate("/admin/dashboard", {
            replace: true,
          });

          return;
        }

        navigate("/", {
          replace: true,
        });
      } catch (error) {
        console.error(
          "SESSION CHECK ERROR:",
          error
        );

        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    async function checkExistingSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(
          "GET SESSION ERROR:",
          error
        );

        if (isMounted) {
          setCheckingSession(false);
        }

        return;
      }

      await redirectAuthenticatedUser(
        session?.user
      );
    }

    checkExistingSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === "SIGNED_IN" &&
          session?.user
        ) {
          redirectAuthenticatedUser(
            session.user
          );
        }

        if (
          event === "SIGNED_OUT" &&
          isMounted
        ) {
          setCheckingSession(false);
        }
      }
    );

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

    setErrorMessage("");
    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: form.email
            .trim()
            .toLowerCase(),
          password: form.password,
        });

      if (error) {
        throw error;
      }

      const user = data.user;

      if (!user) {
        throw new Error(
          t("login.userDataError")
        );
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const role = profile?.role
        ?.trim()
        .toLowerCase();

      if (role === "admin") {
        navigate("/admin/dashboard", {
          replace: true,
        });

        return;
      }

      const destination =
        location.state?.from?.pathname ||
        "/";

      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      if (
        error.message ===
        "Invalid login credentials"
      ) {
        setErrorMessage(
          t("login.invalidCredentials")
        );
      } else {
        setErrorMessage(
          error.message ||
            t("login.loginError")
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
        className="flex min-h-screen items-center justify-center bg-[#f7f9fc]"
      >
        <p className="text-gray-500">
          {i18n.language === "ar"
            ? "جارٍ التحقق من الجلسة..."
            : "Checking session..."}
        </p>
      </div>
    );
  }

  return (
    <div
      dir={i18n.dir()}
      className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-center text-3xl font-bold text-gray-800">
          {t("login.title")}
        </h1>

        <p className="mb-7 mt-2 text-center text-gray-500">
          {t("login.subtitle")}
        </p>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="mb-2 block font-medium text-gray-700">
              {t("login.email")}
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
            <label className="mb-2 block font-medium text-gray-700">
              {t("login.password")}
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder={t(
                "login.passwordPlaceholder"
              )}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {loading
              ? t("login.loading")
              : t("login.button")}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          {t("login.noAccount")}{" "}
          <Link
            to="/register"
            replace
            className="font-bold text-orange-600 hover:underline"
          >
            {t("login.createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}