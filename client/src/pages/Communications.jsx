import { useState, useEffect, useCallback, useId } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Mail,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Save,
  RotateCcw,
  Briefcase,
  FileText,
  Clock,
  Globe,
  UserCheck,
  Search,
  BookOpen,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus
} from 'lucide-react';
import { getApplications } from '../api/applications';
import { getResumes } from '../api/resume';
import {
  generateStudioEmail,
  updateStudioDraft,
  getStudioDrafts,
  getStudioGmailLink
} from '../api/communications';
import './Communications.css';

const EMAIL_TYPES = [
  {
    id: 'application',
    label: 'Application Email',
    desc: 'Express role-specific interest and connect relevant candidate experience directly to company goals.'
  },
  {
    id: 'followup',
    label: 'Follow-up After Application',
    desc: 'Politely inquire about the hiring timeline while referencing your previous application date.'
  },
  {
    id: 'recruiter_outreach',
    label: 'Recruiter Outreach',
    desc: 'Send a concise, high-impact introductory note requesting a brief 10–15 minute conversation.'
  },
  {
    id: 'thank_you',
    label: 'Interview Thank-you',
    desc: 'Express appreciation for the interview, reiterate mutual alignment, and confirm enthusiasm.'
  },
  {
    id: 'interview_scheduling',
    label: 'Interview Scheduling',
    desc: 'Confirm your interview availability with clear, actionable time windows.'
  },
  {
    id: 'other',
    label: 'Other Professional Email',
    desc: 'Draft custom career communication guided by your specific instructions.'
  }
];

const VALID_EMAIL_TYPES = EMAIL_TYPES.map((t) => t.id);

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return null;
  }
};

const Communications = () => {
  const shouldReduceMotion = useReducedMotion();
  const rawId = useId();
  const selectAppId = `select-app-${rawId.replace(/:/g, '')}`;
  const selectTypeId = `select-type-${rawId.replace(/:/g, '')}`;
  const selectResumeId = `select-resume-${rawId.replace(/:/g, '')}`;
  const customContextId = `custom-context-${rawId.replace(/:/g, '')}`;
  const resumeToggleId = `resume-toggle-${rawId.replace(/:/g, '')}`;

  // ── Applications State ──
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [appsError, setAppsError] = useState(null);

  // ── Resume Library State ──
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [resumesError, setResumesError] = useState(null);

  // ── Step 1 Configuration (Genuinely Empty Initial State) ──
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [includeResume, setIncludeResume] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);
  const [userContext, setUserContext] = useState('');

  // ── Step 2 Draft & Review State ──
  const [activeDraft, setActiveDraft] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  // ── Generation State ──
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  // ── Recent Saved Drafts ──
  const [recentDrafts, setRecentDrafts] = useState([]);

  // ── UI Feedback ──
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-dismiss toast after 4.5s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshDrafts = useCallback(async () => {
    try {
      const { data } = await getStudioDrafts();
      if (data?.success) {
        setRecentDrafts(data.data || []);
      }
    } catch {
      // Gracefully silent for recent drafts list
    }
  }, []);

  const fetchResumes = useCallback(async () => {
    setLoadingResumes(true);
    setResumesError(null);
    try {
      const res = await getResumes();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setResumes(res.data.data);
      } else {
        setResumes([]);
      }
    } catch {
      setResumesError('Could not load saved resume versions. Please try again.');
    } finally {
      setLoadingResumes(false);
    }
  }, []);

  // Load initial data: applications, resumes, and recent drafts without pre-selecting
  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setLoadingApps(true);
      setLoadingResumes(true);
      try {
        const [appsRes, resumeRes, draftsRes] = await Promise.allSettled([
          getApplications({ limit: 100 }),
          getResumes(),
          getStudioDrafts()
        ]);

        if (!ignore) {
          if (appsRes.status === 'fulfilled' && appsRes.value?.data?.data) {
            setApplications(appsRes.value.data.data);
          } else if (appsRes.status === 'rejected') {
            setAppsError('Could not load applications. Please check your connection.');
          }

          if (resumeRes.status === 'fulfilled' && resumeRes.value?.data?.data) {
            setResumes(resumeRes.value.data.data);
          } else if (resumeRes.status === 'rejected') {
            setResumesError('Could not load saved resume versions. Please check your connection.');
          }

          if (draftsRes.status === 'fulfilled' && draftsRes.value?.data?.data) {
            setRecentDrafts(draftsRes.value.data.data);
          }
        }
      } finally {
        if (!ignore) {
          setLoadingApps(false);
          setLoadingResumes(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  // When target application is chosen, prefill recipient if application has saved HR email
  const handleSelectApp = (appId) => {
    setSelectedAppId(appId);
    const found = applications.find((a) => a._id === appId);
    if (found) {
      if (found.hrEmail && found.hrEmail.trim()) {
        setRecipientEmail(found.hrEmail.trim());
      } else {
        setRecipientEmail('');
      }
    } else {
      setRecipientEmail('');
    }
  };

  const selectedApp = applications.find((a) => a._id === selectedAppId);
  const selectedTypeObj = EMAIL_TYPES.find((t) => t.id === selectedType);
  const selectedResumeObj = resumes.find((r) => r._id === selectedResumeId);

  const formatResumeOption = (r) => {
    const base = `${r.originalFileName || 'Resume'} — v${r.version || 1}`;
    const targetParts = [r.targetCompany, r.targetRole].filter(Boolean);
    let detail = '';
    if (targetParts.length > 0) {
      detail = targetParts.join(' · ');
    } else if (r.note && r.note.trim()) {
      detail = r.note.trim();
    }
    const currentTag = r.isCurrent ? ' (Current)' : '';
    if (detail) {
      return `${base} · ${detail}${currentTag}`;
    }
    return `${base}${currentTag}`;
  };

  const handleToggleResume = (e) => {
    const checked = e.target.checked;
    setIncludeResume(checked);
    setSelectedResumeId('');
  };

  const isDraftOutdated = Boolean(
    activeDraft?.generatedWith &&
    (selectedAppId !== activeDraft.generatedWith.applicationId ||
     selectedType !== activeDraft.generatedWith.type ||
     includeResume !== activeDraft.generatedWith.includeResume ||
     (includeResume && selectedResumeId !== activeDraft.generatedWith.resumeId))
  );

  // ── Generation Handler ──
  const handleGenerate = async () => {
    if (!selectedAppId || !selectedType) {
      setToast({ type: 'error', text: 'Please select both an application and an email type.' });
      return;
    }

    if (includeResume && !selectedResumeId) {
      setToast({ type: 'error', text: 'Please choose a resume version or uncheck resume personalization.' });
      return;
    }

    // If activeDraft has unsaved edits, ask for confirmation
    if (activeDraft && hasUnsavedEdits) {
      const confirmReplace = window.confirm(
        'You have unsaved changes in your draft. Regenerating will replace your current subject and body. Do you want to continue?'
      );
      if (!confirmReplace) return;
    }

    setIsGenerating(true);
    setGenerationStep('Researching target company with live web search...');
    setHasUnsavedEdits(false);

    try {
      const stepTimer = setTimeout(() => {
        setGenerationStep('Synthesizing research, role requirements, and resume experience...');
      }, 1200);

      const payload = {
        applicationId: selectedAppId,
        type: selectedType,
        userContext: userContext.trim(),
        includeResume,
        resumeId: includeResume ? selectedResumeId : null,
        recipient: recipientEmail.trim(),
        draftId: activeDraft?.communicationId || null
      };

      const { data } = await generateStudioEmail(payload);
      clearTimeout(stepTimer);

      if (data?.success && data.data) {
        setActiveDraft({
          ...data.data,
          generatedWith: {
            applicationId: selectedAppId,
            type: selectedType,
            includeResume,
            resumeId: includeResume ? selectedResumeId : null
          }
        });
        setDraftSubject(data.data.subject || '');
        setDraftBody(data.data.body || '');
        if (data.data.recipient) {
          setRecipientEmail(data.data.recipient);
        }

        if (data.data.isResearchGrounded) {
          setToast({
            type: 'success',
            text: `Generated grounded email for ${data.data.companyName} (${data.data.researchSources?.length || 0} verified source${data.data.researchSources?.length === 1 ? '' : 's'}).`
          });
        } else if (data.data.researchError) {
          setToast({
            type: 'info',
            text: `Standard draft generated. Note: ${data.data.researchError}`
          });
        } else {
          setToast({
            type: 'success',
            text: `Draft email generated for ${data.data.companyName}.`
          });
        }

        refreshDrafts();

        // Smoothly scroll to the review section
        setTimeout(() => {
          const reviewSection = document.getElementById('studio-review-step');
          if (reviewSection) {
            reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    } catch (err) {
      setToast({
        type: 'error',
        text: err.response?.data?.message || 'Failed to generate email. Please try again.'
      });
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // ── Manual Draft Save Handler ──
  const handleSaveDraft = async () => {
    if (!activeDraft?.communicationId) return;

    setIsSaving(true);
    try {
      const payload = {
        subject: draftSubject,
        body: draftBody,
        recipient: recipientEmail.trim(),
        userContext: userContext.trim()
      };

      const { data } = await updateStudioDraft(activeDraft.communicationId, payload);
      if (data?.success) {
        setHasUnsavedEdits(false);
        setToast({ type: 'success', text: 'Draft changes saved.' });
        refreshDrafts();
      }
    } catch (err) {
      setToast({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save draft changes.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Copy to Clipboard ──
  const handleCopy = async () => {
    if (!draftBody) return;
    try {
      await navigator.clipboard.writeText(`${draftSubject ? `Subject: ${draftSubject}\n\n` : ''}${draftBody}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setToast({ type: 'success', text: 'Email copied to clipboard.' });
    } catch {
      setToast({ type: 'error', text: 'Could not copy to clipboard.' });
    }
  };

  // ── Open in Gmail Handler ──
  const handleOpenGmail = async () => {
    const trimmedRecipient = recipientEmail.trim();

    if (!trimmedRecipient) {
      setToast({
        type: 'error',
        text: 'A recipient email address is required before opening Gmail.'
      });
      return;
    }

    if (!isValidEmail(trimmedRecipient)) {
      setToast({
        type: 'error',
        text: 'Please enter a valid email address (e.g. recruiter@company.com).'
      });
      return;
    }

    // Auto-save pending edits
    if (activeDraft?.communicationId && hasUnsavedEdits) {
      try {
        await updateStudioDraft(activeDraft.communicationId, {
          subject: draftSubject,
          body: draftBody,
          recipient: trimmedRecipient
        });
        setHasUnsavedEdits(false);
      } catch {
        // Proceed even if background save fails
      }
    }

    let targetUrl = '';
    try {
      if (activeDraft?.communicationId) {
        const { data } = await getStudioGmailLink(activeDraft.communicationId, {
          recipient: trimmedRecipient,
          subject: draftSubject,
          body: draftBody
        });
        if (data?.gmailUrl) {
          targetUrl = data.gmailUrl;
        }
      }
    } catch {
      // Fallback to direct URL
    }

    if (!targetUrl) {
      targetUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(trimmedRecipient)}&su=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`;
    }

    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (win) {
      setToast({
        type: 'success',
        text: 'Opened in Gmail. Review your prefilled draft and click Send in Gmail.'
      });
    } else {
      setToast({
        type: 'error',
        text: 'Popup was blocked by your browser. Please allow popups for CareerFlow to open Gmail.'
      });
    }
  };

  // ── Load an Existing Draft from Recent List ──
  const handleSelectRecentDraft = (draft) => {
    const resumeUsedId = draft.resumeUsed?._id || draft.resumeUsed;
    const hasResume = Boolean(draft.resumeVersion || resumeUsedId);
    const matchedResume = hasResume
      ? resumes.find((r) => r._id === resumeUsedId || r.version === draft.resumeVersion)
      : null;
    const resolvedResumeId = matchedResume ? matchedResume._id : (typeof resumeUsedId === 'string' ? resumeUsedId : '');

    setActiveDraft({
      communicationId: draft._id,
      applicationId: draft.application?._id || draft.application,
      companyName: draft.companyName,
      role: draft.role,
      recipient: draft.hrEmail || '',
      type: draft.type,
      subject: draft.subject,
      body: draft.body,
      isResearchGrounded: draft.isResearchGrounded,
      researchSummary: draft.researchSummary,
      researchSources: draft.researchSources || [],
      resumeUsed: draft.resumeVersion ? {
        id: resolvedResumeId || null,
        version: draft.resumeVersion,
        fileName: draft.resumeFileName
      } : null,
      generatedWith: {
        applicationId: draft.application?._id || draft.application,
        type: draft.type,
        includeResume: hasResume,
        resumeId: resolvedResumeId
      }
    });

    if (draft.application?._id) {
      setSelectedAppId(draft.application._id);
    }
    if (draft.type && VALID_EMAIL_TYPES.includes(draft.type)) {
      setSelectedType(draft.type);
    }

    if (hasResume) {
      setIncludeResume(true);
      setSelectedResumeId(resolvedResumeId);
    } else {
      setIncludeResume(false);
      setSelectedResumeId('');
    }

    setRecipientEmail(draft.hrEmail || '');
    setDraftSubject(draft.subject || '');
    setDraftBody(draft.body || '');
    setUserContext(draft.userContext || '');
    if (draft.userContext) {
      setShowCustomInstructions(true);
    }
    setHasUnsavedEdits(false);

    setToast({
      type: 'info',
      text: `Loaded draft for ${draft.companyName}.`
    });

    setTimeout(() => {
      const reviewSection = document.getElementById('studio-review-step');
      if (reviewSection) {
        reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  return (
    <div className="cf-email-studio studio-page">
      {/* ── Page Header ── */}
      <header className="studio-header">
        <div className="studio-title-group">
          <h1 className="studio-title">AI Email Studio</h1>
          <p className="studio-subtitle">
            Choose a company and email type. CareerFlow researches the company and helps you draft a tailored message using relevant details from your application and, optionally, your resume. Review the draft before opening it in Gmail.
          </p>
        </div>
      </header>

      {/* ── Apps Error Banner ── */}
      {appsError && (
        <div className="studio-toast studio-toast-error" role="alert">
          <div className="studio-toast-content">
            <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
            <span>{appsError}</span>
          </div>
        </div>
      )}

      {/* ── Toast Notification Banner ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`studio-toast studio-toast-${toast.type}`}
            initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
            role="status"
          >
            <div className="studio-toast-content">
              {toast.type === 'error' ? (
                <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={15} strokeWidth={2} aria-hidden="true" />
              )}
              <span>{toast.text}</span>
            </div>
            <button
              type="button"
              className="studio-toast-close"
              onClick={() => setToast(null)}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Workflow ── */}
      {loadingApps ? (
        <div className="studio-loading-state">
          <div className="studio-spinner" aria-hidden="true" />
          <p>Loading your applications and workspace context...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="studio-empty-state">
          <div className="studio-empty-icon-wrap" aria-hidden="true">
            <Briefcase size={28} strokeWidth={1.8} />
          </div>
          <h2 className="studio-empty-title">No Applications Found</h2>
          <p className="studio-empty-desc">
            AI Email Studio tailors emails directly to your tracked job applications and verified company records. Add your first application to start drafting company-aware outreach.
          </p>
          <Link to="/dashboard/applications" className="studio-btn-primary">
            <span>Go to Applications</span>
            <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="studio-workflow-container">
          {/* ══════════════════════════════════════════════════════════
              STEP 1: SET UP YOUR EMAIL
              ══════════════════════════════════════════════════════════ */}
          <section className="studio-card studio-setup-card" aria-labelledby="studio-step1-heading">
            <div className="studio-card-header">
              <h2 id="studio-step1-heading" className="studio-card-heading">
                Step 1 — Set up your email
              </h2>
              <p className="studio-card-subcopy">
                Select a target application and email purpose to begin.
              </p>
            </div>

            <div className="studio-form-stack">
              {/* Field 1: Target Application */}
              <div className="studio-field">
                <label htmlFor={selectAppId} className="studio-label">
                  Target Application <span className="studio-required">*</span>
                </label>
                <select
                  id={selectAppId}
                  className="studio-select"
                  value={selectedAppId}
                  onChange={(e) => handleSelectApp(e.target.value)}
                >
                  <option value="">Choose an application</option>
                  {applications.map((app) => (
                    <option key={app._id} value={app._id}>
                      {app.companyName} — {app.role} {app.status ? `(${app.status})` : ''}
                    </option>
                  ))}
                </select>

                {/* Target Context Summary (Only after an application is selected) */}
                {selectedApp && (
                  <div className="studio-target-summary">
                    <div className="studio-target-summary-main">
                      <span className="studio-target-company">{selectedApp.companyName}</span>
                      <span className="studio-sep" aria-hidden="true">·</span>
                      <span className="studio-target-role">{selectedApp.role}</span>
                      {selectedApp.status && (
                        <span className="studio-status-pill">{selectedApp.status}</span>
                      )}
                    </div>

                    <div className="studio-target-summary-meta">
                      {selectedApp.companyWebsite && (
                        <a
                          href={
                            selectedApp.companyWebsite.startsWith('http')
                              ? selectedApp.companyWebsite
                              : `https://${selectedApp.companyWebsite}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="studio-meta-link"
                        >
                          <Globe size={11} strokeWidth={2} aria-hidden="true" />
                          <span>{selectedApp.companyWebsite.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          <ExternalLink size={10} strokeWidth={2} aria-hidden="true" />
                        </a>
                      )}
                      {selectedApp.appliedDate && (
                        <span className="studio-meta-item">
                          <Clock size={11} strokeWidth={2} aria-hidden="true" />
                          <span>Applied {formatDate(selectedApp.appliedDate)}</span>
                        </span>
                      )}
                      {selectedApp.interviewDate && (
                        <span className="studio-meta-item">
                          <Clock size={11} strokeWidth={2} aria-hidden="true" />
                          <span>Interview {formatDate(selectedApp.interviewDate)}</span>
                        </span>
                      )}
                      {selectedApp.hrEmail && (
                        <span className="studio-meta-item">
                          <UserCheck size={11} strokeWidth={2} aria-hidden="true" />
                          <span>{selectedApp.hrEmail}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Field 2: Email Purpose */}
              <div className="studio-field">
                <label htmlFor={selectTypeId} className="studio-label">
                  Email Purpose <span className="studio-required">*</span>
                </label>
                <select
                  id={selectTypeId}
                  className="studio-select"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">Choose an email type</option>
                  {EMAIL_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>

                {/* At most one short explanatory sentence */}
                {selectedTypeObj && (
                  <p className="studio-field-hint">{selectedTypeObj.desc}</p>
                )}
              </div>

              {/* Field 3: Resume Personalization */}
              <div className="studio-field">
                <div className="studio-checkbox-wrap">
                  <label htmlFor={resumeToggleId} className="studio-checkbox-label">
                    <input
                      id={resumeToggleId}
                      type="checkbox"
                      checked={includeResume}
                      onChange={handleToggleResume}
                      className="studio-checkbox"
                    />
                    <span className="studio-checkbox-title">Use a resume for personalization</span>
                  </label>
                </div>

                {includeResume && (
                  <div className="studio-resume-selector-wrap">
                    {loadingResumes ? (
                      <div className="studio-resume-loading-state">
                        <div className="studio-btn-spinner studio-spinner-sm" aria-hidden="true" />
                        <span>Loading saved resume versions...</span>
                      </div>
                    ) : resumesError ? (
                      <div className="studio-resume-error-state">
                        <AlertCircle size={14} aria-hidden="true" />
                        <span>{resumesError}</span>
                        <button
                          type="button"
                          className="studio-retry-btn"
                          onClick={fetchResumes}
                        >
                          Retry
                        </button>
                      </div>
                    ) : resumes.length === 0 ? (
                      <div className="studio-resume-empty-note">
                        No saved resumes found in your Library.{' '}
                        <Link to="/dashboard/resume" className="studio-inline-link">
                          Upload a resume
                        </Link>{' '}
                        or uncheck personalization to generate an email based strictly on application details.
                      </div>
                    ) : (
                      <>
                        <label htmlFor={selectResumeId} className="studio-sublabel">
                          Resume Version <span className="studio-required">*</span>
                        </label>
                        <select
                          id={selectResumeId}
                          className="studio-select"
                          value={selectedResumeId}
                          onChange={(e) => setSelectedResumeId(e.target.value)}
                        >
                          <option value="">Choose a resume version</option>
                          {resumes.map((r) => (
                            <option key={r._id} value={r._id}>
                              {formatResumeOption(r)}
                            </option>
                          ))}
                        </select>

                        {/* Compact summary of selected resume */}
                        {selectedResumeObj && (
                          <div className="studio-selected-resume-summary">
                            <FileText size={13} strokeWidth={2} aria-hidden="true" />
                            <span className="studio-selected-resume-text">
                              <strong>{selectedResumeObj.originalFileName}</strong> (v{selectedResumeObj.version})
                              {(selectedResumeObj.targetRole || selectedResumeObj.targetCompany || selectedResumeObj.note) && (
                                <span className="studio-selected-resume-note">
                                  {' · '}{[selectedResumeObj.targetCompany, selectedResumeObj.targetRole].filter(Boolean).join(' · ') || selectedResumeObj.note}
                                </span>
                              )}
                              {selectedResumeObj.isCurrent && (
                                <span className="studio-current-badge">Current</span>
                              )}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Field 4: Custom Instructions (Initially Collapsed) */}
              <div className="studio-field">
                <button
                  type="button"
                  className="studio-btn-toggle-instructions"
                  onClick={() => setShowCustomInstructions(!showCustomInstructions)}
                  aria-expanded={showCustomInstructions}
                >
                  {showCustomInstructions ? (
                    <>
                      <Minus size={13} strokeWidth={2.4} aria-hidden="true" />
                      <span>Hide custom instructions</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} strokeWidth={2.4} aria-hidden="true" />
                      <span>Add custom instructions</span>
                      <span className="studio-label-opt">(Optional)</span>
                    </>
                  )}
                </button>

                {showCustomInstructions && (
                  <div className="studio-instructions-drawer">
                    <textarea
                      id={customContextId}
                      className="studio-textarea studio-textarea-compact"
                      placeholder="e.g. Mention my experience with distributed systems and availability for morning interviews..."
                      value={userContext}
                      onChange={(e) => setUserContext(e.target.value)}
                      maxLength={600}
                      rows={3}
                    />
                    <span className="studio-char-count">{userContext.length}/600</span>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <div className="studio-action-row">
                <button
                  type="button"
                  className="studio-btn-primary studio-btn-generate"
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedAppId || !selectedType || (includeResume && !selectedResumeId)}
                >
                  {isGenerating ? (
                    <>
                      <div className="studio-btn-spinner" aria-hidden="true" />
                      <span>Generating draft...</span>
                    </>
                  ) : (
                    <span>Generate email draft →</span>
                  )}
                </button>

                {isGenerating && generationStep && (
                  <div className="studio-progress-hint">
                    <span className="studio-progress-dot" aria-hidden="true" />
                    <span>{generationStep}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════
              STEP 2: REVEALED ONLY AFTER GENERATION OR DRAFT SELECTION
              ══════════════════════════════════════════════════════════ */}
          {activeDraft && (
            <section
              id="studio-review-step"
              className="studio-card studio-editor-card"
              aria-labelledby="studio-step2-heading"
            >
              <div className="studio-card-header studio-review-header">
                <div>
                  <h2 id="studio-step2-heading" className="studio-card-heading">
                    Step 2 — Review your email
                  </h2>
                  <p className="studio-card-subcopy">
                    Check the research, recipient, and message before opening Gmail.
                  </p>
                </div>

                <div className="studio-editor-actions">
                  <button
                    type="button"
                    className="studio-btn-secondary"
                    onClick={handleCopy}
                    title="Copy draft to clipboard"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    className="studio-btn-secondary"
                    onClick={handleSaveDraft}
                    disabled={isSaving || !hasUnsavedEdits}
                    title="Save edits to database"
                  >
                    <Save size={13} />
                    <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
                  </button>
                  <button
                    type="button"
                    className="studio-btn-secondary"
                    onClick={handleGenerate}
                    disabled={isGenerating || (includeResume && !selectedResumeId)}
                    title="Regenerate email draft"
                  >
                    <RotateCcw size={13} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {isDraftOutdated && (
                <div className="studio-outdated-warning">
                  <AlertCircle size={13} strokeWidth={2.2} aria-hidden="true" />
                  <span>
                    Form selections have changed since this draft was generated. Click{' '}
                    <strong>Regenerate</strong> to update the draft.
                  </span>
                </div>
              )}

              {/* Company Research Findings */}
              <div
                className={`studio-research-card ${activeDraft.isResearchGrounded ? 'is-grounded' : 'is-fallback'}`}
              >
                <div className="studio-research-header">
                  <div className="studio-research-title-group">
                    <Search size={14} strokeWidth={2.2} aria-hidden="true" />
                    <span className="studio-research-title">Company Research</span>
                  </div>
                  <span
                    className={`studio-research-badge ${activeDraft.isResearchGrounded ? 'badge-verified' : 'badge-notice'}`}
                  >
                    {activeDraft.isResearchGrounded ? 'Search Grounded' : 'Standard Draft'}
                  </span>
                </div>

                {activeDraft.researchSummary ? (
                  <p className="studio-research-summary">{activeDraft.researchSummary}</p>
                ) : activeDraft.researchError ? (
                  <p className="studio-research-summary is-warning">
                    {activeDraft.researchError} The draft below was generated using your confirmed application details and active resume.
                  </p>
                ) : null}

                {/* Sources list (Collapsible if long) */}
                {activeDraft.researchSources && activeDraft.researchSources.length > 0 && (
                  <div className="studio-sources-wrap">
                    <span className="studio-sources-label">Verified Sources:</span>
                    <ul className="studio-sources-list">
                      {(sourcesExpanded
                        ? activeDraft.researchSources
                        : activeDraft.researchSources.slice(0, 3)
                      ).map((s, idx) => (
                        <li key={idx} className="studio-source-item">
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="studio-source-link"
                          >
                            <span>{s.title || 'Verified Source'}</span>
                            <ExternalLink size={10} strokeWidth={2} aria-hidden="true" />
                          </a>
                        </li>
                      ))}
                    </ul>
                    {activeDraft.researchSources.length > 3 && (
                      <button
                        type="button"
                        className="studio-sources-toggle-btn"
                        onClick={() => setSourcesExpanded(!sourcesExpanded)}
                      >
                        {sourcesExpanded ? (
                          <>
                            <span>Show fewer</span>
                            <ChevronUp size={12} />
                          </>
                        ) : (
                          <>
                            <span>+{activeDraft.researchSources.length - 3} more</span>
                            <ChevronDown size={12} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Editable Recipient */}
              <div className="studio-field">
                <div className="studio-label-row">
                  <label className="studio-label">
                    Recipient (HR / Recruiter Email) <span className="studio-required">*</span>
                  </label>
                  {selectedApp?.hrEmail && recipientEmail === selectedApp.hrEmail && (
                    <span className="studio-tag-confirmed">
                      <UserCheck size={11} strokeWidth={2.2} aria-hidden="true" />
                      Prefilled from application
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  className={`studio-input ${recipientEmail && !isValidEmail(recipientEmail) ? 'is-invalid' : ''}`}
                  placeholder="e.g. recruiter@company.com"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    setHasUnsavedEdits(true);
                  }}
                />
                {!recipientEmail ? (
                  <span className="studio-input-hint is-missing">
                    Please enter a valid recipient email to enable opening directly in Gmail.
                  </span>
                ) : !isValidEmail(recipientEmail) ? (
                  <span className="studio-input-hint is-error">
                    Please enter a valid email format (e.g. recruiter@company.com).
                  </span>
                ) : null}
              </div>

              {/* Editable Subject */}
              <div className="studio-field">
                <label className="studio-label">
                  Subject Line <span className="studio-required">*</span>
                </label>
                <input
                  type="text"
                  className="studio-input studio-input-subject"
                  placeholder="Email subject line"
                  value={draftSubject}
                  onChange={(e) => {
                    setDraftSubject(e.target.value);
                    setHasUnsavedEdits(true);
                  }}
                />
              </div>

              {/* Editable Email Body */}
              <div className="studio-field">
                <div className="studio-label-row">
                  <label className="studio-label">
                    Email Body <span className="studio-required">*</span>
                  </label>
                  {hasUnsavedEdits && (
                    <span className="studio-unsaved-badge">Unsaved edits</span>
                  )}
                </div>
                <textarea
                  className="studio-textarea studio-editor-body"
                  placeholder="Your email draft will appear here..."
                  value={draftBody}
                  onChange={(e) => {
                    setDraftBody(e.target.value);
                    setHasUnsavedEdits(true);
                  }}
                  rows={10}
                />
              </div>

              {/* Gmail Action Footer */}
              <div className="studio-review-footer">
                <div className="studio-disclaimer-wrap">
                  <span className="studio-disclaimer-title">Gmail Compose Handoff</span>
                  <p className="studio-disclaimer-text">
                    Gmail will open in a new tab with your prefilled recipient, subject, and body. You can review the message and press Send inside Gmail.
                  </p>
                </div>

                <button
                  type="button"
                  className="studio-btn-primary studio-btn-gmail"
                  onClick={handleOpenGmail}
                  disabled={!draftBody || !recipientEmail || !isValidEmail(recipientEmail)}
                  title={
                    !recipientEmail
                      ? 'Enter a valid recipient email to open Gmail'
                      : 'Open Gmail with draft prefilled'
                  }
                >
                  <Mail size={15} strokeWidth={2.4} aria-hidden="true" />
                  <span>Open Gmail to Send</span>
                  <ExternalLink size={12} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════════════════════
              RECENT SAVED DRAFTS (CLEAN SCANNING-FRIENDLY LIST)
              ══════════════════════════════════════════════════════════ */}
          {recentDrafts.length > 0 && (
            <section className="studio-card studio-drafts-card" aria-labelledby="drafts-history-heading">
              <div className="studio-drafts-header">
                <div className="studio-drafts-title-wrap">
                  <BookOpen size={16} strokeWidth={2} aria-hidden="true" />
                  <h3 id="drafts-history-heading" className="studio-drafts-heading">
                    Recent Saved Drafts
                  </h3>
                </div>
                <span className="studio-drafts-count">{recentDrafts.length} saved</span>
              </div>
              <p className="studio-drafts-subcopy">
                Select any saved draft below to review, refine, or open it in Gmail.
              </p>

              <div className="studio-drafts-list" role="list">
                {recentDrafts.map((d) => {
                  const isCurrentActive = activeDraft?.communicationId === d._id;
                  const typeObj = EMAIL_TYPES.find((t) => t.id === d.type);

                  return (
                    <div
                      key={d._id}
                      className={`studio-draft-row ${isCurrentActive ? 'is-active-draft' : ''}`}
                      onClick={() => handleSelectRecentDraft(d)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectRecentDraft(d);
                        }
                      }}
                      title={`Load draft for ${d.companyName}`}
                    >
                      <div className="studio-draft-row-main">
                        {/* Primary Line */}
                        <div className="studio-draft-primary-line">
                          <span className="studio-draft-company">{d.companyName}</span>
                          <span className="studio-sep" aria-hidden="true">·</span>
                          <span className="studio-draft-role">{d.role}</span>
                          <span className="studio-draft-type-tag">
                            {typeObj?.label || d.type}
                          </span>
                          {d.isResearchGrounded && (
                            <span className="studio-draft-grounded-tag">Search Grounded</span>
                          )}
                        </div>

                        {/* Secondary Line: Subject */}
                        <div className="studio-draft-subject-line">
                          {d.subject || 'Untitled Draft'}
                        </div>
                      </div>

                      {/* Right Meta & Load Button */}
                      <div className="studio-draft-row-actions">
                        <span className="studio-draft-date">
                          {formatDate(d.updatedAt || d.createdAt)}
                        </span>
                        <span className="studio-btn-load-draft">
                          {isCurrentActive ? 'Viewing' : 'Load draft'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Communications;
