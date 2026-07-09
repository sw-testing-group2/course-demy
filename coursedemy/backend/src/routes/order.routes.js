const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const { checkout, getOrders } = require('../controllers/order.controller');

// Tất cả order routes yêu cầu authenticate + role student
router.use(authenticate, authorize('student'));

// POST /api/orders/checkout
router.post('/checkout', checkout);

// GET  /api/orders
router.get('/', getOrders);

module.exports = router;
