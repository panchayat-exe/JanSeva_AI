import { useState, useEffect } from "react";

export function LanguageSwitcher() {
  const [lang, setLangState] = useState<"en" | "hi">("en");

  // Read from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("janseva_admin_lang");
      if (stored === "hi") setLangState("hi");
    } catch {}
  }, []);

  const toggle = () => {
    const next = lang === "en" ? "hi" : "en";
    setLangState(next);
    try {
      localStorage.setItem("janseva_admin_lang", next);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch language"
      className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <span className={lang === "en" ? "font-semibold text-foreground" : ""}>EN</span>
      <span className="opacity-40">|</span>
      <span className={lang === "hi" ? "font-semibold text-foreground" : ""}>हिं</span>
    </button>
  );
}
