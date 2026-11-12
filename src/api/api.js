import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add the auth token header to requests
api.interceptors.request.use(
  (config) => {
    const userToken = Cookies.get("billing_token");
    const token = userToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle common errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      Cookies.remove("billing_token");
      const basename = import.meta.env.VITE_BASENAME || "";
      const loginPath = `${basename}/login`;
      
      // Prevent infinite redirect loops if we are already on the login page
      if (!window.location.pathname.endsWith("/login")) {
        window.location.href = `${loginPath}?reason=expired`;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
