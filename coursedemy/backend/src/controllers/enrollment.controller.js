const db = require('../config/database');
const { calculateCourseProgress } = require('./progress.controller');

// ─── GET /api/enrollments ────────────────────────────────────────────────────
function getEnrollments(req, res) {
  try {
    const rows = db.prepare(`
      SELECT
        e.id,
        e.enrolled_at,
        c.id          AS course_id,
        c.title       AS course_title,
        c.thumbnail   AS course_thumbnail,
        u.full_name   AS instructor_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u   ON c.instructor_id = u.id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `).all(req.user.id);

    const data = rows.map((row) => ({
      id:          row.id,
      enrolled_at: row.enrolled_at,
      course: {
        id:               row.course_id,
        title:            row.course_title,
        thumbnail:        row.course_thumbnail,
        instructor: {
          full_name: row.instructor_name,
        },
        progress_percent: calculateCourseProgress(req.user.id, row.course_id),
      },
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getEnrollments]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = { getEnrollments };
