const express = require('express');
const router  = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const {
  downloadCertificate,
  verifyCertificate,
  getMyCertificates,
  getCourseProgress,
  markLessonComplete,
} = require('../controllers/certificate.controller');

// GET /api/courses/:id/certificate — tải chứng chỉ PDF (student)
router.get('/courses/:id/certificate', authenticate, authorize('student'), downloadCertificate);

// GET /api/certificates/verify/:code — xác thực chứng chỉ (public)
router.get('/certificates/verify/:code', verifyCertificate);

// GET /api/profile/certificates — danh sách chứng chỉ của học viên (student)
router.get('/profile/certificates', authenticate, authorize('student'), getMyCertificates);

// GET /api/courses/:id/progress — % tiến độ hoàn thành khóa học (student)
router.get('/courses/:id/progress', authenticate, authorize('student'), getCourseProgress);

// PUT /api/courses/:id/lessons/:lessonId/complete — đánh dấu bài học hoàn thành (student)
router.put('/courses/:courseId/lessons/:lessonId/complete', authenticate, authorize('student'), markLessonComplete);

module.exports = router;
