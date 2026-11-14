import api from "./api";

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "CITIZEN" | "OFFICER" | "DEPT_ADMIN" | "SUPER_ADMIN";
  departmentId: string | null;
  citizenId: string | null;
  isEmailVerified: boolean;
}

const USER_KEY = "janseva_user";
const AUTH_KEY = "janseva_auth";
const TOKEN_KEY = "accessToken";

export const auth = {
  login: async (email: string, password: string): Promise<CurrentUser> => {
    const response = await api.post("/auth/login", { email, password });
    const { accessToken } = response.data.data.tokens;
    const user: CurrentUser = response.data.data.user;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(AUTH_KEY, "true");
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "/";
  },

  getCurrentUser: (): CurrentUser | null => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(AUTH_KEY) && !!localStorage.getItem(TOKEN_KEY);
  },
};
