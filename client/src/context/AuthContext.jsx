import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const { data } = await api.get('/auth/me');
            if (data.success) {
                setUser(data.user);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (data.success) {
            setUser(data.user);
        }
        return data;
    };

    const register = async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        if (data.success) {
            setUser(data.user);
        }
        return data;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout failed on the backend:', error);
        } finally {
            // Always clear the frontend state, even if the backend request fails
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout, refreshUser: checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
