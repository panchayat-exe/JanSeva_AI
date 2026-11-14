import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { Bell, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/lib/useAuth";
import { auth } from "@/lib/auth";
import { getNavForRole, ROLE_LABELS, ROLE_BADGE_COLORS } from "@/lib/rbac";

export type Crumb = { label: string; to?: LinkProps["to"]; params?: any };

export function Crumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mt-1 flex flex-wrap items-center gap-2 text-sm">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2">
          {i > 0 && <span className="text-muted-foreground/50">›</span>}
          {item.to ? (
            <Link to={item.to as any} params={item.params} className="text-muted-foreground transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="border-b border-ashoka pb-0.5 text-ashoka">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AppShell({
  title,
  crumbs,
  children,
}: {
  title: string;
  crumbs: Crumb[];
  children: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, role, fullName } = useAuth();

  // Get nav items for the current user's role
  const nav = getNavForRole(role ?? "OFFICER");
  const roleLabel = ROLE_LABELS[role ?? ""] ?? "User";
  const roleBadgeClass = ROLE_BADGE_COLORS[role ?? ""] ?? "";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="tiranga-bar h-1 w-full shrink-0" />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar lg:flex xl:w-64">
          {/* Logo */}
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

          {/* Role-specific navigation */}
          <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto p-3 xl:gap-2 xl:p-4">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = path === to || path.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to as any}
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

          {/* Bottom: user info + logout */}
          <div className="mt-auto border-t border-sidebar-border">
            {/* User info pill */}
            {user && (
              <div className="px-3 pt-3 xl:px-4">
                <div className="rounded-lg border border-border bg-background/60 px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-foreground">
                    {fullName}
                  </p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${roleBadgeClass}`}>
                    {roleLabel}
                  </span>
                </div>
              </div>
            )}
            <div className="px-3 py-3 xl:px-4">
              <button
                onClick={() => auth.logout()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border bg-background/85 px-5 py-3 backdrop-blur lg:px-8 lg:py-4">
            <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground lg:block">
              भारत सरकार · GOVERNMENT OF INDIA · MINISTRY OF HOUSING &amp; URBAN AFFAIRS
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Role badge in header (visible on all breakpoints) */}
              {role && (
                <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:inline-block ${roleBadgeClass}`}>
                  {roleLabel}
                </span>
              )}
              <button className="relative rounded-full border border-transparent p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                <Bell className="h-5 w-5" strokeWidth={1.5} />
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-saffron" />
              </button>
              <span className="h-5 w-px bg-border" />
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>

          <main className="flex flex-1 flex-col overflow-y-auto px-5 py-6 lg:px-8">
            {children}
          </main>

          <footer className="shrink-0 border-t border-border px-5 py-5 text-center text-xs text-muted-foreground lg:px-8">
            © 2026 Janseva AI Government Portal · Digital India Initiative. All rights reserved.
          </footer>
        </div>
      </div>
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-card shadow-[var(--shadow-panel)] ${className}`}
    >
      {children}
    </section>
  );
}
