const db    = require('../config/database');
const axios = require('axios');
const { createMomoSignature, verifyMomoSignature } = require('../utils/momo.util');
const { buildVnpayUrl, verifyVnpaySignature }       = require('../utils/vnpay.util');

// ─── Helper: side-effects sau thanh toán thành công (enrollments + coupon + cart) ─
// Caller tự chịu trách nhiệm cập nhật payments.status và orders.status.
function applyPaymentSideEffects(orderId, couponId, userId) {
  const orderItems = db.prepare(`
    SELECT oi.course_id
    FROM order_items oi
    WHERE oi.order_id = ?
  `).all(orderId);

  // 1. INSERT OR IGNORE từng course vào enrollments
  const insertEnrollment = db.prepare(
    'INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)'
  );
  for (const item of orderItems) {
    insertEnrollment.run(userId, item.course_id);
  }

  // 2. Tăng used_count của coupon nếu có
  if (couponId) {
    db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?')
      .run(couponId);
  }

  // 3. Xóa cart_items của user
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
}


// ─── Helper: validate order thuộc user và đang pending ────────────────────────
function validateOrder(orderId, userId) {
  const order = db.prepare(`
    SELECT id, user_id, total_amount, status, coupon_id, payment_method
    FROM orders
    WHERE id = ?
  `).get(orderId);

  if (!order) {
    return { error: { status: 404, message: 'Không tìm thấy đơn hàng' } };
  }
  if (order.user_id !== userId) {
    return { error: { status: 403, message: 'Đơn hàng không thuộc về bạn' } };
  }
  if (order.status !== 'pending') {
    return { error: { status: 400, message: 'Đơn hàng không ở trạng thái chờ thanh toán' } };
  }
  return { order };
}

// ─── POST /api/payments/demo/pay ─────────────────────────────────────────────
function demoPay(req, res) {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Thiếu order_id' });
    }

    const { order, error } = validateOrder(Number(order_id), req.user.id);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const doPayment = db.transaction(() => {
      // 1. INSERT payments record
      const payResult = db.prepare(`
        INSERT INTO payments (order_id, method, amount, status)
        VALUES (?, 'demo', ?, 'success')
      `).run(order.id, order.total_amount);

      // 2. UPDATE orders
      db.prepare(`UPDATE orders SET status = 'paid', payment_method = 'demo' WHERE id = ?`)
        .run(order.id);

      // 3. Enrollments + coupon + cart
      applyPaymentSideEffects(order.id, order.coupon_id, req.user.id);
    });

    doPayment();

    return res.status(200).json({
      success: true,
      message: 'Thanh toán thành công (demo)',
      data: { order_id: order.id, status: 'paid' },
    });
  } catch (err) {
    console.error('[demoPay]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/payments/momo/create ──────────────────────────────────────────
async function momoCreate(req, res) {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Thiếu order_id' });
    }

    const { order, error } = validateOrder(Number(order_id), req.user.id);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey   = process.env.MOMO_ACCESS_KEY;
    const secretKey   = process.env.MOMO_SECRET_KEY;
    const endpoint    = process.env.MOMO_ENDPOINT;
    const redirectUrl = process.env.MOMO_REDIRECT_URL;
    const ipnUrl      = process.env.MOMO_IPN_URL;

    const requestId  = `MOMO${order.id}${Date.now()}`;
    const orderId    = requestId; // orderId gửi MoMo = requestId
    const amount     = String(Math.round(order.total_amount));
    const orderInfo  = `Thanh toan don hang #${order.id} CourseDemy`;
    const requestType = 'captureWallet';
    const extraData  = '';

    const signature = createMomoSignature(
      { accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType },
      secretKey
    );

    const payload = {
      partnerCode, accessKey, requestId, amount, orderId,
      orderInfo, redirectUrl, ipnUrl, extraData, requestType, signature,
      lang: 'vi',
    };

    let momoResponse;
    try {
      const response = await axios.post(endpoint, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      momoResponse = response.data;
    } catch (networkErr) {
      console.error('[momoCreate] Network error:', networkErr.message);
      return res.status(502).json({ success: false, message: 'Không thể kết nối cổng thanh toán MoMo' });
    }

    // Lưu payments record (pending)
    db.prepare(`
      INSERT INTO payments (order_id, method, amount, request_id, status, gateway_response)
      VALUES (?, 'momo', ?, ?, 'pending', ?)
    `).run(order.id, order.total_amount, requestId, JSON.stringify(momoResponse));

    return res.status(200).json({
      success: true,
      data: { payUrl: momoResponse.payUrl, orderId: requestId },
    });
  } catch (err) {
    console.error('[momoCreate]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/payments/momo/ipn ─────────────────────────────────────────────
// Public — MoMo gọi server-to-server
function momoIpn(req, res) {
  try {
    const body      = req.body;
    const secretKey = process.env.MOMO_SECRET_KEY;

    // Xác minh chữ ký
    if (!verifyMomoSignature(body, secretKey)) {
      console.warn('[momoIpn] Invalid signature from MoMo');
      return res.status(204).end();
    }

    // Tìm payment theo request_id
    const payment = db.prepare(`
      SELECT p.*, o.user_id, o.coupon_id, o.total_amount, o.id AS order_real_id
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.request_id = ?
    `).get(body.requestId);

    if (!payment) {
      console.warn('[momoIpn] Payment not found for requestId:', body.requestId);
      return res.status(204).end();
    }

    const order = {
      id: payment.order_id,
      user_id: payment.user_id,
      coupon_id: payment.coupon_id,
      total_amount: payment.total_amount,
    };

    const doUpdate = db.transaction(() => {
      if (body.resultCode === 0) {
        // Thanh toán thành công
        db.prepare(`UPDATE payments SET status = 'success', transaction_id = ?, updated_at = datetime('now') WHERE id = ?`)
          .run(String(body.transId), payment.id);
        db.prepare(`UPDATE orders SET status = 'paid', payment_method = 'momo' WHERE id = ?`)
          .run(order.id);
        applyPaymentSideEffects(order.id, order.coupon_id, payment.user_id);
      } else {
        // Thanh toán thất bại
        db.prepare(`UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?`)
          .run(payment.id);
        db.prepare(`UPDATE orders SET status = 'failed' WHERE id = ?`)
          .run(order.id);
      }
    });

    doUpdate();
    return res.status(204).end();
  } catch (err) {
    console.error('[momoIpn]', err);
    return res.status(204).end();
  }
}

// ─── GET /api/payments/momo/return ───────────────────────────────────────────
// Public — MoMo redirect người dùng về
function momoReturn(req, res) {
  try {
    const { resultCode, orderId, signature } = req.query;
    const secretKey  = process.env.MOMO_SECRET_KEY;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Tìm original order_id từ request_id
    const payment = db.prepare(`SELECT order_id FROM payments WHERE request_id = ?`).get(orderId);
    const realOrderId = payment ? payment.order_id : orderId;

    const status = Number(resultCode) === 0 ? 'paid' : 'failed';
    return res.redirect(302, `${frontendUrl}/payment-result.html?orderId=${realOrderId}&status=${status}`);
  } catch (err) {
    console.error('[momoReturn]', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(302, `${frontendUrl}/payment-result.html?status=failed`);
  }
}

// ─── POST /api/payments/vnpay/create ─────────────────────────────────────────
function vnpayCreate(req, res) {
  try {
    const tmnCode    = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const vnpayUrl   = process.env.VNPAY_URL;
    const returnUrl  = process.env.VNPAY_RETURN_URL;

    if (!tmnCode || !hashSecret) {
      return res.status(503).json({
        success: false,
        message: 'Chưa cấu hình VNPay sandbox, vui lòng đăng ký merchant test tại sandbox.vnpayment.vn/devreg',
      });
    }

    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Thiếu order_id' });
    }

    const { order, error } = validateOrder(Number(order_id), req.user.id);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    // Tính thời gian hiện tại (giờ VN = UTC+7) dạng yyyyMMddHHmmss
    const now   = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const pad   = (n) => String(n).padStart(2, '0');
    const createDate = [
      now.getUTCFullYear(),
      pad(now.getUTCMonth() + 1),
      pad(now.getUTCDate()),
      pad(now.getUTCHours()),
      pad(now.getUTCMinutes()),
      pad(now.getUTCSeconds()),
    ].join('');

    const txnRef = `${order.id}-${Date.now()}`;

    const params = {
      vnp_Version:   '2.1.0',
      vnp_Command:   'pay',
      vnp_TmnCode:   tmnCode,
      vnp_Amount:    String(Math.round(order.total_amount * 100)),
      vnp_CurrCode:  'VND',
      vnp_TxnRef:    txnRef,
      vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
      vnp_OrderType: 'other',
      vnp_Locale:    'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr:    req.ip || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const payUrl = buildVnpayUrl(params, hashSecret, vnpayUrl);

    // Lưu payments record (pending)
    db.prepare(`
      INSERT INTO payments (order_id, method, amount, request_id, status)
      VALUES (?, 'vnpay', ?, ?, 'pending')
    `).run(order.id, order.total_amount, txnRef);

    return res.status(200).json({
      success: true,
      data: { payUrl },
    });
  } catch (err) {
    console.error('[vnpayCreate]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/payments/vnpay/ipn ─────────────────────────────────────────────
// Public — VNPay gọi server-to-server
function vnpayIpn(req, res) {
  try {
    const query      = req.query;
    const hashSecret = process.env.VNPAY_HASH_SECRET;

    // Xác minh chữ ký
    if (!verifyVnpaySignature(query, hashSecret)) {
      return res.json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const txnRef = query.vnp_TxnRef;
    const payment = db.prepare(`
      SELECT p.*, o.user_id, o.coupon_id, o.total_amount
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.request_id = ?
    `).get(txnRef);

    if (!payment) {
      return res.json({ RspCode: '01', Message: 'Order not found' });
    }

    const order = {
      id: payment.order_id,
      user_id: payment.user_id,
      coupon_id: payment.coupon_id,
      total_amount: payment.total_amount,
    };

    const doUpdate = db.transaction(() => {
      if (query.vnp_ResponseCode === '00') {
        db.prepare(`UPDATE payments SET status = 'success', transaction_id = ?, updated_at = datetime('now') WHERE id = ?`)
          .run(query.vnp_TransactionNo || '', payment.id);
        db.prepare(`UPDATE orders SET status = 'paid', payment_method = 'vnpay' WHERE id = ?`)
          .run(order.id);
        applyPaymentSideEffects(order.id, order.coupon_id, payment.user_id);
      } else {
        db.prepare(`UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?`)
          .run(payment.id);
        db.prepare(`UPDATE orders SET status = 'failed' WHERE id = ?`)
          .run(order.id);
      }
    });

    doUpdate();
    return res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
    console.error('[vnpayIpn]', err);
    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
}

// ─── GET /api/payments/vnpay/return ──────────────────────────────────────────
// Public — VNPay redirect người dùng về
function vnpayReturn(req, res) {
  try {
    const query       = req.query;
    const hashSecret  = process.env.VNPAY_HASH_SECRET;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const verified = verifyVnpaySignature(query, hashSecret);
    if (!verified) {
      console.warn('[vnpayReturn] Signature mismatch — unverified redirect');
    }

    // Lấy order_id từ txnRef (format: `${order_id}-${timestamp}`)
    const txnRef  = query.vnp_TxnRef || '';
    const orderId = txnRef.split('-')[0];
    const status  = query.vnp_ResponseCode === '00' ? 'paid' : 'failed';

    return res.redirect(302, `${frontendUrl}/payment-result.html?orderId=${orderId}&status=${status}`);
  } catch (err) {
    console.error('[vnpayReturn]', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(302, `${frontendUrl}/payment-result.html?status=failed`);
  }
}

// ─── GET /api/payments/:orderId/status ───────────────────────────────────────
function getPaymentStatus(req, res) {
  try {
    const orderId = Number(req.params.orderId);

    const order = db.prepare(`
      SELECT id, user_id, status, payment_method, total_amount
      FROM orders
      WHERE id = ?
    `).get(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Đơn hàng không thuộc về bạn' });
    }

    return res.status(200).json({
      success: true,
      data: {
        order_id:       order.id,
        status:         order.status,
        payment_method: order.payment_method,
        total_amount:   order.total_amount,
      },
    });
  } catch (err) {
    console.error('[getPaymentStatus]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// Giữ lại walletPay từ Task cũ
const { walletPay } = (() => {
  // inline để tránh circular dependency — copy logic
  function walletPay(req, res) {
    try {
      const { order_id } = req.body;
      if (!order_id) {
        return res.status(400).json({ success: false, message: 'Thiếu order_id' });
      }

      const order = db.prepare(`
        SELECT id, user_id, total_amount, status, coupon_id
        FROM orders WHERE id = ?
      `).get(order_id);

      if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      if (order.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Đơn hàng không thuộc về bạn' });
      if (order.status !== 'pending') return res.status(400).json({ success: false, message: 'Đơn hàng không ở trạng thái chờ thanh toán' });

      const student = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
      if (student.balance < order.total_amount) {
        return res.status(400).json({ success: false, message: 'Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền' });
      }

      const orderItems = db.prepare(`
        SELECT oi.course_id, oi.price, c.instructor_id
        FROM order_items oi JOIN courses c ON oi.course_id = c.id
        WHERE oi.order_id = ?
      `).all(order_id);

      const doPayment = db.transaction(() => {
        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(order.total_amount, req.user.id);
        db.prepare(`INSERT INTO wallet_transactions (user_id, amount, type, status, description) VALUES (?, ?, 'payment', 'success', ?)`)
          .run(req.user.id, order.total_amount, `Thanh toán đơn hàng #${order_id}`);
        db.prepare(`UPDATE orders SET status = 'paid', payment_method = 'wallet' WHERE id = ?`).run(order_id);

        const insertEnrollment = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)');
        const updateInstructorBalance = db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
        const insertInstructorTx = db.prepare(`INSERT INTO wallet_transactions (user_id, amount, type, status, description) VALUES (?, ?, 'income', 'success', ?)`);

        const totalOriginalPrice = orderItems.reduce((sum, item) => sum + item.price, 0);
        const discountRatio = totalOriginalPrice > 0 ? order.total_amount / totalOriginalPrice : 1;

        for (const item of orderItems) {
          insertEnrollment.run(req.user.id, item.course_id);
          const actualPrice = Math.round(item.price * discountRatio * 100) / 100;
          updateInstructorBalance.run(actualPrice, item.instructor_id);
          insertInstructorTx.run(item.instructor_id, actualPrice, `Thu nhập từ bán khóa học trong đơn hàng #${order_id}`);
        }

        if (order.coupon_id) {
          db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(order.coupon_id);
        }
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
      });

      doPayment();

      return res.status(200).json({
        success: true,
        message: 'Thanh toán đơn hàng bằng ví thành công',
        data: { order_id: order.id, status: 'paid' },
      });
    } catch (err) {
      console.error('[walletPay]', err);
      return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }
  return { walletPay };
})();

module.exports = {
  walletPay,
  demoPay,
  momoCreate,
  momoIpn,
  momoReturn,
  vnpayCreate,
  vnpayIpn,
  vnpayReturn,
  getPaymentStatus,
};
