const db = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER CHUNG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tính progress_percent của user cho một course.
 * @param {number} userId
 * @param {number} courseId
 * @returns {number} 0-100
 */
function calculateCourseProgress(userId, courseId) {
  const { total } = db
    .prepare('SELECT COUNT(*) as total FROM lessons WHERE course_id = ?')
    .get(courseId);
  if (total === 0) return 0;

  const { completed } = db
    .prepare(
      'SELECT COUNT(*) as completed FROM lesson_progress WHERE user_id = ? AND course_id = ? AND is_completed = 1'
    )
    .get(userId, courseId);

  return Math.round((completed / total) * 100);
}

/**
 * Kiểm tra user đã enroll course chưa.
 */
function isEnrolled(userId, courseId) {
  return !!db
    .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
    .get(userId, courseId);
}

/**
 * Parse JSON options string → array
 */
function parseOptions(str) {
  try { return JSON.parse(str); } catch { return []; }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/courses/:id/sections  [Public — optional auth]
// ══════════════════════════════════════════════════════════════════════════════
function getCourseSections(req, res) {
  try {
    const { id: courseId } = req.params;
    const user = req.user || null; // optional auth — set by optionalAuth middleware

    // Kiểm tra course tồn tại
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    // Xác định enrolled
    let enrolled = false;
    if (user) {
      if (user.role === 'admin') {
        enrolled = true;
      } else if (user.role === 'instructor' && course.instructor_id === user.id) {
        enrolled = true;
      } else if (user.role === 'student') {
        enrolled = isEnrolled(user.id, courseId);
      }
    }

    // Lấy sections
    const sections = db
      .prepare('SELECT id, title, position FROM course_sections WHERE course_id = ? ORDER BY position ASC')
      .all(courseId);

    const getLessonsStmt = db.prepare(
      `SELECT id, title, type, video_url, content_body, duration_seconds, position, is_preview
       FROM lessons WHERE section_id = ? ORDER BY position ASC`
    );
    const getQuestionsStmt = db.prepare(
      `SELECT id, question_text, options, position FROM quiz_questions WHERE lesson_id = ? ORDER BY position ASC`
    );
    const getProgressStmt = db.prepare(
      `SELECT is_completed, quiz_score FROM lesson_progress WHERE user_id = ? AND lesson_id = ?`
    );

    const progress_percent = enrolled && user
      ? calculateCourseProgress(user.id, courseId)
      : null;

    const sectionsData = sections.map((s) => ({
      id:       s.id,
      title:    s.title,
      position: s.position,
      lessons:  getLessonsStmt.all(s.id).map((l) => {
        const isPreview = !!l.is_preview;

        if (enrolled) {
          // Trả đầy đủ nội dung
          const progressRow = user
            ? getProgressStmt.get(user.id, l.id)
            : null;

          const lessonData = {
            id:               l.id,
            title:            l.title,
            type:             l.type,
            video_url:        l.video_url,
            content_body:     l.content_body,
            duration_seconds: l.duration_seconds,
            position:         l.position,
            is_preview:       isPreview,
            progress: progressRow
              ? { is_completed: !!progressRow.is_completed, quiz_score: progressRow.quiz_score }
              : { is_completed: false, quiz_score: null },
          };

          if (l.type === 'quiz') {
            lessonData.questions = getQuestionsStmt.all(l.id).map((q) => ({
              id:            q.id,
              question_text: q.question_text,
              options:       parseOptions(q.options),
              position:      q.position,
              // correct_index KHÔNG trả cho student
            }));
          }

          return lessonData;
        } else {
          // Chưa enroll — chỉ trả thông tin cơ bản
          const lessonData = {
            id:               l.id,
            title:            l.title,
            type:             l.type,
            position:         l.position,
            is_preview:       isPreview,
            duration_seconds: l.duration_seconds,
            video_url:        isPreview ? l.video_url : null,
            content_body:     isPreview ? l.content_body : null,
          };

          if (l.type === 'quiz' && isPreview) {
            lessonData.questions = getQuestionsStmt.all(l.id).map((q) => ({
              id:            q.id,
              question_text: q.question_text,
              options:       parseOptions(q.options),
              position:      q.position,
            }));
          } else if (l.type === 'quiz') {
            lessonData.questions = null;
          }

          return lessonData;
        }
      }),
    }));

    return res.status(200).json({
      success: true,
      data: {
        enrolled,
        progress_percent,
        sections: sectionsData,
      },
    });
  } catch (err) {
    console.error('[getCourseSections]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/lessons/:id/complete  [authenticate + authorize('student')]
// ══════════════════════════════════════════════════════════════════════════════
function completeLesson(req, res) {
  try {
    const { id: lessonId } = req.params;

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
    }

    if (!isEnrolled(req.user.id, lesson.course_id)) {
      return res.status(403).json({ success: false, message: 'Bạn chưa mua khóa học này' });
    }

    // INSERT hoặc UPDATE (ON CONFLICT)
    db.prepare(`
      INSERT INTO lesson_progress (user_id, lesson_id, course_id, is_completed, completed_at)
      VALUES (?, ?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, lesson_id)
      DO UPDATE SET is_completed = 1, completed_at = datetime('now')
    `).run(req.user.id, lessonId, lesson.course_id);

    const progress_percent = calculateCourseProgress(req.user.id, lesson.course_id);

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu hoàn thành',
      data: { progress_percent },
    });
  } catch (err) {
    console.error('[completeLesson]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/lessons/:id/submit-quiz  [authenticate + authorize('student')]
// ══════════════════════════════════════════════════════════════════════════════
function submitQuiz(req, res) {
  try {
    const { id: lessonId } = req.params;

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
    }
    if (lesson.type !== 'quiz') {
      return res.status(400).json({ success: false, message: 'Bài học này không phải quiz' });
    }
    if (!isEnrolled(req.user.id, lesson.course_id)) {
      return res.status(403).json({ success: false, message: 'Bạn chưa mua khóa học này' });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'answers phải là mảng' });
    }

    // Lấy tất cả questions (có correct_index — phía server)
    const questions = db
      .prepare('SELECT id, correct_index FROM quiz_questions WHERE lesson_id = ? ORDER BY position ASC')
      .all(lessonId);

    const total_questions = questions.length;

    // Đếm câu trả lời đúng
    const answersMap = {};
    for (const a of answers) {
      answersMap[a.question_id] = a.selected_index;
    }

    let correct_count = 0;
    for (const q of questions) {
      if (answersMap[q.id] !== undefined && answersMap[q.id] === q.correct_index) {
        correct_count++;
      }
    }

    const quiz_score   = total_questions > 0 ? Math.round((correct_count / total_questions) * 100) : 0;
    const is_completed = quiz_score >= 50 ? 1 : 0;
    const completedAt  = is_completed ? "datetime('now')" : null;

    if (is_completed) {
      db.prepare(`
        INSERT INTO lesson_progress (user_id, lesson_id, course_id, is_completed, quiz_score, completed_at)
        VALUES (?, ?, ?, 1, ?, datetime('now'))
        ON CONFLICT(user_id, lesson_id)
        DO UPDATE SET is_completed = 1, quiz_score = excluded.quiz_score, completed_at = datetime('now')
      `).run(req.user.id, lessonId, lesson.course_id, quiz_score);
    } else {
      db.prepare(`
        INSERT INTO lesson_progress (user_id, lesson_id, course_id, is_completed, quiz_score)
        VALUES (?, ?, ?, 0, ?)
        ON CONFLICT(user_id, lesson_id)
        DO UPDATE SET quiz_score = excluded.quiz_score, is_completed = 0
      `).run(req.user.id, lessonId, lesson.course_id, quiz_score);
    }

    const progress_percent = calculateCourseProgress(req.user.id, lesson.course_id);

    return res.status(200).json({
      success: true,
      data: {
        quiz_score,
        is_completed: !!is_completed,
        correct_count,
        total_questions,
        progress_percent,
      },
    });
  } catch (err) {
    console.error('[submitQuiz]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/enrollments/:courseId/progress  [authenticate + authorize('student')]
// ══════════════════════════════════════════════════════════════════════════════
function getCourseProgress(req, res) {
  try {
    const { courseId } = req.params;

    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    if (!isEnrolled(req.user.id, courseId)) {
      return res.status(403).json({ success: false, message: 'Bạn chưa mua khóa học này' });
    }

    const { total_lessons } = db
      .prepare('SELECT COUNT(*) as total_lessons FROM lessons WHERE course_id = ?')
      .get(courseId);

    const { completed_lessons } = db
      .prepare(
        'SELECT COUNT(*) as completed_lessons FROM lesson_progress WHERE user_id = ? AND course_id = ? AND is_completed = 1'
      )
      .get(req.user.id, courseId);

    const progress_percent = total_lessons === 0
      ? 0
      : Math.round((completed_lessons / total_lessons) * 100);

    return res.status(200).json({
      success: true,
      data: {
        course_id:         parseInt(courseId),
        total_lessons,
        completed_lessons,
        progress_percent,
      },
    });
  } catch (err) {
    console.error('[getCourseProgress]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = {
  getCourseSections,
  completeLesson,
  submitQuiz,
  getCourseProgress,
  calculateCourseProgress, // export để enrollment.controller dùng chung
};
