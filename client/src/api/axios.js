import axios from 'axios';

// Create a centralized Axios instance.
// Using relative URL because Vite proxies /api to the backend.
const api = axios.create({
    baseURL: '/api',
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
