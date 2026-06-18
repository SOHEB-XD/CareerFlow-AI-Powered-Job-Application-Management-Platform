const router = require('express').Router();
const { addApplication, getAllApplication, getApplicationById, updateApplication, deleteApplication, updateNoResponseStatus } = require('../controllers/applications.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/add-application', protect, addApplication);

router.get('/get-all-applications', protect, getAllApplication);

router.get('/get-application/:id', protect, getApplicationById);

router.put('/update-application/:id', protect, updateApplication);

router.delete('/delete-application/:id', protect, deleteApplication);


router.put('/update-no-response', protect, updateNoResponseStatus);

module.exports = router;