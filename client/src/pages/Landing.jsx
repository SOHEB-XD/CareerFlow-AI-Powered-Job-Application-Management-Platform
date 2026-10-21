import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  FileText,
  Mail,
  Clock,
  Plus,
  CalendarDays,
} from 'lucide-react';
import './Landing.css';

/* ─── NAV LINKS ────────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pipeline', href: '#pipeline' },
  { label: 'Principles', href: '#principles' },
];

/* ─── PAIN POINTS (The Problem) ────────────────────────────────────────────── */
const PAIN_POINTS = [
  {
    num: '01',
    badge: 'Critical',
    title: 'Spreadsheets That Lie',
    body: '47 rows. 12 columns. Outdated dates. You spend more time maintaining an unwieldy sheet than preparing for interviews.',
  },
  {
    num: '02',
    badge: 'Common',
    title: 'Silent Applications',
    body: 'Applications go cold without warning. Days turn into weeks, follow-up windows close, and opportunities quietly evaporate.',
  },
  {
    num: '03',
    badge: 'Chronic',
    title: 'Disjointed Dates & Notes',
    body: 'Interview links in your inbox, recruiter emails on LinkedIn, and prep notes in your phone. Nothing is connected.',
  },
];

/* ─── GENUINE PRODUCT CAPABILITIES (Audited against actual codebase) ───────── */
const PIPELINE_COLUMNS = [
  {
    name: 'Applied',
    cards: [
      { company: 'Linear', role: 'Product Engineer', source: 'LinkedIn', date: 'Oct 14' },
      { company: 'Notion', role: 'Design Technologist', source: 'Referral', date: 'Oct 12' },
    ],
  },
  {
    name: 'Interview Scheduled',
    cards: [
      { company: 'Vercel', role: 'Staff Frontend Engineer', source: 'Website', date: 'Oct 18', eventNote: 'Initial Screen' },
    ],
  },
  {
    name: 'Technical Round',
    cards: [
      { company: 'Stripe', role: 'Infrastructure Engineer', source: 'Outreach', date: 'Oct 20', eventNote: 'System Design' },
    ],
  },
  {
    name: 'Offer Letter',
    cards: [
      { company: 'Airbnb', role: 'Senior Product Engineer', source: 'LinkedIn', date: 'Decision: Friday', isOffer: true },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   NAVIGATION COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
function Nav({ shouldReduceMotion }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <motion.nav
        className={`cf-nav${scrolled || open ? ' scrolled' : ''}`}
        aria-label="Main Navigation"
        initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="cf-nav-inner">
          <Link to="/" className="cf-nav-logo">
            <div className="cf-logo-mark" aria-hidden="true">
              <span className="cf-logo-mark-inner" />
            </div>
            <span className="cf-logo-text">CareerFlow</span>
          </Link>

          <div className="cf-nav-links">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="cf-nav-link">{l.label}</a>
            ))}
          </div>

          <div className="cf-nav-actions">
            <Link to="/login" className="cf-btn-ghost">Sign In</Link>
            <Link to="/register" className="cf-btn-primary">
              <span>Start Free</span>
              <span className="cf-btn-arrow" aria-hidden="true">→</span>
            </Link>
          </div>

          <button
            className="cf-nav-mobile-btn"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            <span /><span /><span />
          </button>
        </div>
      </motion.nav>

      {open && (
        <div className="cf-mobile-drawer">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="cf-mobile-link"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="cf-mobile-hr" />
          <Link to="/login" className="cf-mobile-link" onClick={() => setOpen(false)}>
            Sign In
          </Link>
          <Link to="/register" className="cf-mobile-cta" onClick={() => setOpen(false)}>
            Start Tracking Free →
          </Link>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SCROLL REVEAL OBSERVER
   ═══════════════════════════════════════════════════════════════════════════════ */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.cf-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN LANDING COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
const Landing = () => {
  useReveal();
  const shouldReduceMotion = useReducedMotion();

  const tickerItems = [
    'Stage-by-Stage Tracking',
    '10-Day Silent Inactivity Detection',
    'Interview Schedule Manager',
    'Recruiter Email & Notes Log',
    'Applied to Offer Pipeline',
    'Instant Search & Filtering',
    'Application Source Breakdown',
  ];

  return (
    <div className="cf-landing">
      <Nav shouldReduceMotion={shouldReduceMotion} />

      {/* ── 1. HERO: FULL-BLEED SPIRAL BACKGROUND WITH EDITORIAL OVERLAY ── */}
      <section className="cf-section cf-hero" id="hero" aria-label="Hero">
        {/* Layer 1: Edge-to-edge Video Background */}
        <div className="cf-hero-bg-layer" aria-hidden="true">
          {shouldReduceMotion ? (
            <img
              src="/videos/careerflow-spiral-poster.jpg"
              alt="Silk spiral visual"
              className="cf-hero-bg-media"
            />
          ) : (
            <video
              className="cf-hero-bg-media"
              src="/videos/careerflow-spiral-web.mp4"
              poster="/videos/careerflow-spiral-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          )}
        </div>

        {/* Layer 2: Restrained Editorial Scrim Gradient Overlay */}
        <div className="cf-hero-overlay" aria-hidden="true" />

        {/* Layer 3: Foreground Content */}
        <div className="cf-hero-content cf-container">
          <div className="cf-hero-text-wrap">
            <motion.div
              className="cf-hero-eyebrow"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="cf-hero-eyebrow-pill">
                <span className="cf-pill-pulse" aria-hidden="true" />
                Career Management System
              </span>
              <span className="cf-hero-eyebrow-tag">Focused Job Search</span>
            </motion.div>

            <h1 className="cf-hero-h1">
              <span className="cf-h1-statement">
                <span className="cf-h1-line-mask">
                  <motion.span
                    className="cf-h1-line"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: '100%' }}
                    animate={{ opacity: 1, y: '0%' }}
                    transition={{ duration: 0.85, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  >
                    Job hunting can spiral.
                  </motion.span>
                </span>
              </span>
              <span className="cf-h1-punchline">
                <span className="cf-h1-line-mask">
                  <motion.span
                    className="cf-h1-line"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: '100%' }}
                    animate={{ opacity: 1, y: '0%' }}
                    transition={{ duration: 0.85, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <em className="cf-hero-em">Your process doesn't have to.</em>
                  </motion.span>
                </span>
              </span>
            </h1>

            <motion.p
              className="cf-hero-sub"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.72, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
            >
              CareerFlow organizes your applications, interviews, and follow-ups in one calm,
              centralized workspace. Replace spreadsheet chaos with clear stages, automated inactivity alerts,
              and genuine momentum.
            </motion.p>

            <motion.div
              className="cf-hero-actions"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.54, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link to="/register" className="cf-btn-hero">
                <span>Start Tracking Free</span>
                <span className="cf-btn-arrow" aria-hidden="true">→</span>
              </Link>
              <Link to="/login" className="cf-btn-hero-outline">
                Sign In to Account
              </Link>
            </motion.div>

            {/* Truthful product highlights (replacing mock marketing counts) */}
            <motion.div
              className="cf-hero-pillars"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.72, delay: 0.76, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="cf-hero-pillar">
                <span className="cf-pillar-title">8 Pipeline Stages</span>
                <span className="cf-pillar-desc">Applied to offer letter</span>
              </div>
              <div className="cf-hero-pillar">
                <span className="cf-pillar-title">Inactivity Alert</span>
                <span className="cf-pillar-desc">Flags 10-day silent apps</span>
              </div>
              <div className="cf-hero-pillar">
                <span className="cf-pillar-title">One Workspace</span>
                <span className="cf-pillar-desc">Notes, dates & contacts</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 2. TICKER BAR ─────────────────────────────────────────────────── */}
      <div className="cf-ticker" aria-hidden="true">
        <div className="cf-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="cf-ticker-item">
              <span className="cf-ticker-dot" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── 3. PROBLEM / MANIFESTO (Pure White Canvas, Bold Black Typography) ─ */}
      <section className="cf-section cf-problem" id="problem" aria-label="The Problem">
        <div className="cf-container">
          <div className="cf-problem-inner">
            {/* Left: Statement & Manifesto */}
            <div className="cf-problem-left">
              <span className="cf-label cf-reveal">The Problem</span>
              <h2 className="cf-problem-h2 cf-reveal cf-reveal-delay-1">
                Most job searches<br />
                <em>spiral into chaos.</em>
              </h2>
              <p className="cf-problem-desc cf-reveal cf-reveal-delay-2">
                You're submitting dozens of applications across disparate boards, juggling disconnected recruiter
                threads, and trying to remember interview times without a single reliable source of truth.
              </p>

              <div className="cf-manifesto-card cf-reveal cf-reveal-delay-3">
                <div className="cf-manifesto-badge">The CareerFlow Principle</div>
                <blockquote className="cf-manifesto-quote">
                  “When visibility across your pipeline breaks down, follow-up timing slips, interview prep gets rushed, and career momentum stalls.”
                </blockquote>
              </div>
            </div>

            {/* Right: Pain point cards */}
            <div className="cf-problem-right">
              {PAIN_POINTS.map((p, i) => (
                <div key={i} className={`cf-pain-card cf-reveal cf-reveal-right cf-reveal-delay-${i + 1}`}>
                  <div className="cf-pain-card-top">
                    <span className="cf-pain-num">{p.num}</span>
                    <span className="cf-pain-badge">{p.badge}</span>
                  </div>
                  <h3 className="cf-pain-title">{p.title}</h3>
                  <p className="cf-pain-body">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SOLUTION / GENUINE CAPABILITIES (Solid Black Architectural Grid) ── */}
      <section className="cf-section cf-solution" id="features" aria-label="The Solution">
        <div className="cf-container">
          <div className="cf-solution-header cf-reveal">
            <div>
              <span className="cf-label">The Solution</span>
              <h2 className="cf-solution-h2">
                One System.<br />
                <em>Total Pipeline Clarity.</em>
              </h2>
            </div>
            <p className="cf-solution-right-text">
              CareerFlow brings every application, recruiter interaction, and upcoming interview date into a
              structured workspace — so you stay ahead of every opportunity.
            </p>
          </div>

          {/* Genuine Feature Hierarchy: Primary Feature Spotlight + 3 Supporting Grid Features */}
          <div className="cf-features-layout">
            {/* Primary Spotlight Card */}
            <div className="cf-feature-spotlight cf-reveal">
              <div className="cf-spotlight-content">
                <div className="cf-spotlight-tag">Primary Workflow</div>
                <h3 className="cf-spotlight-title">Stage-by-Stage Application Lifecycle</h3>
                <p className="cf-spotlight-desc">
                  Track every submission through authentic pipeline stages: Applied, Interview Scheduled,
                  Technical Round, HR Round, Offer Letter, or final outcome. Move through rounds with clear
                  visual status badges and immediate stage updates.
                </p>
                <div className="cf-spotlight-badges">
                  <span className="cf-status-pill cf-pill-applied">Applied</span>
                  <span className="cf-status-pill cf-pill-interview">Interview Scheduled</span>
                  <span className="cf-status-pill cf-pill-tech">Technical Round</span>
                  <span className="cf-status-pill cf-pill-hr">HR Round</span>
                  <span className="cf-status-pill cf-pill-offer">Offer Letter</span>
                </div>
              </div>
            </div>

            {/* 3 Real Supporting Capabilities */}
            <div className="cf-features-subgrid">
              <div className="cf-subfeature-card cf-reveal cf-reveal-delay-1">

                <h4 className="cf-subfeature-title">10-Day Stale Application Detection</h4>
                <p className="cf-subfeature-body">
                  Built-in inactivity detection flags applications that have gone quiet for over 10 days,
                  marking them as "No Response" so cold leads never clutter active rounds.
                </p>
              </div>

              <div className="cf-subfeature-card cf-reveal cf-reveal-delay-2">

                <h4 className="cf-subfeature-title">Interview Date & Schedule Tracking</h4>
                <p className="cf-subfeature-body">
                  Enforces explicit interview dates when rounds are scheduled, keeping upcoming rounds
                  visible and ensuring preparation happens well before call time.
                </p>
              </div>

              <div className="cf-subfeature-card cf-reveal cf-reveal-delay-3">

                <h4 className="cf-subfeature-title">Recruiter, Notes & Source Log</h4>
                <p className="cf-subfeature-body">
                  Attach recruiter contact emails, referral sources (LinkedIn, Referral, Direct), company
                  URLs, and salary expectations directly to each application record.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PRODUCT SHOWCASE (Pipeline Visualization) ───────────────────── */}
      <section className="cf-section cf-showcase" id="pipeline" aria-label="Pipeline Showcase">
        <div className="cf-container">
          <div className="cf-showcase-header cf-reveal">
            <span className="cf-label">The Pipeline</span>
            <h2 className="cf-showcase-h2">Your Job Search, Structured.</h2>
            <p className="cf-showcase-sub">
              Every round, company detail, and scheduled interview organized in a clear, scanning-friendly view.
            </p>
          </div>

          <div className="cf-product-window cf-reveal cf-reveal-delay-1">
            {/* Window bar */}
            <div className="cf-window-bar">
              <div className="cf-window-dots">
                <span className="cf-window-dot" />
                <span className="cf-window-dot" />
                <span className="cf-window-dot" />
              </div>
              <span className="cf-window-url">app.careerflow.io/dashboard/applications</span>
            </div>

            {/* App interface layout */}
            <div className="cf-app-layout">
              {/* Sidebar */}
              <div className="cf-app-sidebar">
                <div className="cf-sidebar-brand">CareerFlow</div>
                <div className="cf-sidebar-item">
                  <LayoutDashboard size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>Overview</span>
                </div>
                <div className="cf-sidebar-item active">
                  <BriefcaseBusiness size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>Applications</span>
                </div>
                <div className="cf-sidebar-item">
                  <FileText size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>Resumes</span>
                </div>
                <div className="cf-sidebar-item">
                  <Mail size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>Communications</span>
                </div>
              </div>

              {/* Main content */}
              <div className="cf-app-main">
                <div className="cf-app-toolbar">
                  <div>
                    <h3 className="cf-app-title">Applications</h3>
                    <span className="cf-app-subtitle">Manage, track, and update all your job applications</span>
                  </div>
                  <div className="cf-app-actions">
                    <button type="button" className="cf-app-check-btn" aria-label="Check inactive applications">
                      <Clock size={13} strokeWidth={2} aria-hidden="true" />
                      <span>Check Inactive</span>
                    </button>
                    <button type="button" className="cf-app-btn-add" aria-label="Add new application">
                      <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
                      <span>Add Application</span>
                    </button>
                  </div>
                </div>

                {/* Pipeline column board */}
                <div className="cf-kanban">
                  {PIPELINE_COLUMNS.map((col) => (
                    <div key={col.name} className="cf-kanban-col">
                      <div className="cf-kanban-col-header">
                        <span className="cf-kanban-col-name">{col.name}</span>
                        <span className="cf-kanban-count">{col.cards.length}</span>
                      </div>
                      <div className="cf-kanban-col-cards">
                        {col.cards.map((card, ci) => (
                          <div key={ci} className="cf-kanban-card">
                            <div className="cf-kcard-header">
                              <span className="cf-kcard-company">{card.company}</span>
                              <span className="cf-kcard-source">{card.source}</span>
                            </div>
                            <div className="cf-kcard-role">{card.role}</div>
                            <div className="cf-kcard-footer">
                              <span className="cf-kcard-date">
                                <CalendarDays size={12} strokeWidth={1.8} aria-hidden="true" />
                                <span>{card.date}</span>
                              </span>
                              {card.eventNote && (
                                <span className="cf-kcard-note">{card.eventNote}</span>
                              )}
                              {card.isOffer && (
                                <span className="cf-kcard-offer-badge">Offer Ready</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. WORKFLOW PRINCIPLES (Truthful Product Benchmarks) ───────────── */}
      <section className="cf-section cf-metrics" id="principles" aria-label="Workflow Principles">
        <div className="cf-container">
          <div className="cf-metrics-header cf-reveal">
            <span className="cf-label">Grounded Architecture</span>
            <h2 className="cf-metrics-h2">Built For Action, Not Bureaucracy.</h2>
          </div>

          <div className="cf-metrics-grid">
            <div className="cf-metric-cell cf-reveal">
              <div className="cf-metric-val">8</div>
              <div className="cf-metric-label">Canonical Stages</div>
              <p className="cf-metric-desc">From initial applied status to offer letter or withdrawal.</p>
            </div>
            <div className="cf-metric-cell cf-reveal cf-reveal-delay-1">
              <div className="cf-metric-val">10d</div>
              <div className="cf-metric-label">Inactivity Threshold</div>
              <p className="cf-metric-desc">Flags stagnant leads so you focus on responsive teams.</p>
            </div>
            <div className="cf-metric-cell cf-reveal cf-reveal-delay-2">
              <div className="cf-metric-val">100%</div>
              <div className="cf-metric-label">Focused Tracker</div>
              <p className="cf-metric-desc">Zero bloat, zero tracking friction, and clean data isolation.</p>
            </div>
            <div className="cf-metric-cell cf-reveal cf-reveal-delay-3">
              <div className="cf-metric-val">1</div>
              <div className="cf-metric-label">Unified Workspace</div>
              <p className="cf-metric-desc">Centralized recruiter contacts, interview dates, and role notes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FINAL CTA (Solid Black Canvas, Pure White Typography, Blue CTA) ─ */}
      <section className="cf-section cf-cta" aria-label="Call to Action">
        <div className="cf-container cf-cta-container">
          <span className="cf-label cf-reveal">Ready to take control?</span>
          <h2 className="cf-cta-h2 cf-reveal cf-reveal-delay-1">
            Build Momentum<br />
            <em>In Your Job Search.</em>
          </h2>
          <p className="cf-cta-sub cf-reveal cf-reveal-delay-2">
            Leave behind disorganized sheets and missed follow-ups. Set up your clean, structured application
            pipeline today.
          </p>
          <Link to="/register" className="cf-btn-cta cf-reveal cf-reveal-delay-3">
            <span>Start Tracking Free</span>
            <span className="cf-btn-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ── 8. FOOTER (Solid Black Canvas, Pure White Links, Blue Accents) ── */}
      <footer className="cf-footer" aria-label="Footer">
        <div className="cf-container">
          <div className="cf-footer-top">
            <div className="cf-footer-brand">
              <div className="cf-footer-logo">
                <div className="cf-footer-logo-mark" aria-hidden="true" />
                <span className="cf-footer-logo-text">CareerFlow</span>
              </div>
              <p className="cf-footer-desc">
                A calm, focused job search management platform for engineers, designers, and career-focused
                professionals.
              </p>
            </div>
            <div className="cf-footer-nav">
              <div className="cf-footer-col">
                <span className="cf-footer-col-title">Navigation</span>
                <a href="#features" className="cf-footer-link">Features</a>
                <a href="#pipeline" className="cf-footer-link">Pipeline</a>
                <a href="#principles" className="cf-footer-link">Principles</a>
              </div>
              <div className="cf-footer-col">
                <span className="cf-footer-col-title">Account</span>
                <Link to="/login" className="cf-footer-link">Sign In</Link>
                <Link to="/register" className="cf-footer-link">Register</Link>
              </div>
            </div>
          </div>
          <div className="cf-footer-bottom">
            <span>© {new Date().getFullYear()} CareerFlow. All Rights Reserved.</span>
            <span>Structured Job Search Pipeline</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;