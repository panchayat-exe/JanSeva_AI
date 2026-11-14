import axios from "axios";

export const API_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:5000/api/v1";
export const SERVER_URL = API_URL.replace("/api/v1", "");

// ─── Axios Instance ─────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive HttpOnly refresh-token cookie
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ─── Request Interceptor — attach access token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor — handle 401 / refresh token ─────────────────────────
let isRefreshing = false;
let queue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // If 401 and not already retrying, and the request wasn't for the refresh endpoint itself
    if (error.response?.status === 401 && !original._retry && original.url !== "/auth/refresh") {
      original._retry = true;

      if (isRefreshing) {
        // Wait in queue for new token
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch(Promise.reject);
      }

      isRefreshing = true;

      try {
        const { data } = await api.post<{
          data: { accessToken: string };
        }>("/auth/refresh");
        const newToken = data.data.accessToken;
        localStorage.setItem("accessToken", newToken);
        queue.forEach(({ resolve }) => resolve(newToken));
        queue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        queue.forEach(({ reject }) => reject(error));
        queue = [];
        // Clear auth and send to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/";
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a human-readable error message from an Axios error */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    
    // If there are detailed validation errors, return them combined
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e: any) => e.message).join(' • ');
    }
    
    return (
      data?.message ??
      data?.error ??
      error.message ??
      "Something went wrong."
    );
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
