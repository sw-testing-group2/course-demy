const bcrypt = require('bcrypt');
const db = require('../config/database');

const SALT_ROUNDS = 10;

// ─── GET /api/profile ────────────────────────────────────────────────────────
function getProfile(req, res) {
  const user = db
    .prepare(
      `SELECT id, full_name, email, role, avatar, is_active, created_at
       FROM users WHERE id = ?`
    )
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

// ─── PUT /api/profile/password ───────────────────────────────────────────────
function changePassword(req, res) {
  const { current_password, new_password, confirm_password } = req.body;

  // Kiểm tra đủ trường
  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập đầy đủ thông tin',
    });
  }

  // Độ dài tối thiểu
  if (new_password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
    });
  }

  // Xác nhận khớp
  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Xác nhận mật khẩu không khớp',
    });
  }

  // Lấy hash hiện tại từ DB
  const user = db
    .prepare('SELECT password FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài khoản',
    });
  }

  // Kiểm tra mật khẩu hiện tại
  const isCurrentValid = bcrypt.compareSync(current_password, user.password);
  if (!isCurrentValid) {
    return res.status(401).json({
      success: false,
      message: 'Mật khẩu hiện tại không đúng',
    });
  }

  // Mật khẩu mới không được trùng mật khẩu cũ
  const isSamePassword = bcrypt.compareSync(new_password, user.password);
  if (isSamePassword) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    });
  }

  try {
    const hashedNew = bcrypt.hashSync(new_password, SALT_ROUNDS);
    db.prepare('UPDATE users SET password = ? WHERE id = ?')
      .run(hashedNew, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (err) {
    console.error('[changePassword]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server, vui lòng thử lại',
    });
  }
}

// ─── PUT /api/profile/avatar ─────────────────────────────────────────────────
function updateAvatar(req, res) {
  const { avatar_url } = req.body;

  if (!avatar_url) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập link ảnh đại diện',
    });
  }

  // Validate URL hợp lệ
  try {
    const parsed = new URL(avatar_url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('invalid protocol');
    }
  } catch {
    return res.status(400).json({
      success: false,
      message: 'Link ảnh không hợp lệ',
    });
  }

  try {
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?')
      .run(avatar_url, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công',
      data: { avatar: avatar_url },
    });
  } catch (err) {
    console.error('[updateAvatar]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server, vui lòng thử lại',
    });
  }
}

module.exports = { getProfile, changePassword, updateAvatar };
