const express    = require('express');
const router     = express.Router();
const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../controllers/wishlist.controller');

// Tất cả endpoint đều yêu cầu đăng nhập với role student
router.get(   '/',          authenticate, authorize('student'), getWishlist);
router.post(  '/',          authenticate, authorize('student'), addToWishlist);
router.delete('/:courseId', authenticate, authorize('student'), removeFromWishlist);

module.exports = router;
