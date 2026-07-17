const express      = require('express');
const router       = express.Router({ mergeParams: true }); // mergeParams để nhận :id từ parent
const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const { createReview, getCourseReviews } = require('../controllers/reviews.controller');

// POST /api/courses/:id/reviews — Student đã đăng nhập mới được đánh giá
router.post('/',  authenticate, authorize('student'), createReview);

// GET  /api/courses/:id/reviews — Public
router.get('/',  getCourseReviews);

module.exports = router;
