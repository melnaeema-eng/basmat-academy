import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      setAuthorized(false);
    } else {
      setAuthorized(
        profile?.role?.trim().toLowerCase() === "admin"
      );
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-xl">
        جاري التحقق...
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}