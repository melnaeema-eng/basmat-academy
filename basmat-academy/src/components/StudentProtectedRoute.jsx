import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function StudentProtectedRoute({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setAuthorized(Boolean(session?.user));
      setLoading(false);
    }

    checkUser();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="p-10 text-center">جاري التحقق...</div>;
  }

  if (!authorized) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
