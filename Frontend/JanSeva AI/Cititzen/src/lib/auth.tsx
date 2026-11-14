import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { api, getErrorMessage } from "./api";
import type { User, LoginResponse } from "../types/api";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // On mount: verify token is still valid by fetching /users/profile
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .get<{ data: User }>("/users/profile")
      .then(({ data }) => {
        setUser(data.data);
        localStorage.setItem("user", JSON.stringify(data.data));
      })
      .catch(() => {
        // Token invalid or expired and refresh failed — clear everything
        setUser(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<{ data: LoginResponse }>("/auth/login", {
      email,
      password,
    });
    const { user: loggedInUser, tokens } = data.data;
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const register = async (payload: RegisterPayload) => {
    await api.post("/auth/register", payload);
    // After registration, ask user to verify email — don't auto-login
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Even if the server call fails, clear local state
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get<{ data: User }>("/auth/me");
      setUser(data.data);
      localStorage.setItem("user", JSON.stringify(data.data));
    } catch (err) {
      console.error("Failed to refresh user", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Re-export for convenience
export { getErrorMessage };
