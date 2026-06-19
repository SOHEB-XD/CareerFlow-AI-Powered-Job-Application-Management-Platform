const router = require('express').Router();
const { getFollowUpSuggestions } = require('../features/followUpSuggestionAI.feature');
const { protect } = require('../middlewares/auth.middleware');

router.get('/get-follow-up-suggestions/:id', protect, getFollowUpSuggestions);

module.exports = router;
