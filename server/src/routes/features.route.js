const router = require('express').Router();
const { getDashboardStats, getRecentApplications } = require('../controllers/dashboard.contoller');
const { protect } = require('../middlewares/auth.middleware');
const { getFollowUpEmail } = require('../features/followUpEmailAI.feature');
const uploadResume = require('../controllers/uploadreume.controller');
const { getTargetCompanyPreview, getGmailLink } = require('../features/targetCompanyAI.feature');
const { getDraftFollowUpEmails } = require('../features/getDraftEmails.feature');
const { getDraftApplicationEmails } = require('../features/getDraftEmails.feature');

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
 * Resume feature API
 */
router.post('/resume/upload', protect, uploadResume);

/**
 * Target Company feature API
 */
router.post('/target-company/preview', protect, getTargetCompanyPreview);
router.post('/target-company/:id/get-gmail-link', protect, getGmailLink);

/**
 * Draft Emails feature API
 */
router.get('/draft-follow-up-emails', protect, getDraftFollowUpEmails);
router.get('/draft-application-emails', protect, getDraftApplicationEmails);

module.exports = router;