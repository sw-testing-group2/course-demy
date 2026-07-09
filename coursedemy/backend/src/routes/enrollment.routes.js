const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const { getEnrollments } = require('../controllers/enrollment.controller');

// GET /api/enrollments — yêu cầu authenticate + role student
router.get('/', authenticate, authorize('student'), getEnrollments);

module.exports = router;
