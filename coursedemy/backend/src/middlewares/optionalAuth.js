const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Optional Auth middleware
 * Nếu có Bearer token hợp lệ → gán req.user
 * Nếu không có hoặc token lỗi → bỏ qua (req.user = null), tiếp tục next()
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    req.user = null;
    return next();
  }

  const user = db
    .prepare('SELECT id, email, role, status, full_name FROM users WHERE id = ?')
    .get(decoded.id);

  if (!user || user.status === 'locked') {
    req.user = null;
    return next();
  }

  req.user = {
    id:        user.id,
    email:     user.email,
    role:      user.role,
    status:    user.status,
    full_name: user.full_name,
  };

  next();
}

module.exports = optionalAuth;
