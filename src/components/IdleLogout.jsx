import { useEffect, useRef } from "react";
import { supabase } from "../services/supabase";

const IDLE_TIME = 5 * 60 * 1000 // 30 ثانية للاختبار

export default function IdleLogout() {
  const timerRef = useRef(null);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    function clearIdleTimer() {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    }

    async function forceLogout() {
      if (isLoggingOutRef.current) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        clearIdleTimer();
        return;
      }

      isLoggingOutRef.current = true;

      const { error } = await supabase.auth.signOut({
        scope: "local",
      });

      if (error) {
        console.error("AUTO LOGOUT ERROR:", error);
        isLoggingOutRef.current = false;
        resetIdleTimer();
        return;
      }

      sessionStorage.setItem("logged_out", "true");
      sessionStorage.setItem("logout_reason", "inactive");

      window.location.replace("/login");
    }

    function resetIdleTimer() {
      clearIdleTimer();

      timerRef.current = window.setTimeout(() => {
        forceLogout();
      }, IDLE_TIME);
    }

    async function initializeIdleTimer() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        isLoggingOutRef.current = false;
        resetIdleTimer();
      } else {
        clearIdleTimer();
      }
    }

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, {
        passive: true,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      clearIdleTimer();

      if (session) {
        isLoggingOutRef.current = false;
        resetIdleTimer();
      }
    });

    initializeIdleTimer();

    return () => {
      clearIdleTimer();

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });

      subscription.unsubscribe();
    };
  }, []);

  return null;
}