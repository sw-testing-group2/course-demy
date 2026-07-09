const db = require('../config/database');

// ─── POST /api/orders/checkout ───────────────────────────────────────────────
function checkout(req, res) {
  try {
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

    const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);

    // ── DB Transaction: tất cả hoặc không có gì ────────────────────────────
    const doCheckout = db.transaction(() => {
      // 1. Tạo order
      const orderResult = db
        .prepare(`INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, 'paid')`)
        .run(req.user.id, totalAmount);

      const orderId = orderResult.lastInsertRowid;

      // 2. Insert từng course vào order_items (giá tại thời điểm mua)
      const insertOrderItem = db.prepare(
        'INSERT INTO order_items (order_id, course_id, price) VALUES (?, ?, ?)'
      );

      // 3. INSERT OR IGNORE vào enrollments
      const insertEnrollment = db.prepare(
        'INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)'
      );

      for (const item of cartItems) {
        insertOrderItem.run(orderId, item.course_id, item.price);
        insertEnrollment.run(req.user.id, item.course_id);
      }

      // 4. Xóa toàn bộ giỏ hàng
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

      return orderId;
    });

    const orderId = doCheckout();

    return res.status(201).json({
      success: true,
      message: 'Thanh toán thành công',
      data: {
        order_id:     orderId,
        total_amount: totalAmount,
        status:       'paid',
        items: cartItems.map((item) => ({
          course_id: item.course_id,
          title:     item.title,
          price:     item.price,
        })),
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
      SELECT id, total_amount, status, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
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
      id:           order.id,
      total_amount: order.total_amount,
      status:       order.status,
      created_at:   order.created_at,
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
