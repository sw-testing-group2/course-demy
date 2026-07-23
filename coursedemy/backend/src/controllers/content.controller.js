const db = require('../config/database');

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kiểm tra course tồn tại và thuộc về instructor đang đăng nhập.
 * Trả về course row nếu hợp lệ, null nếu đã gửi response lỗi.
 */
function resolveCourse(courseId, instructorId, res) {
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
      message: 'Bạn không có quyền thao tác trên nội dung này',
    });
    return null;
  }
  return course;
}

/**
 * Kiểm tra section tồn tại và thuộc về instructor đang đăng nhập.
 * Trả về section row nếu hợp lệ, null nếu đã gửi response lỗi.
 */
function resolveSection(sectionId, instructorId, res) {
  const section = db
    .prepare(`
      SELECT cs.id, cs.course_id, cs.title, cs.position,
             c.instructor_id
      FROM course_sections cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.id = ?
    `)
    .get(sectionId);

  if (!section) {
    res.status(404).json({ success: false, message: 'Không tìm thấy chương' });
    return null;
  }
  if (section.instructor_id !== instructorId) {
    res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thao tác trên nội dung này',
    });
    return null;
  }
  return section;
}

/**
 * Kiểm tra lesson tồn tại và thuộc về instructor đang đăng nhập.
 * Trả về lesson row nếu hợp lệ, null nếu đã gửi response lỗi.
 */
function resolveLesson(lessonId, instructorId, res) {
  const lesson = db
    .prepare(`
      SELECT l.id, l.section_id, l.course_id, l.title, l.type,
             l.video_url, l.content_body, l.duration_seconds,
             l.position, l.is_preview,
             c.instructor_id
      FROM lessons l
      JOIN course_sections cs ON l.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      WHERE l.id = ?
    `)
    .get(lessonId);

  if (!lesson) {
    res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
    return null;
  }
  if (lesson.instructor_id !== instructorId) {
    res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thao tác trên nội dung này',
    });
    return null;
  }
  return lesson;
}

/**
 * Kiểm tra question tồn tại và thuộc về instructor đang đăng nhập.
 * Trả về question row nếu hợp lệ, null nếu đã gửi response lỗi.
 */
function resolveQuestion(questionId, instructorId, res) {
  const question = db
    .prepare(`
      SELECT qq.id, qq.lesson_id, qq.question_text, qq.options,
             qq.correct_index, qq.position,
             c.instructor_id
      FROM quiz_questions qq
      JOIN lessons l ON qq.lesson_id = l.id
      JOIN course_sections cs ON l.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      WHERE qq.id = ?
    `)
    .get(questionId);

  if (!question) {
    res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi' });
    return null;
  }
  if (question.instructor_id !== instructorId) {
    res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thao tác trên nội dung này',
    });
    return null;
  }
  return question;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/instructor/courses/:courseId/sections ───────────────────────────
function getSections(req, res) {
  const courseId = parseInt(req.params.courseId);

  try {
    const course = resolveCourse(courseId, req.user.id, res);
    if (!course) return;

    // Lấy tất cả sections
    const sections = db
      .prepare(
        'SELECT id, title, position FROM course_sections WHERE course_id = ? ORDER BY position ASC'
      )
      .all(courseId);

    // Lấy tất cả lessons thuộc course này
    const lessons = db
      .prepare(`
        SELECT id, section_id, title, type, video_url, content_body,
               duration_seconds, position, is_preview
        FROM lessons
        WHERE course_id = ?
        ORDER BY position ASC
      `)
      .all(courseId);

    // Lấy tất cả quiz questions của lessons trong course
    const lessonIds = lessons.map((l) => l.id);
    let allQuestions = [];
    if (lessonIds.length > 0) {
      const placeholders = lessonIds.map(() => '?').join(',');
      allQuestions = db
        .prepare(`
          SELECT id, lesson_id, question_text, options, correct_index, position
          FROM quiz_questions
          WHERE lesson_id IN (${placeholders})
          ORDER BY position ASC
        `)
        .all(...lessonIds);
    }

    // Map questions theo lesson_id
    const questionsByLesson = {};
    for (const q of allQuestions) {
      if (!questionsByLesson[q.lesson_id]) questionsByLesson[q.lesson_id] = [];
      questionsByLesson[q.lesson_id].push({
        id: q.id,
        question_text: q.question_text,
        options: JSON.parse(q.options),
        correct_index: q.correct_index,
        position: q.position,
      });
    }

    // Map lessons theo section_id, kèm questions nếu type='quiz'
    const lessonsBySection = {};
    for (const l of lessons) {
      if (!lessonsBySection[l.section_id]) lessonsBySection[l.section_id] = [];
      const lessonObj = {
        id: l.id,
        title: l.title,
        type: l.type,
        video_url: l.video_url,
        content_body: l.content_body,
        duration_seconds: l.duration_seconds,
        position: l.position,
        is_preview: l.is_preview,
      };
      if (l.type === 'quiz') {
        lessonObj.questions = questionsByLesson[l.id] || [];
      }
      lessonsBySection[l.section_id].push(lessonObj);
    }

    // Gắn lessons vào từng section
    const data = sections.map((s) => ({
      id: s.id,
      title: s.title,
      position: s.position,
      lessons: lessonsBySection[s.id] || [],
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getSections]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/instructor/courses/:courseId/sections ──────────────────────────
function createSection(req, res) {
  const courseId = parseInt(req.params.courseId);

  try {
    const course = resolveCourse(courseId, req.user.id, res);
    if (!course) return;

    const { title } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề chương không được để trống' });
    }

    // Tính position mặc định = số section hiện có
    let { position } = req.body;
    if (position === undefined || position === null) {
      const { cnt } = db
        .prepare('SELECT COUNT(*) AS cnt FROM course_sections WHERE course_id = ?')
        .get(courseId);
      position = cnt;
    }

    const doCreate = db.transaction(() => {
      const r = db
        .prepare('INSERT INTO course_sections (course_id, title, position) VALUES (?, ?, ?)')
        .run(courseId, String(title).trim(), Number(position));
      // Mirror into legacy `sections` table (lessons FK points there)
      db.prepare('INSERT OR IGNORE INTO sections (id, course_id, title, position) VALUES (?, ?, ?, ?)')
        .run(r.lastInsertRowid, courseId, String(title).trim(), Number(position));
      return r;
    });

    const result = doCreate();

    const newSection = db
      .prepare('SELECT id, title, position FROM course_sections WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Tạo chương thành công',
      data: newSection,
    });
  } catch (err) {
    console.error('[createSection]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/instructor/sections/:id ────────────────────────────────────────
function updateSection(req, res) {
  const sectionId = parseInt(req.params.id);

  try {
    const section = resolveSection(sectionId, req.user.id, res);
    if (!section) return;

    const { title, position } = req.body;
    const fields = [];
    const params = [];

    if (title !== undefined) {
      fields.push('title = ?');
      params.push(String(title).trim());
    }
    if (position !== undefined) {
      fields.push('position = ?');
      params.push(Number(position));
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có thông tin cần cập nhật' });
    }

    params.push(sectionId);
    db.prepare(`UPDATE course_sections SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updated = db
      .prepare('SELECT id, title, position FROM course_sections WHERE id = ?')
      .get(sectionId);

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

// ─── DELETE /api/instructor/sections/:id ─────────────────────────────────────
function deleteSection(req, res) {
  const sectionId = parseInt(req.params.id);

  try {
    const section = resolveSection(sectionId, req.user.id, res);
    if (!section) return;

    // Lấy danh sách lesson_id thuộc section để xóa quiz_questions
    const lessonIds = db
      .prepare('SELECT id FROM lessons WHERE section_id = ?')
      .all(sectionId)
      .map((l) => l.id);

    const doDelete = db.transaction(() => {
      if (lessonIds.length > 0) {
        const ph = lessonIds.map(() => '?').join(',');
        // Xóa quiz_questions của các lessons
        db.prepare(`DELETE FROM quiz_questions WHERE lesson_id IN (${ph})`).run(...lessonIds);
        // Xóa lesson_progress liên quan
        db.prepare(`DELETE FROM lesson_progress WHERE lesson_id IN (${ph})`).run(...lessonIds);
      }
      // Xóa toàn bộ lessons của section
      db.prepare('DELETE FROM lessons WHERE section_id = ?').run(sectionId);
      // Xóa section
      db.prepare('DELETE FROM course_sections WHERE id = ?').run(sectionId);
    });

    doDelete();

    return res.status(200).json({ success: true, message: 'Đã xóa chương' });
  } catch (err) {
    console.error('[deleteSection]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LESSONS
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_LESSON_TYPES = ['video', 'content', 'quiz'];

// ─── POST /api/instructor/sections/:sectionId/lessons ─────────────────────────
function createLesson(req, res) {
  const sectionId = parseInt(req.params.sectionId);

  try {
    const section = resolveSection(sectionId, req.user.id, res);
    if (!section) return;

    const { title, type, video_url, content_body, duration_seconds, is_preview } = req.body;
    let { position } = req.body;

    // Validate
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề bài học không được để trống' });
    }
    if (!type || !VALID_LESSON_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type không hợp lệ, phải là 'video', 'content' hoặc 'quiz'",
      });
    }

    // Position mặc định = số lesson hiện có trong section
    if (position === undefined || position === null) {
      const { cnt } = db
        .prepare('SELECT COUNT(*) AS cnt FROM lessons WHERE section_id = ?')
        .get(sectionId);
      position = cnt;
    }

    const courseId = section.course_id;
    const isPreviewVal = is_preview ? 1 : 0;

    // Ensure the section also exists in the legacy `sections` table (FK target)
    // This handles the schema mismatch where lessons.section_id FK → sections(id)
    // but sections are created in course_sections.
    const doInsert = db.transaction(() => {
      const legacyExists = db.prepare('SELECT id FROM sections WHERE id = ?').get(sectionId);
      if (!legacyExists) {
        db.prepare('INSERT OR IGNORE INTO sections (id, course_id, title, position) VALUES (?, ?, ?, ?)')
          .run(sectionId, courseId, section.title, section.position ?? 0);
      }
      return db
        .prepare(`
          INSERT INTO lessons
            (section_id, course_id, title, type, video_url, content_body, duration_seconds, position, is_preview)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          sectionId,
          courseId,
          String(title).trim(),
          type,
          video_url ?? null,
          content_body ?? null,
          duration_seconds ? Number(duration_seconds) : null,
          Number(position),
          isPreviewVal
        );
    });

    const result = doInsert();

    const newLesson = db
      .prepare('SELECT id, title, type, position FROM lessons WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Tạo bài học thành công',
      data: newLesson,
    });
  } catch (err) {
    console.error('[createLesson]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}


// ─── PUT /api/instructor/lessons/:id ─────────────────────────────────────────
function updateLesson(req, res) {
  const lessonId = parseInt(req.params.id);

  try {
    const lesson = resolveLesson(lessonId, req.user.id, res);
    if (!lesson) return;

    // KHÔNG cho đổi type sau khi tạo
    const { title, video_url, content_body, duration_seconds, is_preview, position } = req.body;

    const fields = [];
    const params = [];

    if (title !== undefined) {
      fields.push('title = ?');
      params.push(String(title).trim());
    }
    if (video_url !== undefined) {
      fields.push('video_url = ?');
      params.push(video_url);
    }
    if (content_body !== undefined) {
      fields.push('content_body = ?');
      params.push(content_body);
    }
    if (duration_seconds !== undefined) {
      fields.push('duration_seconds = ?');
      params.push(duration_seconds !== null ? Number(duration_seconds) : null);
    }
    if (is_preview !== undefined) {
      fields.push('is_preview = ?');
      params.push(is_preview ? 1 : 0);
    }
    if (position !== undefined) {
      fields.push('position = ?');
      params.push(Number(position));
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có thông tin cần cập nhật' });
    }

    params.push(lessonId);
    db.prepare(`UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updated = db
      .prepare(`
        SELECT id, title, type, video_url, content_body, duration_seconds, position, is_preview
        FROM lessons WHERE id = ?
      `)
      .get(lessonId);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật bài học thành công',
      data: updated,
    });
  } catch (err) {
    console.error('[updateLesson]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── DELETE /api/instructor/lessons/:id ──────────────────────────────────────
function deleteLesson(req, res) {
  const lessonId = parseInt(req.params.id);

  try {
    const lesson = resolveLesson(lessonId, req.user.id, res);
    if (!lesson) return;

    const doDelete = db.transaction(() => {
      // Xóa quiz_questions liên quan
      db.prepare('DELETE FROM quiz_questions WHERE lesson_id = ?').run(lessonId);
      // Xóa lesson_progress liên quan
      db.prepare('DELETE FROM lesson_progress WHERE lesson_id = ?').run(lessonId);
      // Xóa lesson
      db.prepare('DELETE FROM lessons WHERE id = ?').run(lessonId);
    });

    doDelete();

    return res.status(200).json({ success: true, message: 'Đã xóa bài học' });
  } catch (err) {
    console.error('[deleteLesson]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  QUIZ QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/instructor/lessons/:lessonId/questions ─────────────────────────
function createQuestion(req, res) {
  const lessonId = parseInt(req.params.lessonId);

  try {
    const lesson = resolveLesson(lessonId, req.user.id, res);
    if (!lesson) return;

    // Kiểm tra type phải là 'quiz'
    if (lesson.type !== 'quiz') {
      return res.status(400).json({ success: false, message: 'Bài học này không phải dạng quiz' });
    }

    const { question_text, options, correct_index } = req.body;

    // Validate question_text
    if (!question_text || !String(question_text).trim()) {
      return res.status(400).json({ success: false, message: 'Câu hỏi không được để trống' });
    }

    // Validate options
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'options phải là mảng string với ít nhất 2 phần tử',
      });
    }

    // Validate correct_index
    const ci = Number(correct_index);
    if (!Number.isInteger(ci) || ci < 0 || ci > options.length - 1) {
      return res.status(400).json({ success: false, message: 'correct_index không hợp lệ' });
    }

    // Tính position mặc định
    const { cnt } = db
      .prepare('SELECT COUNT(*) AS cnt FROM quiz_questions WHERE lesson_id = ?')
      .get(lessonId);

    const result = db
      .prepare(`
        INSERT INTO quiz_questions (lesson_id, question_text, options, correct_index, position)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(lessonId, String(question_text).trim(), JSON.stringify(options), ci, cnt);

    const newQuestion = db
      .prepare('SELECT id, question_text, options, correct_index FROM quiz_questions WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Thêm câu hỏi thành công',
      data: {
        id: newQuestion.id,
        question_text: newQuestion.question_text,
        options: JSON.parse(newQuestion.options),
        correct_index: newQuestion.correct_index,
      },
    });
  } catch (err) {
    console.error('[createQuestion]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── PUT /api/instructor/questions/:id ───────────────────────────────────────
function updateQuestion(req, res) {
  const questionId = parseInt(req.params.id);

  try {
    const question = resolveQuestion(questionId, req.user.id, res);
    if (!question) return;

    const { question_text, options, correct_index, position } = req.body;

    // Lấy options hiện tại (cần để validate correct_index khi chỉ đổi correct_index)
    const currentOptions = JSON.parse(question.options);
    const newOptions = Array.isArray(options) ? options : currentOptions;

    // Validate options nếu được truyền
    if (options !== undefined) {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'options phải là mảng string với ít nhất 2 phần tử',
        });
      }
    }

    // Validate correct_index nếu được truyền
    if (correct_index !== undefined) {
      const ci = Number(correct_index);
      if (!Number.isInteger(ci) || ci < 0 || ci > newOptions.length - 1) {
        return res.status(400).json({ success: false, message: 'correct_index không hợp lệ' });
      }
    }

    const fields = [];
    const params = [];

    if (question_text !== undefined) {
      fields.push('question_text = ?');
      params.push(String(question_text).trim());
    }
    if (options !== undefined) {
      fields.push('options = ?');
      params.push(JSON.stringify(options));
    }
    if (correct_index !== undefined) {
      fields.push('correct_index = ?');
      params.push(Number(correct_index));
    }
    if (position !== undefined) {
      fields.push('position = ?');
      params.push(Number(position));
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có thông tin cần cập nhật' });
    }

    params.push(questionId);
    db.prepare(`UPDATE quiz_questions SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updated = db
      .prepare('SELECT id, question_text, options, correct_index, position FROM quiz_questions WHERE id = ?')
      .get(questionId);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật câu hỏi thành công',
      data: {
        id: updated.id,
        question_text: updated.question_text,
        options: JSON.parse(updated.options),
        correct_index: updated.correct_index,
        position: updated.position,
      },
    });
  } catch (err) {
    console.error('[updateQuestion]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── DELETE /api/instructor/questions/:id ────────────────────────────────────
function deleteQuestion(req, res) {
  const questionId = parseInt(req.params.id);

  try {
    const question = resolveQuestion(questionId, req.user.id, res);
    if (!question) return;

    db.prepare('DELETE FROM quiz_questions WHERE id = ?').run(questionId);

    return res.status(200).json({ success: true, message: 'Đã xóa câu hỏi' });
  } catch (err) {
    console.error('[deleteQuestion]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  // Sections
  getSections,
  createSection,
  updateSection,
  deleteSection,
  // Lessons
  createLesson,
  updateLesson,
  deleteLesson,
  // Questions
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
