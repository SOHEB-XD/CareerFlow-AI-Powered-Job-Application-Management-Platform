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
            // The AuthContext will handle state updates, this is just a generic handler
            // that could emit an event if needed, but for now we rely on the endpoints.
        }
        return Promise.reject(error);
    }
);

export default api;
