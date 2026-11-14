import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, Settings, ShieldCheck, ShieldAlert, User } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "../lib/i18n";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Notifications } from "./Notifications";
import { useAuth } from "../lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = useT();
  const { user } = useAuth();
  
  const isFullyVerified = user?.isEmailVerified && user?.isPhoneVerified;

  const nav = [
    { to: "/dashboard", label: t.nav.dashboard, icon: Home },
    { to: "/profile",   label: t.nav.profile,   icon: User },
    { to: "/settings",  label: t.nav.settings,  icon: Settings },
  ] as const;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Tricolour stripe */}
      <div className="h-1 w-full shrink-0 tricolour-rule" />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Sidebar (desktop only) ── */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar lg:flex xl:w-64">
          <Link to="/dashboard" className="flex items-center gap-3 border-b border-border px-4 py-4 xl:px-5 xl:py-5">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
              alt="Janseva AI emblem"
              width={40}
              height={40}
              className="h-9 w-9 xl:h-11 xl:w-11 dark:invert"
            />
            <span>
              <span className="block font-display text-base font-bold tracking-wide xl:text-lg">
                JANSEVA AI
              </span>
              <span className="block text-[10px] text-muted-foreground xl:text-[11px]">
                Your Voice. Our Action.
              </span>
            </span>
          </Link>

          <nav className="flex flex-col gap-1 p-3 xl:gap-2 xl:p-4">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = to === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors xl:px-4 xl:py-3 ${
                    active
                      ? "border-border bg-secondary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 xl:h-5 xl:w-5" strokeWidth={1.5} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto p-3 xl:p-4">
            <Link 
              to="/profile" 
              className={`block rounded-lg border p-3 text-[11px] leading-relaxed transition-colors ${
                isFullyVerified 
                  ? "border-green-200 bg-green-50/50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100/50 dark:hover:bg-green-900/40"
                  : "border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-900/40"
              }`}
            >
              <div className={`flex items-center gap-2 ${isFullyVerified ? "" : "mb-1"}`}>
                {isFullyVerified ? (
                  <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <ShieldAlert className="h-4 w-4" strokeWidth={1.5} />
                )}
                <span className="text-xs font-medium">
                  {isFullyVerified ? "Verified Account" : "Unverified Account"}
                </span>
              </div>
              {!isFullyVerified && (
                <span className="mt-1 block opacity-90">
                  Click here to verify your account to unlock full access.
                </span>
              )}
            </Link>
          </div>
        </aside>

        {/* ── Main content column ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top header */}
          <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6 md:py-4 lg:px-8">
            {/* Mobile logo */}
            <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 dark:invert"
              />
              <span className="font-display text-sm font-bold sm:text-base">JANSEVA AI</span>
            </Link>

            {/* Desktop tagline */}
            <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground lg:block">
              {t.header.tagline}
            </p>

            <div className="flex items-center gap-2 sm:gap-3">
              <Notifications />
              <span className="h-5 w-px bg-border" />
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>

          {/* Scrollable page content */}
          <main className="flex flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <nav className="shrink-0 flex border-t border-border bg-sidebar lg:hidden">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground [&.active]:text-foreground sm:py-3 sm:text-[11px]"
                activeOptions={{ exact: to === "/dashboard" }}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  back,
  action,
}: {
  title: string;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-3 sm:mb-6 sm:gap-4">
      {back ? (
        <Link
          to={back}
          aria-label="Go back"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor">
            <path d="M19 12H5M11 6l-6 6 6 6" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Link>
      ) : null}
      <h1 className="font-display text-xl font-semibold sm:text-2xl md:text-3xl">{title}</h1>
      <div className="ml-auto">{action}</div>
    </div>
  );
}
