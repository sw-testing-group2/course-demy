const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const SALT_ROUNDS = 10;
const ALLOWED_ROLES = ['student', 'instructor'];

// ─── POST /api/auth/register ────────────────────────────────────────────────
function register(req, res) {
  const { full_name, email, password, role } = req.body;

  // Kiểm tra field bắt buộc
  if (!full_name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ thông tin: full_name, email, password, role',
    });
  }

  // Chỉ cho phép role student hoặc instructor
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Role không hợp lệ. Chỉ chấp nhận: student, instructor',
    });
  }

  // Kiểm tra email đã tồn tại chưa
  const existingUser = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email đã được sử dụng',
    });
  }

  // Hash password và tạo user
  try {
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

    const result = db
      .prepare(
        'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)'
      )
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

  // Kiểm tra field bắt buộc
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ email và password',
    });
  }

  // Kiểm tra email tồn tại
  const user = db
    .prepare('SELECT id, full_name, email, password, role, status FROM users WHERE email = ?')
    .get(email);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Email không tồn tại',
    });
  }

  // Kiểm tra tài khoản bị khóa
  if (user.status === 'locked') {
    return res.status(403).json({
      success: false,
      message: 'Tài khoản đã bị khóa',
    });
  }

  // Kiểm tra password
  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Mật khẩu không đúng',
    });
  }

  // Tạo JWT token
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
  // req.user đã được gán bởi authenticate middleware
  const user = db
    .prepare('SELECT id, full_name, email, role, status, created_at FROM users WHERE id = ?')
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

  // Phải có ít nhất một field để cập nhật
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
      .prepare('SELECT id, full_name, email, role FROM users WHERE id = ?')
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
