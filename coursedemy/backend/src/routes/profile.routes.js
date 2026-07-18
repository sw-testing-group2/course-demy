const express = require('express');
const router  = express.Router();

const authenticate = require('../middlewares/authenticate');
const { getProfile, changePassword, updateAvatar } = require('../controllers/profile.controller');

// Tất cả profile routes yêu cầu xác thực — áp dụng mọi role
router.use(authenticate);

// GET  /api/profile — thông tin hồ sơ hiện tại
router.get('/', getProfile);

// PUT  /api/profile/password — đổi mật khẩu
router.put('/password', changePassword);

// PUT  /api/profile/avatar — cập nhật ảnh đại diện bằng URL
router.put('/avatar', updateAvatar);

module.exports = router;
