const axios = require('axios');
const db     = require('../config/database');
const { createMomoSignature, verifyMomoSignature } = require('../utils/momo.util');
const { buildVnpayUrl, verifyVnpaySignature }      = require('../utils/vnpay.util');

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: xác nhận thanh toán thành công — dùng chung cho demo, momo, vnpay
//  Dùng db.transaction để đảm bảo tính toàn vẹn.
// ─────────────────────────────────────────────────────────────────────────────
function confirmPaymentSuccess(orderId, paymentId, transactionId) {
  const doConfirm = db.transaction(() => {
    // 1. Cập nhật payments
    db.prepare(
      `UPDATE payments
       SET status = 'success', transaction_id = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(transactionId ?? null, paymentId);

    // 2. Cập nhật orders
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    db.prepare(
      `UPDATE orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?`
    ).run(orderId);

    // 3. Enroll từng course trong order_items
    const items = db.prepare('SELECT course_id FROM order_items WHERE order_id = ?').all(orderId);
    const insertEnrollment = db.prepare(
      'INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)'
    );
    for (const item of items) {
      insertEnrollment.run(order.user_id, item.course_id);
    }

    // 4. Tăng used_count của coupon nếu có
    if (order.coupon_id) {
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(order.coupon_id);
    }

    // 5. Xóa cart_items của user
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(order.user_id);
  });

  doConfirm();
}

// Helper: lấy order + kiểm tra quyền ownership + status pending
function getOrderForPayment(orderId, userId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return { error: 404, message: 'Không tìm thấy đơn hàng' };
  if (order.user_id !== userId) return { error: 403, message: 'Bạn không có quyền truy cập đơn hàng này' };
  if (order.status !== 'pending') return { error: 400, message: 'Đơn hàng không ở trạng thái chờ thanh toán' };
  return { order };
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/demo/pay  [student]
// ══════════════════════════════════════════════════════════════════════════════
function demoPay(req, res) {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ success: false, message: 'Thiếu order_id' });

    const check = getOrderForPayment(order_id, req.user.id);
    if (check.error) return res.status(check.error).json({ success: false, message: check.message });
    const { order } = check;

    const doDemo = db.transaction(() => {
      // 1. Tạo payment record
      const payResult = db.prepare(
        `INSERT INTO payments (order_id, method, amount, status, updated_at)
         VALUES (?, 'demo', ?, 'success', datetime('now'))`
      ).run(order.id, order.total_amount);

      // 2-5: Enroll, coupon, cart (dùng helper nhưng không lồng transaction → inline)
      db.prepare(
        `UPDATE orders SET status = 'paid', payment_method = 'demo', updated_at = datetime('now') WHERE id = ?`
      ).run(order.id);

      const items = db.prepare('SELECT course_id FROM order_items WHERE order_id = ?').all(order.id);
      const insertEnroll = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)');
      for (const item of items) insertEnroll.run(order.user_id, item.course_id);

      if (order.coupon_id) {
        db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(order.coupon_id);
      }

      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(order.user_id);

      return payResult.lastInsertRowid;
    });

    doDemo();

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

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/momo/create  [student]
// ══════════════════════════════════════════════════════════════════════════════
async function momoCreate(req, res) {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ success: false, message: 'Thiếu order_id' });

    const check = getOrderForPayment(order_id, req.user.id);
    if (check.error) return res.status(check.error).json({ success: false, message: check.message });
    const { order } = check;

    const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
    const accessKey   = process.env.MOMO_ACCESS_KEY   || 'F8BBA842ECF85';
    const secretKey   = process.env.MOMO_SECRET_KEY   || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const endpoint    = process.env.MOMO_ENDPOINT      || 'https://test-payment.momo.vn/v2/gateway/api/create';
    const redirectUrl = process.env.MOMO_REDIRECT_URL  || 'http://localhost:3000/api/payments/momo/return';
    const ipnUrl      = process.env.MOMO_IPN_URL       || 'http://localhost:3000/api/payments/momo/ipn';

    const requestId   = `MOMO${order_id}${Date.now()}`;
    const orderId     = requestId; // MoMo orderId
    const amount      = String(Math.round(order.total_amount));
    const orderInfo   = `Thanh toan don hang #${order_id} CourseDemy`;
    const requestType = 'captureWallet';
    const extraData   = '';
    const lang        = 'vi';

    const signature = createMomoSignature(
      { accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType },
      secretKey
    );

    const momoBody = {
      partnerCode, accessKey, requestId, amount, orderId,
      orderInfo, redirectUrl, ipnUrl, lang, requestType,
      extraData, signature,
    };

    let momoRes;
    try {
      momoRes = await axios.post(endpoint, momoBody, { timeout: 10000 });
    } catch (networkErr) {
      console.error('[momoCreate] network error', networkErr.message);
      return res.status(502).json({ success: false, message: 'Không thể kết nối cổng thanh toán MoMo' });
    }

    // Lưu payment record
    db.prepare(
      `INSERT INTO payments (order_id, method, amount, request_id, status, gateway_response, updated_at)
       VALUES (?, 'momo', ?, ?, 'pending', ?, datetime('now'))`
    ).run(order.id, order.total_amount, requestId, JSON.stringify(momoRes.data));

    return res.status(200).json({
      success: true,
      data: { payUrl: momoRes.data.payUrl, orderId: requestId },
    });
  } catch (err) {
    console.error('[momoCreate]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/momo/ipn  [Public — MoMo server-to-server]
// ══════════════════════════════════════════════════════════════════════════════
function momoIpn(req, res) {
  try {
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const body      = req.body;

    // Verify chữ ký
    if (!verifyMomoSignature(body, secretKey)) {
      console.warn('[momoIpn] invalid signature, ignored');
      return res.sendStatus(204);
    }

    const payment = db.prepare('SELECT * FROM payments WHERE request_id = ?').get(body.requestId);
    if (!payment) {
      console.warn('[momoIpn] payment not found for requestId:', body.requestId);
      return res.sendStatus(204);
    }

    const doUpdate = db.transaction(() => {
      if (body.resultCode === 0) {
        // Thanh toán thành công
        db.prepare(
          `UPDATE payments
           SET status = 'success', transaction_id = ?, gateway_response = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).run(String(body.transId), JSON.stringify(body), payment.id);

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(payment.order_id);
        db.prepare(
          `UPDATE orders SET status = 'paid', payment_method = 'momo', updated_at = datetime('now') WHERE id = ?`
        ).run(order.id);

        const items = db.prepare('SELECT course_id FROM order_items WHERE order_id = ?').all(order.id);
        const insertEnroll = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)');
        for (const item of items) insertEnroll.run(order.user_id, item.course_id);

        if (order.coupon_id) {
          db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(order.coupon_id);
        }
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(order.user_id);
      } else {
        // Thanh toán thất bại
        db.prepare(
          `UPDATE payments SET status = 'failed', gateway_response = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(JSON.stringify(body), payment.id);

        db.prepare(
          `UPDATE orders SET status = 'failed', updated_at = datetime('now') WHERE id = ?`
        ).run(payment.order_id);
      }
    });

    doUpdate();
    return res.sendStatus(204);
  } catch (err) {
    console.error('[momoIpn]', err);
    return res.sendStatus(204); // MoMo yêu cầu luôn trả 204
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/momo/return  [Public — browser redirect]
// ══════════════════════════════════════════════════════════════════════════════
function momoReturn(req, res) {
  try {
    const { resultCode, orderId, requestId } = req.query;
    const secretKey  = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Verify nếu có signature (log nếu sai nhưng vẫn cho redirect)
    if (req.query.signature) {
      if (!verifyMomoSignature(req.query, secretKey)) {
        console.warn('[momoReturn] unverified signature from MoMo redirect');
      }
    }

    // Tìm order_id thực từ payment request
    const payment = db.prepare('SELECT * FROM payments WHERE request_id = ?').get(orderId || requestId);
    const realOrderId = payment ? payment.order_id : 'unknown';
    const status = resultCode === '0' || resultCode === 0 ? 'paid' : 'failed';

    return res.redirect(302, `${frontendUrl}/payment-result.html?orderId=${realOrderId}&status=${status}`);
  } catch (err) {
    console.error('[momoReturn]', err);
    return res.redirect(302, (process.env.FRONTEND_URL || 'http://localhost:3000') + '/payment-result.html?status=error');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/vnpay/create  [student]
// ══════════════════════════════════════════════════════════════════════════════
function vnpayCreate(req, res) {
  try {
    const tmnCode   = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;

    if (!tmnCode || !hashSecret) {
      return res.status(503).json({
        success: false,
        message: 'Chưa cấu hình VNPay sandbox, vui lòng đăng ký merchant test tại sandbox.vnpayment.vn/devreg',
      });
    }

    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ success: false, message: 'Thiếu order_id' });

    const check = getOrderForPayment(order_id, req.user.id);
    if (check.error) return res.status(check.error).json({ success: false, message: check.message });
    const { order } = check;

    const vnpUrl    = process.env.VNPAY_URL        || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payments/vnpay/return';

    const txnRef = `${order_id}-${Date.now()}`;

    // Tạo ngày theo định dạng VNPay: yyyyMMddHHmmss giờ VN (UTC+7)
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // shift to UTC+7
    const pad = (n) => String(n).padStart(2, '0');
    const createDate = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;

    const params = {
      vnp_Version:    '2.1.0',
      vnp_Command:    'pay',
      vnp_TmnCode:    tmnCode,
      vnp_Amount:     String(Math.round(order.total_amount * 100)),
      vnp_CurrCode:   'VND',
      vnp_TxnRef:     txnRef,
      vnp_OrderInfo:  `Thanh toan don hang ${order_id}`,
      vnp_OrderType:  'other',
      vnp_Locale:     'vn',
      vnp_ReturnUrl:  returnUrl,
      vnp_IpAddr:     req.ip || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const payUrl = buildVnpayUrl(params, hashSecret, vnpUrl);

    // Lưu payment record
    db.prepare(
      `INSERT INTO payments (order_id, method, amount, request_id, status, updated_at)
       VALUES (?, 'vnpay', ?, ?, 'pending', datetime('now'))`
    ).run(order.id, order.total_amount, txnRef);

    return res.status(200).json({ success: true, data: { payUrl } });
  } catch (err) {
    console.error('[vnpayCreate]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/vnpay/ipn  [Public — VNPay server-to-server]
// ══════════════════════════════════════════════════════════════════════════════
function vnpayIpn(req, res) {
  try {
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const query      = req.query;

    if (!hashSecret || !verifyVnpaySignature(query, hashSecret)) {
      return res.json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const txnRef  = query.vnp_TxnRef;
    const payment = db.prepare('SELECT * FROM payments WHERE request_id = ?').get(txnRef);
    if (!payment) {
      return res.json({ RspCode: '01', Message: 'Order not found' });
    }

    const doUpdate = db.transaction(() => {
      if (query.vnp_ResponseCode === '00') {
        db.prepare(
          `UPDATE payments
           SET status = 'success', transaction_id = ?, gateway_response = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).run(query.vnp_TransactionNo || '', JSON.stringify(query), payment.id);

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(payment.order_id);
        db.prepare(
          `UPDATE orders SET status = 'paid', payment_method = 'vnpay', updated_at = datetime('now') WHERE id = ?`
        ).run(order.id);

        const items = db.prepare('SELECT course_id FROM order_items WHERE order_id = ?').all(order.id);
        const insertEnroll = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)');
        for (const item of items) insertEnroll.run(order.user_id, item.course_id);

        if (order.coupon_id) {
          db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(order.coupon_id);
        }
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(order.user_id);
      } else {
        db.prepare(
          `UPDATE payments SET status = 'failed', gateway_response = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(JSON.stringify(query), payment.id);

        db.prepare(
          `UPDATE orders SET status = 'failed', updated_at = datetime('now') WHERE id = ?`
        ).run(payment.order_id);
      }
    });

    doUpdate();
    return res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
    console.error('[vnpayIpn]', err);
    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/vnpay/return  [Public — browser redirect]
// ══════════════════════════════════════════════════════════════════════════════
function vnpayReturn(req, res) {
  try {
    const hashSecret  = process.env.VNPAY_HASH_SECRET;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const query       = req.query;

    const valid = hashSecret ? verifyVnpaySignature(query, hashSecret) : false;
    if (!valid) console.warn('[vnpayReturn] unverified signature from VNPay redirect');

    const txnRef  = query.vnp_TxnRef || '';
    const payment = db.prepare('SELECT * FROM payments WHERE request_id = ?').get(txnRef);
    const realOrderId = payment ? payment.order_id : 'unknown';
    const status = query.vnp_ResponseCode === '00' ? 'paid' : 'failed';

    return res.redirect(302, `${frontendUrl}/payment-result.html?orderId=${realOrderId}&status=${status}`);
  } catch (err) {
    console.error('[vnpayReturn]', err);
    return res.redirect(302, (process.env.FRONTEND_URL || 'http://localhost:3000') + '/payment-result.html?status=error');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/:orderId/status  [student]
// ══════════════════════════════════════════════════════════════════════════════
function getPaymentStatus(req, res) {
  try {
    const { orderId } = req.params;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    if (order.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập đơn hàng này' });

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

module.exports = {
  demoPay,
  momoCreate,
  momoIpn,
  momoReturn,
  vnpayCreate,
  vnpayIpn,
  vnpayReturn,
  getPaymentStatus,
};
