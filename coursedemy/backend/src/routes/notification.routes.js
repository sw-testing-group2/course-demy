const express = require('express');
const router  = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const {
  sendAdminNotification,
  getAdminNotifications,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notification.controller');

// ── Admin: gửi + lịch sử thông báo ───────────────────────────────────────────
router.post('/admin/notifications', authenticate, authorize('admin'), sendAdminNotification);
router.get('/admin/notifications',  authenticate, authorize('admin'), getAdminNotifications);

// ── User: đọc + đánh dấu thông báo ───────────────────────────────────────────
// Quan trọng: đặt /notifications/read-all và /notifications/unread-count TRƯỚC /:id/read
// để tránh Express nhầm "read-all" / "unread-count" là :id
router.put('/notifications/read-all',      authenticate, markAllAsRead);
router.get('/notifications/unread-count',  authenticate, getUnreadCount);
router.get('/notifications',               authenticate, getMyNotifications);
router.put('/notifications/:id/read',      authenticate, markAsRead);

module.exports = router;
