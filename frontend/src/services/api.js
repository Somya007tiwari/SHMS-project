import axios from 'axios';

const isVercelHost =
  typeof window !== 'undefined' && /\.vercel\.app$/.test(window.location.hostname);

const api = axios.create({
  // On the deployed Vercel site, call the API same-origin and let vercel.json
  // proxy /api/* to the Render backend (avoids CORS entirely).
  baseURL: isVercelHost
    ? '/api/v1'
    : import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1',
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

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
