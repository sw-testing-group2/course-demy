const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const { walletPay } = require('../controllers/payments.controller');

// POST /api/payments/wallet/pay — thanh toán đơn hàng bằng ví
router.post('/wallet/pay', authenticate, authorize('student'), walletPay);

module.exports = router;
