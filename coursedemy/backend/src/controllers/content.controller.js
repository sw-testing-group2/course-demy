const db = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: kiểm tra course thuộc về instructor
// ─────────────────────────────────────────────────────────────────────────────
function getCourseOwned(courseId, instructorId) {
  return db.prepare('SELECT * FROM courses WHERE id = ? AND instructor_id = ?').get(courseId, instructorId);
}

// Lấy section + kiểm tra ownership qua course
function getSectionOwned(sectionId, instructorId) {
  return db.prepare(`
    SELECT s.* FROM course_sections s
    JOIN courses c ON s.course_id = c.id
    WHERE s.id = ? AND c.instructor_id = ?
  `).get(sectionId, instructorId);
}

// Lấy lesson + kiểm tra ownership qua course
function getLessonOwned(lessonId, instructorId) {
  return db.prepare(`
    SELECT l.* FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE l.id = ? AND c.instructor_id = ?
  `).get(lessonId, instructorId);
}

// Lấy question + kiểm tra ownership qua lesson → course
function getQuestionOwned(questionId, instructorId) {
  return db.prepare(`
    SELECT q.* FROM quiz_questions q
    JOIN lessons l ON q.lesson_id = l.id
    JOIN courses c ON l.course_id = c.id
    WHERE q.id = ? AND c.instructor_id = ?
  `).get(questionId, instructorId);
}

// Parse options từ JSON string → array
function parseQuestion(q) {
  if (!q) return q;
  try { q.options = JSON.parse(q.options); } catch { q.options = []; }
  return q;
}

// ══════════════════════════════════════════════════════════════════════════════
//  SECTIONS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/instructor/courses/:courseId/sections
function getSections(req, res) {
  try {
    const { courseId } = req.params;

    const course = getCourseOwned(courseId, req.user.id);
    if (!course) {
      // Kiểm tra course có tồn tại không (để phân biệt 404 vs 403)
      const exists = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
      return res.status(exists ? 403 : 404).json({
        success: false,
        message: exists ? 'Bạn không có quyền thao tác trên nội dung này' : 'Không tìm thấy khóa học',
      });
    }

    const sections = db.prepare(
      'SELECT id, title, position FROM course_sections WHERE course_id = ? ORDER BY position ASC'
    ).all(courseId);

    const getLessons = db.prepare(
      `SELECT id, title, type, video_url, content_body, duration_seconds,
              position, is_preview
       FROM lessons WHERE section_id = ? ORDER BY position ASC`
    );
    const getQuestions = db.prepare(
      'SELECT id, question_text, options, correct_index, position FROM quiz_questions WHERE lesson_id = ? ORDER BY position ASC'
    );

    const data = sections.map((s) => ({
      ...s,
      lessons: getLessons.all(s.id).map((l) => ({
        ...l,
        is_preview: !!l.is_preview,
        questions: l.type === 'quiz'
          ? getQuestions.all(l.id).map(parseQuestion)
          : undefined,
      })),
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getSections]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// POST /api/instructor/courses/:courseId/sections
function createSection(req, res) {
  try {
    const { courseId } = req.params;
    const { title, position } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Thiếu title' });
    }

    const course = getCourseOwned(courseId, req.user.id);
    if (!course) {
      const exists = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
      return res.status(exists ? 403 : 404).json({
        success: false,
        message: exists ? 'Bạn không có quyền thao tác trên nội dung này' : 'Không tìm thấy khóa học',
      });
    }

    // Default position = số section hiện có
    let pos = position;
    if (pos === undefined || pos === null) {
      const { count } = db.prepare('SELECT COUNT(*) as count FROM course_sections WHERE course_id = ?').get(courseId);
      pos = count;
    }

    const result = db.prepare(
      'INSERT INTO course_sections (course_id, title, position) VALUES (?, ?, ?)'
    ).run(courseId, title, pos);

    return res.status(201).json({
      success: true,
      message: 'Tạo chương thành công',
      data: { id: result.lastInsertRowid, title, position: pos },
    });
  } catch (err) {
    console.error('[createSection]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// PUT /api/instructor/sections/:id
function updateSection(req, res) {
  try {
    const { id } = req.params;

    const section = db.prepare('SELECT * FROM course_sections WHERE id = ?').get(id);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chương' });
    }
    const owned = getCourseOwned(section.course_id, req.user.id);
    if (!owned) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên nội dung này' });
    }

    const { title, position } = req.body;
    const newTitle    = title    !== undefined ? title    : section.title;
    const newPosition = position !== undefined ? position : section.position;

    db.prepare('UPDATE course_sections SET title = ?, position = ? WHERE id = ?')
      .run(newTitle, newPosition, id);

    const updated = db.prepare('SELECT id, title, position, course_id FROM course_sections WHERE id = ?').get(id);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật chương thành công',
      data: updated,
    });
  } catch (err) {
    console.error('[updateSection]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// DELETE /api/instructor/sections/:id
function deleteSection(req, res) {
  try {
    const { id } = req.params;

    const section = db.prepare('SELECT * FROM course_sections WHERE id = ?').get(id);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chương' });
    }
    const owned = getCourseOwned(section.course_id, req.user.id);
    if (!owned) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên nội dung này' });
    }

    const doDelete = db.transaction(() => {
      // Lấy tất cả lessonId trong section
      const lessonIds = db.prepare('SELECT id FROM lessons WHERE section_id = ?').all(id).map((l) => l.id);

      for (const lessonId of lessonIds) {
        // Xóa quiz_questions
        db.prepare('DELETE FROM quiz_questions WHERE lesson_id = ?').run(lessonId);
        // Xóa lesson_progress nếu bảng tồn tại (Task 9 — safe check)
        try {
          db.prepare('DELETE FROM lesson_progress WHERE lesson_id = ?').run(lessonId);
        } catch (_) { /* bảng chưa tạo → bỏ qua */ }
      }
      // Xóa lessons
      db.prepare('DELETE FROM lessons WHERE section_id = ?').run(id);
      // Xóa section
      db.prepare('DELETE FROM course_sections WHERE id = ?').run(id);
    });

    doDelete();

    return res.status(200).json({ success: true, message: 'Đã xóa chương' });
  } catch (err) {
    console.error('[deleteSection]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  LESSONS
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/instructor/sections/:sectionId/lessons
function createLesson(req, res) {
  try {
    const { sectionId } = req.params;

    const section = db.prepare('SELECT * FROM course_sections WHERE id = ?').get(sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chương' });
    }
    const owned = getCourseOwned(section.course_id, req.user.id);
    if (!owned) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên nội dung này' });
    }

    const {
      title, type, video_url, content_body,
      duration_seconds, is_preview = false, position,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Thiếu title' });
    }
    if (!type || !['video', 'content', 'quiz'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type không hợp lệ (video | content | quiz)' });
    }

    // Default position = số lesson hiện có trong section
    let pos = position;
    if (pos === undefined || pos === null) {
      const { count } = db.prepare('SELECT COUNT(*) as count FROM lessons WHERE section_id = ?').get(sectionId);
      pos = count;
    }

    const result = db.prepare(`
      INSERT INTO lessons
        (section_id, course_id, title, type, video_url, content_body,
         duration_seconds, position, is_preview)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sectionId,
      section.course_id,
      title,
      type,
      video_url    ?? null,
      content_body ?? null,
      duration_seconds ?? null,
      pos,
      is_preview ? 1 : 0,
    );

    return res.status(201).json({
      success: true,
      message: 'Tạo bài học thành công',
      data: { id: result.lastInsertRowid, title, type, position: pos },
    });
  } catch (err) {
    console.error('[createLesson]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// PUT /api/instructor/lessons/:id
function updateLesson(req, res) {
  try {
    const { id } = req.params;

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
    }
    const owned = getCourseOwned(lesson.course_id, req.user.id);
    if (!owned) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên nội dung này' });
    }

    const { title, video_url, content_body, duration_seconds, is_preview, position } = req.body;
    // KHÔNG cho đổi type sau khi tạo

    const updated = {
      title:            title            !== undefined ? title            : lesson.title,
      video_url:        video_url        !== undefined ? video_url        : lesson.video_url,
      content_body:     content_body     !== undefined ? content_body     : lesson.content_body,
      duration_seconds: duration_seconds !== undefined ? duration_seconds : lesson.duration_seconds,
      is_preview:       is_preview       !== undefined ? (is_preview ? 1 : 0) : lesson.is_preview,
      position:         position         !== undefined ? position         : lesson.position,
    };

    db.prepare(`
      UPDATE lessons
      SET title = ?, video_url = ?, content_body = ?,
          duration_seconds = ?, is_preview = ?, position = ?
      WHERE id = ?
    `).run(
      updated.title,
      updated.video_url,
      updated.content_body,
      updated.duration_seconds,
      updated.is_preview,
      updated.position,
      id,
    );

    const result = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
    result.is_preview = !!result.is_preview;

    return res.status(200).json({
      success: true,
      message: 'Cập nhật bài học thành công',
      data: result,
    });
  } catch (err) {
    console.error('[updateLesson]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// DELETE /api/instructor/lessons/:id
function deleteLesson(req, res) {
  try {
    const { id } = req.params;

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
    }
    const owned = getCourseOwned(lesson.course_id, req.user.id);
    if (!owned) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên nội dung này' });
    }

    const doDelete = db.transaction(() => {
      db.prepare('DELETE FROM quiz_questions WHERE lesson_id = ?').run(id);
      try {
        db.prepare('DELETE FROM lesson_progress WHERE lesson_id = ?').run(id);
      } catch (_) { /* bảng chưa tạo → bỏ qua */ }
      db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
    });

    doDelete();

    return res.status(200).json({ success: true, message: 'Đã xóa bài học' });
  } catch (err) {
    console.error('[deleteLesson]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  QUIZ QUESTIONS
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/instructor/lessons/:lessonId/questions
function createQuestion(req, res) {
  try {
    const { lessonId } = req.params;

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
    }
    const owned = getCourseOwned(lesson.course_id, req.user.id);
    if (!owned) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên nội dung này' });
    }
    if (lesson.type !== 'quiz') {
      return res.status(400).json({ success: false, message: 'Bài học này không phải dạng quiz' });
    }

    const { question_text, options, correct_index, position } = req.body;

    if (!question_text) {
      return res.status(400).json({ success: false, message: 'Thiếu question_text' });
    }
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'options phải là mảng ít nhất 2 phần tử' });
    }
    if (correct_index === undefined || correct_index === null || !Number.isInteger(correct_index)
        || correct_index < 0 || correct_index > options.length - 1) {
      return res.status(400).json({ success: false, message: 'correct_index không hợp lệ' });
    }

    let pos = position;
    if (pos === undefined || pos === null) {
      const { count } = db.prepare('SELECT COUNT(*) as count FROM quiz_questions WHERE lesson_id = ?').get(lessonId);
      pos = count;
    }

    const result = db.prepare(
      'INSERT INTO quiz_questions (lesson_id, question_text, options, correct_index, position) VALUES (?, ?, ?, ?, ?)'
    ).run(lessonId, question_text, JSON.stringify(options), correct_index, pos);

    return res.status(201).json({
      success: true,
      message: 'Thêm câu hỏi thành công',
      data: {
        id:            result.lastInsertRowid,
        question_text,
        options,
        correct_index,
        position:      pos,
      },
    });
  } catch (err) {
    console.error('[createQuestion]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// PUT /api/instructor/questions/:id
function updateQuestion(req, res) {
  try {
    const { id } = req.params;

    const question = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi' });
    }

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(question.lesson_id);
    const owned = getCourseOwned(lesson.course_id, req.user.id);
    if (!owned) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên nội dung này' });
    }

    const { question_text, options, correct_index, position } = req.body;

    // Parse existing options để merge
    let currentOptions;
    try { currentOptions = JSON.parse(question.options); } catch { currentOptions = []; }

    const newText    = question_text  !== undefined ? question_text  : question.question_text;
    const newOptions = options        !== undefined ? options        : currentOptions;
    const newCorrect = correct_index  !== undefined ? correct_index  : question.correct_index;
    const newPos     = position       !== undefined ? position       : question.position;

    // Validate nếu có thay đổi options hoặc correct_index
    if (options !== undefined || correct_index !== undefined) {
      if (!Array.isArray(newOptions) || newOptions.length < 2) {
        return res.status(400).json({ success: false, message: 'options phải là mảng ít nhất 2 phần tử' });
      }
      if (!Number.isInteger(newCorrect) || newCorrect < 0 || newCorrect > newOptions.length - 1) {
        return res.status(400).json({ success: false, message: 'correct_index không hợp lệ' });
      }
    }

    db.prepare(`
      UPDATE quiz_questions
      SET question_text = ?, options = ?, correct_index = ?, position = ?
      WHERE id = ?
    `).run(newText, JSON.stringify(newOptions), newCorrect, newPos, id);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật câu hỏi thành công',
      data: {
        id:            parseInt(id),
        question_text: newText,
        options:       newOptions,
        correct_index: newCorrect,
        position:      newPos,
      },
    });
  } catch (err) {
    console.error('[updateQuestion]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// DELETE /api/instructor/questions/:id
function deleteQuestion(req, res) {
  try {
    const { id } = req.params;

    const question = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi' });
    }

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(question.lesson_id);
    const owned = getCourseOwned(lesson.course_id, req.user.id);
    if (!owned) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên nội dung này' });
    }

    db.prepare('DELETE FROM quiz_questions WHERE id = ?').run(id);

    return res.status(200).json({ success: true, message: 'Đã xóa câu hỏi' });
  } catch (err) {
    console.error('[deleteQuestion]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = {
  getSections,
  createSection,
  updateSection,
  deleteSection,
  createLesson,
  updateLesson,
  deleteLesson,
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
