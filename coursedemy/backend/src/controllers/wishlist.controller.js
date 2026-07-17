const db = require('../config/database');

// ─── GET /api/wishlist ────────────────────────────────────────────────────────
function getWishlist(req, res) {
  try {
    const userId = req.user.id;

    const rows = db.prepare(`
      SELECT
        w.id,
        w.created_at,
        c.id          AS course_id,
        c.title       AS course_title,
        c.price       AS course_price,
        c.thumbnail   AS course_thumbnail,
        cat.name      AS category_name,
        u.full_name   AS instructor_name
      FROM wishlists w
      JOIN courses c    ON w.course_id   = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u        ON c.instructor_id = u.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(userId);

    const data = rows.map((row) => ({
      id:         row.id,
      created_at: row.created_at,
      course: {
        id:        row.course_id,
        title:     row.course_title,
        price:     row.course_price,
        thumbnail: row.course_thumbnail,
        category:  { name: row.category_name },
        instructor: { full_name: row.instructor_name },
      },
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getWishlist]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/wishlist ───────────────────────────────────────────────────────
function addToWishlist(req, res) {
  try {
    const userId   = req.user.id;
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({ success: false, message: 'course_id là bắt buộc' });
    }

    // Kiểm tra course tồn tại và đã duyệt
    const course = db
      .prepare("SELECT id FROM courses WHERE id = ? AND status = 'approved'")
      .get(course_id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Khóa học không tồn tại hoặc chưa được duyệt',
      });
    }

    // Kiểm tra đã có trong wishlist chưa
    const existing = db
      .prepare('SELECT id FROM wishlists WHERE user_id = ? AND course_id = ?')
      .get(userId, course_id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Khóa học đã có trong danh sách yêu thích',
      });
    }

    db.prepare('INSERT INTO wishlists (user_id, course_id) VALUES (?, ?)').run(userId, course_id);

    return res.status(201).json({ success: true, message: 'Đã thêm vào danh sách yêu thích' });
  } catch (err) {
    console.error('[addToWishlist]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── DELETE /api/wishlist/:courseId ──────────────────────────────────────────
function removeFromWishlist(req, res) {
  try {
    const userId   = req.user.id;
    const courseId = req.params.courseId;

    const existing = db
      .prepare('SELECT id FROM wishlists WHERE user_id = ? AND course_id = ?')
      .get(userId, courseId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khóa học trong danh sách yêu thích',
      });
    }

    db.prepare('DELETE FROM wishlists WHERE user_id = ? AND course_id = ?').run(userId, courseId);

    return res.status(200).json({ success: true, message: 'Đã xóa khỏi danh sách yêu thích' });
  } catch (err) {
    console.error('[removeFromWishlist]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
