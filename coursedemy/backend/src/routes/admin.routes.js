const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const {
  getPendingCourses,
  approveCourse,
  rejectCourse,
  getUsers,
  toggleLockUser,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/admin.controller');

// Tất cả admin routes yêu cầu authenticate + role admin
router.use(authenticate, authorize('admin'));

// ── Course management ─────────────────────────────────────────────────────────
router.get('/courses/pending',         getPendingCourses);
router.put('/courses/:id/approve',     approveCourse);
router.put('/courses/:id/reject',      rejectCourse);

// ── User management ───────────────────────────────────────────────────────────
router.get('/users',                   getUsers);
router.put('/users/:id/lock',          toggleLockUser);

// ── Category management ───────────────────────────────────────────────────────
router.post('/categories',             createCategory);
router.put('/categories/:id',          updateCategory);
router.delete('/categories/:id',       deleteCategory);

module.exports = router;
