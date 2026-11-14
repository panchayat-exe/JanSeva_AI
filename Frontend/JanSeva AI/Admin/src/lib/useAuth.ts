import { useState, useEffect } from "react";
import { auth, type CurrentUser } from "./auth";

/**
 * React hook — returns the currently authenticated user from localStorage.
 * Re-reads on mount so it's always fresh.
 */
export function useAuth() {
  const [user, setUser] = useState<CurrentUser | null>(() => auth.getCurrentUser());

  useEffect(() => {
    setUser(auth.getCurrentUser());
  }, []);

  return {
    user,
    role: user?.role ?? null,
    isOfficer:    user?.role === "OFFICER",
    isDeptAdmin:  user?.role === "DEPT_ADMIN",
    isSuperAdmin: user?.role === "SUPER_ADMIN",
    isAdmin:      user?.role === "DEPT_ADMIN" || user?.role === "SUPER_ADMIN",
    isAuthenticated: auth.isAuthenticated(),
    fullName: user ? (`${user.firstName} ${user.lastName}`).trim() : "User",
  };
}
