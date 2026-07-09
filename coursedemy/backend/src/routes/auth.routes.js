const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const { register, login, getMe, updateProfile } = require('../controllers/auth.controller');

// POST /api/auth/register — Public
router.post('/register', register);

// POST /api/auth/login — Public
router.post('/login', login);

// GET /api/auth/me — Yêu cầu đăng nhập
router.get('/me', authenticate, getMe);

// PUT /api/auth/profile — Yêu cầu đăng nhập
router.put('/profile', authenticate, updateProfile);

module.exports = router;
