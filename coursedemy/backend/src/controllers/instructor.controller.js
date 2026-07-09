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

module.exports = {
  getInstructorCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStudents,
};
