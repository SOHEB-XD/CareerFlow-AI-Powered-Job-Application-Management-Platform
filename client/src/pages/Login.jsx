import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, CalendarDays, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError('');
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      const destination = location.state?.from?.pathname
        ? `${location.state.from.pathname}${location.state.from.search || ''}`
        : '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cf-auth-page">
      {/* ── Left: Form Area ── */}
      <section className="cf-auth-form-side" aria-label="Sign In Form">
        <div>
          <header className="cf-auth-topbar">
            <Link to="/" className="cf-auth-logo" aria-label="CareerFlow Home">
              <div className="cf-logo-mark" aria-hidden="true" />
              <span className="cf-logo-text">CareerFlow</span>
            </Link>
            <Link to="/" className="cf-auth-home-link">
              ← Back to Home
            </Link>
          </header>

          <motion.div
            className="cf-auth-form-card"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cf-auth-header">
              <h1 className="cf-auth-h1">Welcome back</h1>
              <p className="cf-auth-desc">
                Enter your credentials to access your job applications and recruiter CRM.
              </p>
            </div>

            {error && (
              <div className="cf-auth-alert" role="alert" aria-live="assertive">
                <AlertCircle className="cf-auth-alert-icon" size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="cf-auth-form" noValidate>
              <div className="cf-form-field">
                <label htmlFor="email" className="cf-form-label">
                  Email Address
                </label>
                <div className="cf-input-wrap">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`cf-input${error ? ' has-error' : ''}`}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="cf-form-field">
                <label htmlFor="password" className="cf-form-label">
                  Password
                </label>
                <div className="cf-input-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`cf-input${error ? ' has-error' : ''}`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="cf-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="cf-auth-submit-btn"
                disabled={isSubmitting || !email.trim() || !password}
              >
                {isSubmitting ? (
                  <>
                    <span className="cf-auth-spinner" aria-hidden="true" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <footer className="cf-auth-footer">
              <span>Don't have an account?</span>
              <Link to="/register" className="cf-auth-switch-link">
                Create an account →
              </Link>
            </footer>
          </motion.div>
        </div>

        <div className="cf-auth-legal">
          © {new Date().getFullYear()} CareerFlow Platform. All rights reserved.
        </div>
      </section>

      {/* ── Right: Brand Area (Desktop) ── */}
      <aside className="cf-auth-brand-side" aria-label="Platform Highlights">
        <motion.div
          className="cf-auth-brand-content"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cf-auth-brand-eyebrow">
            <span className="cf-auth-eyebrow-label">Career CRM</span>
          </div>

          <h2 className="cf-auth-brand-h2">
            Your Job Search.<br />
            <em>Under Control.</em>
          </h2>

          <p className="cf-auth-brand-desc">
            A centralized workspace to organize applications, track interviews,
            and manage every stage of your search.
          </p>

          {/* Visual application cards showcase */}
          <div className="cf-auth-cards-stack" aria-hidden="true">
            <motion.div
              className="cf-preview-card"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="cf-preview-card-header">
                <div className="cf-preview-brand">
                  <div className="cf-preview-avatar">G</div>
                  <div>
                    <div className="cf-preview-company">Google</div>
                    <div className="cf-preview-role">Sr. Frontend Engineer · Mountain View</div>
                  </div>
                </div>
                <span className="cf-preview-pill">Interviewing</span>
              </div>
              <div className="cf-preview-card-footer">
                <span className="cf-preview-next">
                  <CalendarDays size={12} strokeWidth={1.8} aria-hidden="true" />
                  <span>Technical Round — Tomorrow 2:00 PM</span>
                </span>
              </div>
            </motion.div>

            <motion.div
              className="cf-preview-card"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="cf-preview-card-header">
                <div className="cf-preview-brand">
                  <div className="cf-preview-avatar">S</div>
                  <div>
                    <div className="cf-preview-company">Stripe</div>
                    <div className="cf-preview-role">Staff Infrastructure Engineer · Remote</div>
                  </div>
                </div>
                <span className="cf-preview-pill neutral">Offer Ready</span>
              </div>
              <div className="cf-preview-card-footer">
                <span className="cf-preview-next">
                  <CalendarDays size={12} strokeWidth={1.8} aria-hidden="true" />
                  <span>Decision deadline Friday</span>
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </aside>
    </div>
  );
};

export default Login;
