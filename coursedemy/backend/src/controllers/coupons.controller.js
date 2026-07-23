const db = require('../config/database');

// ─── Helper: validate coupon logic (dùng chung) ──────────────────────────────
/**
 * Validate coupon và tính discount.
 * @param {number} userId - ID của student
 * @param {string} code   - Mã coupon (chưa cần uppercase, hàm tự xử lý)
 * @param {number} subtotal - Tổng tiền giỏ hàng
 * @returns {{ error: {status, message} } | { coupon, discount_amount }}
 */
function validateCoupon(userId, code, subtotal) {
  const upperCode = code.trim().toUpperCase();

  const coupon = db
    .prepare('SELECT * FROM coupons WHERE UPPER(code) = ?')
    .get(upperCode);

  if (!coupon) {
    return { error: { status: 404, message: 'Mã giảm giá không tồn tại' } };
  }

  if (coupon.status === 'inactive') {
    return { error: { status: 400, message: 'Mã giảm giá đã bị vô hiệu hóa' } };
  }

  const now = new Date().toISOString();
  if (now < coupon.valid_from || now > coupon.valid_to) {
    return { error: { status: 400, message: 'Mã giảm giá đã hết hạn hoặc chưa có hiệu lực' } };
  }

  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { error: { status: 400, message: 'Mã giảm giá đã hết lượt sử dụng' } };
  }

  if (subtotal < coupon.min_order_amount) {
    return {
      error: {
        status: 400,
        message: `Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã này`,
      },
    };
  }

  // Tính discount_amount
  let discount_amount;
  if (coupon.discount_type === 'fixed') {
    discount_amount = Math.min(coupon.discount_value, subtotal);
  } else {
    // percent
    discount_amount = (subtotal * coupon.discount_value) / 100;
    if (coupon.max_discount !== null) {
      discount_amount = Math.min(discount_amount, coupon.max_discount);
    }
  }

  // Làm tròn 2 số thập phân
  discount_amount = Math.round(discount_amount * 100) / 100;

  return { coupon, discount_amount };
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

    // Validate required fields
    if (!code || !discount_type || discount_value == null || !valid_from || !valid_to) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu field bắt buộc: code, discount_type, discount_value, valid_from, valid_to',
      });
    }

    if (!['percent', 'fixed'].includes(discount_type)) {
      return res
        .status(400)
        .json({ success: false, message: 'discount_type không hợp lệ' });
    }

    const upperCode = code.trim().toUpperCase();

    // Kiểm tra code trùng (case-insensitive)
    const existing = db
      .prepare('SELECT id FROM coupons WHERE UPPER(code) = ?')
      .get(upperCode);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Mã coupon đã tồn tại' });
    }

    const result = db
      .prepare(`
        INSERT INTO coupons
          (code, description, discount_type, discount_value, max_discount,
           min_order_amount, usage_limit, valid_from, valid_to, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `)
      .run(
        upperCode,
        description ?? null,
        discount_type,
        parseFloat(discount_value),
        max_discount != null ? parseFloat(max_discount) : null,
        parseFloat(min_order_amount) || 0,
        usage_limit != null ? parseInt(usage_limit) : null,
        valid_from,
        valid_to,
      );

    const newCoupon = db
      .prepare('SELECT id, code, status FROM coupons WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Tạo coupon thành công',
      data: newCoupon,
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

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const coupons = db
      .prepare(`
        SELECT
          id, code, description, discount_type, discount_value, max_discount,
          min_order_amount, usage_limit, used_count, valid_from, valid_to,
          status, created_at
        FROM coupons
        ${where}
        ORDER BY created_at DESC
      `)
      .all(...params);

    return res.status(200).json({ success: true, data: coupons });
  } catch (err) {
    console.error('[getCoupons]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/admin/coupons/:id ──────────────────────────────────────────────
function updateCoupon(req, res) {
  try {
    const couponId = parseInt(req.params.id);
    const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(couponId);
    if (!existing) {
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

    // Kiểm tra code trùng với coupon khác
    if (code !== undefined) {
      const upperCode = code.trim().toUpperCase();
      const conflict = db
        .prepare('SELECT id FROM coupons WHERE UPPER(code) = ? AND id != ?')
        .get(upperCode, couponId);
      if (conflict) {
        return res.status(409).json({ success: false, message: 'Mã coupon đã tồn tại' });
      }
    }

    if (discount_type !== undefined && !['percent', 'fixed'].includes(discount_type)) {
      return res
        .status(400)
        .json({ success: false, message: 'discount_type không hợp lệ' });
    }

    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: 'status không hợp lệ' });
    }

    const fields = [];
    const params = [];

    if (code !== undefined) {
      fields.push('code = ?');
      params.push(code.trim().toUpperCase());
    }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (discount_type !== undefined) { fields.push('discount_type = ?'); params.push(discount_type); }
    if (discount_value !== undefined) { fields.push('discount_value = ?'); params.push(parseFloat(discount_value)); }
    if (max_discount !== undefined) { fields.push('max_discount = ?'); params.push(max_discount !== null ? parseFloat(max_discount) : null); }
    if (min_order_amount !== undefined) { fields.push('min_order_amount = ?'); params.push(parseFloat(min_order_amount) || 0); }
    if (usage_limit !== undefined) { fields.push('usage_limit = ?'); params.push(usage_limit !== null ? parseInt(usage_limit) : null); }
    if (valid_from !== undefined) { fields.push('valid_from = ?'); params.push(valid_from); }
    if (valid_to !== undefined) { fields.push('valid_to = ?'); params.push(valid_to); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có thông tin cần cập nhật' });
    }

    params.push(couponId);
    db.prepare(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updated = db
      .prepare(`
        SELECT id, code, description, discount_type, discount_value, max_discount,
               min_order_amount, usage_limit, used_count, valid_from, valid_to, status, created_at
        FROM coupons WHERE id = ?
      `)
      .get(couponId);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật coupon thành công',
      data: updated,
    });
  } catch (err) {
    console.error('[updateCoupon]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── DELETE /api/admin/coupons/:id ───────────────────────────────────────────
function deleteCoupon(req, res) {
  try {
    const couponId = parseInt(req.params.id);
    const existing = db.prepare('SELECT id FROM coupons WHERE id = ?').get(couponId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy coupon' });
    }

    db.prepare('DELETE FROM coupons WHERE id = ?').run(couponId);

    return res.status(200).json({ success: true, message: 'Đã xóa coupon' });
  } catch (err) {
    console.error('[deleteCoupon]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/coupons/validate [student] ────────────────────────────────────
function validateCouponRoute(req, res) {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã giảm giá' });
    }

    // Lấy giỏ hàng kèm giá
    const cartItems = db
      .prepare(`
        SELECT c.price
        FROM cart_items ci
        JOIN courses c ON ci.course_id = c.id
        WHERE ci.user_id = ?
      `)
      .all(req.user.id);

    if (!cartItems.length) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);

    const result = validateCoupon(req.user.id, code, subtotal);
    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    const { coupon, discount_amount } = result;
    const total_amount = Math.round((subtotal - discount_amount) * 100) / 100;

    return res.status(200).json({
      success: true,
      data: {
        code: coupon.code,
        subtotal,
        discount_amount,
        total_amount,
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
  validateCoupon, // export helper để dùng trong order.controller.js
};
