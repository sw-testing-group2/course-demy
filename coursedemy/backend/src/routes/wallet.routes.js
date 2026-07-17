const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const { getWallet, getWalletBalance, getWalletTransactions, deposit } = require('../controllers/wallet.controller');

// GET  /api/wallet/balance — chỉ trả số dư (frontend wallet.html dùng)
router.get('/balance', authenticate, authorize('student', 'instructor'), getWalletBalance);

// GET  /api/wallet/transactions — lịch sử phân trang (frontend wallet.html dùng)
router.get('/transactions', authenticate, authorize('student', 'instructor'), getWalletTransactions);

// GET  /api/wallet — backward compat: trả cả balance + transactions
router.get('/', authenticate, authorize('student', 'instructor'), getWallet);

// POST /api/wallet/deposit — nạp tiền giả lập (student)
router.post('/deposit', authenticate, authorize('student'), deposit);

module.exports = router;
