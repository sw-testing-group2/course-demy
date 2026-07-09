/**
 * Middleware phân quyền theo role
 * Sử dụng: router.get('/...', authenticate, authorize('admin'), handler)
 * Sử dụng nhiều role: authorize('admin', 'instructor')
 *
 * @param {...string} roles - Danh sách role được phép truy cập
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này',
      });
    }
    next();
  };
}

module.exports = authorize;
