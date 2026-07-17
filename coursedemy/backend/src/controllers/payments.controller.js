const db = require('../config/database');

// ─── POST /api/payments/wallet/pay ───────────────────────────────────────────
function walletPay(req, res) {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu order_id',
      });
    }

    // 1. Kiểm tra order tồn tại và thuộc student
    const order = db.prepare(`
      SELECT id, user_id, total_amount, status, coupon_id
      FROM orders
      WHERE id = ?
    `).get(order_id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Đơn hàng không thuộc về bạn',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng không ở trạng thái chờ thanh toán',
      });
    }

    // 2. Kiểm tra số dư ví
    const student = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);

    if (student.balance < order.total_amount) {
      return res.status(400).json({
        success: false,
        message: 'Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền',
      });
    }

    // 3. Lấy danh sách order_items kèm instructor_id
    const orderItems = db.prepare(`
      SELECT
        oi.course_id,
        oi.price,
        c.instructor_id
      FROM order_items oi
      JOIN courses c ON oi.course_id = c.id
      WHERE oi.order_id = ?
    `).all(order_id);

    // 4. Thực hiện transaction
    const doPayment = db.transaction(() => {
      // 4.1 Trừ số dư ví student
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?')
        .run(order.total_amount, req.user.id);

      // 4.2 Ghi giao dịch ví cho student
      db.prepare(`
        INSERT INTO wallet_transactions (user_id, amount, type, status, description)
        VALUES (?, ?, 'payment', 'success', ?)
      `).run(req.user.id, order.total_amount, `Thanh toán đơn hàng #${order_id}`);

      // 4.3 Cập nhật trạng thái đơn hàng
      db.prepare(`
        UPDATE orders
        SET status = 'paid', payment_method = 'wallet'
        WHERE id = ?
      `).run(order_id);

      // 4.4 Tạo enrollments + cộng tiền cho giảng viên
      const insertEnrollment = db.prepare(
        'INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)'
      );
      const updateInstructorBalance = db.prepare(
        'UPDATE users SET balance = balance + ? WHERE id = ?'
      );
      const insertInstructorTx = db.prepare(`
        INSERT INTO wallet_transactions (user_id, amount, type, status, description)
        VALUES (?, ?, 'income', 'success', ?)
      `);

      // Tính tỉ lệ giảm giá (nếu có coupon)
      const totalOriginalPrice = orderItems.reduce((sum, item) => sum + item.price, 0);
      const discountRatio = totalOriginalPrice > 0
        ? order.total_amount / totalOriginalPrice
        : 1;

      for (const item of orderItems) {
        // Enroll student
        insertEnrollment.run(req.user.id, item.course_id);

        // Giá thực tế sau khi chia tỉ lệ giảm giá
        const actualPrice = Math.round(item.price * discountRatio * 100) / 100;

        // Cộng tiền cho giảng viên
        updateInstructorBalance.run(actualPrice, item.instructor_id);

        // Ghi giao dịch ví cho giảng viên
        insertInstructorTx.run(
          item.instructor_id,
          actualPrice,
          `Thu nhập từ bán khóa học trong đơn hàng #${order_id}`
        );
      }

      // 4.5 Tăng used_count của coupon nếu có
      if (order.coupon_id) {
        db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?')
          .run(order.coupon_id);
      }

      // 4.6 Xóa cart_items của student
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    });

    doPayment();

    return res.status(200).json({
      success: true,
      message: 'Thanh toán đơn hàng bằng ví thành công',
      data: {
        order_id: order.id,
        status: 'paid',
      },
    });
  } catch (err) {
    console.error('[walletPay]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = { walletPay };
