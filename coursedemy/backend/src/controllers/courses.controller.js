const db = require('../config/database');

// ─── GET /api/categories ─────────────────────────────────────────────────────
function getCategories(req, res) {
  try {
    const categories = db
      .prepare('SELECT id, name, description FROM categories ORDER BY name ASC')
      .all();

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error('[getCategories]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/courses ────────────────────────────────────────────────────────
function getCourses(req, res) {
  try {
    const {
      search,
      category_id,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset   = (pageNum - 1) * limitNum;

    // ── Xây WHERE clause động ──────────────────────────────────────────────
    const conditions = ['c.status = ?'];
    const params     = ['approved'];

    if (category_id) {
      conditions.push('c.category_id = ?');
      params.push(parseInt(category_id));
    }

    if (minPrice !== undefined && minPrice !== '') {
      conditions.push('c.price >= ?');
      params.push(parseFloat(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      conditions.push('c.price <= ?');
      params.push(parseFloat(maxPrice));
    }

    if (search && search.trim()) {
      conditions.push('(c.title LIKE ? OR c.description LIKE ?)');
      const keyword = `%${search.trim()}%`;
      params.push(keyword, keyword);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // ── Đếm tổng để tính totalPages ────────────────────────────────────────
    const countSQL = `
      SELECT COUNT(*) AS total
      FROM courses c
      ${whereClause}
    `;
    const { total } = db.prepare(countSQL).get(...params);

    // ── Lấy dữ liệu có LIMIT/OFFSET ───────────────────────────────────────
    const dataSQL = `
      SELECT
        c.id,
        c.title,
        c.description,
        c.price,
        c.thumbnail,
        c.status,
        c.created_at,
        cat.id   AS category_id,
        cat.name AS category_name,
        u.id        AS instructor_id,
        u.full_name AS instructor_name
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u        ON c.instructor_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(dataSQL).all(...params, limitNum, offset);

    // ── Reshape rows → nested objects ──────────────────────────────────────
    const courses = rows.map((row) => ({
      id:          row.id,
      title:       row.title,
      description: row.description,
      price:       row.price,
      thumbnail:   row.thumbnail,
      status:      row.status,
      created_at:  row.created_at,
      category: {
        id:   row.category_id,
        name: row.category_name,
      },
      instructor: {
        id:        row.instructor_id,
        full_name: row.instructor_name,
      },
    }));

    return res.status(200).json({
      success: true,
      data: {
        courses,
        total,
        page:       pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[getCourses]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── GET /api/courses/:id ────────────────────────────────────────────────────
function getCourseById(req, res) {
  try {
    const { id } = req.params;

    const row = db.prepare(`
      SELECT
        c.id,
        c.title,
        c.description,
        c.price,
        c.thumbnail,
        c.status,
        c.created_at,
        cat.id   AS category_id,
        cat.name AS category_name,
        u.id        AS instructor_id,
        u.full_name AS instructor_name
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u        ON c.instructor_id = u.id
      WHERE c.id = ?
    `).get(id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khóa học',
      });
    }

    const course = {
      id:          row.id,
      title:       row.title,
      description: row.description,
      price:       row.price,
      thumbnail:   row.thumbnail,
      status:      row.status,
      created_at:  row.created_at,
      category: {
        id:   row.category_id,
        name: row.category_name,
      },
      instructor: {
        id:        row.instructor_id,
        full_name: row.instructor_name,
      },
    };

    return res.status(200).json({ success: true, data: course });
  } catch (err) {
    console.error('[getCourseById]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = { getCategories, getCourses, getCourseById };
