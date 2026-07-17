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

console.log('Database connected');

module.exports = db;
