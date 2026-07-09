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

module.exports = router;
