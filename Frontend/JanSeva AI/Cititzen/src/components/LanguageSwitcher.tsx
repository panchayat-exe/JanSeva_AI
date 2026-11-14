import { useI18n } from "../lib/i18n";
import { useState, useRef, useEffect } from "react";
import type { Lang } from "../lib/translations";

interface LanguageSwitcherProps {
  /** Visual variant — "pill" for header, "card" for login dropdown */
  variant?: "pill" | "card";
}

export function LanguageSwitcher({ variant = "pill" }: LanguageSwitcherProps) {
  const { lang, setLang } = useI18n();

  const toggle = () => setLang(lang === "en" ? "hi" : "en");

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (variant === "card") {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="lang-selector"
          aria-label="Switch language"
        >
          <span className="material-symbols-rounded icon-sm">language</span>
          <span>{lang === "en" ? "English" : "हिंदी"}</span>
          <span className="material-symbols-rounded icon-sm" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>expand_more</span>
        </button>
        
        {isOpen && (
          <div 
            className="absolute right-0 top-full mt-2 w-32 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg z-50 animate-in fade-in slide-in-from-top-2"
          >
            <button
              onClick={() => { setLang("en"); setIsOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary ${lang === "en" ? "bg-secondary/50 font-medium" : ""}`}
            >
              English
            </button>
            <button
              onClick={() => { setLang("hi"); setIsOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary ${lang === "hi" ? "bg-secondary/50 font-medium" : ""}`}
            >
              हिंदी
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default pill variant for AppShell header
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch language"
      className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-secondary sm:px-3 sm:py-1.5 sm:text-sm"
    >
      <span className="font-semibold">{lang === "en" ? "EN" : "HI"}</span>
      <span className="text-muted-foreground">|</span>
      <span className="text-muted-foreground">{lang === "en" ? "हिं" : "EN"}</span>
    </button>
  );
}
