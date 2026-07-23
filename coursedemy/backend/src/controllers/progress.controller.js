const db = require('../config/database');

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPER DÙNG CHUNG
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tính progress_percent của một user trong một course.
 * @param {number} userId
 * @param {number} courseId
 * @returns {number} 0–100 (integer)
 */
function calculateCourseProgress(userId, courseId) {
  const { total } = db
    .prepare('SELECT COUNT(*) AS total FROM lessons WHERE course_id = ?')
    .get(courseId);

  if (total === 0) return 0;

  const { completed } = db
    .prepare(`
      SELECT COUNT(*) AS completed
      FROM lesson_progress
      WHERE user_id = ? AND course_id = ? AND is_completed = 1
    `)
    .get(userId, courseId);

  return Math.round((completed / total) * 100);
}

/**
 * Kiểm tra user đã enroll course chưa.
 * @param {number} userId
 * @param {number} courseId
 * @returns {boolean}
 */
function isEnrolled(userId, courseId) {
  const row = db
    .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
    .get(userId, courseId);
  return !!row;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/courses/:id/sections  [Public với optional auth]
// ═══════════════════════════════════════════════════════════════════════════════
function getCourseSections(req, res) {
  const courseId = parseInt(req.params.id);

  try {
    // Kiểm tra course tồn tại
    const course = db
      .prepare('SELECT id, instructor_id FROM courses WHERE id = ?')
      .get(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    // Xác định quyền truy cập
    const user = req.user || null;
    let enrolled = false;

    if (user) {
      if (user.role === 'admin') {
        enrolled = true;
      } else if (user.role === 'instructor' && user.id === course.instructor_id) {
        enrolled = true;
      } else if (user.role === 'student') {
        enrolled = isEnrolled(user.id, courseId);
      }
    }

    // Lấy tất cả sections của course (theo course_sections từ Task 8)
    const sections = db
      .prepare(
        'SELECT id, title, position FROM course_sections WHERE course_id = ? ORDER BY position ASC'
      )
      .all(courseId);

    // Lấy tất cả lessons của course
    const lessons = db
      .prepare(`
        SELECT id, section_id, title, type, video_url, content_body,
               duration_seconds, position, is_preview
        FROM lessons
        WHERE course_id = ?
        ORDER BY position ASC
      `)
      .all(courseId);

    const lessonIds = lessons.map((l) => l.id);

    // Lấy quiz questions nếu cần (enrolled hoặc preview)
    let questionsByLesson = {};
    if (lessonIds.length > 0) {
      const ph = lessonIds.map(() => '?').join(',');
      const questions = db
        .prepare(`
          SELECT id, lesson_id, question_text, options, position
          FROM quiz_questions
          WHERE lesson_id IN (${ph})
          ORDER BY position ASC
        `)
        .all(...lessonIds);

      for (const q of questions) {
        if (!questionsByLesson[q.lesson_id]) questionsByLesson[q.lesson_id] = [];
        questionsByLesson[q.lesson_id].push({
          id: q.id,
          question_text: q.question_text,
          options: JSON.parse(q.options),   // KHÔNG trả correct_index cho student
          position: q.position,
        });
      }
    }

    // Lấy lesson_progress của user nếu enrolled
    let progressByLesson = {};
    if (enrolled && user) {
      const ph = lessonIds.length > 0 ? lessonIds.map(() => '?').join(',') : null;
      if (ph) {
        const progRows = db
          .prepare(`
            SELECT lesson_id, is_completed, quiz_score
            FROM lesson_progress
            WHERE user_id = ? AND lesson_id IN (${ph})
          `)
          .all(user.id, ...lessonIds);

        for (const p of progRows) {
          progressByLesson[p.lesson_id] = {
            is_completed: p.is_completed === 1,
            quiz_score: p.quiz_score ?? null,
          };
        }
      }
    }

    // Map lessons theo section_id
    const lessonsBySection = {};
    for (const l of lessons) {
      if (!lessonsBySection[l.section_id]) lessonsBySection[l.section_id] = [];

      let lessonObj;

      if (enrolled) {
        // Trả đầy đủ thông tin
        lessonObj = {
          id: l.id,
          title: l.title,
          type: l.type,
          video_url: l.video_url,
          content_body: l.content_body,
          duration_seconds: l.duration_seconds,
          position: l.position,
          is_preview: l.is_preview,
          progress: progressByLesson[l.id] ?? { is_completed: false, quiz_score: null },
        };
        if (l.type === 'quiz') {
          lessonObj.questions = questionsByLesson[l.id] || [];
        }
      } else {
        // Chưa enroll: chỉ metadata
        lessonObj = {
          id: l.id,
          title: l.title,
          type: l.type,
          position: l.position,
          is_preview: l.is_preview,
          duration_seconds: l.duration_seconds,
          // nếu preview = 1: cho xem nội dung
          video_url: l.is_preview ? l.video_url : null,
          content_body: l.is_preview ? l.content_body : null,
        };
        if (l.type === 'quiz') {
          // preview quiz: trả questions không có đáp án; non-preview: null
          lessonObj.questions = l.is_preview ? (questionsByLesson[l.id] || []) : null;
        }
      }

      lessonsBySection[l.section_id].push(lessonObj);
    }

    // Tính progress_percent tổng
    const progress_percent = enrolled && user
      ? calculateCourseProgress(user.id, courseId)
      : 0;

    // Ghép sections
    const data = {
      enrolled,
      progress_percent,
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        position: s.position,
        lessons: lessonsBySection[s.id] || [],
      })),
    };

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getCourseSections]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/lessons/:id/complete  [authenticate + authorize('student')]
// ═══════════════════════════════════════════════════════════════════════════════
function completeLesson(req, res) {
  const lessonId = parseInt(req.params.id);

  try {
    // Lấy lesson (dùng bảng lessons — lesson có course_id)
    const lesson = db
      .prepare('SELECT id, course_id FROM lessons WHERE id = ?')
      .get(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
    }

    // Kiểm tra enroll
    if (!isEnrolled(req.user.id, lesson.course_id)) {
      return res.status(403).json({ success: false, message: 'Bạn chưa mua khóa học này' });
    }

    // INSERT hoặc UPDATE lesson_progress
    db.prepare(`
      INSERT INTO lesson_progress (user_id, lesson_id, course_id, is_completed, completed_at)
      VALUES (?, ?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, lesson_id) DO UPDATE SET
        is_completed = 1,
        completed_at = datetime('now')
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

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/lessons/:id/submit-quiz  [authenticate + authorize('student')]
// ═══════════════════════════════════════════════════════════════════════════════
function submitQuiz(req, res) {
  const lessonId = parseInt(req.params.id);

  try {
    // Lấy lesson
    const lesson = db
      .prepare('SELECT id, course_id, type FROM lessons WHERE id = ?')
      .get(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
    }

    // Kiểm tra type
    if (lesson.type !== 'quiz') {
      return res.status(400).json({ success: false, message: 'Bài học này không phải quiz' });
    }

    // Kiểm tra enroll
    if (!isEnrolled(req.user.id, lesson.course_id)) {
      return res.status(403).json({ success: false, message: 'Bạn chưa mua khóa học này' });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'answers phải là mảng không rỗng' });
    }

    // Lấy toàn bộ câu hỏi của lesson
    const questions = db
      .prepare('SELECT id, correct_index FROM quiz_questions WHERE lesson_id = ?')
      .all(lessonId);

    const total_questions = questions.length;
    if (total_questions === 0) {
      return res.status(400).json({ success: false, message: 'Quiz chưa có câu hỏi nào' });
    }

    // Tính điểm
    const answerMap = {};
    for (const a of answers) {
      answerMap[a.question_id] = a.selected_index;
    }

    let correct_count = 0;
    for (const q of questions) {
      if (answerMap[q.id] !== undefined && answerMap[q.id] === q.correct_index) {
        correct_count++;
      }
    }

    const quiz_score = Math.round((correct_count / total_questions) * 100);
    const is_completed = quiz_score >= 50 ? 1 : 0;

    // INSERT hoặc UPDATE lesson_progress
    db.prepare(`
      INSERT INTO lesson_progress (user_id, lesson_id, course_id, is_completed, quiz_score, completed_at)
      VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END)
      ON CONFLICT(user_id, lesson_id) DO UPDATE SET
        is_completed = excluded.is_completed,
        quiz_score   = excluded.quiz_score,
        completed_at = excluded.completed_at
    `).run(
      req.user.id, lessonId, lesson.course_id,
      is_completed, quiz_score, is_completed
    );

    const progress_percent = calculateCourseProgress(req.user.id, lesson.course_id);

    return res.status(200).json({
      success: true,
      data: {
        quiz_score,
        is_completed: is_completed === 1,
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

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/enrollments/:courseId/progress  [authenticate + authorize('student')]
// ═══════════════════════════════════════════════════════════════════════════════
function getCourseProgress(req, res) {
  const courseId = parseInt(req.params.courseId);

  try {
    // Kiểm tra enroll
    if (!isEnrolled(req.user.id, courseId)) {
      return res.status(403).json({ success: false, message: 'Bạn chưa mua khóa học này' });
    }

    const { total_lessons } = db
      .prepare('SELECT COUNT(*) AS total_lessons FROM lessons WHERE course_id = ?')
      .get(courseId);

    const { completed_lessons } = db
      .prepare(`
        SELECT COUNT(*) AS completed_lessons
        FROM lesson_progress
        WHERE user_id = ? AND course_id = ? AND is_completed = 1
      `)
      .get(req.user.id, courseId);

    const progress_percent = total_lessons === 0
      ? 0
      : Math.round((completed_lessons / total_lessons) * 100);

    return res.status(200).json({
      success: true,
      data: {
        course_id: courseId,
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
  calculateCourseProgress,
  getCourseSections,
  completeLesson,
  submitQuiz,
  getCourseProgress,
};
