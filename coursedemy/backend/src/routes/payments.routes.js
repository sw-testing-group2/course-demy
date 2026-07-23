const express = require('express');
const router  = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const {
  walletPay,
  demoPay,
  momoCreate,
  momoIpn,
  momoReturn,
  vnpayCreate,
  vnpayIpn,
  vnpayReturn,
  getPaymentStatus,
} = require('../controllers/payments.controller');

// ── Ví nội bộ ────────────────────────────────────────────────────────────────
// POST /api/payments/wallet/pay
router.post('/wallet/pay', authenticate, authorize('student'), walletPay);

// ── Demo (không cần trình duyệt, dùng để test nhanh) ─────────────────────────
// POST /api/payments/demo/pay
router.post('/demo/pay', authenticate, authorize('student'), demoPay);

// ── MoMo Sandbox ─────────────────────────────────────────────────────────────
// POST /api/payments/momo/create  — tạo yêu cầu thanh toán
router.post('/momo/create', authenticate, authorize('student'), momoCreate);

// POST /api/payments/momo/ipn  — MoMo gọi server-to-server (public)
router.post('/momo/ipn', momoIpn);

// GET /api/payments/momo/return  — MoMo redirect người dùng về (public)
router.get('/momo/return', momoReturn);

// ── VNPay Sandbox ─────────────────────────────────────────────────────────────
// POST /api/payments/vnpay/create  — tạo URL thanh toán
router.post('/vnpay/create', authenticate, authorize('student'), vnpayCreate);

// GET /api/payments/vnpay/ipn  — VNPay gọi server-to-server (public)
router.get('/vnpay/ipn', vnpayIpn);

// GET /api/payments/vnpay/return  — VNPay redirect người dùng về (public)
router.get('/vnpay/return', vnpayReturn);

// ── Trạng thái thanh toán ─────────────────────────────────────────────────────
// GET /api/payments/:orderId/status
router.get('/:orderId/status', authenticate, authorize('student'), getPaymentStatus);

module.exports = router;
