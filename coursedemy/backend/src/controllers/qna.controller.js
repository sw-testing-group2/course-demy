const db = require('../config/database');

// ─── Helper: lấy câu hỏi hoặc trả 404 ────────────────────────────────────────
function getQuestionOrFail(questionId, res) {
  const question = db
    .prepare('SELECT * FROM lesson_questions WHERE id = ?')
    .get(questionId);
  if (!question) {
    res.status(404).json({ success: false, message: 'Câu hỏi không tồn tại' });
    return null;
  }
  return question;
}

// ─── Helper: kiểm tra quyền xem Q&A của bài học ──────────────────────────────
// Trả về true nếu: học viên đã đăng ký | giảng viên sở hữu khóa học | admin
function canViewQnA(user, courseId) {
  if (user.role === 'admin') return true;

  if (user.role === 'instructor') {
    const course = db
      .prepare('SELECT instructor_id FROM courses WHERE id = ?')
      .get(courseId);
    return course && course.instructor_id === user.id;
  }

  // student (hoặc bất kỳ role nào): kiểm tra enrollment
  const enrolled = db
    .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
    .get(user.id, courseId);
  return !!enrolled;
}

// ─── POST /api/lessons/:lessonId/questions ────────────────────────────────────
function createQuestion(req, res) {
  try {
    const lessonId = parseInt(req.params.lessonId);
    const { title, content } = req.body;

    // Kiểm tra bài học tồn tại
    const lesson = db
      .prepare('SELECT id, course_id FROM lessons WHERE id = ?')
      .get(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Bài học không tồn tại' });
    }

    // Kiểm tra học viên đã mua khóa học chưa
    const enrolled = db
      .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
      .get(req.user.id, lesson.course_id);
    if (!enrolled) {
      return res.status(403).json({
        success: false,
        message: 'Bạn cần đăng ký khóa học để đặt câu hỏi',
      });
    }

    // Kiểm tra title + content
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tiêu đề và nội dung câu hỏi',
      });
    }

    // Lưu câu hỏi
    const result = db
      .prepare(`
        INSERT INTO lesson_questions (lesson_id, course_id, user_id, title, content)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(lessonId, lesson.course_id, req.user.id, title.trim(), content.trim());

    const newQuestion = db
      .prepare('SELECT id, title, content, created_at FROM lesson_questions WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Đặt câu hỏi thành công',
      data: newQuestion,
    });
  } catch (err) {
    console.error('[createQuestion]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/lessons/:lessonId/questions ─────────────────────────────────────
function getLessonQuestions(req, res) {
  try {
    const lessonId = parseInt(req.params.lessonId);

    // Kiểm tra bài học tồn tại
    const lesson = db
      .prepare('SELECT id, course_id FROM lessons WHERE id = ?')
      .get(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Bài học không tồn tại' });
    }

    // Kiểm tra quyền xem
    if (!canViewQnA(req.user, lesson.course_id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem Q&A của bài học này',
      });
    }

    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.max(1, parseInt(req.query.limit) || 10);
    const offset  = (page - 1) * limit;
    const search  = req.query.search ? `%${req.query.search.trim()}%` : null;

    // Xây điều kiện tìm kiếm
    const conditions = ['q.lesson_id = ?'];
    const params     = [lessonId];

    if (search) {
      conditions.push('(q.title LIKE ? OR q.content LIKE ?)');
      params.push(search, search);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    // Đếm tổng
    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM lesson_questions q ${where}`)
      .get(...params);

    // Lấy câu hỏi có phân trang
    const rows = db.prepare(`
      SELECT
        q.id,
        q.title,
        q.content,
        q.is_resolved,
        q.created_at,
        u.id        AS user_id,
        u.full_name AS user_full_name,
        u.avatar    AS user_avatar,
        (SELECT COUNT(*) FROM lesson_answers a WHERE a.question_id = q.id) AS answers_count
      FROM lesson_questions q
      JOIN users u ON q.user_id = u.id
      ${where}
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const questions = rows.map((row) => ({
      id:          row.id,
      title:       row.title,
      content:     row.content,
      is_resolved: row.is_resolved,
      created_at:  row.created_at,
      answers_count: row.answers_count,
      user: {
        id:        row.user_id,
        full_name: row.user_full_name,
        avatar:    row.user_avatar,
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
    console.error('[getLessonQuestions]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/questions/:id ───────────────────────────────────────────────────
function getQuestion(req, res) {
  try {
    const questionId = parseInt(req.params.id);

    const question = getQuestionOrFail(questionId, res);
    if (!question) return;

    // Kiểm tra quyền
    if (!canViewQnA(req.user, question.course_id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem Q&A của bài học này',
      });
    }

    // Lấy thông tin người hỏi
    const asker = db
      .prepare('SELECT id, full_name, avatar FROM users WHERE id = ?')
      .get(question.user_id);

    // Lấy toàn bộ câu trả lời
    const answerRows = db.prepare(`
      SELECT
        a.id,
        a.content,
        a.is_instructor_answer,
        a.created_at,
        u.id        AS user_id,
        u.full_name AS user_full_name,
        u.avatar    AS user_avatar,
        u.role      AS user_role
      FROM lesson_answers a
      JOIN users u ON a.user_id = u.id
      WHERE a.question_id = ?
      ORDER BY a.created_at ASC
    `).all(questionId);

    const answers = answerRows.map((row) => ({
      id:                  row.id,
      content:             row.content,
      is_instructor_answer: row.is_instructor_answer,
      created_at:          row.created_at,
      user: {
        id:        row.user_id,
        full_name: row.user_full_name,
        avatar:    row.user_avatar,
        role:      row.user_role,
      },
    }));

    return res.status(200).json({
      success: true,
      data: {
        id:          question.id,
        title:       question.title,
        content:     question.content,
        is_resolved: question.is_resolved,
        created_at:  question.created_at,
        user: {
          id:        asker.id,
          full_name: asker.full_name,
          avatar:    asker.avatar,
        },
        answers,
      },
    });
  } catch (err) {
    console.error('[getQuestion]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/questions/:id/answers ─────────────────────────────────────────
function createAnswer(req, res) {
  try {
    const questionId = parseInt(req.params.id);
    const { content } = req.body;

    // Kiểm tra câu hỏi tồn tại
    const question = getQuestionOrFail(questionId, res);
    if (!question) return;

    const user = req.user;

    // Phân quyền theo role
    if (user.role === 'student') {
      // Phải đã mua khóa học
      const enrolled = db
        .prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?')
        .get(user.id, question.course_id);
      if (!enrolled) {
        return res.status(403).json({
          success: false,
          message: 'Bạn cần đăng ký khóa học để trả lời câu hỏi',
        });
      }
    } else if (user.role === 'instructor') {
      // Phải là giảng viên sở hữu khóa học chứa câu hỏi
      const course = db
        .prepare('SELECT instructor_id FROM courses WHERE id = ?')
        .get(question.course_id);
      if (!course || course.instructor_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền trả lời câu hỏi này',
        });
      }
    }
    // admin: không hạn chế

    // Kiểm tra nội dung
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung câu trả lời',
      });
    }

    // Xác định is_instructor_answer: chỉ đúng khi instructor VÀ là chủ khóa học
    let isInstructorAnswer = 0;
    if (user.role === 'instructor') {
      const course = db
        .prepare('SELECT instructor_id FROM courses WHERE id = ?')
        .get(question.course_id);
      if (course && course.instructor_id === user.id) {
        isInstructorAnswer = 1;
      }
    }

    const result = db
      .prepare(`
        INSERT INTO lesson_answers (question_id, user_id, content, is_instructor_answer)
        VALUES (?, ?, ?, ?)
      `)
      .run(questionId, user.id, content.trim(), isInstructorAnswer);

    const newAnswer = db
      .prepare('SELECT id, content, is_instructor_answer, created_at FROM lesson_answers WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Trả lời câu hỏi thành công',
      data: newAnswer,
    });
  } catch (err) {
    console.error('[createAnswer]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/questions/:id/resolve ──────────────────────────────────────────
function resolveQuestion(req, res) {
  try {
    const questionId = parseInt(req.params.id);

    const question = getQuestionOrFail(questionId, res);
    if (!question) return;

    const user = req.user;
    const isOwner = question.user_id === user.id;

    // Kiểm tra giảng viên sở hữu khóa học
    let isInstructorOwner = false;
    if (user.role === 'instructor') {
      const course = db
        .prepare('SELECT instructor_id FROM courses WHERE id = ?')
        .get(question.course_id);
      isInstructorOwner = course && course.instructor_id === user.id;
    }

    if (!isOwner && !isInstructorOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này',
      });
    }

    db.prepare(`
      UPDATE lesson_questions
      SET is_resolved = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(questionId);

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu câu hỏi là đã giải quyết',
    });
  } catch (err) {
    console.error('[resolveQuestion]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── DELETE /api/questions/:id ────────────────────────────────────────────────
function deleteQuestion(req, res) {
  try {
    const questionId = parseInt(req.params.id);

    const question = getQuestionOrFail(questionId, res);
    if (!question) return;

    const user = req.user;
    const isOwner = question.user_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa câu hỏi này',
      });
    }

    // Dùng transaction để xóa answers trước rồi mới xóa question
    const doDelete = db.transaction(() => {
      db.prepare('DELETE FROM lesson_answers WHERE question_id = ?').run(questionId);
      db.prepare('DELETE FROM lesson_questions WHERE id = ?').run(questionId);
    });

    doDelete();

    return res.status(200).json({ success: true, message: 'Đã xóa câu hỏi' });
  } catch (err) {
    console.error('[deleteQuestion]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── DELETE /api/answers/:id ──────────────────────────────────────────────────
function deleteAnswer(req, res) {
  try {
    const answerId = parseInt(req.params.id);

    const answer = db
      .prepare('SELECT * FROM lesson_answers WHERE id = ?')
      .get(answerId);
    if (!answer) {
      return res.status(404).json({ success: false, message: 'Câu trả lời không tồn tại' });
    }

    const user = req.user;
    const isOwner = answer.user_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa câu trả lời này',
      });
    }

    db.prepare('DELETE FROM lesson_answers WHERE id = ?').run(answerId);

    return res.status(200).json({ success: true, message: 'Đã xóa câu trả lời' });
  } catch (err) {
    console.error('[deleteAnswer]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = {
  createQuestion,
  getLessonQuestions,
  getQuestion,
  createAnswer,
  resolveQuestion,
  deleteQuestion,
  deleteAnswer,
};
