import { useEffect } from "react";
import AppRouter from "./router/AppRouter";
import { supabase } from "./services/supabase";

export default function App() {
  useEffect(() => {
    async function validateBrowserHistory(event) {
      const loggedOut =
        sessionStorage.getItem("logged_out") === "true";

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (loggedOut && !session) {
        const protectedPaths = [
          "/admin",
          "/profile",
          "/my-courses",
          "/certificates",
        ];

        const isProtectedPage = protectedPaths.some((path) =>
          window.location.pathname.startsWith(path)
        );

        if (isProtectedPage) {
          window.location.replace("/login");
          return;
        }

        if (event?.persisted) {
          window.location.reload();
        }
      }
    }

    function handlePageShow(event) {
      validateBrowserHistory(event);
    }

    function handlePopState() {
      validateBrowserHistory();
    }

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return <AppRouter />;
}