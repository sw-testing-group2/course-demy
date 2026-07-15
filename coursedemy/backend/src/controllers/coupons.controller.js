const db = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// Hàm dùng chung: validate coupon + tính discount_amount
// Trả về { ok: true, coupon, discount_amount } hoặc { ok: false, status, message }
// ─────────────────────────────────────────────────────────────────────────────
function validateCoupon(userId, code, subtotal) {
  const upperCode = code.trim().toUpperCase();

  const coupon = db
    .prepare('SELECT * FROM coupons WHERE UPPER(code) = ?')
    .get(upperCode);

  if (!coupon) {
    return { ok: false, status: 404, message: 'Mã giảm giá không tồn tại' };
  }

  if (coupon.status === 'inactive') {
    return { ok: false, status: 400, message: 'Mã giảm giá đã bị vô hiệu hóa' };
  }

  const now = new Date().toISOString().slice(0, 19); // "YYYY-MM-DDTHH:mm:ss"
  if (now < coupon.valid_from || now > coupon.valid_to) {
    return {
      ok: false,
      status: 400,
      message: 'Mã giảm giá đã hết hạn hoặc chưa có hiệu lực',
    };
  }

  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { ok: false, status: 400, message: 'Mã giảm giá đã hết lượt sử dụng' };
  }

  if (subtotal < coupon.min_order_amount) {
    return {
      ok: false,
      status: 400,
      message: 'Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã này',
    };
  }

  // Tính discount_amount
  let discountAmount;
  if (coupon.discount_type === 'fixed') {
    discountAmount = Math.min(coupon.discount_value, subtotal);
  } else {
    // percent
    discountAmount = (subtotal * coupon.discount_value) / 100;
    if (coupon.max_discount !== null) {
      discountAmount = Math.min(discountAmount, coupon.max_discount);
    }
  }

  return { ok: true, coupon, discount_amount: discountAmount };
}

// ─── POST /api/admin/coupons ─────────────────────────────────────────────────
function createCoupon(req, res) {
  try {
    const {
      code,
      description,
      discount_type,
      discount_value,
      max_discount,
      min_order_amount = 0,
      usage_limit,
      valid_from,
      valid_to,
    } = req.body;

    // Validate bắt buộc
    if (!code || !discount_type || discount_value === undefined || !valid_from || !valid_to) {
      return res.status(400).json({ success: false, message: 'Thiếu field bắt buộc' });
    }

    if (!['percent', 'fixed'].includes(discount_type)) {
      return res.status(400).json({ success: false, message: 'discount_type không hợp lệ' });
    }

    const upperCode = code.trim().toUpperCase();

    // Kiểm tra code đã tồn tại
    const existing = db.prepare('SELECT id FROM coupons WHERE UPPER(code) = ?').get(upperCode);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Mã coupon đã tồn tại' });
    }

    const result = db
      .prepare(
        `INSERT INTO coupons
          (code, description, discount_type, discount_value, max_discount,
           min_order_amount, usage_limit, valid_from, valid_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        upperCode,
        description || null,
        discount_type,
        discount_value,
        max_discount ?? null,
        min_order_amount,
        usage_limit ?? null,
        valid_from,
        valid_to
      );

    return res.status(201).json({
      success: true,
      message: 'Tạo coupon thành công',
      data: { id: result.lastInsertRowid, code: upperCode, status: 'active' },
    });
  } catch (err) {
    console.error('[createCoupon]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/admin/coupons ──────────────────────────────────────────────────
function getCoupons(req, res) {
  try {
    const { status } = req.query;

    let query = `
      SELECT id, code, description, discount_type, discount_value, max_discount,
             min_order_amount, usage_limit, used_count, valid_from, valid_to,
             status, created_at
      FROM coupons
    `;
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const data = db.prepare(query).all(...params);

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getCoupons]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/admin/coupons/:id ──────────────────────────────────────────────
function updateCoupon(req, res) {
  try {
    const { id } = req.params;

    const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy coupon' });
    }

    const {
      code,
      description,
      discount_type,
      discount_value,
      max_discount,
      min_order_amount,
      usage_limit,
      valid_from,
      valid_to,
      status,
    } = req.body;

    // Nếu cập nhật code, kiểm tra trùng với coupon khác
    let upperCode = coupon.code;
    if (code !== undefined) {
      upperCode = code.trim().toUpperCase();
      const dup = db
        .prepare('SELECT id FROM coupons WHERE UPPER(code) = ? AND id != ?')
        .get(upperCode, id);
      if (dup) {
        return res.status(409).json({ success: false, message: 'Mã coupon đã tồn tại' });
      }
    }

    // Merge với giá trị hiện có
    const updated = {
      code:             upperCode,
      description:      description      !== undefined ? description      : coupon.description,
      discount_type:    discount_type    !== undefined ? discount_type    : coupon.discount_type,
      discount_value:   discount_value   !== undefined ? discount_value   : coupon.discount_value,
      max_discount:     max_discount     !== undefined ? max_discount     : coupon.max_discount,
      min_order_amount: min_order_amount !== undefined ? min_order_amount : coupon.min_order_amount,
      usage_limit:      usage_limit      !== undefined ? usage_limit      : coupon.usage_limit,
      valid_from:       valid_from       !== undefined ? valid_from       : coupon.valid_from,
      valid_to:         valid_to         !== undefined ? valid_to         : coupon.valid_to,
      status:           status           !== undefined ? status           : coupon.status,
    };

    db.prepare(
      `UPDATE coupons SET
        code = ?, description = ?, discount_type = ?, discount_value = ?,
        max_discount = ?, min_order_amount = ?, usage_limit = ?,
        valid_from = ?, valid_to = ?, status = ?
       WHERE id = ?`
    ).run(
      updated.code,
      updated.description,
      updated.discount_type,
      updated.discount_value,
      updated.max_discount,
      updated.min_order_amount,
      updated.usage_limit,
      updated.valid_from,
      updated.valid_to,
      updated.status,
      id
    );

    const result = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật coupon thành công',
      data: result,
    });
  } catch (err) {
    console.error('[updateCoupon]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── DELETE /api/admin/coupons/:id ───────────────────────────────────────────
function deleteCoupon(req, res) {
  try {
    const { id } = req.params;

    const coupon = db.prepare('SELECT id FROM coupons WHERE id = ?').get(id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy coupon' });
    }

    db.prepare('DELETE FROM coupons WHERE id = ?').run(id);

    return res.status(200).json({ success: true, message: 'Đã xóa coupon' });
  } catch (err) {
    console.error('[deleteCoupon]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/coupons/validate ───────────────────────────────────────────────
function validateCouponRoute(req, res) {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Thiếu mã coupon' });
    }

    // Lấy giỏ hàng hiện tại
    const cartItems = db
      .prepare(
        `SELECT c.price FROM cart_items ci
         JOIN courses c ON ci.course_id = c.id
         WHERE ci.user_id = ?`
      )
      .all(req.user.id);

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);

    const validation = validateCoupon(req.user.id, code, subtotal);
    if (!validation.ok) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const { coupon, discount_amount } = validation;

    return res.status(200).json({
      success: true,
      data: {
        code:            coupon.code,
        subtotal,
        discount_amount,
        total_amount:    subtotal - discount_amount,
      },
    });
  } catch (err) {
    console.error('[validateCouponRoute]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  validateCouponRoute,
  validateCoupon, // export để order.controller dùng chung
};
