const express = require('express');
const router = express.Router();

const {
  getCategories,
  getCourses,
  getCourseById,
} = require('../controllers/courses.controller');

/**
 * Router này được mount tại 2 prefix:
 *   app.use('/api/categories', coursesRoutes)  → GET / → getCategories
 *   app.use('/api/courses',    coursesRoutes)  → GET / → getCourses
 *                                              → GET /:id → getCourseById
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

// GET /:id — chi tiết một khóa học (chỉ có nghĩa khi prefix là /api/courses)
router.get('/:id', getCourseById);

module.exports = router;
