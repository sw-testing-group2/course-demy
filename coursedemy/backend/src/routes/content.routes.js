const express = require('express');
const router  = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');

const {
  getSections,
  createSection,
  updateSection,
  deleteSection,
  createLesson,
  updateLesson,
  deleteLesson,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} = require('../controllers/content.controller');

// Tất cả routes yêu cầu đăng nhập + role instructor
router.use(authenticate, authorize('instructor'));

// ─── SECTIONS ─────────────────────────────────────────────────────────────────

// GET  /api/instructor/courses/:courseId/sections
router.get('/courses/:courseId/sections', getSections);

// POST /api/instructor/courses/:courseId/sections
router.post('/courses/:courseId/sections', createSection);

// PUT  /api/instructor/sections/:id
router.put('/sections/:id', updateSection);

// DELETE /api/instructor/sections/:id
router.delete('/sections/:id', deleteSection);

// ─── LESSONS ──────────────────────────────────────────────────────────────────

// POST /api/instructor/sections/:sectionId/lessons
router.post('/sections/:sectionId/lessons', createLesson);

// PUT  /api/instructor/lessons/:id
router.put('/lessons/:id', updateLesson);

// DELETE /api/instructor/lessons/:id
router.delete('/lessons/:id', deleteLesson);

// ─── QUIZ QUESTIONS ───────────────────────────────────────────────────────────

// POST /api/instructor/lessons/:lessonId/questions
router.post('/lessons/:lessonId/questions', createQuestion);

// PUT  /api/instructor/questions/:id
router.put('/questions/:id', updateQuestion);

// DELETE /api/instructor/questions/:id
router.delete('/questions/:id', deleteQuestion);

module.exports = router;
