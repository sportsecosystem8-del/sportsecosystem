import axios from 'axios';

function getBaseURL() {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== 'string') return '/api';
  let trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';
  if (trimmed.startsWith('http://') && trimmed.includes('onrender.com')) {
    trimmed = trimmed.replace('http://', 'https://');
  }
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

const baseURL = getBaseURL();

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  /** FormData uploads: do not send application/json — browser must set multipart boundary for multer */
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || '');
    const isAuthForm =
      url.includes('/auth/login') || url.includes('/auth/register');
    if (status === 401) {
      localStorage.removeItem('token');
      if (!isAuthForm) {
        const path = window.location.pathname;
        if (!['/login', '/register'].some((p) => path.startsWith(p))) {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err) {
  return err.response?.data?.message || err.message || 'Request failed';
}
