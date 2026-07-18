const Database = require('better-sqlite3');
const path = require('path');

// Tạo/kết nối file database.sqlite ở thư mục root của backend
const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
const db = new Database(dbPath);

// Bật foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Tạo toàn bộ bảng nếu chưa có
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student','instructor','admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','locked')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0,
    category_id INTEGER REFERENCES categories(id),
    instructor_id INTEGER NOT NULL REFERENCES users(id),
    thumbnail TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('pending','paid','cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id)
  );

  CREATE TABLE IF NOT EXISTS wishlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id)
  );
`);

// ── Thêm cột balance vào bảng users nếu chưa có ──────────────────────────────
const userColumns = db.prepare("PRAGMA table_info('users')").all();
if (!userColumns.find((col) => col.name === 'balance')) {
  db.exec(`ALTER TABLE users ADD COLUMN balance REAL NOT NULL DEFAULT 0`);
}

// ── Thêm cột is_active vào bảng users nếu chưa có ────────────────────────────
if (!userColumns.find((col) => col.name === 'is_active')) {
  db.exec(`ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`);
}

// ── Thêm cột avatar vào bảng users nếu chưa có ───────────────────────────────
if (!userColumns.find((col) => col.name === 'avatar')) {
  db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT NULL`);
}

// ── Thêm cột failed_login_attempts vào bảng users nếu chưa có ────────────────
if (!userColumns.find((col) => col.name === 'failed_login_attempts')) {
  db.exec(`ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0`);
}

// ── Thêm cột locked_until vào bảng users nếu chưa có ─────────────────────────
if (!userColumns.find((col) => col.name === 'locked_until')) {
  db.exec(`ALTER TABLE users ADD COLUMN locked_until TEXT DEFAULT NULL`);
}

// ── Thêm cột payment_method vào bảng orders nếu chưa có ──────────────────────
const orderColumns = db.prepare("PRAGMA table_info('orders')").all();
if (!orderColumns.find((col) => col.name === 'payment_method')) {
  db.exec(`ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT NULL`);
}

// ── Thêm cột coupon_id vào bảng orders nếu chưa có ───────────────────────────
if (!orderColumns.find((col) => col.name === 'coupon_id')) {
  db.exec(`ALTER TABLE orders ADD COLUMN coupon_id INTEGER DEFAULT NULL`);
}

// ── Tạo bảng wallet_transactions ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('deposit','payment','withdrawal','refund','income')),
    status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('pending','success','failed')),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Tạo bảng sections và lessons (nội dung khóa học) ─────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    video_url TEXT,
    duration INTEGER DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    is_preview INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Tạo bảng Q&A: lesson_questions và lesson_answers ─────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS lesson_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS lesson_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES lesson_questions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_instructor_answer INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Tạo bảng withdrawal_requests ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instructor_id INTEGER NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at TEXT
  );
`);

// ── Tạo bảng lesson_progress (theo dõi tiến độ học bài) ──────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS lesson_progress (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    lesson_id  INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    completed  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, lesson_id)
  );
`);

// ── Tạo bảng certificates (chứng chỉ hoàn thành khóa học) ────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS certificates (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    course_id        INTEGER NOT NULL REFERENCES courses(id),
    certificate_code TEXT NOT NULL UNIQUE,
    issued_at        TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id)
  );
`);

// ── Tạo bảng notifications ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    target_role TEXT,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'system',
    link        TEXT,
    created_by  INTEGER REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Tạo bảng notification_reads ───────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS notification_reads (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id INTEGER NOT NULL REFERENCES notifications(id),
    user_id         INTEGER NOT NULL REFERENCES users(id),
    read_at         TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(notification_id, user_id)
  );
`);

console.log('Database connected');

module.exports = db;
