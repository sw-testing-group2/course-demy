const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const { getWallet, deposit } = require('../controllers/wallet.controller');

// GET  /api/wallet — xem số dư và lịch sử (student + instructor)
router.get('/', authenticate, authorize('student', 'instructor'), getWallet);

// POST /api/wallet/deposit — nạp tiền giả lập (student)
router.post('/deposit', authenticate, authorize('student'), deposit);

module.exports = router;
