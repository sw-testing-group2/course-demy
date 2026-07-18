const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const SALT_ROUNDS = 10;
const ALLOWED_ROLES = ['student', 'instructor'];
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

// ─── POST /api/auth/register ────────────────────────────────────────────────
function register(req, res) {
  const { full_name, email, password, role } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ thông tin: full_name, email, password, role',
    });
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Role không hợp lệ. Chỉ chấp nhận: student, instructor',
    });
  }

  const existingUser = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email đã được sử dụng',
    });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

    const result = db
      .prepare('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)')
      .run(full_name, email, hashedPassword, role);

    const newUser = db
      .prepare('SELECT id, full_name, email, role FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: newUser,
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server, vui lòng thử lại',
    });
  }
}

// ─── POST /api/auth/login ────────────────────────────────────────────────────
function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ email và password',
    });
  }

  // Tìm user — dùng thông báo chung khi không tìm thấy để không lộ email
  const user = db
    .prepare(
      `SELECT id, full_name, email, password, role, status, is_active,
              failed_login_attempts, locked_until
       FROM users WHERE email = ?`
    )
    .get(email);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Email hoặc mật khẩu không đúng',
    });
  }

  const now = new Date();

  // ── Kiểm tra khoá tạm thời do brute-force ──────────────────────────────────
  if (user.locked_until) {
    const lockedUntil = new Date(user.locked_until);

    if (lockedUntil > now) {
      const remainingMs = lockedUntil - now;
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      return res.status(423).json({
        success: false,
        message: `Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút`,
        data: {
          locked_until: user.locked_until,
          remaining_seconds: remainingSeconds,
        },
      });
    }

    // Khoá đã hết hạn — reset đếm
    db.prepare(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`
    ).run(user.id);
    user.failed_login_attempts = 0;
    user.locked_until = null;
  }

  // ── Kiểm tra tài khoản bị khoá thủ công bởi admin ────────────────────────
  if (user.status === 'locked' || user.is_active === 0) {
    return res.status(403).json({
      success: false,
      message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên',
    });
  }

  // ── Kiểm tra mật khẩu ─────────────────────────────────────────────────────
  const isPasswordValid = bcrypt.compareSync(password, user.password);

  if (!isPasswordValid) {
    const newAttempts = (user.failed_login_attempts || 0) + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      // Đạt ngưỡng — khoá tài khoản 5 phút
      const lockUntilDate = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
      const lockUntilISO = lockUntilDate.toISOString().replace('T', ' ').slice(0, 19);

      db.prepare(
        `UPDATE users SET failed_login_attempts = 0, locked_until = ? WHERE id = ?`
      ).run(lockUntilISO, user.id);

      return res.status(423).json({
        success: false,
        message: `Bạn đã nhập sai mật khẩu quá ${MAX_ATTEMPTS} lần. Tài khoản đã bị khóa tạm thời trong ${LOCK_MINUTES} phút`,
        data: {
          locked_until: lockUntilISO,
          remaining_seconds: LOCK_MINUTES * 60,
        },
      });
    }

    // Chưa đạt ngưỡng — tăng bộ đếm
    db.prepare(
      `UPDATE users SET failed_login_attempts = ? WHERE id = ?`
    ).run(newAttempts, user.id);

    const remaining = MAX_ATTEMPTS - newAttempts;
    return res.status(401).json({
      success: false,
      message: `Email hoặc mật khẩu không đúng. Còn lại ${remaining} lần thử trước khi tài khoản bị khóa`,
    });
  }

  // ── Mật khẩu đúng — reset brute-force counter ────────────────────────────
  db.prepare(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`
  ).run(user.id);

  // Tạo JWT
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.status(200).json({
    success: true,
    message: 'Đăng nhập thành công',
    data: {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    },
  });
}

// ─── GET /api/auth/me ───────────────────────────────────────────────────────
function getMe(req, res) {
  const user = db
    .prepare('SELECT id, full_name, email, role, status, avatar, created_at FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài khoản',
    });
  }

  return res.status(200).json({
    success: true,
    data: user,
  });
}

// ─── PUT /api/auth/profile ──────────────────────────────────────────────────
function updateProfile(req, res) {
  const { full_name } = req.body;

  if (!full_name) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp thông tin cần cập nhật (full_name)',
    });
  }

  try {
    db.prepare('UPDATE users SET full_name = ? WHERE id = ?')
      .run(full_name, req.user.id);

    const updated = db
      .prepare('SELECT id, full_name, email, role, avatar FROM users WHERE id = ?')
      .get(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      data: updated,
    });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server, vui lòng thử lại',
    });
  }
}

module.exports = { register, login, getMe, updateProfile };
