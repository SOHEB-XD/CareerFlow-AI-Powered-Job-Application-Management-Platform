const router = require('express').Router();
const { getDashboardStats } = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/get-dashboard-stats', protect, getDashboardStats);

module.exports = router;
