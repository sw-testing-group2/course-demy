const db = require('../config/database');
const { validateCoupon } = require('./coupons.controller');

// ─── POST /api/orders/checkout ───────────────────────────────────────────────
// Task 10: Chỉ tạo order ở trạng thái 'pending', KHÔNG tạo enrollment, KHÔNG xóa giỏ hàng.
// Việc enroll + xóa giỏ hàng sẽ xảy ra SAU KHI thanh toán thành công (payments.controller).
function checkout(req, res) {
  try {
    const { coupon_code } = req.body;

    // Lấy toàn bộ giỏ hàng kèm thông tin giá
    const cartItems = db.prepare(`
      SELECT
        ci.course_id,
        c.title,
        c.price
      FROM cart_items ci
      JOIN courses c ON ci.course_id = c.id
      WHERE ci.user_id = ?
    `).all(req.user.id);

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);

    // ── Xử lý coupon nếu có ───────────────────────────────────────────────
    let discountAmount = 0;
    let couponId       = null;

    if (coupon_code) {
      const validation = validateCoupon(req.user.id, coupon_code, subtotal);
      if (!validation.ok) {
        return res.status(validation.status).json({ success: false, message: validation.message });
      }
      discountAmount = validation.discount_amount;
      couponId       = validation.coupon.id;
    }

    const totalAmount = subtotal - discountAmount;

    // ── Tạo order ở trạng thái PENDING ────────────────────────────────────
    const doCheckout = db.transaction(() => {
      // 1. Tạo order (status='pending', chưa thanh toán)
      const orderResult = db
        .prepare(
          `INSERT INTO orders (user_id, total_amount, status, coupon_id, discount_amount)
           VALUES (?, ?, 'pending', ?, ?)`
        )
        .run(req.user.id, totalAmount, couponId, discountAmount);

      const orderId = orderResult.lastInsertRowid;

      // 2. Lưu order_items (giá tại thời điểm đặt hàng)
      const insertOrderItem = db.prepare(
        'INSERT INTO order_items (order_id, course_id, price) VALUES (?, ?, ?)'
      );
      for (const item of cartItems) {
        insertOrderItem.run(orderId, item.course_id, item.price);
      }

      // KHÔNG tạo enrollments, KHÔNG xóa cart_items ở bước này.
      // Chờ thanh toán xác nhận (payments.controller → confirmPaymentSuccess)

      return orderId;
    });

    const orderId = doCheckout();

    return res.status(201).json({
      success: true,
      message: 'Đã tạo đơn hàng, vui lòng chọn phương thức thanh toán',
      data: {
        order_id:        orderId,
        subtotal,
        discount_amount: discountAmount,
        total_amount:    totalAmount,
        coupon_code:     couponId ? coupon_code.trim().toUpperCase() : null,
        status:          'pending',
      },
    });
  } catch (err) {
    console.error('[checkout]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/orders ─────────────────────────────────────────────────────────
function getOrders(req, res) {
  try {
    const orders = db.prepare(`
      SELECT id, total_amount, discount_amount, coupon_id, status, payment_method, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    const getItems = db.prepare(`
      SELECT
        oi.course_id,
        oi.price,
        c.title,
        c.thumbnail
      FROM order_items oi
      JOIN courses c ON oi.course_id = c.id
      WHERE oi.order_id = ?
    `);

    const data = orders.map((order) => ({
      id:              order.id,
      total_amount:    order.total_amount,
      discount_amount: order.discount_amount,
      coupon_id:       order.coupon_id,
      status:          order.status,
      payment_method:  order.payment_method,
      created_at:      order.created_at,
      items: getItems.all(order.id).map((item) => ({
        course_id: item.course_id,
        title:     item.title,
        price:     item.price,
        thumbnail: item.thumbnail,
      })),
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getOrders]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = { checkout, getOrders };
