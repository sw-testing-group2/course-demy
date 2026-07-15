const express = require('express');
const router = express.Router();

const authenticate  = require('../middlewares/authenticate');
const authorize     = require('../middlewares/authorize');
const optionalAuth  = require('../middlewares/optionalAuth');
const {
  getCourseSections,
  completeLesson,
  submitQuiz,
  getCourseProgress,
} = require('../controllers/progress.controller');

// ─── Public (optional auth) ──────────────────────────────────────────────────
// GET /api/courses/:id/sections
// Được mount tại app.use('/api/courses', progressRoutes) → path là /:id/sections
router.get('/:id/sections', optionalAuth, getCourseSections);

// ─── Student: lesson complete / quiz ─────────────────────────────────────────
// Được mount tại app.use('/api/lessons', progressRoutes) → path là /:id/...
// POST /api/lessons/:id/complete
router.post('/:id/complete', authenticate, authorize('student'), completeLesson);

// POST /api/lessons/:id/submit-quiz
router.post('/:id/submit-quiz', authenticate, authorize('student'), submitQuiz);

// ─── Student: course progress ─────────────────────────────────────────────────
// Được mount tại app.use('/api/enrollments', progressRoutes) → path là /:courseId/progress
// GET /api/enrollments/:courseId/progress
router.get('/:courseId/progress', authenticate, authorize('student'), getCourseProgress);

module.exports = router;
