import axios from 'axios';

/* Same origin in development (Vite proxies /api) and in production (Express
   serves the build). Set VITE_API_URL only when the API lives elsewhere. */
const baseURL = import.meta.env.VITE_API_URL || '/api';

const axiosInstance = axios.create({ baseURL });

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    /* A token the server no longer accepts: drop it and let the app send the
       person back to sign in, instead of every screen failing on its own. */
    if (error?.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('authToken');
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw error;
  }
);

export default axiosInstance;
