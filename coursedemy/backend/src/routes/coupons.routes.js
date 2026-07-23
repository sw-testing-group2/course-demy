const express = require('express');
const router  = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  validateCouponRoute,
} = require('../controllers/coupons.controller');

// ─────────────────────────────────────────────────────────────────────────────
// Router này được mount ở 2 prefix trong app.js:
//   app.use('/api/admin/coupons', couponsRoutes)  → Admin CRUD
//   app.use('/api/coupons',       couponsRoutes)  → Student validate
//
// Dùng req.baseUrl để phân biệt (giống pattern trong courses.routes.js).
// ─────────────────────────────────────────────────────────────────────────────

// STUDENT: POST /api/coupons/validate
// Phải đặt TRƯỚC /:id để Express không nhầm 'validate' là tham số :id
router.post('/validate', authenticate, authorize('student'), validateCouponRoute);

// ADMIN: GET /api/admin/coupons
router.get('/', (req, res) => {
  if (req.baseUrl === '/api/admin/coupons') {
    return authenticate(req, res, () =>
      authorize('admin')(req, res, () => getCoupons(req, res))
    );
  }
  return res.status(404).json({ success: false, message: 'Not found' });
});

// ADMIN: POST /api/admin/coupons
router.post('/', (req, res) => {
  if (req.baseUrl === '/api/admin/coupons') {
    return authenticate(req, res, () =>
      authorize('admin')(req, res, () => createCoupon(req, res))
    );
  }
  return res.status(404).json({ success: false, message: 'Not found' });
});

// ADMIN: PUT /api/admin/coupons/:id
router.put('/:id', authenticate, authorize('admin'), updateCoupon);

// ADMIN: DELETE /api/admin/coupons/:id
router.delete('/:id', authenticate, authorize('admin'), deleteCoupon);

module.exports = router;
