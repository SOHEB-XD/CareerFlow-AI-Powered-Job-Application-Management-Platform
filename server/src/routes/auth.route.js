const router = require('express').Router();
const { register, login, getMe, logout } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

router.get('/me', protect, getMe);

module.exports = router;