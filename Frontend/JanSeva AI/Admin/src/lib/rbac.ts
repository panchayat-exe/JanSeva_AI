import type { CurrentUser } from "./auth";
import {
  LayoutDashboard, FileText, MapPin, User, Settings, Users,
  Building2, BarChart3, AlertTriangle, UserCheck, ClipboardList,
} from "lucide-react";

// ── Role constants ────────────────────────────────────────────────────────────
export const ROLES = {
  OFFICER: "OFFICER",
  DEPT_ADMIN: "DEPT_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type Role = keyof typeof ROLES;

// ── Role display labels ───────────────────────────────────────────────────────
export const ROLE_LABELS: Record<string, string> = {
  OFFICER: "Field Officer",
  DEPT_ADMIN: "Department Admin",
  SUPER_ADMIN: "Super Admin",
  CITIZEN: "Citizen",
};

export const ROLE_BADGE_COLORS: Record<string, string> = {
  OFFICER:     "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  DEPT_ADMIN:  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  SUPER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  CITIZEN:     "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

// ── Navigation config per role ────────────────────────────────────────────────
export type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const OFFICER_NAV: NavItem[] = [
  { to: "/dashboard/officer", label: "Dashboard", icon: LayoutDashboard },
  { to: "/complaints",        label: "Complaints", icon: FileText },
  { to: "/geovision",         label: "GeoVision", icon: MapPin },
  { to: "/profile",           label: "Profile", icon: User },
];

const DEPT_ADMIN_NAV: NavItem[] = [
  { to: "/dashboard",   label: "Dashboard", icon: LayoutDashboard },
  { to: "/complaints",  label: "Complaints", icon: FileText },
  { to: "/geovision",   label: "GeoVision", icon: MapPin },
  { to: "/officers",    label: "Officers", icon: UserCheck },
  { to: "/profile",     label: "Profile", icon: User },
];

const SUPER_ADMIN_NAV: NavItem[] = [
  { to: "/dashboard",     label: "Command Center", icon: LayoutDashboard },
  { to: "/complaints",    label: "All Complaints", icon: FileText },
  { to: "/geovision",     label: "GeoVision", icon: MapPin },
  { to: "/departments",   label: "Departments", icon: Building2 },
  { to: "/officers",      label: "Officers", icon: UserCheck },
  { to: "/users",         label: "Users", icon: Users },
  { to: "/analytics",     label: "Analytics", icon: BarChart3 },
  { to: "/escalations",   label: "Escalations", icon: AlertTriangle },
  { to: "/audit-logs",    label: "Audit Logs", icon: ClipboardList },
  { to: "/settings",      label: "System Settings", icon: Settings },
  { to: "/profile",       label: "Profile", icon: User },
];

export function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case "OFFICER":     return OFFICER_NAV;
    case "DEPT_ADMIN":  return DEPT_ADMIN_NAV;
    case "SUPER_ADMIN": return SUPER_ADMIN_NAV;
    default:            return OFFICER_NAV; // safe fallback
  }
}

// ── Dashboard route per role ───────────────────────────────────────────────────
export function getDashboardRoute(role: string): string {
  switch (role) {
    case "OFFICER":     return "/dashboard/officer";
    case "DEPT_ADMIN":  return "/dashboard";
    case "SUPER_ADMIN": return "/dashboard";
    default:            return "/dashboard";
  }
}

// ── Permission helpers ────────────────────────────────────────────────────────
export function canViewAllComplaints(user: CurrentUser | null): boolean {
  return user?.role === "DEPT_ADMIN" || user?.role === "SUPER_ADMIN";
}

export function canManageUsers(user: CurrentUser | null): boolean {
  return user?.role === "SUPER_ADMIN";
}

export function canManageDepartments(user: CurrentUser | null): boolean {
  return user?.role === "SUPER_ADMIN";
}

export function canAssignComplaints(user: CurrentUser | null): boolean {
  return user?.role === "DEPT_ADMIN" || user?.role === "SUPER_ADMIN";
}

export function canAccessAdminPanel(user: CurrentUser | null): boolean {
  return user?.role === "DEPT_ADMIN" || user?.role === "SUPER_ADMIN";
}

export function isOfficer(user: CurrentUser | null): boolean {
  return user?.role === "OFFICER";
}

export function isDeptAdmin(user: CurrentUser | null): boolean {
  return user?.role === "DEPT_ADMIN";
}

export function isSuperAdmin(user: CurrentUser | null): boolean {
  return user?.role === "SUPER_ADMIN";
}
