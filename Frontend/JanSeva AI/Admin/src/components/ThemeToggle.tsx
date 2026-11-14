import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

function applyDark(dark: boolean) {
  // Set on both html and body so both CSS variants work
  if (dark) {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
  }
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("janseva_admin_theme");
      const dark = stored === "dark";
      setIsDark(dark);
      applyDark(dark);
    } catch {}
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    applyDark(next);
    try {
      localStorage.setItem("janseva_admin_theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-300 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ overflow: "hidden" }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? "rotate(90deg) scale(0.5)" : "rotate(0deg) scale(1)",
        }}
      >
        <Sun className="h-4 w-4" strokeWidth={1.5} />
      </span>

      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)",
        }}
      >
        <Moon className="h-4 w-4" strokeWidth={1.5} />
      </span>
    </button>
  );
}
