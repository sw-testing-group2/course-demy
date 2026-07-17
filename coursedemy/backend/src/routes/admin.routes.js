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
  updateUserRole,
  updateUserStatus,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getAdminStatsOverview,
  getAdminStatsRevenue,
  getAdminTopCourses,
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
router.put('/users/:id/role',          updateUserRole);
router.put('/users/:id/status',        updateUserStatus);

// ── Category management ───────────────────────────────────────────────────────
router.post('/categories',             createCategory);
router.put('/categories/:id',          updateCategory);
router.delete('/categories/:id',       deleteCategory);

// ── Withdrawal management ─────────────────────────────────────────────────────
router.get('/withdrawals',             getAdminWithdrawals);
router.put('/withdrawals/:id/approve', approveWithdrawal);
router.put('/withdrawals/:id/reject',  rejectWithdrawal);

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats/overview',          getAdminStatsOverview);
router.get('/stats/revenue',           getAdminStatsRevenue);
router.get('/stats/top-courses',       getAdminTopCourses);

module.exports = router;
