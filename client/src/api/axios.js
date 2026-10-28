import axios from 'axios';

// Create a centralized Axios instance.
// In local development, defaults to relative '/api' proxied by Vite to http://localhost:3000.
// In production, uses import.meta.env.VITE_API_URL (e.g., https://your-backend.onrender.com/api).
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    // Important: required to send and receive the HTTP-only cookie containing the JWT.
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Intercept responses to handle 401 Unauthorized globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const url = error.config?.url || '';
            const isAuthRoute =
                url.includes('/auth/me') ||
                url.includes('/auth/login') ||
                url.includes('/auth/register') ||
                url.includes('/auth/google');

            // When a protected endpoint returns 401 mid-session, notify the app to reset auth state
            if (!isAuthRoute && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            }
        }
        return Promise.reject(error);
    }
);

export default api;
