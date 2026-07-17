const db = require('../config/database');

// ─── Helper: kiểm tra course tồn tại và thuộc instructor ────────────────────
function getCourseOrFail(courseId, instructorId, res) {
  const course = db
    .prepare('SELECT id, instructor_id FROM courses WHERE id = ?')
    .get(courseId);

  if (!course) {
    res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    return null;
  }

  if (course.instructor_id !== instructorId) {
    res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện thao tác trên khóa học này',
    });
    return null;
  }

  return course;
}

// ─── GET /api/instructor/courses ─────────────────────────────────────────────
function getInstructorCourses(req, res) {
  try {
    const rows = db.prepare(`
      SELECT
        c.id,
        c.title,
        c.price,
        c.status,
        c.thumbnail,
        c.created_at,
        cat.id   AS category_id,
        cat.name AS category_name
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.instructor_id = ?
      ORDER BY c.created_at DESC
    `).all(req.user.id);

    const data = rows.map((row) => ({
      id:         row.id,
      title:      row.title,
      price:      row.price,
      status:     row.status,
      thumbnail:  row.thumbnail,
      created_at: row.created_at,
      category: {
        id:   row.category_id,
        name: row.category_name,
      },
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getInstructorCourses]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/instructor/courses ────────────────────────────────────────────
function createCourse(req, res) {
  const { title, description, price = 0, category_id, thumbnail } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Tiêu đề khóa học không được để trống' });
  }

  try {
    // Kiểm tra category_id nếu được truyền
    if (category_id != null) {
      const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
      if (!cat) {
        return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
      }
    }

    const result = db.prepare(`
      INSERT INTO courses (title, description, price, category_id, instructor_id, thumbnail, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      title.trim(),
      description ?? null,
      parseFloat(price) || 0,
      category_id ?? null,
      req.user.id,
      thumbnail ?? null,
    );

    const newCourse = db
      .prepare('SELECT id, title, status, created_at FROM courses WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Tạo khóa học thành công, đang chờ duyệt',
      data: newCourse,
    });
  } catch (err) {
    console.error('[createCourse]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/instructor/courses/:id ─────────────────────────────────────────
function updateCourse(req, res) {
  const courseId = parseInt(req.params.id);

  try {
    const existing = getCourseOrFail(courseId, req.user.id, res);
    if (!existing) return; // response đã được gửi trong helper

    const { title, description, price, category_id, thumbnail } = req.body;

    // Kiểm tra category_id nếu được truyền
    if (category_id != null) {
      const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
      if (!cat) {
        return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
      }
    }

    // Xây UPDATE SET động — chỉ update field được gửi lên
    const fields  = [];
    const params  = [];

    if (title      !== undefined) { fields.push('title = ?');       params.push(title.trim()); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (price      !== undefined) { fields.push('price = ?');       params.push(parseFloat(price) || 0); }
    if (category_id !== undefined) { fields.push('category_id = ?'); params.push(category_id); }
    if (thumbnail  !== undefined) { fields.push('thumbnail = ?');   params.push(thumbnail); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có thông tin cần cập nhật' });
    }

    params.push(courseId);
    db.prepare(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updated = db
      .prepare('SELECT id, title, description, price, status, thumbnail FROM courses WHERE id = ?')
      .get(courseId);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật khóa học thành công',
      data: updated,
    });
  } catch (err) {
    console.error('[updateCourse]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── DELETE /api/instructor/courses/:id ──────────────────────────────────────
function deleteCourse(req, res) {
  const courseId = parseInt(req.params.id);

  try {
    // Override message cho delete
    const course = db.prepare('SELECT id, instructor_id FROM courses WHERE id = ?').get(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    if (course.instructor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa khóa học này',
      });
    }

    // Xóa cart_items liên quan trước, sau đó xóa course
    const doDelete = db.transaction(() => {
      db.prepare('DELETE FROM cart_items WHERE course_id = ?').run(courseId);
      db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
    });

    doDelete();

    return res.status(200).json({ success: true, message: 'Đã xóa khóa học' });
  } catch (err) {
    console.error('[deleteCourse]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/instructor/courses/:id/students ─────────────────────────────────
function getCourseStudents(req, res) {
  const courseId = parseInt(req.params.id);

  try {
    // Override message cho students
    const course = db.prepare('SELECT id, instructor_id FROM courses WHERE id = ?').get(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    if (course.instructor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem thông tin khóa học này',
      });
    }

    const students = db.prepare(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        e.enrolled_at
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.course_id = ?
      ORDER BY e.enrolled_at DESC
    `).all(courseId);

    return res.status(200).json({ success: true, data: students });
  } catch (err) {
    console.error('[getCourseStudents]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/instructor/withdrawals ────────────────────────────────────────
function createWithdrawal(req, res) {
  try {
    const { amount, bank_name, account_number, account_holder } = req.body;

    if (!amount || amount <= 0 || !bank_name || !account_number || !account_holder) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin: amount (số dương), bank_name, account_number, account_holder',
      });
    }

    // Kiểm tra số dư
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);

    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Số dư tài khoản không đủ để rút',
      });
    }

    const doWithdraw = db.transaction(() => {
      // 1. Trừ số dư ví ngay
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?')
        .run(amount, req.user.id);

      // 2. Tạo yêu cầu rút tiền
      const result = db.prepare(`
        INSERT INTO withdrawal_requests (instructor_id, amount, bank_name, account_number, account_holder, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(req.user.id, amount, bank_name, account_number, account_holder);

      // 3. Ghi giao dịch ví
      db.prepare(`
        INSERT INTO wallet_transactions (user_id, amount, type, status, description)
        VALUES (?, ?, 'withdrawal', 'pending', 'Yêu cầu rút tiền về ngân hàng')
      `).run(req.user.id, amount);

      return result.lastInsertRowid;
    });

    const withdrawalId = doWithdraw();

    return res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu rút tiền thành công, đang chờ Admin duyệt',
      data: {
        withdrawal_id: withdrawalId,
        amount,
      },
    });
  } catch (err) {
    console.error('[createWithdrawal]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/instructor/withdrawals ─────────────────────────────────────────
function getWithdrawals(req, res) {
  try {
    const withdrawals = db.prepare(`
      SELECT id, amount, bank_name, account_number, account_holder, status, reason, created_at, processed_at
      FROM withdrawal_requests
      WHERE instructor_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    return res.status(200).json({ success: true, data: withdrawals });
  } catch (err) {
    console.error('[getWithdrawals]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/instructor/questions — Hộp thư Q&A ──────────────────────────────
function getInstructorQuestions(req, res) {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.max(1, parseInt(req.query.limit) || 10);
    const offset   = (page - 1) * limit;
    const status   = req.query.status   || 'all';   // 'all' | 'resolved' | 'unresolved'
    const courseId = req.query.course_id ? parseInt(req.query.course_id) : null;

    const conditions = ['c.instructor_id = ?'];
    const params     = [req.user.id];

    if (status === 'resolved') {
      conditions.push('q.is_resolved = 1');
    } else if (status === 'unresolved') {
      conditions.push('q.is_resolved = 0');
    }

    if (courseId) {
      conditions.push('q.course_id = ?');
      params.push(courseId);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    // Đếm tổng
    const { total } = db.prepare(`
      SELECT COUNT(*) AS total
      FROM lesson_questions q
      JOIN courses c ON q.course_id = c.id
      ${where}
    `).get(...params);

    // Lấy dữ liệu: câu hỏi chưa trả lời hiển thị trước
    const rows = db.prepare(`
      SELECT
        q.id,
        q.title,
        q.content,
        q.is_resolved,
        q.created_at,
        c.id    AS course_id,
        c.title AS course_title,
        l.id    AS lesson_id,
        l.title AS lesson_title,
        u.full_name AS user_full_name,
        (SELECT COUNT(*) FROM lesson_answers a WHERE a.question_id = q.id) AS answers_count
      FROM lesson_questions q
      JOIN courses c ON q.course_id = c.id
      JOIN lessons l ON q.lesson_id = l.id
      JOIN users u   ON q.user_id  = u.id
      ${where}
      ORDER BY
        answers_count ASC,
        q.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const questions = rows.map((row) => ({
      id:          row.id,
      title:       row.title,
      content:     row.content,
      is_resolved: row.is_resolved,
      answers_count: row.answers_count,
      created_at:  row.created_at,
      course: {
        id:    row.course_id,
        title: row.course_title,
      },
      lesson: {
        id:    row.lesson_id,
        title: row.lesson_title,
      },
      user: {
        full_name: row.user_full_name,
      },
    }));

    return res.status(200).json({
      success: true,
      data: {
        questions,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[getInstructorQuestions]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════
//  INSTRUCTOR STATS
// ══════════════════════════════════════════════════════

// ─── Helper: sinh mảng labels ngày/tháng ──────────────────────────────────────
function buildLabels(period) {
  const now    = new Date();
  const labels = [];

  if (period === '7days') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
    }
  } else if (period === '30days') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
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

// ─── GET /api/instructor/stats/overview ───────────────────────────────────────
function getInstructorStatsOverview(req, res) {
  try {
    const instructorId = req.user.id;

    // Doanh thu (type='income')
    const revenueRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_revenue
      FROM wallet_transactions
      WHERE user_id = ? AND type = 'income' AND status = 'success'
    `).get(instructorId);

    // Tổng học viên riêng biệt
    const studentsRow = db.prepare(`
      SELECT COUNT(DISTINCT e.user_id) AS total_students
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = ?
    `).get(instructorId);

    // Số khóa học theo status
    const courseRows = db.prepare(`
      SELECT status, COUNT(*) AS cnt
      FROM courses
      WHERE instructor_id = ?
      GROUP BY status
    `).all(instructorId);

    const coursesByStatus = { approved: 0, pending: 0, rejected: 0 };
    let totalCourses = 0;
    for (const r of courseRows) {
      if (r.status in coursesByStatus) coursesByStatus[r.status] = r.cnt;
      totalCourses += r.cnt;
    }

    // Điểm đánh giá trung bình
    const ratingRow = db.prepare(`
      SELECT COALESCE(ROUND(AVG(rv.rating), 1), 0) AS avg_rating
      FROM reviews rv
      JOIN courses c ON rv.course_id = c.id
      WHERE c.instructor_id = ?
    `).get(instructorId);

    // Số dư ví
    const balanceRow = db.prepare('SELECT balance FROM users WHERE id = ?').get(instructorId);

    return res.status(200).json({
      success: true,
      data: {
        total_revenue:    revenueRow.total_revenue,
        total_students:   studentsRow.total_students,
        total_courses:    totalCourses,
        courses_by_status: coursesByStatus,
        avg_rating:       ratingRow.avg_rating,
        current_balance:  balanceRow.balance,
      },
    });
  } catch (err) {
    console.error('[getInstructorStatsOverview]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/instructor/stats/revenue ────────────────────────────────────────
function getInstructorStatsRevenue(req, res) {
  try {
    const instructorId = req.user.id;
    const period = ['7days', '30days', '12months'].includes(req.query.period)
      ? req.query.period
      : '30days';

    const labels   = buildLabels(period);
    const groupFmt = period === '12months' ? "strftime('%Y-%m', created_at)" : "strftime('%Y-%m-%d', created_at)";

    // Tính ngày bắt đầu
    const firstLabel = labels[0];
    const startDate  = period === '12months' ? `${firstLabel}-01` : firstLabel;

    const rows = db.prepare(`
      SELECT ${groupFmt} AS label, COALESCE(SUM(amount), 0) AS total
      FROM wallet_transactions
      WHERE user_id = ?
        AND type = 'income'
        AND status = 'success'
        AND created_at >= ?
      GROUP BY label
    `).all(instructorId, startDate);

    // Map SQL kết quả vào labels (zero-fill các mốc không có dữ liệu)
    const revenueMap = {};
    for (const r of rows) revenueMap[r.label] = r.total;

    const revenue = labels.map((l) => revenueMap[l] ?? 0);

    return res.status(200).json({
      success: true,
      data: { period, labels, revenue },
    });
  } catch (err) {
    console.error('[getInstructorStatsRevenue]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/instructor/stats/courses ────────────────────────────────────────
function getInstructorStatsCourses(req, res) {
  try {
    const instructorId = req.user.id;

    // Doanh thu theo từng khóa học tính từ order_items (chính xác nhất)
    const courseStats = db.prepare(`
      SELECT
        c.id,
        c.title,
        c.thumbnail,
        c.status,
        COUNT(DISTINCT e.user_id)              AS students_count,
        COALESCE(SUM(oi.price), 0)             AS revenue,
        COALESCE(ROUND(AVG(rv.rating), 1), 0) AS avg_rating,
        COUNT(DISTINCT rv.id)                  AS reviews_count
      FROM courses c
      LEFT JOIN enrollments e  ON e.course_id = c.id
      LEFT JOIN order_items oi ON oi.course_id = c.id
      LEFT JOIN orders o       ON oi.order_id = o.id AND o.status = 'paid'
      LEFT JOIN reviews rv     ON rv.course_id = c.id
      WHERE c.instructor_id = ?
      GROUP BY c.id
      ORDER BY revenue DESC
    `).all(instructorId);

    return res.status(200).json({
      success: true,
      data: courseStats,
    });
  } catch (err) {
    console.error('[getInstructorStatsCourses]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = {
  getInstructorCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStudents,
  createWithdrawal,
  getWithdrawals,
  getInstructorQuestions,
  getInstructorStatsOverview,
  getInstructorStatsRevenue,
  getInstructorStatsCourses,
};
