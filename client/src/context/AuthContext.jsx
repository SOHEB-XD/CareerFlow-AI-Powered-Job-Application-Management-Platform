import { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const inFlightCheckRef = useRef(null);

    const checkAuth = useCallback(async () => {
        // Prevent concurrent duplicate session checks (e.g. StrictMode double-mount or multiple triggers)
        if (inFlightCheckRef.current) {
            return inFlightCheckRef.current;
        }

        const checkPromise = (async () => {
            try {
                const { data } = await api.get('/auth/me');
                if (data.success && data.user) {
                    setUser(data.user);
                    return data.user;
                }
                setUser(null);
                return null;
            } catch {
                setUser(null);
                return null;
            } finally {
                setLoading(false);
                inFlightCheckRef.current = null;
            }
        })();

        inFlightCheckRef.current = checkPromise;
        return checkPromise;
    }, []);

    useEffect(() => {
        checkAuth();

        const handleUnauthorized = () => {
            setUser(null);
            setLoading(false);
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, [checkAuth]);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (data.success && data.user) {
            setUser(data.user);
            setLoading(false);
        }
        return data;
    };

    const register = async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        if (data.success && data.user) {
            setUser(data.user);
            setLoading(false);
        }
        return data;
    };

    const logout = async () => {
        inFlightCheckRef.current = null;
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout failed on the backend:', error);
        } finally {
            // Always clear the frontend state, even if the backend request fails
            setUser(null);
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout, refreshUser: checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
