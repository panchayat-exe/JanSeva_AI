import axios from "axios";

export const API_URL = "http://localhost:5000/api/v1";
export const SERVER_URL = "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("janseva_auth");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
