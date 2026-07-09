const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Middleware xác thực JWT
 * Đọc Authorization: Bearer <token>, xác thực và gán req.user
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Kiểm tra header có tồn tại và đúng format Bearer
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Không có token xác thực',
    });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn',
    });
  }

  // Kiểm tra user có tồn tại trong DB không
  const user = db
    .prepare('SELECT id, email, role, status, full_name FROM users WHERE id = ?')
    .get(decoded.id);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Tài khoản không tồn tại',
    });
  }

  // Kiểm tra tài khoản bị khóa
  if (user.status === 'locked') {
    return res.status(403).json({
      success: false,
      message: 'Tài khoản đã bị khóa',
    });
  }

  // Gán thông tin user vào request
  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    full_name: user.full_name,
  };

  next();
}

module.exports = authenticate;
