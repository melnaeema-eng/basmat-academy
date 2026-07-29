import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function ProtectedRoute({ children }) {
 // console.log("ProtectedRoute Loaded");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
useEffect(() => {
  checkUser();
}, []);
 async function checkUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("SESSION:", session);

  if (!session) {
    setAuthorized(false);
    setLoading(false);
    return;
  }

  //console.log("User ID:", session.user.id);
  // console.log("Email:", session.user.email);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  // console.log("PROFILE:", profile);
  // console.log("ERROR:", error);

  if (error) {
    setAuthorized(false);
  } else {
    setAuthorized(profile?.role?.toLowerCase() === "admin");
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
    return <Navigate to="/" replace />;
  }

  return children;
}