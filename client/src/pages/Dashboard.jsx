import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { 
  Calendar, 
  Briefcase, 
  AlertCircle, 
  Plus, 
  ArrowRight, 
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, getRecentApplications, getUpcomingInterviews } from '../api/dashboard';
import './Dashboard.css';

// --- Utility Functions ---
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
  }
};

const formatInterviewDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return dateStr;
  }
};

// Canonical status presentation locked to #000000, #FFFFFF, #0000FF
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Interview Scheduled':
    case 'Technical Round':
    case 'HR Round':
      return 'badge-blue';
    case 'Offer Letter':
      return 'badge-black';
    case 'Applied':
      return 'badge-neutral';
    default:
      return 'badge-quiet';
  }
};

const getStatusDisplayLabel = (status) => {
  switch (status) {
    case 'Interview Scheduled': return 'Interview';
    case 'Technical Round': return 'Technical';
    case 'HR Round': return 'HR Round';
    case 'Offer Letter': return 'Offer';
    case 'No Response': return 'No Response';
    default: return status || 'Applied';
  }
};

// --- Skeleton Component ---
const Skeleton = ({ width = '100%', height = '1rem', radius = '4px' }) => (
  <div className="cf-skeleton" style={{ width, height, borderRadius: radius }} />
);

// --- Pipeline Component ---
const PipelineSummary = ({ stats, isLoading }) => {
  const total = stats?.totalApplications || 0;

  const stages = [
    { key: 'applied', label: 'Applied', color: '#000000' },
    { key: 'interviewScheduled', label: 'Interview', color: '#0000FF' },
    { key: 'technicalRound', label: 'Technical', color: '#0000FF' },
    { key: 'hrRound', label: 'HR Round', color: '#0000FF' },
    { key: 'offerLetter', label: 'Offer', color: '#000000' },
    { key: 'rejected', label: 'Rejected', color: 'rgba(0,0,0,0.25)' },
    { key: 'withdrawn', label: 'Withdrawn', color: 'rgba(0,0,0,0.2)' },
    { key: 'noResponse', label: 'No Response', color: 'rgba(0,0,0,0.15)' },
  ];

  if (isLoading) {
    return (
      <div className="cf-pipeline-card">
        <Skeleton height="8px" radius="4px" />
        <div style={{ marginTop: '12px' }}>
          <Skeleton width="40%" height="14px" />
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="cf-pipeline-card cf-pipeline-empty">
        <p className="cf-pipeline-empty-text">
          No pipeline distribution yet. Add your first application to track velocity across stages.
        </p>
      </div>
    );
  }

  return (
    <div className="cf-pipeline-card">
      <div className="cf-pipeline-bar" aria-label="Pipeline distribution bar">
        {stages.map(({ key, color }) => {
          const count = stats?.[key] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              className="cf-pipeline-segment"
              style={{ backgroundColor: color, width: `${pct}%` }}
              title={`${key}: ${count} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      <div className="cf-pipeline-legend">
        {stages.map(({ key, label, color }) => {
          const count = stats?.[key] || 0;
          if (count === 0) return null;
          return (
            <div key={key} className="cf-legend-item">
              <span className="cf-legend-dot" style={{ backgroundColor: color }} />
              <span className="cf-legend-label">{label}</span>
              <span className="cf-legend-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Main Dashboard Overview ---
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [statsRes, recentRes, interviewsRes] = await Promise.all([
          getDashboardStats(),
          getRecentApplications(),
          getUpcomingInterviews(),
        ]);
        if (!ignore) {
          setStats(statsRes.data?.data || null);
          setRecent(recentRes.data?.data || []);
          setInterviews(interviewsRes.data?.data || []);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          if (err.response?.status === 404) {
            setRecent([]);
          } else {
            setError(err.response?.data?.message || 'Failed to load dashboard data. Please verify your connection.');
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((prev) => prev + 1);
  };

  const activeCount = stats
    ? (stats.applied + stats.interviewScheduled + stats.technicalRound + stats.hrRound)
    : 0;

  const totalInterviews = stats
    ? ((stats.interviewScheduled || 0) + (stats.technicalRound || 0) + (stats.hrRound || 0))
    : 0;

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <div className="cf-dashboard">
      {/* ── Page Header ── */}
      <header className="cf-dashboard-header">
        <div className="cf-dashboard-title-wrap">
          <h1 className="cf-dashboard-title">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="cf-dashboard-desc">
            {loading ? (
              'Retrieving your career pipeline overview…'
            ) : stats?.totalApplications ? (
              `You have ${activeCount} active application${activeCount === 1 ? '' : 's'} in progress across your pipeline.`
            ) : (
              'Your job search command center. Organize submissions, interviews, and offers in one place.'
            )}
          </p>
        </div>

        <div className="cf-dashboard-header-actions">
          <Link 
            to="/dashboard/applications" 
            className="cf-btn-primary"
            aria-label="Go to your applications"
          >
            <span>Go to your applications →</span>
          </Link>
        </div>
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div className="cf-dashboard-error" role="alert">
          <div className="cf-error-text">
            <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={handleRetry} className="cf-error-retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* ── Key Metrics Summary Strip ── */}
      <section className="cf-metrics-strip" aria-label="Key Search Metrics">
        <div className="cf-metric-card">
          <span className="cf-metric-label">Total Applications</span>
          <div className="cf-metric-body">
            {loading ? (
              <Skeleton width="48px" height="2rem" />
            ) : (
              <span className="cf-metric-value">{stats?.totalApplications || 0}</span>
            )}
          </div>
          <span className="cf-metric-sub">All logged entries</span>
        </div>

        <div className="cf-metric-card">
          <div className="cf-metric-header">
            <span className="cf-metric-label">Active Pipeline</span>
            <span className="cf-metric-indicator" aria-hidden="true" />
          </div>
          <div className="cf-metric-body">
            {loading ? (
              <Skeleton width="48px" height="2rem" />
            ) : (
              <span className="cf-metric-value highlight">{activeCount}</span>
            )}
          </div>
          <span className="cf-metric-sub">In review or interview</span>
        </div>

        <div className="cf-metric-card">
          <span className="cf-metric-label">Interviews</span>
          <div className="cf-metric-body">
            {loading ? (
              <Skeleton width="48px" height="2rem" />
            ) : (
              <span className="cf-metric-value">{totalInterviews}</span>
            )}
          </div>
          <span className="cf-metric-sub">Scheduled & technical</span>
        </div>

        <div className="cf-metric-card">
          <span className="cf-metric-label">Offers Received</span>
          <div className="cf-metric-body">
            {loading ? (
              <Skeleton width="48px" height="2rem" />
            ) : (
              <span className="cf-metric-value">{stats?.offerLetter || 0}</span>
            )}
          </div>
          <span className="cf-metric-sub">Ready for decision</span>
        </div>

        <div className="cf-metric-card">
          <span className="cf-metric-label">Archived</span>
          <div className="cf-metric-body">
            {loading ? (
              <Skeleton width="48px" height="2rem" />
            ) : (
              <span className="cf-metric-value">
                {(stats?.rejected || 0) + (stats?.withdrawn || 0) + (stats?.noResponse || 0)}
              </span>
            )}
          </div>
          <span className="cf-metric-sub">Closed or withdrawn</span>
        </div>
      </section>

      {/* ── Pipeline Distribution Section ── */}
      <section className="cf-dashboard-section" aria-label="Pipeline Velocity">
        <div className="cf-section-header">
          <h2 className="cf-section-heading">Application Pipeline</h2>
          <span className="cf-section-meta">Stage Distribution</span>
        </div>
        <PipelineSummary stats={stats} isLoading={loading} />
      </section>

      {/* ── Two-Column Operational Grid ── */}
      <div className="cf-dashboard-grid">
        {/* Left Column: Recent Applications */}
        <section className="cf-grid-column" aria-label="Recent Applications">
          <div className="cf-section-header">
            <div className="cf-header-title-group">
              <h2 className="cf-section-heading">Recent Applications</h2>
              {recent.length > 0 && (
                <span className="cf-heading-badge">{recent.length}</span>
              )}
            </div>
            <Link to="/dashboard/applications" className="cf-section-link">
              <span>View all</span>
              <ArrowRight size={13} strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>

          <div className="cf-recent-container">
            {loading ? (
              <div className="cf-loading-stack">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="cf-table-row skeleton-row">
                    <Skeleton width="28px" height="28px" radius="4px" />
                    <div style={{ flex: 1 }}>
                      <Skeleton width="60%" height="13px" />
                      <div style={{ marginTop: '4px' }}>
                        <Skeleton width="40%" height="11px" />
                      </div>
                    </div>
                    <Skeleton width="70px" height="20px" radius="3px" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="cf-empty-box">
                <div className="cf-empty-icon-wrap" aria-hidden="true">
                  <Briefcase size={22} strokeWidth={1.8} />
                </div>
                <h3 className="cf-empty-title">No applications logged yet</h3>
                <p className="cf-empty-desc">
                  Start tracking your job search by adding companies, roles, and current statuses.
                </p>
                <Link to="/dashboard/applications" className="cf-btn-secondary">
                  <Plus size={14} strokeWidth={2} aria-hidden="true" />
                  <span>Add First Application</span>
                </Link>
              </div>
            ) : (
              <div className="cf-recent-table" role="table" aria-label="Recent applications table">
                {recent.map((app) => (
                  <div
                    key={app._id}
                    className="cf-table-row"
                    role="row"
                    tabIndex={0}
                    onClick={() => navigate('/dashboard/applications')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate('/dashboard/applications');
                      }
                    }}
                  >
                    <div className="cf-row-brand">
                      <div className="cf-company-avatar" aria-hidden="true">
                        {app.companyName ? app.companyName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="cf-row-details">
                        <span className="cf-row-company">{app.companyName}</span>
                        <span className="cf-row-role">{app.role}</span>
                      </div>
                    </div>

                    <div className="cf-row-meta">
                      <span className={`cf-status-pill ${getStatusBadgeClass(app.status)}`}>
                        {getStatusDisplayLabel(app.status)}
                      </span>
                      <span className="cf-row-date">
                        {formatDate(app.appliedDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Upcoming Interviews */}
        <section className="cf-grid-column" aria-label="Upcoming Interviews">
          <div className="cf-section-header">
            <div className="cf-header-title-group">
              <h2 className="cf-section-heading">Upcoming Interviews</h2>
              {interviews.length > 0 && (
                <span className="cf-heading-badge alert">{interviews.length}</span>
              )}
            </div>
            <Link to="/dashboard/applications" className="cf-section-link">
              <span>Manage</span>
              <ArrowRight size={13} strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>

          <div className="cf-interviews-container">
            {loading ? (
              <div className="cf-loading-stack">
                {[1, 2].map((i) => (
                  <div key={i} className="cf-interview-card skeleton-card">
                    <Skeleton width="50%" height="14px" />
                    <Skeleton width="75%" height="12px" />
                    <Skeleton width="40%" height="11px" />
                  </div>
                ))}
              </div>
            ) : interviews.length === 0 ? (
              <div className="cf-empty-box">
                <div className="cf-empty-icon-wrap" aria-hidden="true">
                  <Calendar size={22} strokeWidth={1.8} />
                </div>
                <h3 className="cf-empty-title">No upcoming interviews</h3>
                <p className="cf-empty-desc">
                  When you advance an application to an interview stage and set a date, it will appear here.
                </p>
              </div>
            ) : (
              <div className="cf-interviews-stack">
                {interviews.map((item) => (
                  <motion.div
                    key={item._id}
                    className="cf-interview-card"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    tabIndex={0}
                    onClick={() => navigate('/dashboard/applications')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate('/dashboard/applications');
                      }
                    }}
                  >
                    <div className="cf-interview-card-top">
                      <div className="cf-interview-company-info">
                        <span className="cf-interview-company">{item.companyName}</span>
                        <span className="cf-interview-role">{item.role}</span>
                      </div>
                      <span className="cf-interview-pill">Scheduled</span>
                    </div>

                    <div className="cf-interview-card-footer">
                      <CalendarDays size={13} strokeWidth={1.8} aria-hidden="true" />
                      <span>{formatInterviewDate(item.interviewDate)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
