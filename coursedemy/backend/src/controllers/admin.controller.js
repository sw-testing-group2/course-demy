const db = require('../config/database');

// ══════════════════════════════════════════════════════
//  COURSE MANAGEMENT
// ══════════════════════════════════════════════════════

// ─── GET /api/admin/courses/pending ──────────────────────────────────────────
function getPendingCourses(req, res) {
  try {
    const rows = db.prepare(`
      SELECT
        c.id,
        c.title,
        c.price,
        c.created_at,
        u.id        AS instructor_id,
        u.full_name AS instructor_name,
        u.email     AS instructor_email,
        cat.id      AS category_id,
        cat.name    AS category_name
      FROM courses c
      JOIN users u        ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.status = 'pending'
      ORDER BY c.created_at ASC
    `).all();

    const data = rows.map((row) => ({
      id:         row.id,
      title:      row.title,
      price:      row.price,
      created_at: row.created_at,
      instructor: {
        id:        row.instructor_id,
        full_name: row.instructor_name,
        email:     row.instructor_email,
      },
      category: {
        id:   row.category_id,
        name: row.category_name,
      },
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getPendingCourses]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/admin/courses/:id/approve ──────────────────────────────────────
function approveCourse(req, res) {
  const courseId = parseInt(req.params.id);

  try {
    const course = db.prepare('SELECT id, status FROM courses WHERE id = ?').get(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    if (course.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Khóa học không ở trạng thái chờ duyệt',
      });
    }

    db.prepare("UPDATE courses SET status = 'approved' WHERE id = ?").run(courseId);

    return res.status(200).json({ success: true, message: 'Đã phê duyệt khóa học' });
  } catch (err) {
    console.error('[approveCourse]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/admin/courses/:id/reject ───────────────────────────────────────
function rejectCourse(req, res) {
  const courseId = parseInt(req.params.id);

  try {
    const course = db.prepare('SELECT id, status FROM courses WHERE id = ?').get(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    if (course.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Khóa học không ở trạng thái chờ duyệt',
      });
    }

    db.prepare("UPDATE courses SET status = 'rejected' WHERE id = ?").run(courseId);

    return res.status(200).json({ success: true, message: 'Đã từ chối khóa học' });
  } catch (err) {
    console.error('[rejectCourse]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════
//  USER MANAGEMENT
// ══════════════════════════════════════════════════════

// ─── GET /api/admin/users ────────────────────────────────────────────────────
function getUsers(req, res) {
  try {
    const { role, status } = req.query;

    const conditions = [];
    const params     = [];

    if (role)   { conditions.push('role = ?');   params.push(role); }
    if (status) { conditions.push('status = ?'); params.push(status); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const users = db.prepare(`
      SELECT id, full_name, email, role, status, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
    `).all(...params);

    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    console.error('[getUsers]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/admin/users/:id/lock ───────────────────────────────────────────
function toggleLockUser(req, res) {
  const userId = parseInt(req.params.id);

  try {
    const user = db
      .prepare('SELECT id, role, status FROM users WHERE id = ?')
      .get(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Không thể khóa tài khoản admin',
      });
    }

    // Toggle: active ↔ locked
    const newStatus = user.status === 'active' ? 'locked' : 'active';
    const message   = newStatus === 'locked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản';

    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(newStatus, userId);

    return res.status(200).json({
      success: true,
      message,
      data: { id: userId, status: newStatus },
    });
  } catch (err) {
    console.error('[toggleLockUser]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════
//  CATEGORY MANAGEMENT
// ══════════════════════════════════════════════════════

// ─── POST /api/admin/categories ──────────────────────────────────────────────
function createCategory(req, res) {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' });
  }

  try {
    const existing = db
      .prepare('SELECT id FROM categories WHERE name = ?')
      .get(name.trim());

    if (existing) {
      return res.status(409).json({ success: false, message: 'Tên danh mục đã tồn tại' });
    }

    const result = db
      .prepare('INSERT INTO categories (name, description) VALUES (?, ?)')
      .run(name.trim(), description ?? null);

    const newCat = db
      .prepare('SELECT id, name, description FROM categories WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công',
      data: newCat,
    });
  } catch (err) {
    console.error('[createCategory]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/admin/categories/:id ───────────────────────────────────────────
function updateCategory(req, res) {
  const catId = parseInt(req.params.id);
  const { name, description } = req.body;

  try {
    const existing = db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .get(catId);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }

    // Kiểm tra trùng tên với danh mục KHÁC
    if (name && name.trim()) {
      const duplicate = db
        .prepare('SELECT id FROM categories WHERE name = ? AND id != ?')
        .get(name.trim(), catId);

      if (duplicate) {
        return res.status(409).json({ success: false, message: 'Tên danh mục đã tồn tại' });
      }
    }

    // Xây UPDATE SET động
    const fields = [];
    const params = [];

    if (name        !== undefined) { fields.push('name = ?');        params.push(name.trim()); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có thông tin cần cập nhật' });
    }

    params.push(catId);
    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updated = db
      .prepare('SELECT id, name, description FROM categories WHERE id = ?')
      .get(catId);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công',
      data: updated,
    });
  } catch (err) {
    console.error('[updateCategory]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── DELETE /api/admin/categories/:id ────────────────────────────────────────
function deleteCategory(req, res) {
  const catId = parseInt(req.params.id);

  try {
    const existing = db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .get(catId);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }

    // Kiểm tra có courses đang dùng category này không
    const inUse = db
      .prepare('SELECT COUNT(*) AS count FROM courses WHERE category_id = ?')
      .get(catId);

    if (inUse.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa danh mục đang có khóa học',
      });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(catId);

    return res.status(200).json({ success: true, message: 'Đã xóa danh mục' });
  } catch (err) {
    console.error('[deleteCategory]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════
//  WITHDRAWAL MANAGEMENT
// ══════════════════════════════════════════════════════

// ─── GET /api/admin/withdrawals ──────────────────────────────────────────────
function getAdminWithdrawals(req, res) {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        wr.id,
        wr.amount,
        wr.bank_name,
        wr.account_number,
        wr.account_holder,
        wr.status,
        wr.reason,
        wr.created_at,
        wr.processed_at,
        u.full_name,
        u.email
      FROM withdrawal_requests wr
      JOIN users u ON wr.instructor_id = u.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE wr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY wr.created_at DESC';

    const rows = db.prepare(query).all(...params);

    const data = rows.map((row) => ({
      id:             row.id,
      amount:         row.amount,
      bank_name:      row.bank_name,
      account_number: row.account_number,
      account_holder: row.account_holder,
      status:         row.status,
      reason:         row.reason,
      created_at:     row.created_at,
      processed_at:   row.processed_at,
      instructor: {
        full_name: row.full_name,
        email:     row.email,
      },
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getAdminWithdrawals]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/admin/withdrawals/:id/approve ──────────────────────────────────
function approveWithdrawal(req, res) {
  const withdrawalId = parseInt(req.params.id);

  try {
    const withdrawal = db.prepare('SELECT id, status, instructor_id, amount FROM withdrawal_requests WHERE id = ?')
      .get(withdrawalId);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu rút tiền',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu đã được xử lý từ trước',
      });
    }

    const doApprove = db.transaction(() => {
      // 1. Cập nhật withdrawal_requests
      db.prepare(`
        UPDATE withdrawal_requests
        SET status = 'approved', processed_at = datetime('now')
        WHERE id = ?
      `).run(withdrawalId);

      // 2. Cập nhật wallet_transactions tương ứng
      db.prepare(`
        UPDATE wallet_transactions
        SET status = 'success'
        WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending' AND amount = ?
      `).run(withdrawal.instructor_id, withdrawal.amount);
    });

    doApprove();

    return res.status(200).json({
      success: true,
      message: 'Đã phê duyệt yêu cầu rút tiền',
    });
  } catch (err) {
    console.error('[approveWithdrawal]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/admin/withdrawals/:id/reject ───────────────────────────────────
function rejectWithdrawal(req, res) {
  const withdrawalId = parseInt(req.params.id);
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp lý do từ chối',
    });
  }

  try {
    const withdrawal = db.prepare('SELECT id, status, instructor_id, amount FROM withdrawal_requests WHERE id = ?')
      .get(withdrawalId);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu rút tiền',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu đã được xử lý từ trước',
      });
    }

    const doReject = db.transaction(() => {
      // 1. Cập nhật withdrawal_requests
      db.prepare(`
        UPDATE withdrawal_requests
        SET status = 'rejected', reason = ?, processed_at = datetime('now')
        WHERE id = ?
      `).run(reason, withdrawalId);

      // 2. Cập nhật wallet_transactions tương ứng thành failed
      db.prepare(`
        UPDATE wallet_transactions
        SET status = 'failed', description = ?
        WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending' AND amount = ?
      `).run(`Từ chối rút tiền: ${reason}`, withdrawal.instructor_id, withdrawal.amount);

      // 3. Hoàn tiền lại vào ví giảng viên
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?')
        .run(withdrawal.amount, withdrawal.instructor_id);

      // 4. Ghi giao dịch hoàn tiền
      db.prepare(`
        INSERT INTO wallet_transactions (user_id, amount, type, status, description)
        VALUES (?, ?, 'refund', 'success', ?)
      `).run(
        withdrawal.instructor_id,
        withdrawal.amount,
        `Hoàn tiền yêu cầu rút tiền bị từ chối #${withdrawalId}`
      );
    });

    doReject();

    return res.status(200).json({
      success: true,
      message: 'Đã từ chối yêu cầu rút tiền',
    });
  } catch (err) {
    console.error('[rejectWithdrawal]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = {
  getPendingCourses,
  approveCourse,
  rejectCourse,
  getUsers,
  toggleLockUser,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
};

