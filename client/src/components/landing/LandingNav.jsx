import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const LandingNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`landing-nav-header ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="nav-container">
        {/* Brand Logo */}
        <Link to="/" className="nav-brand" aria-label="CareerFlow Home">
          <div className="brand-logo-symbol">
            <span className="brand-symbol-dot" />
          </div>
          <span className="brand-text">CAREERFLOW</span>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-menu-desktop" aria-label="Main navigation">
          <a href="#features" onClick={scrollToSection('features')} className="nav-link">
            Features
          </a>
          <a href="#pipeline" onClick={scrollToSection('pipeline')} className="nav-link">
            Workflow
          </a>
          <a href="#analytics" onClick={scrollToSection('analytics')} className="nav-link">
            Analytics
          </a>
          <a href="#testimonials" onClick={scrollToSection('testimonials')} className="nav-link">
            Stories
          </a>
        </nav>

        {/* CTA Actions */}
        <div className="nav-actions">
          <Link to="/login" className="btn-nav-ghost">
            Sign In
          </Link>
          <Link to="/register" className="btn-nav-primary">
            Get Started <span className="btn-arrow">→</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className={`menu-bar ${mobileMenuOpen ? 'open' : ''}`} />
            <span className={`menu-bar ${mobileMenuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-menu-drawer"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <a href="#features" onClick={scrollToSection('features')} className="mobile-nav-link">
              Features
            </a>
            <a href="#pipeline" onClick={scrollToSection('pipeline')} className="mobile-nav-link">
              Workflow
            </a>
            <a href="#analytics" onClick={scrollToSection('analytics')} className="mobile-nav-link">
              Analytics
            </a>
            <a href="#testimonials" onClick={scrollToSection('testimonials')} className="mobile-nav-link">
              Stories
            </a>
            <div className="mobile-nav-divider" />
            <Link to="/login" className="mobile-nav-btn-ghost" onClick={() => setMobileMenuOpen(false)}>
              Sign In
            </Link>
            <Link to="/register" className="mobile-nav-btn-primary" onClick={() => setMobileMenuOpen(false)}>
              Get Started Free →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default LandingNav;
