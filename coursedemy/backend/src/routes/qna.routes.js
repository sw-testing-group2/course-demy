const express = require('express');
const router  = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');

const {
  createQuestion,
  getLessonQuestions,
  getQuestion,
  createAnswer,
  resolveQuestion,
  deleteQuestion,
  deleteAnswer,
} = require('../controllers/qna.controller');

// ─── Q&A theo bài học ────────────────────────────────────────────────────────

// POST /api/lessons/:lessonId/questions — đặt câu hỏi (chỉ học viên)
router.post(
  '/lessons/:lessonId/questions',
  authenticate,
  authorize('student'),
  createQuestion,
);

// GET /api/lessons/:lessonId/questions — danh sách câu hỏi của bài học
router.get(
  '/lessons/:lessonId/questions',
  authenticate,
  getLessonQuestions,
);

// ─── Q&A theo câu hỏi ────────────────────────────────────────────────────────

// GET /api/questions/:id — chi tiết câu hỏi kèm answers
router.get(
  '/questions/:id',
  authenticate,
  getQuestion,
);

// POST /api/questions/:id/answers — trả lời câu hỏi
router.post(
  '/questions/:id/answers',
  authenticate,
  authorize('student', 'instructor', 'admin'),
  createAnswer,
);

// PUT /api/questions/:id/resolve — đánh dấu đã giải quyết
router.put(
  '/questions/:id/resolve',
  authenticate,
  authorize('student', 'instructor'),
  resolveQuestion,
);

// DELETE /api/questions/:id — xóa câu hỏi
router.delete(
  '/questions/:id',
  authenticate,
  deleteQuestion,
);

// ─── Quản lý câu trả lời ─────────────────────────────────────────────────────

// DELETE /api/answers/:id — xóa câu trả lời
router.delete(
  '/answers/:id',
  authenticate,
  deleteAnswer,
);

module.exports = router;
