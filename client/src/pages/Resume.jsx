import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  Clock,
  MoreVertical
} from 'lucide-react';
import {
  getResumes,
  uploadResume,
  setCurrentResume,
  updateResumeNote,
  deleteResume,
  downloadResumeBlob
} from '../api/resume';
import './Resume.css';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

const formatTargetText = (targetCompany, targetRole, note) => {
  const parts = [];
  if (targetCompany && targetCompany.trim()) parts.push(targetCompany.trim());
  if (targetRole && targetRole.trim()) parts.push(targetRole.trim());
  if (parts.length === 0) return null;
  const combined = parts.join(' · ');
  if (note && note.trim().toLowerCase() === combined.toLowerCase()) return null;
  return combined;
};

const Resume = () => {
  const shouldReduceMotion = useReducedMotion();

  // ── State ──
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // ── Action Menu ──
  const [openMenuId, setOpenMenuId] = useState(null);

  // ── Modals ──
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNote, setUploadNote] = useState('');
  const [uploadCompany, setUploadCompany] = useState('');
  const [uploadRole, setUploadRole] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const [editingResume, setEditingResume] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [editError, setEditError] = useState('');

  const [deletingResume, setDeletingResume] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Close ellipsis dropdown on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.resume-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const [reloadKey, setReloadKey] = useState(0);

  // Fetch resumes via effect
  useEffect(() => {
    let ignore = false;

    async function loadResumes() {
      try {
        const { data } = await getResumes();
        if (!ignore && data?.success) {
          setResumes(data.data || []);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Failed to fetch resume library. Please verify your connection.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadResumes();

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((prev) => prev + 1);
  }, []);

  // Lock body scroll and Escape key handling for open modals
  const activeModal = isUploadOpen || editingResume || deletingResume;

  const handleCloseAllModals = useCallback(() => {
    if (isUploading || isSavingNote || isDeleting) return;
    setIsUploadOpen(false);
    setUploadFile(null);
    setUploadNote('');
    setUploadCompany('');
    setUploadRole('');
    setUploadError('');
    setEditingResume(null);
    setEditFile(null);
    setDeletingResume(null);
    setOpenMenuId(null);
  }, [isUploading, isSavingNote, isDeleting]);

  useEffect(() => {
    if (!activeModal) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseAllModals();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeModal, handleCloseAllModals]);

  // ── Handlers: File Select & Drag-and-Drop ──
  const processSelectedFile = (file) => {
    setUploadError('');
    if (!file) return;

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setUploadError(`Unsupported format. Please select one of: ${allowedExtensions.join(', ')}`);
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError('File size exceeds the 10MB limit.');
      return;
    }

    setUploadFile(file);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // ── Handlers: Upload ──
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a resume file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(uploadFile);
      });

      const base64Data = await base64Promise;

      let textContent = '';
      if (uploadFile.name.endsWith('.txt') || uploadFile.type.startsWith('text/')) {
        try {
          textContent = await uploadFile.text();
        } catch {
          textContent = '';
        }
      }

      const payload = {
        originalFileName: uploadFile.name,
        fileData: base64Data,
        fileContentType: uploadFile.type || 'application/pdf',
        fileSize: uploadFile.size,
        resumeText: textContent,
        note: uploadNote.trim(),
        targetCompany: uploadCompany.trim(),
        targetRole: uploadRole.trim()
      };

      const { data } = await uploadResume(payload);

      if (data?.success) {
        setIsUploadOpen(false);
        setUploadFile(null);
        setUploadNote('');
        setUploadCompany('');
        setUploadRole('');
        setToast({
          type: 'success',
          text: `Resume version v${data.data?.version || 'new'} uploaded and set as active.`
        });
        handleRefresh();
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // ── Handlers: Set Active Version ──
  const handleSetCurrent = async (resume) => {
    if (resume.isCurrent) return;
    setActionLoadingId(resume._id);
    try {
      const { data } = await setCurrentResume(resume._id);
      if (data?.success) {
        setResumes((prev) =>
          prev.map((r) => ({
            ...r,
            isCurrent: r._id === resume._id
          }))
        );
        setToast({
          type: 'success',
          text: `Version v${resume.version} is now your active resume.`
        });
      }
    } catch (err) {
      setToast({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update active resume.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Handlers: Download ──
  const handleDownload = async (resume) => {
    setActionLoadingId(resume._id);
    try {
      const response = await downloadResumeBlob(resume._id);
      const blob = new Blob([response.data], {
        type: resume.fileContentType || 'application/octet-stream'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = resume.originalFileName || `resume_v${resume.version}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setToast({
        type: 'error',
        text: err.response?.data?.message || 'Failed to download resume file.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Handlers: Edit Note & Replacement File ──
  const processEditFile = (file) => {
    setEditError('');
    if (!file) return;

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setEditError(`Unsupported format. Please select one of: ${allowedExtensions.join(', ')}`);
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setEditError('File size exceeds the 10MB limit.');
      return;
    }

    setEditFile(file);
  };

  const handleEditFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processEditFile(e.target.files[0]);
    }
  };

  const handleOpenEditNote = (resume) => {
    setEditingResume(resume);
    setEditNote(resume.note || '');
    setEditCompany(resume.targetCompany || '');
    setEditRole(resume.targetRole || '');
    setEditFile(null);
    setEditError('');
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!editingResume) return;

    setIsSavingNote(true);
    setEditError('');

    try {
      if (editFile) {
        // Upload replacement file as new resume version
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(editFile);
        });

        const base64Data = await base64Promise;

        let textContent = '';
        if (editFile.name.endsWith('.txt') || editFile.type.startsWith('text/')) {
          try {
            textContent = await editFile.text();
          } catch {
            textContent = '';
          }
        }

        const payload = {
          originalFileName: editFile.name,
          fileData: base64Data,
          fileContentType: editFile.type || 'application/pdf',
          fileSize: editFile.size,
          resumeText: textContent,
          note: editNote.trim(),
          targetCompany: editCompany.trim(),
          targetRole: editRole.trim()
        };

        const { data } = await uploadResume(payload);

        if (data?.success) {
          setEditingResume(null);
          setEditFile(null);
          setToast({
            type: 'success',
            text: `Resume version v${data.data?.version || 'new'} uploaded and set as active.`
          });
          handleRefresh();
        }
      } else {
        // Metadata-only update: preserves file, extracted text, and historical versioning
        const { data } = await updateResumeNote(editingResume._id, {
          note: editNote.trim(),
          targetCompany: editCompany.trim(),
          targetRole: editRole.trim()
        });

        if (data?.success) {
          setResumes((prev) =>
            prev.map((r) => (r._id === editingResume._id ? { ...r, ...data.data } : r))
          );
          setEditingResume(null);
          setToast({
            type: 'success',
            text: `Updated details for version v${editingResume.version}.`
          });
        }
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update resume details. Please try again.');
    } finally {
      setIsSavingNote(false);
    }
  };

  // ── Handlers: Delete ──
  const handleOpenDelete = (resume) => {
    setDeletingResume(resume);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingResume) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      const { data } = await deleteResume(deletingResume._id);
      if (data?.success) {
        const deletedVersion = deletingResume.version;
        setDeletingResume(null);
        setToast({
          type: 'success',
          text: `Resume version v${deletedVersion} has been deleted.`
        });
        handleRefresh();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete resume version.');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentResume = resumes.find((r) => r.isCurrent) || resumes[0];

  return (
    <div className="resume-library-page">
      {/* ── Page Header ── */}
      <header className="resume-header">
        <div className="resume-title-group">
          <h1 className="resume-title">Resume Library</h1>
          <p className="resume-subtitle">
            Maintain and organize tailored resume versions for different companies and roles.
            The active resume is automatically used across AI features and outreach.
          </p>
        </div>

        <div className="resume-header-actions">
          <button
            type="button"
            className="resume-btn-primary"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload size={14} strokeWidth={2.4} aria-hidden="true" />
            <span>Upload Resume</span>
          </button>
        </div>
      </header>

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`resume-banner ${toast.type === 'error' ? 'resume-banner-error' : 'resume-banner-success'}`}
            initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
            role="status"
          >
            <div className="resume-banner-text">
              {toast.type === 'error' ? (
                <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={15} strokeWidth={2} aria-hidden="true" />
              )}
              <span>{toast.text}</span>
            </div>
            <button
              type="button"
              className="resume-banner-close"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Banner ── */}
      {error && (
        <div className="resume-banner resume-banner-error" role="alert">
          <div className="resume-banner-text">
            <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="resume-btn-secondary"
            onClick={handleRefresh}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Saved Versions Section ── */}
      <section className="resume-list-container" aria-labelledby="resume-list-title">
        <div className="resume-list-header">
          <div className="resume-list-title-group">
            <h2 id="resume-list-title" className="resume-list-heading">
              Saved Versions
            </h2>
            {!loading && !error && resumes.length > 0 && (
              <span className="resume-list-summary">
                {resumes.length} saved version{resumes.length === 1 ? '' : 's'}
                {currentResume ? ` · Current version: v${currentResume.version}` : ''}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="resume-skeleton-stack">
            {[1, 2, 3].map((i) => (
              <div key={i} className="resume-skeleton-row" />
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <div className="resume-empty-state">
            <div className="resume-empty-icon-wrap" aria-hidden="true">
              <FileText size={24} strokeWidth={1.8} />
            </div>
            <h3 className="resume-empty-title">No resumes in your library yet</h3>
            <p className="resume-empty-desc">
              Upload your first resume to power tailored AI applications, interview prep, and recruiter outreach.
            </p>
            <button
              type="button"
              className="resume-btn-primary"
              onClick={() => setIsUploadOpen(true)}
              style={{ marginTop: '4px' }}
            >
              <Upload size={14} strokeWidth={2.4} aria-hidden="true" />
              <span>Upload Your First Resume</span>
            </button>
          </div>
        ) : (
          <div className="resume-rows-list">
            {resumes.map((item) => {
              const targetInfo = formatTargetText(item.targetCompany, item.targetRole, item.note);

              return (
                <div
                  key={item._id}
                  className={`resume-row ${item.isCurrent ? 'is-current' : ''}`}
                >
                  <div className="resume-row-main">
                    {/* Line 1 — Primary */}
                    <div className="resume-item-primary">
                      <FileText size={16} strokeWidth={2} className="resume-row-file-icon" aria-hidden="true" />
                      <span className="resume-item-filename" title={item.originalFileName}>
                        {item.originalFileName}
                      </span>
                      <span className="resume-version-tag">v{item.version}</span>
                      {item.isCurrent && (
                        <span className="resume-badge-current">Current</span>
                      )}
                    </div>

                    {/* Line 2 — Resume note */}
                    {item.note && (
                      <p className="resume-item-note">
                        {item.note}
                      </p>
                    )}

                    {/* Line 3 — Target information */}
                    {targetInfo && (
                      <div className="resume-item-target-wrap">
                        <span className="resume-item-target-label">Target:</span>
                        <span className="resume-item-target-val">{targetInfo}</span>
                      </div>
                    )}

                    {/* Line 4 — Secondary metadata */}
                    <div className="resume-item-meta">
                      <span>Uploaded {formatDate(item.createdAt)}</span>
                      {item.fileSize > 0 && (
                        <>
                          <span className="resume-meta-dot" aria-hidden="true">·</span>
                          <span>{formatFileSize(item.fileSize)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="resume-item-actions">
                    {item.isCurrent ? (
                      <span className="resume-current-indicator">
                        <CheckCircle2 size={13} strokeWidth={2.4} aria-hidden="true" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="resume-btn-set-active"
                        onClick={() => handleSetCurrent(item)}
                        disabled={actionLoadingId === item._id}
                      >
                        Set as active
                      </button>
                    )}

                    <button
                      type="button"
                      className="resume-action-btn-icon"
                      onClick={() => handleDownload(item)}
                      disabled={actionLoadingId === item._id}
                      title={`Download ${item.originalFileName}`}
                      aria-label={`Download ${item.originalFileName}`}
                    >
                      <Download size={14} strokeWidth={2} />
                    </button>

                    <div className="resume-menu-container">
                      <button
                        type="button"
                        className={`resume-action-btn-icon ${openMenuId === item._id ? 'is-open' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === item._id ? null : item._id));
                        }}
                        title="More options"
                        aria-label={`More options for version v${item.version}`}
                        aria-expanded={openMenuId === item._id}
                      >
                        <MoreVertical size={14} strokeWidth={2} />
                      </button>

                      {openMenuId === item._id && (
                        <div className="resume-dropdown-menu" role="menu">
                          <button
                            type="button"
                            className="resume-dropdown-item"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleOpenEditNote(item);
                            }}
                          >
                            <Edit3 size={13} strokeWidth={2} aria-hidden="true" />
                            <span>Edit note</span>
                          </button>
                          <button
                            type="button"
                            className="resume-dropdown-item resume-dropdown-item-danger"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleOpenDelete(item);
                            }}
                          >
                            <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
                            <span>Delete version</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── UPLOAD MODAL ── */}
      <AnimatePresence>
        {isUploadOpen && (
          <div
            className="resume-modal-backdrop"
            onClick={handleCloseAllModals}
            role="presentation"
          >
            <motion.div
              className="resume-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="upload-modal-title"
              aria-describedby="upload-modal-desc"
              onClick={(e) => e.stopPropagation()}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className="resume-modal-header">
                <div className="resume-modal-title-group">
                  <h2 id="upload-modal-title" className="resume-modal-title">
                    Upload Resume Version
                  </h2>
                  <p id="upload-modal-desc" className="resume-modal-subtitle">
                    Add a new resume version to your library. It will be preserved alongside your existing versions.
                  </p>
                </div>
                <button
                  type="button"
                  className="resume-modal-close-btn"
                  onClick={handleCloseAllModals}
                  disabled={isUploading}
                  aria-label="Close modal"
                >
                  <X size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit}>
                <div className="resume-modal-body">
                  {uploadError && (
                    <div className="resume-banner resume-banner-error" role="alert">
                      <div className="resume-banner-text">
                        <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
                        <span>{uploadError}</span>
                      </div>
                    </div>
                  )}

                  {/* File Dropzone */}
                  <div className="resume-field">
                    <label className="resume-label">Resume File</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.rtf"
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />

                    {uploadFile ? (
                      <div className="resume-selected-file-badge">
                        <div className="resume-selected-file-info">
                          <FileText size={18} color="var(--color-blue, #0000FF)" />
                          <div>
                            <div className="resume-selected-file-name">{uploadFile.name}</div>
                            <div className="resume-selected-file-size">{formatFileSize(uploadFile.size)}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="resume-action-btn-icon"
                          onClick={() => setUploadFile(null)}
                          title="Remove file"
                          aria-label="Remove selected file"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`resume-dropzone ${isDragOver ? 'is-dragover' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                      >
                        <Upload size={22} className="resume-dropzone-icon" />
                        <span className="resume-dropzone-title">Click to browse or drag file here</span>
                        <span className="resume-dropzone-subtitle">
                          Supported formats: PDF, DOCX, TXT • Maximum size: 10MB
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Note / Purpose */}
                  <div className="resume-field">
                    <label htmlFor="upload-note" className="resume-label">
                      Purpose / Note <span className="resume-label-optional">(optional)</span>
                    </label>
                    <input
                      id="upload-note"
                      type="text"
                      className="resume-input"
                      placeholder="e.g., Tailored for Google — Frontend Engineer"
                      value={uploadNote}
                      onChange={(e) => setUploadNote(e.target.value)}
                      maxLength={140}
                    />
                    <span className="resume-field-hint">
                      Describe the specialization or target of this version.
                    </span>
                  </div>

                  {/* Optional Target Company & Role */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="resume-field">
                      <label htmlFor="upload-company" className="resume-label">
                        Target Company <span className="resume-label-optional">(opt)</span>
                      </label>
                      <input
                        id="upload-company"
                        type="text"
                        className="resume-input"
                        placeholder="e.g., Stripe"
                        value={uploadCompany}
                        onChange={(e) => setUploadCompany(e.target.value)}
                        maxLength={80}
                      />
                    </div>

                    <div className="resume-field">
                      <label htmlFor="upload-role" className="resume-label">
                        Target Role <span className="resume-label-optional">(opt)</span>
                      </label>
                      <input
                        id="upload-role"
                        type="text"
                        className="resume-input"
                        placeholder="e.g., Full Stack Engineer"
                        value={uploadRole}
                        onChange={(e) => setUploadRole(e.target.value)}
                        maxLength={80}
                      />
                    </div>
                  </div>
                </div>

                <div className="resume-modal-footer">
                  <button
                    type="button"
                    className="resume-btn-secondary"
                    onClick={handleCloseAllModals}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="resume-btn-primary"
                    disabled={!uploadFile || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Clock size={14} className="animate-spin" aria-hidden="true" />
                        <span>Uploading…</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} strokeWidth={2.4} aria-hidden="true" />
                        <span>Save Version</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT NOTE MODAL ── */}
      <AnimatePresence>
        {editingResume && (
          <div
            className="resume-modal-backdrop"
            onClick={handleCloseAllModals}
            role="presentation"
          >
            <motion.div
              className="resume-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-modal-title"
              onClick={(e) => e.stopPropagation()}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className="resume-modal-header">
                <div className="resume-modal-title-group">
                  <h2 id="edit-modal-title" className="resume-modal-title">
                    Edit Version v{editingResume.version} Details
                  </h2>
                  <p className="resume-modal-subtitle">
                    {editingResume.originalFileName}
                  </p>
                </div>
                <button
                  type="button"
                  className="resume-modal-close-btn"
                  onClick={handleCloseAllModals}
                  disabled={isSavingNote}
                  aria-label="Close modal"
                >
                  <X size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleSaveNote}>
                <div className="resume-modal-body">
                  {editError && (
                    <div className="resume-banner resume-banner-error" role="alert">
                      <div className="resume-banner-text">
                        <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
                        <span>{editError}</span>
                      </div>
                    </div>
                  )}

                  <div className="resume-field">
                    <label htmlFor="edit-note" className="resume-label">
                      Purpose / Note
                    </label>
                    <textarea
                      id="edit-note"
                      className="resume-textarea"
                      placeholder="e.g., Updated experience with React 19 and distributed systems"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      maxLength={200}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="resume-field">
                      <label htmlFor="edit-company" className="resume-label">
                        Target Company
                      </label>
                      <input
                        id="edit-company"
                        type="text"
                        className="resume-input"
                        placeholder="e.g., Google"
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        maxLength={80}
                      />
                    </div>

                    <div className="resume-field">
                      <label htmlFor="edit-role" className="resume-label">
                        Target Role
                      </label>
                      <input
                        id="edit-role"
                        type="text"
                        className="resume-input"
                        placeholder="e.g., Senior Frontend Engineer"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        maxLength={80}
                      />
                    </div>
                  </div>

                  {/* Replace resume file (optional) */}
                  <div className="resume-field">
                    <label htmlFor="edit-resume-file" className="resume-label">
                      Replace resume file <span className="resume-label-optional">(optional)</span>
                    </label>
                    <p className="resume-field-hint">
                      Uploading a new file creates a new resume version. Your existing version will remain in your library.
                    </p>

                    <input
                      id="edit-resume-file"
                      ref={editFileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.rtf"
                      onChange={handleEditFileInputChange}
                      className="resume-file-input-hidden"
                      disabled={isSavingNote}
                    />

                    {editFile ? (
                      <div className="resume-selected-file-badge">
                        <div className="resume-selected-file-info">
                          <FileText size={16} strokeWidth={2} className="resume-dropzone-icon" aria-hidden="true" />
                          <div>
                            <span className="resume-selected-file-name" title={editFile.name}>
                              {editFile.name}
                            </span>
                            <span className="resume-selected-file-size">
                              {' · '}{formatFileSize(editFile.size)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="resume-remove-file-btn"
                          onClick={() => {
                            setEditFile(null);
                            if (editFileInputRef.current) editFileInputRef.current.value = '';
                          }}
                          disabled={isSavingNote}
                          title="Remove replacement file"
                          aria-label="Remove replacement file"
                        >
                          <X size={15} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="resume-btn-choose-file"
                        onClick={() => editFileInputRef.current?.click()}
                        disabled={isSavingNote}
                      >
                        <Upload size={13} strokeWidth={2.4} aria-hidden="true" />
                        <span>Select Replacement File…</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="resume-modal-footer">
                  <button
                    type="button"
                    className="resume-btn-secondary"
                    onClick={handleCloseAllModals}
                    disabled={isSavingNote}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="resume-btn-primary"
                    disabled={isSavingNote}
                  >
                    {isSavingNote
                      ? (editFile ? 'Uploading Version…' : 'Saving Changes…')
                      : (editFile ? 'Save as New Version' : 'Save Changes')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deletingResume && (
          <div
            className="resume-modal-backdrop"
            onClick={handleCloseAllModals}
            role="presentation"
          >
            <motion.div
              className="resume-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
              onClick={(e) => e.stopPropagation()}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className="resume-modal-header">
                <div className="resume-modal-title-group">
                  <h2 id="delete-modal-title" className="resume-modal-title">
                    Delete Version v{deletingResume.version}?
                  </h2>
                  <p className="resume-modal-subtitle">
                    {deletingResume.originalFileName}
                  </p>
                </div>
                <button
                  type="button"
                  className="resume-modal-close-btn"
                  onClick={handleCloseAllModals}
                  disabled={isDeleting}
                  aria-label="Close modal"
                >
                  <X size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>

              <div className="resume-modal-body">
                {deleteError && (
                  <div className="resume-banner resume-banner-error" role="alert">
                    <div className="resume-banner-text">
                      <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
                      <span>{deleteError}</span>
                    </div>
                  </div>
                )}

                <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: 'rgba(0, 0, 0, 0.75)' }}>
                  Are you sure you want to delete this resume version? This action cannot be undone.
                </p>

                {deletingResume.isCurrent && (
                  <div className="resume-banner resume-banner-success" style={{ marginTop: '4px' }}>
                    <div className="resume-banner-text" style={{ fontSize: '0.8125rem' }}>
                      <span>
                        Note: This is currently your active resume. If deleted, the next newest version will automatically become active.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="resume-modal-footer">
                <button
                  type="button"
                  className="resume-btn-secondary"
                  onClick={handleCloseAllModals}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="resume-btn-danger"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Delete Version'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Resume;
