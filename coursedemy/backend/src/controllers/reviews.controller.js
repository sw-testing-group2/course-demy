const db = require('../config/database');

// ─── POST /api/courses/:id/reviews ───────────────────────────────────────────
function createReview(req, res) {
  try {
    const courseId = req.params.id;
    const userId   = req.user.id;
    const { rating, comment } = req.body;

    // Kiểm tra rating hợp lệ trước tiên
    if (rating === undefined || rating === null) {
      return res.status(400).json({ success: false, message: 'rating là bắt buộc' });
    }
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Số sao đánh giá phải từ 1 đến 5',
      });
    }

    // Kiểm tra khóa học tồn tại
    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    // Kiểm tra student đã mua khóa học chưa
    const enrolled = db
      .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
      .get(userId, courseId);
    if (!enrolled) {
      return res.status(403).json({
        success: false,
        message: 'Bạn cần mua khóa học này để có thể đánh giá',
      });
    }

    // Kiểm tra đã đánh giá chưa
    const existing = db
      .prepare('SELECT id FROM reviews WHERE user_id = ? AND course_id = ?')
      .get(userId, courseId);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã đánh giá khóa học này rồi',
      });
    }

    // Lưu đánh giá
    const result = db
      .prepare('INSERT INTO reviews (user_id, course_id, rating, comment) VALUES (?, ?, ?, ?)')
      .run(userId, courseId, ratingNum, comment || null);

    const newReview = db
      .prepare('SELECT id, rating, comment, created_at FROM reviews WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Đánh giá khóa học thành công',
      data: newReview,
    });
  } catch (err) {
    console.error('[createReview]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/courses/:id/reviews ────────────────────────────────────────────
function getCourseReviews(req, res) {
  try {
    const courseId = req.params.id;
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.max(1, parseInt(req.query.limit) || 10);
    const offset   = (page - 1) * limit;

    // Kiểm tra khóa học tồn tại
    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    // Đếm tổng
    const { total } = db
      .prepare('SELECT COUNT(*) AS total FROM reviews WHERE course_id = ?')
      .get(courseId);

    // Lấy dữ liệu có phân trang
    const rows = db.prepare(`
      SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.full_name AS user_full_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.course_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(courseId, limit, offset);

    const reviews = rows.map((row) => ({
      id:         row.id,
      rating:     row.rating,
      comment:    row.comment,
      created_at: row.created_at,
      user: { full_name: row.user_full_name },
    }));

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[getCourseReviews]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = { createReview, getCourseReviews };
