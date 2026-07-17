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
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { role, search } = req.query;

    const conditions = [];
    const params     = [];

    if (role) { conditions.push('role = ?'); params.push(role); }
    if (search && search.trim()) {
      conditions.push('(full_name LIKE ? OR email LIKE ?)');
      const kw = `%${search.trim()}%`;
      params.push(kw, kw);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM users ${where}`)
      .get(...params);

    const rows = db.prepare(`
      SELECT id, full_name, email, role, avatar, created_at, is_active
      FROM users
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return res.status(200).json({
      success: true,
      data: {
        users: rows,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[getUsers]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/admin/users/:id/lock (giữ cũ cho backward-compat) ──────────────
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

// ─── PUT /api/admin/users/:id/role ───────────────────────────────────────────
function updateUserRole(req, res) {
  const userId = parseInt(req.params.id);
  const { role } = req.body;

  // Validate role
  if (!role || !['student', 'instructor'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
  }

  try {
    const user = db
      .prepare('SELECT id, full_name, email, role FROM users WHERE id = ?')
      .get(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    // Không cho phép đổi role admin (dù là admin tự đổi chính mình)
    if (user.role === 'admin' || userId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Không thể thay đổi vai trò của quản trị viên',
      });
    }

    // Nếu hạ từ instructor → student, kiểm tra khóa học đã approved
    if (user.role === 'instructor' && role === 'student') {
      const activeCourses = db
        .prepare("SELECT COUNT(*) AS cnt FROM courses WHERE instructor_id = ? AND status = 'approved'")
        .get(userId);
      if (activeCourses.cnt > 0) {
        return res.status(409).json({
          success: false,
          message: 'Không thể chuyển vai trò vì giảng viên đang có khóa học đã được duyệt. Vui lòng ẩn/chuyển giao khóa học trước',
        });
      }
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật vai trò người dùng thành công',
      data: { id: user.id, full_name: user.full_name, email: user.email, role },
    });
  } catch (err) {
    console.error('[updateUserRole]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/admin/users/:id/status ─────────────────────────────────────────
function updateUserStatus(req, res) {
  const userId = parseInt(req.params.id);
  const { is_active } = req.body;

  if (is_active === undefined || is_active === null) {
    return res.status(400).json({ success: false, message: 'Thiếu trường is_active' });
  }

  // Không cho tự khóa mình
  if (userId === req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Không thể tự khóa tài khoản đang đăng nhập',
    });
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const activeVal = is_active ? 1 : 0;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(activeVal, userId);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái tài khoản thành công',
      data: { id: userId, is_active: activeVal },
    });
  } catch (err) {
    console.error('[updateUserStatus]', err);
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

// ══════════════════════════════════════════════════════
//  ADMIN STATS
// ══════════════════════════════════════════════════════

// ─── Helper: sinh mảng labels ngày/tháng ─────────────────────────────────────
function buildLabels(period) {
  const now    = new Date();
  const labels = [];
  if (period === '7days') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      labels.push(d.toISOString().slice(0, 10));
    }
  } else if (period === '30days') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      labels.push(d.toISOString().slice(0, 10));
    }
  } else {
    // 12months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      labels.push(`${y}-${m}`);
    }
  }
  return labels;
}

// ─── GET /api/admin/stats/overview ───────────────────────────────────────────
function getAdminStatsOverview(req, res) {
  try {
    // Users theo role
    const userRows = db.prepare(
      'SELECT role, COUNT(*) AS cnt FROM users GROUP BY role'
    ).all();
    const usersByRole = { student: 0, instructor: 0, admin: 0 };
    let totalUsers = 0;
    for (const r of userRows) {
      if (r.role in usersByRole) usersByRole[r.role] = r.cnt;
      totalUsers += r.cnt;
    }

    // Courses theo status
    const courseRows = db.prepare(
      'SELECT status, COUNT(*) AS cnt FROM courses GROUP BY status'
    ).all();
    const coursesByStatus = { approved: 0, pending: 0, rejected: 0 };
    let totalCourses = 0;
    for (const r of courseRows) {
      if (r.status in coursesByStatus) coursesByStatus[r.status] = r.cnt;
      totalCourses += r.cnt;
    }

    // Orders paid
    const orderRow = db.prepare(
      "SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS revenue FROM orders WHERE status = 'paid'"
    ).get();

    // Enrollments
    const enrollRow = db.prepare('SELECT COUNT(*) AS cnt FROM enrollments').get();

    // Pending withdrawals
    const withdrawRow = db.prepare(
      "SELECT COUNT(*) AS cnt FROM withdrawal_requests WHERE status = 'pending'"
    ).get();

    // Pending courses
    const pendingCoursesRow = db.prepare(
      "SELECT COUNT(*) AS cnt FROM courses WHERE status = 'pending'"
    ).get();

    return res.status(200).json({
      success: true,
      data: {
        total_users:         totalUsers,
        users_by_role:       usersByRole,
        total_courses:       totalCourses,
        courses_by_status:   coursesByStatus,
        total_orders:        orderRow.cnt,
        total_revenue:       orderRow.revenue,
        total_enrollments:   enrollRow.cnt,
        pending_withdrawals: withdrawRow.cnt,
        pending_courses:     pendingCoursesRow.cnt,
      },
    });
  } catch (err) {
    console.error('[getAdminStatsOverview]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/admin/stats/revenue ────────────────────────────────────────────
function getAdminStatsRevenue(req, res) {
  try {
    const period = ['7days', '30days', '12months'].includes(req.query.period)
      ? req.query.period
      : '30days';

    const labels   = buildLabels(period);
    const groupFmt = period === '12months'
      ? "strftime('%Y-%m', created_at)"
      : "strftime('%Y-%m-%d', created_at)";

    const firstLabel = labels[0];
    const startDate  = period === '12months' ? `${firstLabel}-01` : firstLabel;

    const rows = db.prepare(`
      SELECT ${groupFmt} AS label, COALESCE(SUM(total_amount), 0) AS total
      FROM orders
      WHERE status = 'paid'
        AND created_at >= ?
      GROUP BY label
    `).all(startDate);

    const revenueMap = {};
    for (const r of rows) revenueMap[r.label] = r.total;
    const revenue = labels.map((l) => revenueMap[l] ?? 0);

    return res.status(200).json({
      success: true,
      data: { period, labels, revenue },
    });
  } catch (err) {
    console.error('[getAdminStatsRevenue]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/admin/stats/top-courses ────────────────────────────────────────
function getAdminTopCourses(req, res) {
  try {
    const limitNum = Math.max(1, parseInt(req.query.limit) || 10);

    const rows = db.prepare(`
      SELECT
        c.id,
        c.title,
        c.thumbnail,
        COUNT(DISTINCT e.user_id)              AS students_count,
        COALESCE(SUM(oi.price), 0)             AS revenue,
        COALESCE(ROUND(AVG(rv.rating), 1), 0) AS avg_rating,
        u.full_name AS instructor_name
      FROM courses c
      LEFT JOIN enrollments e  ON e.course_id = c.id
      LEFT JOIN order_items oi ON oi.course_id = c.id
      LEFT JOIN orders o       ON oi.order_id = o.id AND o.status = 'paid'
      LEFT JOIN reviews rv     ON rv.course_id = c.id
      JOIN users u             ON c.instructor_id = u.id
      WHERE c.status = 'approved'
      GROUP BY c.id
      ORDER BY revenue DESC
      LIMIT ?
    `).all(limitNum);

    const data = rows.map((row) => ({
      id:             row.id,
      title:          row.title,
      thumbnail:      row.thumbnail,
      students_count: row.students_count,
      revenue:        row.revenue,
      avg_rating:     row.avg_rating,
      instructor:     { full_name: row.instructor_name },
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getAdminTopCourses]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = {
  getPendingCourses,
  approveCourse,
  rejectCourse,
  getUsers,
  toggleLockUser,
  updateUserRole,
  updateUserStatus,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getAdminStatsOverview,
  getAdminStatsRevenue,
  getAdminTopCourses,
};
