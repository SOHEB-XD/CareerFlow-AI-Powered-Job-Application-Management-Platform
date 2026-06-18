const router = require('express').Router();
const { addApplication } = require('../controllers/applications.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/add-application', protect, addApplication);

module.exports = router;