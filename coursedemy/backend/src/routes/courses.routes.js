const express = require('express');
const router  = express.Router();

const {
  getCategories,
  getCourses,
  getCourseById,
} = require('../controllers/courses.controller');

const reviewsRouter = require('./reviews.routes');

const jwt = require('jsonwebtoken');
const db  = require('../config/database');

/**
 * Middleware xác thực tuỳ chọn: không bắt buộc có token.
 * Nếu có token hợp lệ, gán req.user. Nếu không có hoặc hết hạn, cho qua.
 */
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = db
        .prepare('SELECT id, email, role, status, full_name FROM users WHERE id = ?')
        .get(decoded.id);
      if (user && user.status === 'active') {
        req.user = user;
      }
    } catch {
      // token không hợp lệ → bỏ qua, tiếp tục như khách
    }
  }
  next();
}

/**
 * Router này được mount tại 2 prefix:
 *   app.use('/api/categories', coursesRoutes)  → GET / → getCategories
 *   app.use('/api/courses',    coursesRoutes)  → GET / → getCourses
 *                                              → GET /:id → getCourseById
 *                                              → GET|POST /:id/reviews → reviewsRouter
 *
 * Dùng req.baseUrl để phân biệt ngữ cảnh.
 */

// GET / — trả categories hoặc courses tùy prefix
router.get('/', (req, res) => {
  if (req.baseUrl === '/api/categories') {
    return getCategories(req, res);
  }
  return getCourses(req, res);
});

// Sub-router cho đánh giá: GET|POST /api/courses/:id/reviews
// Phải đặt TRƯỚC /:id để Express không nhầm 'reviews' là tham số :id
router.use('/:id/reviews', reviewsRouter);

// GET /:id — chi tiết một khóa học, dùng optionalAuthenticate để phân quyền xem pending/rejected
router.get('/:id', optionalAuthenticate, getCourseById);

module.exports = router;

