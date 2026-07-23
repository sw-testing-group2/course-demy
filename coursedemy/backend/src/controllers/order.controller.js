const db = require('../config/database');
const { validateCoupon } = require('./coupons.controller');

// ─── POST /api/orders/checkout ───────────────────────────────────────────────
// Chỉ tạo order (status='pending') + order_items.
// Enrollment & xóa cart sẽ được thực hiện sau khi thanh toán thành công.
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

    // ── Xử lý coupon (nếu có) ─────────────────────────────────────────────
    let discount_amount = 0;
    let couponId = null;

    if (coupon_code && coupon_code.trim()) {
      const couponResult = validateCoupon(req.user.id, coupon_code, subtotal);
      if (couponResult.error) {
        return res.status(couponResult.error.status).json({
          success: false,
          message: couponResult.error.message,
        });
      }
      discount_amount = couponResult.discount_amount;
      couponId = couponResult.coupon.id;
    }

    const totalAmount = Math.round((subtotal - discount_amount) * 100) / 100;

    // ── DB Transaction: chỉ tạo order + order_items ─────────────────────────
    const doCheckout = db.transaction(() => {
      // 1. Tạo order với status='pending' — CHƯA thanh toán
      const orderResult = db
        .prepare(`
          INSERT INTO orders (user_id, total_amount, status, coupon_id, discount_amount)
          VALUES (?, ?, 'pending', ?, ?)
        `)
        .run(req.user.id, totalAmount, couponId, discount_amount);

      const orderId = orderResult.lastInsertRowid;

      // 2. Insert từng course vào order_items (lưu giá tại thời điểm đặt)
      const insertOrderItem = db.prepare(
        'INSERT INTO order_items (order_id, course_id, price) VALUES (?, ?, ?)'
      );
      for (const item of cartItems) {
        insertOrderItem.run(orderId, item.course_id, item.price);
      }

      // NOTE: Enrollment, xóa cart_items, tăng coupon used_count
      //       được xử lý sau khi xác nhận thanh toán (payments controller).

      return orderId;
    });

    const orderId = doCheckout();

    return res.status(201).json({
      success: true,
      message: 'Đã tạo đơn hàng, vui lòng chọn phương thức thanh toán',
      data: {
        order_id:        orderId,
        subtotal,
        discount_amount,
        total_amount:    totalAmount,
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
    // Lấy danh sách orders của user
    const orders = db.prepare(`
      SELECT
        o.id,
        o.total_amount,
        o.discount_amount,
        o.status,
        o.created_at,
        o.coupon_id,
        cp.code AS coupon_code
      FROM orders o
      LEFT JOIN coupons cp ON o.coupon_id = cp.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id);

    // Với mỗi order, lấy danh sách items
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
      discount_amount: order.discount_amount ?? 0,
      coupon_code:     order.coupon_code ?? null,
      status:          order.status,
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
