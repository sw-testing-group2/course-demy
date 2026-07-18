const db = require('../config/database');

// ══════════════════════════════════════════════════════════════════════════════
//  Helper: tạo thông báo hệ thống (dùng chung, tái sử dụng ở các module khác)
//  createSystemNotification({ user_id, target_role, title, content, link })
// ══════════════════════════════════════════════════════════════════════════════
function createSystemNotification({ user_id = null, target_role = null, title, content, link = null }) {
  db.prepare(`
    INSERT INTO notifications (user_id, target_role, title, content, type, link)
    VALUES (?, ?, ?, ?, 'system', ?)
  `).run(user_id, target_role, title, content, link);
}

// ── Hàm nội bộ: xây WHERE clause kiểm tra thông báo có áp dụng cho user ──────
// Trả về { sql, params }
// Điều kiện: (n.user_id = userId) OR (n.target_role = userRole) OR (n.user_id IS NULL AND n.target_role IS NULL)
function buildUserNotifWhere(userId, userRole) {
  const sql = `(
    n.user_id = ?
    OR n.target_role = ?
    OR (n.user_id IS NULL AND n.target_role IS NULL)
  )`;
  return { sql, params: [userId, userRole] };
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/admin/notifications
//  [authenticate + authorize('admin')]
// ══════════════════════════════════════════════════════════════════════════════
function sendAdminNotification(req, res) {
  const { title, content, target, user_id, link } = req.body;
  const adminId = req.user.id;

  // Validate bắt buộc
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo',
    });
  }

  const validTargets = ['all', 'student', 'instructor', 'admin', 'user'];
  if (!target || !validTargets.includes(target)) {
    return res.status(400).json({
      success: false,
      message: 'Target không hợp lệ (all | student | instructor | admin | user)',
    });
  }

  try {
    // Map target → (notif_user_id, target_role)
    let notifUserId   = null;
    let notifRole     = null;

    if (target === 'all') {
      notifUserId = null;
      notifRole   = null;
    } else if (target === 'user') {
      // Bắt buộc có user_id và user phải tồn tại
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn người dùng hợp lệ',
        });
      }
      const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(parseInt(user_id));
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Vui lòng chọn người dùng hợp lệ',
        });
      }
      notifUserId = parseInt(user_id);
      notifRole   = null;
    } else {
      // 'student' | 'instructor' | 'admin'
      notifUserId = null;
      notifRole   = target;
    }

    const result = db.prepare(`
      INSERT INTO notifications (user_id, target_role, title, content, type, link, created_by)
      VALUES (?, ?, ?, ?, 'admin', ?, ?)
    `).run(notifUserId, notifRole, title, content, link ?? null, adminId);

    const created = db.prepare(
      'SELECT id, title, content, target_role, user_id, created_at FROM notifications WHERE id = ?'
    ).get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Gửi thông báo thành công',
      data: {
        id:         created.id,
        title:      created.title,
        content:    created.content,
        target,
        created_at: created.created_at,
      },
    });
  } catch (err) {
    console.error('[sendAdminNotification]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/notifications
//  [authenticate + authorize('admin')]
// ══════════════════════════════════════════════════════════════════════════════
function getAdminNotifications(req, res) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const { total } = db.prepare(
      "SELECT COUNT(*) AS total FROM notifications WHERE type = 'admin'"
    ).get();

    const rows = db.prepare(`
      SELECT id, title, content, target_role, user_id, link, created_at
      FROM notifications
      WHERE type = 'admin'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return res.status(200).json({
      success: true,
      data: {
        notifications: rows,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[getAdminNotifications]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/notifications
//  [authenticate — mọi role]
// ══════════════════════════════════════════════════════════════════════════════
function getMyNotifications(req, res) {
  const userId   = req.user.id;
  const userRole = req.user.role;

  try {
    const page        = Math.max(1, parseInt(req.query.page)  || 1);
    const limit       = Math.max(1, parseInt(req.query.limit) || 10);
    const offset      = (page - 1) * limit;
    const unreadOnly  = req.query.unread_only === 'true';

    const { sql: whereSql, params: whereParams } = buildUserNotifWhere(userId, userRole);

    // Điều kiện unread (chưa có bản ghi trong notification_reads)
    const unreadCond = unreadOnly
      ? 'AND nr.id IS NULL'
      : '';

    // Đếm tổng theo điều kiện
    const countSql = `
      SELECT COUNT(*) AS total
      FROM notifications n
      LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      WHERE ${whereSql}
      ${unreadCond}
    `;
    const { total } = db.prepare(countSql).get(userId, ...whereParams);

    // Đếm unread_count (luôn đếm bất kể filter)
    const { unread_count } = db.prepare(`
      SELECT COUNT(*) AS unread_count
      FROM notifications n
      LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      WHERE ${whereSql}
      AND nr.id IS NULL
    `).get(userId, ...whereParams);

    // Lấy dữ liệu có phân trang
    const rows = db.prepare(`
      SELECT
        n.id,
        n.title,
        n.content,
        n.type,
        n.link,
        n.created_at,
        CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END AS is_read
      FROM notifications n
      LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      WHERE ${whereSql}
      ${unreadCond}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, ...whereParams, limit, offset);

    return res.status(200).json({
      success: true,
      data: {
        notifications: rows,
        unread_count,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[getMyNotifications]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/notifications/unread-count
//  [authenticate — mọi role]
// ══════════════════════════════════════════════════════════════════════════════
function getUnreadCount(req, res) {
  const userId   = req.user.id;
  const userRole = req.user.role;

  try {
    const { sql: whereSql, params: whereParams } = buildUserNotifWhere(userId, userRole);

    const { unread_count } = db.prepare(`
      SELECT COUNT(*) AS unread_count
      FROM notifications n
      LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      WHERE ${whereSql}
      AND nr.id IS NULL
    `).get(userId, ...whereParams);

    return res.status(200).json({
      success: true,
      data: { unread_count },
    });
  } catch (err) {
    console.error('[getUnreadCount]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PUT /api/notifications/:id/read
//  [authenticate — mọi role]
// ══════════════════════════════════════════════════════════════════════════════
function markAsRead(req, res) {
  const notifId  = parseInt(req.params.id);
  const userId   = req.user.id;
  const userRole = req.user.role;

  try {
    // Kiểm tra thông báo tồn tại và áp dụng cho user này
    const { sql: whereSql, params: whereParams } = buildUserNotifWhere(userId, userRole);

    const notif = db.prepare(`
      SELECT n.id
      FROM notifications n
      WHERE n.id = ? AND ${whereSql}
    `).get(notifId, ...whereParams);

    if (!notif) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền với thông báo này',
      });
    }

    // Insert or ignore (UNIQUE constraint sẽ bỏ qua nếu đã tồn tại)
    db.prepare(
      'INSERT OR IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)'
    ).run(notifId, userId);

    return res.status(200).json({ success: true, message: 'Đã đánh dấu đã đọc' });
  } catch (err) {
    console.error('[markAsRead]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PUT /api/notifications/read-all
//  [authenticate — mọi role]
// ══════════════════════════════════════════════════════════════════════════════
function markAllAsRead(req, res) {
  const userId   = req.user.id;
  const userRole = req.user.role;

  try {
    const { sql: whereSql, params: whereParams } = buildUserNotifWhere(userId, userRole);

    // Lấy toàn bộ thông báo áp dụng cho user mà chưa đọc
    const unreadNotifs = db.prepare(`
      SELECT n.id
      FROM notifications n
      LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      WHERE ${whereSql}
      AND nr.id IS NULL
    `).all(userId, ...whereParams);

    if (unreadNotifs.length === 0) {
      return res.status(200).json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
    }

    // Dùng transaction để insert hàng loạt
    const insertRead = db.prepare(
      'INSERT OR IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)'
    );

    const doMarkAll = db.transaction((notifIds) => {
      for (const { id } of notifIds) {
        insertRead.run(id, userId);
      }
    });

    doMarkAll(unreadNotifs);

    return res.status(200).json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
  } catch (err) {
    console.error('[markAllAsRead]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = {
  createSystemNotification,
  sendAdminNotification,
  getAdminNotifications,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
