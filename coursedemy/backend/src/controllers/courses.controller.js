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

    // ── HAVING clause lọc theo avg_rating (optional) ────────────────────────
    const ratingMin    = req.query.rating ? parseFloat(req.query.rating) : null;
    const havingClause = ratingMin ? `HAVING COALESCE(AVG(rv.rating), 0) >= ?` : '';
    const havingParams = ratingMin ? [ratingMin] : [];

    // ── Đếm tổng — dùng sub-query để COUNT chính xác khi có HAVING ─────────
    const countSQL = `
      SELECT COUNT(*) AS total FROM (
        SELECT c.id
        FROM courses c
        LEFT JOIN reviews rv ON rv.course_id = c.id
        ${whereClause}
        GROUP BY c.id
        ${havingClause}
      )
    `;
    const { total } = db.prepare(countSQL).get(...params, ...havingParams);

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
        u.full_name AS instructor_name,
        COALESCE(ROUND(AVG(rv.rating), 1), 0) AS avg_rating,
        COUNT(rv.id)                           AS reviews_count
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u        ON c.instructor_id = u.id
      LEFT JOIN reviews rv     ON rv.course_id = c.id
      ${whereClause}
      GROUP BY c.id
      ${havingClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(dataSQL).all(...params, ...havingParams, limitNum, offset);

    // ── Reshape rows → nested objects ──────────────────────────────────────
    const courses = rows.map((row) => ({
      id:            row.id,
      title:         row.title,
      description:   row.description,
      price:         row.price,
      thumbnail:     row.thumbnail,
      status:        row.status,
      created_at:    row.created_at,
      avg_rating:    row.avg_rating,
      reviews_count: row.reviews_count,
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
        u.full_name AS instructor_name,
        u.email     AS instructor_email,
        COALESCE(ROUND(AVG(rv.rating), 1), 0) AS avg_rating,
        COUNT(rv.id)                           AS reviews_count
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u        ON c.instructor_id = u.id
      LEFT JOIN reviews rv     ON rv.course_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khóa học',
      });
    }

    // Chỉ cho xem khóa học đã được duyệt (ngoại trừ admin và giảng viên sở hữu)
    if (row.status !== 'approved') {
      const user = req.user; // có thể undefined nếu chưa đăng nhập
      const isAdmin = user && user.role === 'admin';
      const isOwner = user && user.role === 'instructor' && user.id === row.instructor_id;
      if (!isAdmin && !isOwner) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khóa học',
        });
      }
    }

    const course = {
      id:            row.id,
      title:         row.title,
      description:   row.description,
      price:         row.price,
      thumbnail:     row.thumbnail,
      status:        row.status,
      created_at:    row.created_at,
      avg_rating:    row.avg_rating,
      reviews_count: row.reviews_count,
      category: {
        id:   row.category_id,
        name: row.category_name,
      },
      instructor: {
        id:        row.instructor_id,
        full_name: row.instructor_name,
        email:     row.instructor_email,
      },
    };

    return res.status(200).json({ success: true, data: course });
  } catch (err) {
    console.error('[getCourseById]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = { getCategories, getCourses, getCourseById };
