import axios, { AxiosInstance } from 'axios';

/**
 * Dedicated Axios instance for the Inbox module.
 * Uses the Next.js /api/backend proxy to avoid CORS issues.
 * Swap NEXT_PUBLIC_INBOX_API_URL in .env when the real endpoint is ready.
 */
const INBOX_API_BASE_URL =
  process.env.NEXT_PUBLIC_INBOX_API_URL || '/api/backend';


const inboxAxiosInstance: AxiosInstance = axios.create({
  baseURL: INBOX_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor – attach auth token ────────────────────────────────
inboxAxiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor – handle 401 ─────────────────────────────────────
inboxAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // Token expired / invalid – you can redirect to login here when ready
      console.warn('[InboxAPI] 401 Unauthorized – please check your session.');
    }
    return Promise.reject(error);
  },
);

export { inboxAxiosInstance };
export default inboxAxiosInstance;
