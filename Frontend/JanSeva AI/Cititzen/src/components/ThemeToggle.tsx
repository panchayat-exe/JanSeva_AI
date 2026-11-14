import { Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Dark mode" : "Light mode"}
      className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-300 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ overflow: "hidden" }}
    >
      {/* Sun icon — visible in light mode */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: theme === "light" ? 1 : 0,
          transform: theme === "light" ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.5)",
        }}
      >
        <Sun className="h-4 w-4" strokeWidth={1.5} />
      </span>

      {/* Moon icon — visible in dark mode */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: theme === "dark" ? 1 : 0,
          transform: theme === "dark" ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)",
        }}
      >
        <Moon className="h-4 w-4" strokeWidth={1.5} />
      </span>
    </button>
  );
}
