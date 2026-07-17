const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const {
  getInstructorCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStudents,
  createWithdrawal,
  getWithdrawals,
  getInstructorQuestions,
  getInstructorStatsOverview,
  getInstructorStatsRevenue,
  getInstructorStatsCourses,
} = require('../controllers/instructor.controller');

// Tất cả routes yêu cầu authenticate + role instructor
router.use(authenticate, authorize('instructor'));

// GET  /api/instructor/courses
router.get('/courses', getInstructorCourses);

// POST /api/instructor/courses
router.post('/courses', createCourse);

// PUT  /api/instructor/courses/:id
router.put('/courses/:id', updateCourse);

// DELETE /api/instructor/courses/:id
router.delete('/courses/:id', deleteCourse);

// GET  /api/instructor/courses/:id/students
router.get('/courses/:id/students', getCourseStudents);

// ── Withdrawals ───────────────────────────────────────────────────────────────
// POST /api/instructor/withdrawals — yêu cầu rút tiền
router.post('/withdrawals', createWithdrawal);

// GET  /api/instructor/withdrawals — lịch sử yêu cầu rút tiền
router.get('/withdrawals', getWithdrawals);

// ── Q&A Inbox ────────────────────────────────────────────────────────────────────────────
// GET  /api/instructor/questions — hộp thư Q&A của giảng viên
router.get('/questions', getInstructorQuestions);

// ── Thống kê doanh thu ───────────────────────────────────────────────────────────────────
// GET /api/instructor/stats/overview
router.get('/stats/overview', getInstructorStatsOverview);
// GET /api/instructor/stats/revenue?period=30days
router.get('/stats/revenue',  getInstructorStatsRevenue);
// GET /api/instructor/stats/courses
router.get('/stats/courses',  getInstructorStatsCourses);

module.exports = router;

