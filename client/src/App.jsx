import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import Resume from './pages/Resume';
import Communications from './pages/Communications';
import Landing from './pages/Landing';

import RouteMetadata from './components/RouteMetadata';

// Generic placeholder for future protected routes
const Placeholder = ({ title }) => (
  <div className="content-container" style={{ padding: '2rem', background: '#FFFFFF', border: '1px solid #000000' }}>
    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: '#000000', marginBottom: '0.75rem' }}>{title}</h1>
    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: '#000000', opacity: 0.8 }}>This workspace section is being prepared. Check back shortly.</p>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <RouteMetadata />
        <Routes>
          {/* Public & Guest routes */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <Landing />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected app routes — all nested under /dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="applications" element={<Applications />} />
            <Route path="resume" element={<Resume />} />
            <Route path="communications" element={<Communications />} />
            <Route path="settings" element={<Placeholder title="Settings" />} />
          </Route>

          <Route path="*" element={
            <div style={{ padding: '2rem', textAlign: 'center', background: '#000000', minHeight: '100vh', color: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#FFFFFF' }}>Page Not Found</h1>
              <p style={{ fontFamily: 'var(--font-sans)', color: '#FFFFFF', opacity: 0.8 }}>The page you are looking for does not exist.</p>
              <Link to="/" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#0000FF', color: '#FFFFFF', fontWeight: 700, textDecoration: 'none', border: '1px solid #0000FF' }}>
                Return to CareerFlow
              </Link>
            </div>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;