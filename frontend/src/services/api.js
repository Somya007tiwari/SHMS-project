import axios from 'axios';

// Detect if running on Vercel (including custom domains)
// Check: 1) .vercel.app hostname, 2) VITE_API_URL is set (production indicator), 3) window.__VERCEL__ flag
const isVercelHost = typeof window !== 'undefined' && (
  /\.vercel\.app$/.test(window.location.hostname) ||
  import.meta.env.VITE_API_URL?.includes('onrender.com') ||
  window.__VERCEL__ === true
);

const api = axios.create({
  // On Vercel (any domain), use same-origin /api/v1 and let vercel.json proxy to Render
  baseURL: isVercelHost
    ? '/api/v1'
    : import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1',
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Debug logging (remove in production)
if (import.meta.env.DEV) {
  console.log('[API] BaseURL:', api.defaults.baseURL);
  console.log('[API] isVercelHost:', isVercelHost);
  console.log('[API] VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('[API] Hostname:', window.location.hostname);
}

// Request interceptor - attach access token and handle FormData Content-Type
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const actingPatientId = sessionStorage.getItem('actingPatientId');
  if (actingPatientId) {
    config.headers['X-Acting-Patient-Id'] = actingPatientId;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
}, (error) => Promise.reject(error));

export default api;
