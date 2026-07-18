const db  = require('../config/database');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');

// ─── Helper: sinh certificate_code duy nhất ──────────────────────────────────
function generateCertificateCode(courseId, userId) {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 ký tự hex
  return `CD-${courseId}-${userId}-${random}`;
}

// ─── Helper: định dạng ngày dd/MM/yyyy từ chuỗi ISO ──────────────────────────
function formatDate(isoStr) {
  const d = new Date(isoStr);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/courses/:id/certificate
//  [authenticate + authorize('student')]
// ══════════════════════════════════════════════════════════════════════════════
function downloadCertificate(req, res) {
  const courseId = parseInt(req.params.id);
  const userId   = req.user.id;

  try {
    // 1. Kiểm tra khóa học tồn tại
    const course = db.prepare(`
      SELECT c.id, c.title, u.full_name AS instructor_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `).get(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    // 2. Kiểm tra học viên đã enroll
    const enrollment = db.prepare(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
    ).get(userId, courseId);

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chưa đăng ký khóa học này',
      });
    }

    // 3. Kiểm tra hoàn thành 100% bài học
    const totalLessons = db.prepare(
      'SELECT COUNT(*) AS cnt FROM lessons WHERE course_id = ?'
    ).get(courseId);

    const completedLessons = db.prepare(
      'SELECT COUNT(*) AS cnt FROM lesson_progress WHERE user_id = ? AND course_id = ? AND completed = 1'
    ).get(userId, courseId);

    if (totalLessons.cnt === 0 || completedLessons.cnt < totalLessons.cnt) {
      return res.status(403).json({
        success: false,
        message: 'Bạn cần hoàn thành 100% khóa học để nhận chứng chỉ',
      });
    }

    // 4. Lấy hoặc tạo bản ghi certificate
    let cert = db.prepare(
      'SELECT certificate_code, issued_at FROM certificates WHERE user_id = ? AND course_id = ?'
    ).get(userId, courseId);

    if (!cert) {
      const code = generateCertificateCode(courseId, userId);
      db.prepare(
        `INSERT INTO certificates (user_id, course_id, certificate_code) VALUES (?, ?, ?)`
      ).run(userId, courseId, code);

      cert = db.prepare(
        'SELECT certificate_code, issued_at FROM certificates WHERE user_id = ? AND course_id = ?'
      ).get(userId, courseId);
    }

    const { certificate_code, issued_at } = cert;
    const studentName   = req.user.full_name;
    const issuedFormatted = formatDate(issued_at);

    // 5. Sinh PDF và stream trực tiếp về client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${certificate_code}.pdf"`
    );

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 50,
    });

    doc.pipe(res);

    // ── Nền trắng + viền trang ────────────────────────────────────────────────
    const W = doc.page.width;
    const H = doc.page.height;

    // Viền ngoài
    doc.rect(20, 20, W - 40, H - 40)
       .lineWidth(4)
       .strokeColor('#1a56db')
       .stroke();

    // Viền trong
    doc.rect(28, 28, W - 56, H - 56)
       .lineWidth(1.5)
       .strokeColor('#93c5fd')
       .stroke();

    // ── Logo / tên nền tảng ───────────────────────────────────────────────────
    doc.moveDown(0);
    doc.fontSize(14)
       .fillColor('#1a56db')
       .font('Helvetica-Bold')
       .text('CourseDemy', { align: 'center' });

    doc.moveDown(0.3);
    doc.moveTo(W / 2 - 100, doc.y)
       .lineTo(W / 2 + 100, doc.y)
       .strokeColor('#1a56db')
       .lineWidth(1)
       .stroke();

    // ── Tiêu đề ───────────────────────────────────────────────────────────────
    doc.moveDown(0.8);
    doc.fontSize(32)
       .fillColor('#111827')
       .font('Helvetica-Bold')
       .text('CHỨNG CHỈ HOÀN THÀNH', { align: 'center' });

    // ── Trao cho ──────────────────────────────────────────────────────────────
    doc.moveDown(0.6);
    doc.fontSize(13)
       .fillColor('#6b7280')
       .font('Helvetica')
       .text('Trao tặng cho', { align: 'center' });

    // ── Tên học viên ──────────────────────────────────────────────────────────
    doc.moveDown(0.4);
    doc.fontSize(26)
       .fillColor('#1a56db')
       .font('Helvetica-BoldOblique')
       .text(studentName, { align: 'center' });

    // ── Đã hoàn thành khóa học ────────────────────────────────────────────────
    doc.moveDown(0.6);
    doc.fontSize(13)
       .fillColor('#6b7280')
       .font('Helvetica')
       .text('đã hoàn thành xuất sắc khóa học', { align: 'center' });

    // ── Tên khóa học ──────────────────────────────────────────────────────────
    doc.moveDown(0.4);
    doc.fontSize(20)
       .fillColor('#111827')
       .font('Helvetica-Bold')
       .text(`"${course.title}"`, { align: 'center' });

    // ── Giảng viên ────────────────────────────────────────────────────────────
    doc.moveDown(0.5);
    doc.fontSize(12)
       .fillColor('#374151')
       .font('Helvetica')
       .text(`Giảng viên: ${course.instructor_name}`, { align: 'center' });

    // ── Ngày cấp ──────────────────────────────────────────────────────────────
    doc.moveDown(0.4);
    doc.fontSize(12)
       .fillColor('#374151')
       .text(`Ngày cấp: ${issuedFormatted}`, { align: 'center' });

    // ── Mã chứng chỉ ─────────────────────────────────────────────────────────
    doc.moveDown(0.5);
    doc.fontSize(11)
       .fillColor('#6b7280')
       .text(`Mã chứng chỉ: ${certificate_code}`, { align: 'center' });

    // ── Dòng xác thực ─────────────────────────────────────────────────────────
    doc.moveDown(0.4);
    doc.fontSize(9)
       .fillColor('#9ca3af')
       .text(`Xác thực chứng chỉ tại: /certificate-verify?code=${certificate_code}`, {
         align: 'center',
       });

    doc.end();
  } catch (err) {
    console.error('[downloadCertificate]', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/certificates/verify/:code
//  [public — không cần authenticate]
// ══════════════════════════════════════════════════════════════════════════════
function verifyCertificate(req, res) {
  const { code } = req.params;

  try {
    const row = db.prepare(`
      SELECT
        cert.certificate_code,
        cert.issued_at,
        c.title   AS course_title,
        u.full_name
      FROM certificates cert
      JOIN courses c ON cert.course_id = c.id
      JOIN users  u ON cert.user_id   = u.id
      WHERE cert.certificate_code = ?
    `).get(code);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Mã chứng chỉ không hợp lệ hoặc không tồn tại',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        certificate_code: row.certificate_code,
        issued_at:        row.issued_at,
        course: { title: row.course_title },
        user:   { full_name: row.full_name },
      },
    });
  } catch (err) {
    console.error('[verifyCertificate]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/profile/certificates
//  [authenticate + authorize('student')]
// ══════════════════════════════════════════════════════════════════════════════
function getMyCertificates(req, res) {
  const userId = req.user.id;

  try {
    const rows = db.prepare(`
      SELECT
        cert.id,
        cert.certificate_code,
        cert.issued_at,
        c.id        AS course_id,
        c.title     AS course_title,
        c.thumbnail AS course_thumbnail
      FROM certificates cert
      JOIN courses c ON cert.course_id = c.id
      WHERE cert.user_id = ?
      ORDER BY cert.issued_at DESC
    `).all(userId);

    const data = rows.map((r) => ({
      id:               r.id,
      certificate_code: r.certificate_code,
      issued_at:        r.issued_at,
      course: {
        id:        r.course_id,
        title:     r.course_title,
        thumbnail: r.course_thumbnail,
      },
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getMyCertificates]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/courses/:id/progress
//  Trả về % tiến độ hoàn thành khóa học của học viên
// ══════════════════════════════════════════════════════════════════════════════
function getCourseProgress(req, res) {
  const courseId = parseInt(req.params.id);
  const userId   = req.user.id;

  try {
    const total = db.prepare(
      'SELECT COUNT(*) AS cnt FROM lessons WHERE course_id = ?'
    ).get(courseId)?.cnt ?? 0;

    const completed = db.prepare(
      'SELECT COUNT(*) AS cnt FROM lesson_progress WHERE user_id = ? AND course_id = ? AND completed = 1'
    ).get(userId, courseId)?.cnt ?? 0;

    const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return res.status(200).json({
      success: true,
      data: {
        total_lessons:     total,
        completed_lessons: completed,
        progress_percent:  progressPercent,
      },
    });
  } catch (err) {
    console.error('[getCourseProgress]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PUT /api/courses/:courseId/lessons/:lessonId/complete
//  Đánh dấu 1 bài học là đã hoàn thành (upsert vào lesson_progress)
// ══════════════════════════════════════════════════════════════════════════════
function markLessonComplete(req, res) {
  const courseId = parseInt(req.params.courseId);
  const lessonId = parseInt(req.params.lessonId);
  const userId   = req.user.id;

  try {
    // Xác nhận bài học thuộc khóa học
    const lesson = db.prepare(
      'SELECT id FROM lessons WHERE id = ? AND course_id = ?'
    ).get(lessonId, courseId);

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Bài học không tìm thấy' });
    }

    // Upsert lesson_progress
    db.prepare(`
      INSERT INTO lesson_progress (user_id, course_id, lesson_id, completed)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1
    `).run(userId, courseId, lessonId);

    // Tính lại progress
    const total = db.prepare(
      'SELECT COUNT(*) AS cnt FROM lessons WHERE course_id = ?'
    ).get(courseId)?.cnt ?? 0;

    const completed = db.prepare(
      'SELECT COUNT(*) AS cnt FROM lesson_progress WHERE user_id = ? AND course_id = ? AND completed = 1'
    ).get(userId, courseId)?.cnt ?? 0;

    const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu hoàn thành bài học',
      data: {
        total_lessons:     total,
        completed_lessons: completed,
        progress_percent:  progressPercent,
      },
    });
  } catch (err) {
    console.error('[markLessonComplete]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = {
  downloadCertificate,
  verifyCertificate,
  getMyCertificates,
  getCourseProgress,
  markLessonComplete,
};

