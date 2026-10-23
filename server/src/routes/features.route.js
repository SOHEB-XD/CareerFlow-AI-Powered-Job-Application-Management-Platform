const router = require('express').Router();
const { getDashboardStats, getRecentApplications } = require('../controllers/dashboard.contoller');
const { protect } = require('../middlewares/auth.middleware');
const { getFollowUpEmail } = require('../features/followUpEmailAI.feature');
const {
    getResumeList,
    getCurrentResume,
    getResumeById,
    downloadResumeFile,
    uploadResume,
    setCurrentResume,
    updateResumeNote,
    deleteResume
} = require('../controllers/resume.controller');
const { getTargetCompanyPreview, getGmailLink, markSend } = require('../features/targetCompanyAI.feature');
const { getDraftFollowUpEmails } = require('../features/getDraftEmails.feature');
const { getDraftApplicationEmails } = require('../features/getDraftEmails.feature');
const { getCommunications } = require('../features/getCommunications.feature');
const {
    generateStudioEmail,
    updateStudioDraft,
    getStudioGmailLink,
    getStudioDrafts
} = require('../features/emailStudioAI.feature');

/**
 * Dashboard feature API
 */
router.get('/dashboard/stats', protect, getDashboardStats);
router.get('/dashboard/recent', protect, getRecentApplications);

/**
 * Follow Up Email AI feature API
 */
router.get('/follow-up-email/:id', protect, getFollowUpEmail);

/**
 * Resume Library feature API
 */
router.get('/resume', protect, getResumeList);
router.get('/resume/current', protect, getCurrentResume);
router.get('/resume/:id', protect, getResumeById);
router.get('/resume/:id/download', protect, downloadResumeFile);
router.post('/resume/upload', protect, uploadResume);
router.patch('/resume/:id/current', protect, setCurrentResume);
router.patch('/resume/:id/note', protect, updateResumeNote);
router.delete('/resume/:id', protect, deleteResume);

/**
 * Target Company feature API
 */
router.post('/target-company/preview', protect, getTargetCompanyPreview);
router.post('/target-company/:id/get-gmail-link', protect, getGmailLink);
router.patch('/target-company/:id/mark-sent', protect, markSend);

/**
 * Draft Emails feature API
 */
router.get('/draft-follow-up-emails', protect, getDraftFollowUpEmails);
router.get('/draft-application-emails', protect, getDraftApplicationEmails);

/**
 * Communications / AI Email Studio feature API
 */
router.get('/communications', protect, getCommunications);
router.get('/communications/drafts', protect, getStudioDrafts);
router.post('/communications/generate', protect, generateStudioEmail);
router.put('/communications/:id/draft', protect, updateStudioDraft);
router.get('/communications/:id/gmail-link', protect, getStudioGmailLink);

module.exports = router;