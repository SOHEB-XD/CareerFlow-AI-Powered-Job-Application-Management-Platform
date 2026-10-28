import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { Eye, EyeOff, AlertCircle, CalendarDays, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import './Auth.css';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const handleGoogleSuccess = async (credential) => {
    setError('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle(credential);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Google sign-in was not successful. Please try again or create an account with email.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = (errorMessage) => {
    setError(errorMessage);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // Match backend requirement: password must be at least 6 characters
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cf-auth-page">
      {/* ── Left: Form Area ── */}
      <section className="cf-auth-form-side" aria-label="Registration Form">
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
              <h1 className="cf-auth-h1">Create an account</h1>
              <p className="cf-auth-desc">
                Start tracking your job applications today. Free, fast, and structured.
              </p>
            </div>

            {error && (
              <div className="cf-auth-alert" role="alert" aria-live="assertive">
                <AlertCircle className="cf-auth-alert-icon" size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Authentication */}
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              text="continue_with"
            />

            <div className="cf-auth-divider" aria-hidden="true">
              <span>or continue with email</span>
            </div>

            <form onSubmit={handleSubmit} className="cf-auth-form" noValidate>
              <div className="cf-form-field">
                <label htmlFor="name" className="cf-form-label">
                  Full Name
                </label>
                <div className="cf-input-wrap">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className={`cf-input${error && !name ? ' has-error' : ''}`}
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="cf-form-field">
                <label htmlFor="email" className="cf-form-label">
                  Email Address
                </label>
                <div className="cf-input-wrap">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`cf-input${error && !email ? ' has-error' : ''}`}
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
                    className={`cf-input${error && password.length < 6 ? ' has-error' : ''}`}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
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
                <span className="cf-field-hint">Must be at least 6 characters</span>
              </div>

              <button
                type="submit"
                className="cf-auth-submit-btn"
                disabled={isSubmitting || !name.trim() || !email.trim() || !password}
              >
                {isSubmitting ? (
                  <>
                    <span className="cf-auth-spinner" aria-hidden="true" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Start Free</span>
                    <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <footer className="cf-auth-footer">
              <span>Already have an account?</span>
              <Link to="/login" className="cf-auth-switch-link">
                Sign in →
              </Link>
            </footer>
          </motion.div>
        </div>

        <div className="cf-auth-legal">
          By signing up, you agree to our Terms of Service and Privacy Policy.
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
            <span className="cf-auth-eyebrow-label">Pipeline Engine</span>
          </div>

          <h2 className="cf-auth-brand-h2">
            One System.<br />
            <em>Total Clarity.</em>
          </h2>

          <p className="cf-auth-brand-desc">
            Track applications, schedule follow-ups, and keep every contact
            organized in a single, focused workspace.
          </p>

          {/* Authentic preview cards stack */}
          <div className="cf-auth-cards-stack" aria-hidden="true">
            <motion.div
              className="cf-preview-card"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="cf-preview-card-header">
                <div className="cf-preview-brand">
                  <div className="cf-preview-avatar">S</div>
                  <div>
                    <div className="cf-preview-company">Stripe</div>
                    <div className="cf-preview-role">Infrastructure Engineer · Remote</div>
                  </div>
                </div>
                <span className="cf-preview-pill">Technical Round</span>
              </div>
              <div className="cf-preview-card-footer">
                <span className="cf-preview-next">
                  <CalendarDays size={12} strokeWidth={1.8} aria-hidden="true" />
                  <span>System Design — Tomorrow 2:00 PM</span>
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
                  <div className="cf-preview-avatar">L</div>
                  <div>
                    <div className="cf-preview-company">Linear</div>
                    <div className="cf-preview-role">Frontend Architect · Remote</div>
                  </div>
                </div>
                <span className="cf-preview-pill neutral">Applied</span>
              </div>
              <div className="cf-preview-card-footer">
                <span className="cf-preview-next">
                  <CalendarDays size={12} strokeWidth={1.8} aria-hidden="true" />
                  <span>Follow-up scheduled Thursday</span>
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </aside>
    </div>
  );
};

export default Register;
