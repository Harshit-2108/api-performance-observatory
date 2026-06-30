const express = require('express');
const { updatePreferences } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.put('/preferences', updatePreferences);

module.exports = router;
