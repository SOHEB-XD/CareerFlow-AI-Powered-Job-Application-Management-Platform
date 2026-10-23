import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  X, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  Briefcase, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  CalendarDays,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { 
  getApplications, 
  addApplication, 
  updateApplication, 
  deleteApplication, 
  updateNoResponse 
} from '../api/applications';
import './Applications.css';

// Canonical application statuses defined by backend schema
const CANONICAL_STATUSES = [
  'Applied',
  'Interview Scheduled',
  'Technical Round',
  'HR Round',
  'Offer Letter',
  'Rejected',
  'Withdrawn',
  'No Response'
];

const INTERVIEW_STATUSES = ['Interview Scheduled', 'Technical Round', 'HR Round'];

const COMMON_SOURCES = [
  'LinkedIn',
  'Company Website',
  'Referral',
  'Indeed',
  'Wellfound',
  'Recruiter Outreach',
  'Other'
];

// Date formatters
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

const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  } catch {
    return '';
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

const Applications = () => {
  // Collection state
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [deletingApp, setDeletingApp] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    companyName: '',
    role: '',
    applicationSource: 'LinkedIn',
    appliedDate: new Date().toISOString().split('T')[0],
    companyWebsite: '',
    hrEmail: '',
    notes: ''
  });
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [createApiError, setCreateApiError] = useState('');

  const [editForm, setEditForm] = useState(null);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [editApiError, setEditApiError] = useState('');

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteApiError, setDeleteApiError] = useState('');

  // Inline status update & prompt states
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [datePrompt, setDatePrompt] = useState(null);
  const [datePromptError, setDatePromptError] = useState('');

  // Auto-dismiss toasts
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [reloadToken, setReloadToken] = useState(0);
  const fetchApplications = useCallback(() => {
    setIsLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const params = { page, limit };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (statusFilter && statusFilter !== 'All') params.status = statusFilter;

    getApplications(params)
      .then(({ data }) => {
        if (!isCancelled && data?.success) {
          setApplications(data.data || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.response?.data?.message || 'Failed to fetch applications. Please check your connection.');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [page, limit, debouncedSearch, statusFilter, reloadToken]);

  // ── Handlers: Status Filter ──
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('All');
    setPage(1);
  };

  // ── Handlers: Inline Status Change ──
  const performStatusUpdate = async (app, newStatus, interviewDate) => {
    setUpdatingStatusId(app._id);
    try {
      const isInterview = INTERVIEW_STATUSES.includes(newStatus);
      const payload = { status: newStatus };
      if (isInterview && interviewDate) {
        payload.interviewDate = interviewDate;
      } else if (!isInterview) {
        payload.interviewDate = null;
      }

      const { data } = await updateApplication(app._id, payload);
      if (data?.success && data?.data) {
        setApplications((prev) =>
          prev.map((item) => (item._id === app._id ? { ...item, ...data.data } : item))
        );
        setToast({
          type: 'success',
          text: `Updated status for ${app.companyName} to "${newStatus}"`
        });
        return true;
      }
      return false;
    } catch (err) {
      setToast({
        type: 'error',
        text: err.response?.data?.message || `Failed to update status for ${app.companyName}. Previous status preserved.`
      });
      return false;
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleInlineStatusChange = async (app, newStatus) => {
    if (app.status === newStatus || updatingStatusId === app._id) return;

    // Transition to a different interview-related status requires fresh interview date confirmation
    const isInterview = INTERVIEW_STATUSES.includes(newStatus);
    if (isInterview) {
      setDatePrompt({
        app,
        targetStatus: newStatus,
        interviewDate: ''
      });
      setDatePromptError('');
      return;
    }

    await performStatusUpdate(app, newStatus);
  };

  const handleDatePromptSubmit = async (e) => {
    e.preventDefault();
    if (!datePrompt.interviewDate) {
      setDatePromptError('Please provide an interview date to proceed');
      return;
    }

    const success = await performStatusUpdate(
      datePrompt.app,
      datePrompt.targetStatus,
      datePrompt.interviewDate
    );
    if (success) {
      setDatePrompt(null);
      setDatePromptError('');
    }
  };

  // ── Handlers: Check No Response (Silent Applications) ──
  const handleCheckNoResponse = async () => {
    try {
      const { data } = await updateNoResponse();
      if (data?.data?.count > 0) {
        setToast({
          type: 'success',
          text: `Updated ${data.data.count} inactive applications to "No Response".`
        });
        fetchApplications();
      } else {
        setToast({
          type: 'info',
          text: 'No applications older than 10 days needed updating.'
        });
      }
    } catch {
      setToast({
        type: 'error',
        text: 'Failed to update inactive applications.'
      });
    }
  };

  // ── Handlers: Create Application ──
  const handleOpenCreateModal = () => {
    setCreateForm({
      companyName: '',
      role: '',
      applicationSource: 'LinkedIn',
      appliedDate: new Date().toISOString().split('T')[0],
      companyWebsite: '',
      hrEmail: '',
      notes: ''
    });
    setCreateFormErrors({});
    setCreateApiError('');
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateApiError('');

    const errors = {};
    if (!createForm.companyName.trim()) errors.companyName = 'Company name is required';
    if (!createForm.role.trim()) errors.role = 'Role / Job title is required';
    if (!createForm.applicationSource.trim()) errors.applicationSource = 'Application source is required';

    if (Object.keys(errors).length > 0) {
      setCreateFormErrors(errors);
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        companyName: createForm.companyName.trim(),
        role: createForm.role.trim(),
        applicationSource: createForm.applicationSource.trim(),
        appliedDate: createForm.appliedDate || undefined,
        companyWebsite: createForm.companyWebsite.trim(),
        hrEmail: createForm.hrEmail.trim(),
        notes: createForm.notes.trim()
      };

      await addApplication(payload);
      setIsCreateOpen(false);
      setToast({ type: 'success', text: `Added application for ${payload.role} at ${payload.companyName}` });
      fetchApplications();
    } catch (err) {
      setCreateApiError(err.response?.data?.message || 'Failed to add application. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Handlers: Edit Application ──
  const handleOpenEditModal = (app) => {
    setEditingApp(app);
    const isInterview = INTERVIEW_STATUSES.includes(app.status);
    setEditForm({
      companyName: app.companyName || '',
      role: app.role || '',
      status: app.status || 'Applied',
      applicationSource: app.applicationSource || 'LinkedIn',
      appliedDate: toInputDate(app.appliedDate),
      interviewDate: isInterview ? toInputDate(app.interviewDate) : '',
      companyWebsite: app.companyWebsite || '',
      hrEmail: app.hrEmail || '',
      notes: app.notes || ''
    });
    setEditFormErrors({});
    setEditApiError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditApiError('');

    const errors = {};
    if (!editForm.companyName.trim()) errors.companyName = 'Company name is required';
    if (!editForm.role.trim()) errors.role = 'Role is required';
    if (!editForm.applicationSource.trim()) errors.applicationSource = 'Source is required';

    // If changing to or in an interview status, check interviewDate
    const isInterview = INTERVIEW_STATUSES.includes(editForm.status);
    if (isInterview && !editForm.interviewDate) {
      errors.interviewDate = 'Please provide an interview date for this stage';
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        companyName: editForm.companyName.trim(),
        role: editForm.role.trim(),
        status: editForm.status,
        applicationSource: editForm.applicationSource.trim(),
        appliedDate: editForm.appliedDate || undefined,
        companyWebsite: editForm.companyWebsite.trim(),
        hrEmail: editForm.hrEmail.trim(),
        notes: editForm.notes.trim()
      };

      if (isInterview && editForm.interviewDate) {
        payload.interviewDate = editForm.interviewDate;
      } else if (!isInterview) {
        payload.interviewDate = null;
      }

      await updateApplication(editingApp._id, payload);
      setEditingApp(null);
      setToast({ type: 'success', text: `Updated ${payload.companyName} (${payload.role})` });
      fetchApplications();
    } catch (err) {
      setEditApiError(err.response?.data?.message || 'Failed to update application. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Handlers: Delete Application ──
  const handleOpenDeleteModal = (app) => {
    setDeletingApp(app);
    setDeleteApiError('');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingApp) return;
    setIsDeleting(true);
    setDeleteApiError('');

    try {
      await deleteApplication(deletingApp._id);
      const deletedName = `${deletingApp.role} at ${deletingApp.companyName}`;
      setDeletingApp(null);
      setToast({ type: 'success', text: `Deleted application for ${deletedName}` });
      fetchApplications();
    } catch (err) {
      setDeleteApiError(err.response?.data?.message || 'Failed to delete application. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="applications-page">
      {/* ── Page Header ── */}
      <header className="applications-header">
        <div className="applications-title-group">
          <h1 className="applications-title">Applications</h1>
          <p className="applications-subtitle">
            Manage, track, and update all your job applications in one place.
          </p>
        </div>

        <div className="applications-header-actions">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleCheckNoResponse}
            title="Update applications older than 10 days to 'No Response'"
          >
            <Clock size={15} strokeWidth={2} aria-hidden="true" />
            <span>Check Inactive</span>
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleOpenCreateModal}
          >
            <Plus size={15} strokeWidth={2.4} aria-hidden="true" />
            <span>Add Application</span>
          </button>
        </div>
      </header>

      {/* ── Toast Notifications ── */}
      {toast && (
        <div 
          className={`app-alert ${toast.type === 'error' ? 'app-alert-error' : 'app-alert-success'}`}
          role="status"
        >
          {toast.type === 'error' ? (
            <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
          )}
          <span>{toast.text}</span>
          <button 
            type="button" 
            className="app-alert-action" 
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Top Level Error Banner with Retry ── */}
      {error && (
        <div className="app-alert app-alert-error" role="alert">
          <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
          <span>{error}</span>
          <button 
            type="button" 
            className="app-alert-action" 
            onClick={fetchApplications}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Controls: Search and Status Filters ── */}
      <section className="applications-controls" aria-label="Search and Filter Applications">
        <div className="controls-row-top">
          <div className="search-input-wrap">
            <Search size={15} strokeWidth={2} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search applications by company or role"
            />
            {searchQuery && (
              <button 
                type="button" 
                className="search-clear-btn" 
                onClick={() => setSearchQuery('')}
                aria-label="Clear search input"
              >
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>

          {(debouncedSearch || statusFilter !== 'All') && (
            <button 
              type="button" 
              className="clear-filters-link" 
              onClick={handleClearFilters}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div className="status-filters-wrap" role="group" aria-label="Filter by Status">
          <button
            type="button"
            className={`status-pill${statusFilter === 'All' ? ' active' : ''}`}
            onClick={() => handleStatusFilterChange('All')}
          >
            All
          </button>
          {CANONICAL_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={`status-pill${statusFilter === status ? ' active' : ''}`}
              onClick={() => handleStatusFilterChange(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {/* ── Application Collection / Table Card ── */}
      <section className="applications-table-card" aria-label="Applications List">
        {isLoading ? (
          /* Loading Skeleton */
          <div className="applications-skeleton-stack">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="applications-skeleton-row" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          /* Empty States */
          <div className="applications-empty-state">
            <div className="empty-icon-wrap" aria-hidden="true">
              {debouncedSearch || statusFilter !== 'All' ? (
                <Search size={22} strokeWidth={1.8} />
              ) : (
                <Briefcase size={22} strokeWidth={1.8} />
              )}
            </div>

            {debouncedSearch || statusFilter !== 'All' ? (
              <>
                <h2 className="empty-state-title">No matching applications</h2>
                <p className="empty-state-desc">
                  No applications matched your current search or filter criteria. Try resetting them to see all records.
                </p>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <h2 className="empty-state-title">No applications yet</h2>
                <p className="empty-state-desc">
                  You haven't tracked any job applications yet. Add your first application to stay on top of your search.
                </p>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleOpenCreateModal}
                >
                  <Plus size={15} strokeWidth={2.4} aria-hidden="true" />
                  <span>Add First Application</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Structured Table */}
            <div className="table-responsive">
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role & Source</th>
                    <th>Status</th>
                    <th>Applied Date</th>
                    <th>Interview Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app._id}>
                      {/* Company */}
                      <td>
                        <div className="company-cell">
                          <div className="company-avatar" aria-hidden="true">
                            {app.companyName?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div className="company-info">
                            {app.companyWebsite ? (
                              <a 
                                href={app.companyWebsite.startsWith('http') ? app.companyWebsite : `https://${app.companyWebsite}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="company-name-link"
                                title={`Visit ${app.companyName}`}
                              >
                                <span>{app.companyName}</span>
                                <ExternalLink size={11} strokeWidth={2} aria-hidden="true" />
                              </a>
                            ) : (
                              <span className="company-name-text">{app.companyName}</span>
                            )}
                            {app.hrEmail && (
                              <span className="company-subtext">{app.hrEmail}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role & Source */}
                      <td>
                        <div className="role-title">{app.role}</div>
                        {app.applicationSource && (
                          <span className="source-badge">{app.applicationSource}</span>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td>
                        <div 
                          className={`status-dropdown-wrap ${getStatusBadgeClass(app.status)} ${updatingStatusId === app._id ? 'is-updating' : ''}`}
                          title="Click to change status"
                        >
                          {updatingStatusId === app._id ? (
                            <div className="status-updating-indicator">
                              <Loader2 size={11} className="spin-animate" aria-hidden="true" />
                              <span>{app.status}</span>
                            </div>
                          ) : (
                            <div className="status-select-container">
                              <select
                                className="status-select-control"
                                value={app.status}
                                onChange={(e) => handleInlineStatusChange(app, e.target.value)}
                                disabled={updatingStatusId === app._id}
                                aria-label={`Change status for ${app.companyName} (${app.role})`}
                              >
                                {CANONICAL_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={11} strokeWidth={2.5} className="status-select-arrow" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Applied Date */}
                      <td>
                        <span className="date-text">
                          {formatDate(app.appliedDate)}
                        </span>
                      </td>

                      {/* Interview Date */}
                      <td>
                        {app.interviewDate ? (
                          <span className="interview-date-text">
                            <CalendarDays size={13} strokeWidth={2} className="interview-date-icon" aria-hidden="true" />
                            <span>{formatInterviewDate(app.interviewDate)}</span>
                          </span>
                        ) : (
                          <span className="date-empty">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleOpenEditModal(app)}
                            title={`Edit ${app.companyName} application`}
                            aria-label={`Edit ${app.companyName} application`}
                          >
                            <Pencil size={14} strokeWidth={1.8} />
                          </button>
                          <button
                            type="button"
                            className="action-btn delete-btn"
                            onClick={() => handleOpenDeleteModal(app)}
                            title={`Delete ${app.companyName} application`}
                            aria-label={`Delete ${app.companyName} application`}
                          >
                            <Trash2 size={14} strokeWidth={1.8} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Responsive Layout < 768px) */}
            <div className="mobile-cards-list">
              {applications.map((app) => (
                <article key={app._id} className="mobile-app-card">
                  <div className="mobile-card-header">
                    <div className="mobile-card-brand">
                      <div className="company-avatar" aria-hidden="true">
                        {app.companyName?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div className="mobile-card-title-group">
                        <h3 className="mobile-card-company">{app.companyName}</h3>
                        <p className="mobile-card-role">{app.role}</p>
                      </div>
                    </div>

                    <div 
                      className={`status-dropdown-wrap ${getStatusBadgeClass(app.status)} ${updatingStatusId === app._id ? 'is-updating' : ''}`}
                      title="Click to change status"
                    >
                      {updatingStatusId === app._id ? (
                        <div className="status-updating-indicator">
                          <Loader2 size={11} className="spin-animate" aria-hidden="true" />
                          <span>{app.status}</span>
                        </div>
                      ) : (
                        <div className="status-select-container">
                          <select
                            className="status-select-control"
                            value={app.status}
                            onChange={(e) => handleInlineStatusChange(app, e.target.value)}
                            disabled={updatingStatusId === app._id}
                            aria-label={`Change status for ${app.companyName} (${app.role})`}
                          >
                            {CANONICAL_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={11} strokeWidth={2.5} className="status-select-arrow" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mobile-card-meta">
                    <div className="mobile-meta-item">
                      <span className="mobile-meta-label">Applied:</span>
                      <span className="mobile-meta-val">{formatDate(app.appliedDate)}</span>
                    </div>
                    {app.interviewDate && (
                      <div className="mobile-meta-item highlight">
                        <span className="mobile-meta-label">
                          <CalendarDays size={11} strokeWidth={2} className="mobile-interview-icon" aria-hidden="true" />
                          <span>Interview:</span>
                        </span>
                        <span className="mobile-meta-val">{formatInterviewDate(app.interviewDate)}</span>
                      </div>
                    )}
                    {app.applicationSource && (
                      <div className="mobile-meta-item">
                        <span className="mobile-meta-label">Source:</span>
                        <span className="mobile-meta-val">{app.applicationSource}</span>
                      </div>
                    )}
                  </div>

                  <div className="mobile-card-actions">
                    <button
                      type="button"
                      className="btn-secondary mobile-action-btn"
                      onClick={() => handleOpenEditModal(app)}
                    >
                      <Pencil size={13} strokeWidth={1.8} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary mobile-action-btn delete-action"
                      onClick={() => handleOpenDeleteModal(app)}
                    >
                      <Trash2 size={13} strokeWidth={1.8} />
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* ── Pagination Controls ── */}
            <footer className="applications-pagination">
              <span className="pagination-info">
                Page {page} {applications.length > 0 && `(${applications.length} on this page)`}
              </span>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} strokeWidth={2} />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={applications.length < limit || isLoading}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={15} strokeWidth={2} />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      {/* ═════════════════════════════════════════════════════════════════════════
          CREATE APPLICATION MODAL
          ═════════════════════════════════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="modal-backdrop" onClick={() => !isCreating && setIsCreateOpen(false)}>
          <div 
            className="modal-dialog" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-modal-title"
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <h2 id="create-modal-title" className="modal-title">New Application</h2>
                <span className="modal-subtitle">Track a new job application in your pipeline</span>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => !isCreating && setIsCreateOpen(false)}
                aria-label="Close modal"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} noValidate>
              <div className="modal-body">
                {createApiError && (
                  <div className="app-alert app-alert-error" role="alert">
                    <AlertCircle size={16} strokeWidth={2} />
                    <span>{createApiError}</span>
                  </div>
                )}

                <div className="form-grid-2">
                  <div className="modal-field">
                    <label htmlFor="create-companyName">
                      Company Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="create-companyName"
                      type="text"
                      className={`modal-input${createFormErrors.companyName ? ' has-error' : ''}`}
                      placeholder="e.g. Acme Corp"
                      value={createForm.companyName}
                      onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                      required
                      disabled={isCreating}
                    />
                    {createFormErrors.companyName && (
                      <span className="field-error-text">{createFormErrors.companyName}</span>
                    )}
                  </div>

                  <div className="modal-field">
                    <label htmlFor="create-role">
                      Job Role / Title <span className="required-star">*</span>
                    </label>
                    <input
                      id="create-role"
                      type="text"
                      className={`modal-input${createFormErrors.role ? ' has-error' : ''}`}
                      placeholder="e.g. Senior Frontend Engineer"
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                      required
                      disabled={isCreating}
                    />
                    {createFormErrors.role && (
                      <span className="field-error-text">{createFormErrors.role}</span>
                    )}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="modal-field">
                    <label htmlFor="create-source">
                      Application Source <span className="required-star">*</span>
                    </label>
                    <select
                      id="create-source"
                      className="modal-select"
                      value={createForm.applicationSource}
                      onChange={(e) => setCreateForm({ ...createForm, applicationSource: e.target.value })}
                      disabled={isCreating}
                    >
                      {COMMON_SOURCES.map((src) => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>

                  <div className="modal-field">
                    <label htmlFor="create-appliedDate">Applied Date</label>
                    <input
                      id="create-appliedDate"
                      type="date"
                      className="modal-input"
                      value={createForm.appliedDate}
                      onChange={(e) => setCreateForm({ ...createForm, appliedDate: e.target.value })}
                      disabled={isCreating}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="modal-field">
                    <label htmlFor="create-website">Company Website</label>
                    <input
                      id="create-website"
                      type="url"
                      className="modal-input"
                      placeholder="https://company.com"
                      value={createForm.companyWebsite}
                      onChange={(e) => setCreateForm({ ...createForm, companyWebsite: e.target.value })}
                      disabled={isCreating}
                    />
                  </div>

                  <div className="modal-field">
                    <label htmlFor="create-hrEmail">Recruiter / HR Email</label>
                    <input
                      id="create-hrEmail"
                      type="email"
                      className="modal-input"
                      placeholder="recruiter@company.com"
                      value={createForm.hrEmail}
                      onChange={(e) => setCreateForm({ ...createForm, hrEmail: e.target.value })}
                      disabled={isCreating}
                    />
                  </div>
                </div>

                <div className="modal-field">
                  <label htmlFor="create-notes">Notes / Job Details</label>
                  <textarea
                    id="create-notes"
                    className="modal-textarea"
                    placeholder="Salary expectations, interview tips, referral name, or job requirements..."
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isCreating}
                >
                  {isCreating ? 'Adding Application...' : 'Save Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          EDIT APPLICATION MODAL
          ═════════════════════════════════════════════════════════════════════════ */}
      {editingApp && editForm && (
        <div className="modal-backdrop" onClick={() => !isUpdating && setEditingApp(null)}>
          <div 
            className="modal-dialog" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <h2 id="edit-modal-title" className="modal-title">Edit Application</h2>
                <span className="modal-subtitle">Update stage, interview details, or notes</span>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => !isUpdating && setEditingApp(null)}
                aria-label="Close modal"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} noValidate>
              <div className="modal-body">
                {editApiError && (
                  <div className="app-alert app-alert-error" role="alert">
                    <AlertCircle size={16} strokeWidth={2} />
                    <span>{editApiError}</span>
                  </div>
                )}

                <div className="form-grid-2">
                  <div className="modal-field">
                    <label htmlFor="edit-companyName">
                      Company Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="edit-companyName"
                      type="text"
                      className={`modal-input${editFormErrors.companyName ? ' has-error' : ''}`}
                      value={editForm.companyName}
                      onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                      required
                      disabled={isUpdating}
                    />
                    {editFormErrors.companyName && (
                      <span className="field-error-text">{editFormErrors.companyName}</span>
                    )}
                  </div>

                  <div className="modal-field">
                    <label htmlFor="edit-role">
                      Job Role <span className="required-star">*</span>
                    </label>
                    <input
                      id="edit-role"
                      type="text"
                      className={`modal-input${editFormErrors.role ? ' has-error' : ''}`}
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      required
                      disabled={isUpdating}
                    />
                    {editFormErrors.role && (
                      <span className="field-error-text">{editFormErrors.role}</span>
                    )}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="modal-field">
                    <label htmlFor="edit-status">Application Status</label>
                    <select
                      id="edit-status"
                      className="modal-select"
                      value={editForm.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value;
                        const isChangingToDifferentInterview =
                          INTERVIEW_STATUSES.includes(nextStatus) && nextStatus !== editingApp.status;
                        const isNonInterview = !INTERVIEW_STATUSES.includes(nextStatus);

                        let nextInterviewDate = editForm.interviewDate;
                        if (isChangingToDifferentInterview || isNonInterview) {
                          nextInterviewDate = '';
                        } else if (nextStatus === editingApp.status && INTERVIEW_STATUSES.includes(editingApp.status)) {
                          nextInterviewDate = toInputDate(editingApp.interviewDate);
                        }

                        setEditForm({
                          ...editForm,
                          status: nextStatus,
                          interviewDate: nextInterviewDate
                        });
                        if (editFormErrors.interviewDate) {
                          setEditFormErrors((prev) => ({ ...prev, interviewDate: undefined }));
                        }
                      }}
                      disabled={isUpdating}
                    >
                      {CANONICAL_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="modal-field">
                    <label htmlFor="edit-source">Source</label>
                    <select
                      id="edit-source"
                      className="modal-select"
                      value={editForm.applicationSource}
                      onChange={(e) => setEditForm({ ...editForm, applicationSource: e.target.value })}
                      disabled={isUpdating}
                    >
                      {COMMON_SOURCES.map((src) => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conditional Interview Date field when status is an Interview status */}
                {INTERVIEW_STATUSES.includes(editForm.status) && (
                  <div className="modal-field-interview-alert">
                    <label htmlFor="edit-interviewDate" className="interview-alert-label">
                      Interview Date & Time <span className="required-star">*</span>
                    </label>
                    <input
                      id="edit-interviewDate"
                      type="date"
                      className={`modal-input${editFormErrors.interviewDate ? ' has-error' : ''}`}
                      value={editForm.interviewDate}
                      onChange={(e) => setEditForm({ ...editForm, interviewDate: e.target.value })}
                      disabled={isUpdating}
                    />
                    {editFormErrors.interviewDate && (
                      <span className="field-error-text">{editFormErrors.interviewDate}</span>
                    )}
                  </div>
                )}

                <div className="form-grid-2">
                  <div className="modal-field">
                    <label htmlFor="edit-appliedDate">Applied Date</label>
                    <input
                      id="edit-appliedDate"
                      type="date"
                      className="modal-input"
                      value={editForm.appliedDate}
                      onChange={(e) => setEditForm({ ...editForm, appliedDate: e.target.value })}
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="modal-field">
                    <label htmlFor="edit-hrEmail">HR / Recruiter Email</label>
                    <input
                      id="edit-hrEmail"
                      type="email"
                      className="modal-input"
                      value={editForm.hrEmail}
                      onChange={(e) => setEditForm({ ...editForm, hrEmail: e.target.value })}
                      disabled={isUpdating}
                    />
                  </div>
                </div>

                <div className="modal-field">
                  <label htmlFor="edit-website">Company Website</label>
                  <input
                    id="edit-website"
                    type="url"
                    className="modal-input"
                    value={editForm.companyWebsite}
                    onChange={(e) => setEditForm({ ...editForm, companyWebsite: e.target.value })}
                    disabled={isUpdating}
                  />
                </div>

                <div className="modal-field">
                  <label htmlFor="edit-notes">Notes</label>
                  <textarea
                    id="edit-notes"
                    className="modal-textarea"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    disabled={isUpdating}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingApp(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
          ═════════════════════════════════════════════════════════════════════════ */}
      {deletingApp && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setDeletingApp(null)}>
          <div 
            className="modal-dialog modal-dialog-delete" 
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
          >
            <div className="modal-header">
              <h2 id="delete-dialog-title" className="modal-title">
                Delete Application
              </h2>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => !isDeleting && setDeletingApp(null)}
                aria-label="Close dialog"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="modal-body">
              {deleteApiError && (
                <div className="app-alert app-alert-error" role="alert">
                  <AlertCircle size={16} strokeWidth={2} />
                  <span>{deleteApiError}</span>
                </div>
              )}

              <p id="delete-dialog-desc" className="delete-confirm-text">
                Are you sure you want to delete your application for{' '}
                <strong>{deletingApp.role}</strong> at <strong>{deletingApp.companyName}</strong>?
              </p>
              <p className="delete-confirm-sub">
                This record and its associated history will be permanently removed.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeletingApp(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Application'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ═════════════════════════════════════════════════════════════════════════
          INTERVIEW DATE PROMPT MODAL (FOR INLINE STATUS TRANSITIONS)
          ═════════════════════════════════════════════════════════════════════════ */}
      {datePrompt && (
        <div className="modal-backdrop" onClick={() => !updatingStatusId && setDatePrompt(null)}>
          <div 
            className="modal-dialog modal-dialog-prompt"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-modal-title"
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <h2 id="prompt-modal-title" className="modal-title">
                  Interview Date Required
                </h2>
                <span className="modal-subtitle">
                  Moving to &ldquo;{datePrompt.targetStatus}&rdquo; requires an interview date
                </span>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => !updatingStatusId && setDatePrompt(null)}
                aria-label="Close dialog"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleDatePromptSubmit} noValidate>
              <div className="modal-body">
                {datePromptError && (
                  <div className="app-alert app-alert-error" role="alert">
                    <AlertCircle size={16} strokeWidth={2} />
                    <span>{datePromptError}</span>
                  </div>
                )}

                <p className="prompt-lead-text">
                  To update <strong>{datePrompt.app.companyName}</strong> ({datePrompt.app.role}) to{' '}
                  <span className="cf-status-pill badge-blue">{datePrompt.targetStatus}</span>, please specify the interview date.
                </p>

                <div className="modal-field">
                  <label htmlFor="prompt-interviewDate">
                    Interview Date <span className="required-star">*</span>
                  </label>
                  <input
                    id="prompt-interviewDate"
                    type="date"
                    className={`modal-input${datePromptError ? ' has-error' : ''}`}
                    value={datePrompt.interviewDate}
                    onChange={(e) => {
                      setDatePrompt({ ...datePrompt, interviewDate: e.target.value });
                      setDatePromptError('');
                    }}
                    required
                    disabled={updatingStatusId === datePrompt.app._id}
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDatePrompt(null)}
                  disabled={updatingStatusId === datePrompt.app._id}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updatingStatusId === datePrompt.app._id}
                >
                  {updatingStatusId === datePrompt.app._id ? 'Updating...' : 'Save & Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
