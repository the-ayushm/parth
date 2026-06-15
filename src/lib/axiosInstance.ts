import axios from "axios";

const NGROK_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// Axios instance for the external ngrok API
export const ngrokAxiosInstance = axios.create({
  baseURL: NGROK_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Attach token from localStorage for ngrok instance
ngrokAxiosInstance.interceptors.request.use((config) => {
  let token = typeof window !== "undefined"
    ? (localStorage.getItem("token") || localStorage.getItem("console_access_token"))
    : null;

  // Strip surrounding quotes if present
  if (token && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

// ── 401 guard ────────────────────────────────────────────────────────────────
let _isRedirectingToAuth = false;

ngrokAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Check whether a valid token exists right now.
      const token = localStorage.getItem("token") || localStorage.getItem("console_access_token");
      const hasCookieToken =
        document.cookie.includes("consoleAccessToken=") ||
        document.cookie.includes("accessToken=") ||
        document.cookie.includes("token=");

      // Only redirect when the token is genuinely absent
      if (!token && !hasCookieToken && !_isRedirectingToAuth) {
        _isRedirectingToAuth = true;
        window.location.href = "/auth";
      }
    }
    return Promise.reject(error);
  }
);
