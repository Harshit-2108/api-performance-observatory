const express = require('express');
const { register, login, refresh, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validator');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
