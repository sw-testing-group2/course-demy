const express = require('express');

const authenticate    = require('../middlewares/authenticate');
const authorize       = require('../middlewares/authorize');
const {
  getCourseSections,
  completeLesson,
  submitQuiz,
  getCourseProgress,
} = require('../controllers/progress.controller');

// ─── Middleware optional auth ─────────────────────────────────────────────────
// GET /api/courses/:id/sections là public nhưng đọc token nếu có
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Không có token → guest, tiếp tục
    return next();
  }
  // Có token → thử xác thực; nếu token hỏng thì coi như guest (không trả lỗi)
  authenticate(req, res, (err) => {
    // authenticate chỉ gọi next() khi thành công, hoặc trả response lỗi.
    // Để xử lý lỗi token mềm, ta override bằng wrapper không break nếu err xảy ra.
    next();
  });
}

// ─── Router cho prefix /api/courses ──────────────────────────────────────────
const coursesRouter = express.Router();
// GET /api/courses/:id/sections
coursesRouter.get('/:id/sections', optionalAuth, getCourseSections);

// ─── Router cho prefix /api/lessons ──────────────────────────────────────────
const lessonsRouter = express.Router();
// POST /api/lessons/:id/complete
lessonsRouter.post('/:id/complete',     authenticate, authorize('student'), completeLesson);
// POST /api/lessons/:id/submit-quiz
lessonsRouter.post('/:id/submit-quiz',  authenticate, authorize('student'), submitQuiz);

// ─── Router cho prefix /api/enrollments ──────────────────────────────────────
const enrollmentsRouter = express.Router();
// GET /api/enrollments/:courseId/progress
enrollmentsRouter.get('/:courseId/progress', authenticate, authorize('student'), getCourseProgress);

module.exports = { coursesRouter, lessonsRouter, enrollmentsRouter };

