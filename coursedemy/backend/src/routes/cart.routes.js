const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const { getCart, addToCart, removeFromCart } = require('../controllers/cart.controller');

// Tất cả cart routes yêu cầu authenticate + role student
router.use(authenticate, authorize('student'));

// GET  /api/cart
router.get('/', getCart);

// POST /api/cart
router.post('/', addToCart);

// DELETE /api/cart/:courseId
router.delete('/:courseId', removeFromCart);

module.exports = router;
