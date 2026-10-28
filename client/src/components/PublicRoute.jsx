import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PublicRoute (Guest Route)
 * Prevents authenticated users from accessing guest-only screens (/, /login, /register).
 * While session check is in-flight, displays loading indicator to avoid form or landing flash.
 * If already authenticated, redirects to intended destination or /dashboard.
 */
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="auth-loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (isAuthenticated) {
        const destination = location.state?.from?.pathname
            ? `${location.state.from.pathname}${location.state.from.search || ''}`
            : '/dashboard';
        return <Navigate to={destination} replace />;
    }

    return children;
};

export default PublicRoute;
