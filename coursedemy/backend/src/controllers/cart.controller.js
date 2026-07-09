const db = require('../config/database');

// ─── GET /api/cart ───────────────────────────────────────────────────────────
function getCart(req, res) {
  try {
    const rows = db.prepare(`
      SELECT
        ci.id,
        ci.created_at,
        c.id          AS course_id,
        c.title       AS course_title,
        c.price       AS course_price,
        c.thumbnail   AS course_thumbnail,
        c.status      AS course_status,
        u.id          AS instructor_id,
        u.full_name   AS instructor_name
      FROM cart_items ci
      JOIN courses c ON ci.course_id = c.id
      JOIN users u   ON c.instructor_id = u.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `).all(req.user.id);

    const data = rows.map((row) => ({
      id:         row.id,
      created_at: row.created_at,
      course: {
        id:        row.course_id,
        title:     row.course_title,
        price:     row.course_price,
        thumbnail: row.course_thumbnail,
        status:    row.course_status,
        instructor: {
          id:        row.instructor_id,
          full_name: row.instructor_name,
        },
      },
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getCart]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/cart ──────────────────────────────────────────────────────────
function addToCart(req, res) {
  const { course_id } = req.body;

  // 1. Kiểm tra đầu vào
  if (!course_id) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp course_id' });
  }

  const courseIdNum = parseInt(course_id);
  if (isNaN(courseIdNum) || courseIdNum <= 0) {
    return res.status(400).json({ success: false, message: 'course_id không hợp lệ' });
  }

  try {
    // 2. Kiểm tra khóa học tồn tại và đã được duyệt
    const course = db
      .prepare("SELECT id, status FROM courses WHERE id = ? AND status = 'approved'")
      .get(courseIdNum);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Khóa học không tồn tại hoặc chưa được duyệt',
      });
    }

    // 3. Kiểm tra đã enroll (đã sở hữu/mua) chưa
    const enrolled = db
      .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
      .get(req.user.id, courseIdNum);

    if (enrolled) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã sở hữu khóa học này',
      });
    }

    // 4. Kiểm tra đã có trong giỏ hàng chưa
    const inCart = db
      .prepare('SELECT id FROM cart_items WHERE user_id = ? AND course_id = ?')
      .get(req.user.id, courseIdNum);

    if (inCart) {
      return res.status(409).json({
        success: false,
        message: 'Khóa học đã có trong giỏ hàng',
      });
    }

    // 5. Thêm vào giỏ hàng
    db.prepare('INSERT INTO cart_items (user_id, course_id) VALUES (?, ?)')
      .run(req.user.id, courseIdNum);

    return res.status(201).json({ success: true, message: 'Đã thêm vào giỏ hàng' });
  } catch (err) {
    console.error('[addToCart]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── DELETE /api/cart/:courseId ──────────────────────────────────────────────
function removeFromCart(req, res) {
  const courseId = parseInt(req.params.courseId);

  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ success: false, message: 'courseId không hợp lệ' });
  }

  try {
    const item = db
      .prepare('SELECT id FROM cart_items WHERE user_id = ? AND course_id = ?')
      .get(req.user.id, courseId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khóa học trong giỏ hàng',
      });
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND course_id = ?')
      .run(req.user.id, courseId);

    return res.status(200).json({ success: true, message: 'Đã xóa khỏi giỏ hàng' });
  } catch (err) {
    console.error('[removeFromCart]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = { getCart, addToCart, removeFromCart };
