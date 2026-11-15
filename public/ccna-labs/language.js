(() => {
  "use strict";
  const normalize = value => typeof value === "string" && /^(ar|en)(-|$)/i.test(value) ? value.slice(0, 2).toLowerCase() : null;
  function saved() { try { return normalize(localStorage.getItem("language")); } catch { return null; } }
  function apply(value, persist) {
    const lang = normalize(value) || "ar";
    const ar = lang === "ar";
    document.documentElement.lang = lang;
    document.documentElement.dir = ar ? "rtl" : "ltr";
    document.getElementById("lab-ar").hidden = !ar;
    document.getElementById("lab-en").hidden = ar;
    document.title = document.getElementById(ar ? "lab-ar" : "lab-en").querySelector("h1").textContent + " | Basmat Alnawabigh Academy";
    document.querySelectorAll("[data-lab-language]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.labLanguage === lang)));
    document.querySelectorAll("a.back").forEach(a => a.href = "/ccna-labs");
    if (persist) { try { localStorage.setItem("language", lang); } catch {} }
    try { const url = new URL(location.href); url.searchParams.set("lang", lang); history.replaceState(null, "", url); } catch {}
  }
  document.querySelectorAll("[data-lab-language]").forEach(button => {
    button.addEventListener("click", () => apply(button.dataset.labLanguage, true));
  });
  window.addEventListener("storage", event => { if (event.key === "language") apply(event.newValue, false); });
  window.addEventListener("pageshow", () => apply(normalize(document.documentElement.dataset.initialLanguage) || saved() || new URLSearchParams(location.search).get("lang"), false));
  window.addEventListener("beforeprint", () => apply(document.documentElement.lang, false));
  apply(normalize(document.documentElement.dataset.initialLanguage) || normalize(new URLSearchParams(location.search).get("lang")) || saved() || "ar", true);
})();