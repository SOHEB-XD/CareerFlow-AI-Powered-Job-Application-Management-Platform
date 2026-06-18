const router = require('express').Router();
const { getDashboardStats, getRecentApplications } = require('../controllers/dashboard.contoller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/stats', protect, getDashboardStats);
router.get('/recent', protect, getRecentApplications);

module.exports = router;
