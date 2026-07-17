require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Kết nối database và tạo bảng khi khởi động
require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware cơ bản ─────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Serve static files ────────────────────────────────────────────────────
// Phục vụ frontend
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// Phục vụ ảnh upload qua /uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Routes ──────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth.routes');
const coursesRoutes    = require('./routes/courses.routes');
const cartRoutes       = require('./routes/cart.routes');
const orderRoutes      = require('./routes/order.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const instructorRoutes = require('./routes/instructor.routes');
const adminRoutes      = require('./routes/admin.routes');
const wishlistRoutes   = require('./routes/wishlist.routes');
const walletRoutes     = require('./routes/wallet.routes');
const paymentsRoutes   = require('./routes/payments.routes');
const qnaRoutes        = require('./routes/qna.routes');

app.use('/api/auth',        authRoutes);
app.use('/api/categories',  coursesRoutes);
app.use('/api/courses',     coursesRoutes);
app.use('/api/cart',        cartRoutes);
app.use('/api/orders',      orderRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/instructor',  instructorRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/wishlist',    wishlistRoutes);
app.use('/api/wallet',      walletRoutes);
app.use('/api/payments',    paymentsRoutes);
app.use('/api',             qnaRoutes);

// ─── Khởi động server ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
