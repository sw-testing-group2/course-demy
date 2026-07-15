const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  validateCouponRoute,
} = require('../controllers/coupons.controller');

// ─── Admin routes: /api/admin/coupons ────────────────────────────────────────
router.post('/',    authenticate, authorize('admin'), createCoupon);
router.get('/',     authenticate, authorize('admin'), getCoupons);
router.put('/:id',  authenticate, authorize('admin'), updateCoupon);
router.delete('/:id', authenticate, authorize('admin'), deleteCoupon);

// ─── Student route: /api/coupons/validate ────────────────────────────────────
router.post('/validate', authenticate, authorize('student'), validateCouponRoute);

module.exports = router;
