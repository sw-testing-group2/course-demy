const express = require('express');
const router  = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const {
  demoPay,
  momoCreate,
  momoIpn,
  momoReturn,
  vnpayCreate,
  vnpayIpn,
  vnpayReturn,
  getPaymentStatus,
} = require('../controllers/payments.controller');

// ─── Demo ─────────────────────────────────────────────────────────────────────
// POST /api/payments/demo/pay
router.post('/demo/pay', authenticate, authorize('student'), demoPay);

// ─── MoMo ─────────────────────────────────────────────────────────────────────
// POST /api/payments/momo/create
router.post('/momo/create', authenticate, authorize('student'), momoCreate);

// POST /api/payments/momo/ipn  (MoMo server → server, Public)
router.post('/momo/ipn', momoIpn);

// GET  /api/payments/momo/return  (MoMo redirect browser, Public)
router.get('/momo/return', momoReturn);

// ─── VNPay ────────────────────────────────────────────────────────────────────
// POST /api/payments/vnpay/create
router.post('/vnpay/create', authenticate, authorize('student'), vnpayCreate);

// GET  /api/payments/vnpay/ipn  (VNPay server → server, Public)
router.get('/vnpay/ipn', vnpayIpn);

// GET  /api/payments/vnpay/return  (VNPay redirect browser, Public)
router.get('/vnpay/return', vnpayReturn);

// ─── Status ───────────────────────────────────────────────────────────────────
// GET /api/payments/:orderId/status
router.get('/:orderId/status', authenticate, authorize('student'), getPaymentStatus);

module.exports = router;
