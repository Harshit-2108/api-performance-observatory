import axios from 'axios';

let accessToken = null;
let refreshSubscribers = [];
let isRefreshing = false;

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true, // Crucial: enables sending/receiving HTTP-Only cookies (Refresh Token)
  headers: {
    'Content-Type': 'application/json'
  }
});

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Notify all waiting requests of new token
const onRefreshed = (token) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

// Queue request to retry when token is refreshed
const addRefreshSubscriber = (cb) => {
  refreshSubscribers.push(cb);
};

// Interceptor to inject bearer token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle token expirations and perform silent refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is unauthorized (401) and request has not already been retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      
      // If already on login/register pages, do not attempt to refresh
      if (
        window.location.pathname.includes('/login') ||
        window.location.pathname.includes('/register')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If refresh is in progress, queue this request
        return new Promise((resolve) => {
          addRefreshSubscriber((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Fetch new access token using HTTP-only Refresh Token cookie
        const res = await axios.post(
  `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
  {},
  {
    withCredentials: true
  }
);
        
        if (res.data.success) {
          const newToken = res.data.accessToken;
          setAccessToken(newToken);
          
          isRefreshing = false;
          onRefreshed(newToken);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        
        // Refresh token invalid or expired - force clear auth and redirect
        setAccessToken(null);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?expired=true';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
