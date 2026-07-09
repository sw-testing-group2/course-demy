# TASK PROMPTS — COURSEDEMY

> Sử dụng từng prompt dưới đây để giao việc cho AI. Copy toàn bộ nội dung mỗi task và dán vào chat với AI.
> Thực hiện theo thứ tự: Task 0 → 1 → 2 → 3 → 4 → 5 → 6.

---

## TASK 0 — Khởi tạo dự án & Cơ sở dữ liệu

```
Hãy khởi tạo dự án backend cho website bán khóa học "CourseDemy" theo đúng yêu cầu sau:

## Công nghệ
- Node.js + Express.js
- SQLite làm database, dùng thư viện `better-sqlite3` (synchronous, không cần async/await cho DB)
- Các package cần cài: express, better-sqlite3, jsonwebtoken, bcrypt, dotenv, multer, cors

## Cấu trúc thư mục cần tạo
coursedemy/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js      # kết nối SQLite, tạo bảng nếu chưa có
│   │   ├── middlewares/          # để trống, sẽ làm ở task sau
│   │   ├── routes/               # để trống, sẽ làm ở task sau
│   │   ├── controllers/          # để trống, sẽ làm ở task sau
│   │   └── app.js               # setup Express, mount middleware cơ bản (cors, json)
│   ├── seed.js                  # seed dữ liệu mẫu
│   ├── .env                     # PORT=3000, JWT_SECRET=coursedemy_secret_key
│   ├── .gitignore               # node_modules, database.sqlite, .env
│   └── package.json
└── frontend/                    # thư mục rỗng, sẽ làm sau

## Yêu cầu database.js
File này phải:
1. Tạo/kết nối file `database.sqlite` ở thư mục root của backend
2. Chạy CREATE TABLE IF NOT EXISTS cho toàn bộ 7 bảng:

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

## Yêu cầu seed.js
File này chạy độc lập bằng `node seed.js`. Khi chạy:
1. Xóa toàn bộ dữ liệu cũ (DELETE FROM theo thứ tự đảm bảo không lỗi FK)
2. Insert dữ liệu mẫu:

Users (password hash bằng bcrypt, saltRounds=10):
- Admin: full_name="Admin CourseDemy", email="admin@coursedemy.com", password="admin123", role="admin"
- Instructor 1: full_name="Tran Thi Instructor", email="instructor1@example.com", password="123456", role="instructor"
- Instructor 2: full_name="Le Van Instructor", email="instructor2@example.com", password="123456", role="instructor"
- Student 1: full_name="Nguyen Van Student", email="student1@example.com", password="123456", role="student"
- Student 2: full_name="Pham Thi Student", email="student2@example.com", password="123456", role="student"
- Student 3: full_name="Hoang Van Student", email="student3@example.com", password="123456", role="student"

Categories:
- "Lập trình" — "Các khóa học về lập trình và phát triển phần mềm"
- "Thiết kế" — "Các khóa học về UI/UX và đồ họa"
- "Ngoại ngữ" — "Các khóa học học tiếng Anh, Nhật, Hàn"
- "Kinh doanh" — "Các khóa học về kinh doanh và khởi nghiệp"

Courses:
- "Lập trình Python cơ bản" | instructor1 | Lập trình | 299000 | approved
- "JavaScript từ A-Z" | instructor1 | Lập trình | 399000 | approved
- "Thiết kế UI/UX với Figma" | instructor2 | Thiết kế | 249000 | approved
- "Tiếng Anh giao tiếp B1" | instructor2 | Ngoại ngữ | 199000 | approved
- "Khởi nghiệp từ ý tưởng" | instructor1 | Kinh doanh | 0 | approved
- "Docker cho người mới" | instructor1 | Lập trình | 150000 | pending
- "Marketing Online cơ bản" | instructor2 | Kinh doanh | 99000 | pending

## Yêu cầu app.js
- Import và chạy database.js khi khởi động (đảm bảo bảng đã tạo)
- Dùng cors(), express.json()
- Serve static files từ thư mục `../frontend`
- Serve `/uploads` static để truy cập ảnh upload
- Chạy server trên PORT từ .env (default 3000)
- Log ra console: "Server running on port 3000" và "Database connected"

## Output mong đợi
- Toàn bộ source code đầy đủ, có thể chạy ngay: npm install → node seed.js → node src/app.js
- Khi chạy seed.js: log ra số records đã insert
```

---

## TASK 1 — Auth & Middleware phân quyền

```
Tiếp tục dự án CourseDemy. Đã có sẵn: project Node.js + Express, SQLite với đủ 7 bảng và dữ liệu seed.

Yêu cầu: Code module Auth và các Middleware phân quyền.

## Công nghệ
- Express.js, better-sqlite3 (synchronous)
- jsonwebtoken (JWT, expiry: 7d, secret từ process.env.JWT_SECRET)
- bcrypt (so sánh password hash)

## Chuẩn response (BẮT BUỘC áp dụng cho mọi API)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }
HTTP status: 200/201 (OK/Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Server Error)

## Files cần tạo

### src/middlewares/authenticate.js
- Đọc header Authorization: Bearer <token>
- Không có token → 401 { success: false, message: "Không có token xác thực" }
- Token không hợp lệ/hết hạn → 401 { success: false, message: "Token không hợp lệ hoặc đã hết hạn" }
- User trong token không tồn tại trong DB → 401 { success: false, message: "Tài khoản không tồn tại" }
- User bị locked → 403 { success: false, message: "Tài khoản đã bị khóa" }
- Hợp lệ → gán req.user = { id, email, role, status, full_name } rồi next()

### src/middlewares/authorize.js
- Export function: authorize(...roles)
- Dùng: router.get('/...', authenticate, authorize('admin'), handler)
- Sai role → 403 { success: false, message: "Bạn không có quyền thực hiện thao tác này" }

### src/routes/auth.routes.js + src/controllers/auth.controller.js

POST /api/auth/register [Public]
- Body: { full_name (required), email (required), password (required), role (required: 'student' hoặc 'instructor') }
- Thiếu field → 400
- role='admin' hoặc không hợp lệ → 400 { message: "Role không hợp lệ" }
- Email đã tồn tại → 409 { message: "Email đã được sử dụng" }
- Hash password bcrypt saltRounds=10
- Response 201: { success: true, message: "Đăng ký thành công", data: { id, full_name, email, role } }

POST /api/auth/login [Public]
- Body: { email (required), password (required) }
- Thiếu field → 400
- Email không tồn tại → 404 { message: "Email không tồn tại" }
- Sai password → 401 { message: "Mật khẩu không đúng" }
- Tài khoản bị locked → 403 { message: "Tài khoản đã bị khóa" }
- Response 200: { success: true, data: { token, user: { id, full_name, email, role, status } } }
- JWT payload: { id, email, role }

GET /api/auth/me [authenticate required]
- Response 200: { success: true, data: { id, full_name, email, role, status, created_at } }

PUT /api/auth/profile [authenticate required]
- Body: { full_name } — optional
- Response 200: { success: true, message: "Cập nhật hồ sơ thành công", data: { id, full_name, email, role } }

### Mount vào app.js
app.use('/api/auth', authRoutes)
```

---

## TASK 2 — Module Courses & Categories (Public)

```
Tiếp tục dự án CourseDemy. Đã có sẵn: Express app, SQLite, middleware authenticate và authorize.

Yêu cầu: Code module Courses (public) và Categories.

## Chuẩn response (BẮT BUỘC)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }

## Schema liên quan
- courses: id, title, description, price, category_id, instructor_id, thumbnail, status, created_at
- categories: id, name, description
- users: id, full_name, email, role

## Endpoints cần implement

GET /api/categories [Public]
- Trả toàn bộ danh mục
- Response 200: { success: true, data: [ { id, name, description } ] }

GET /api/courses [Public]
- Query params (tất cả optional): search, category_id, minPrice, maxPrice, page (default 1), limit (default 10)
- CHỈ trả courses có status = 'approved'
- Mỗi course JOIN: category: { id, name } và instructor: { id, full_name }
- Response 200: { success: true, data: { courses: [...], total, page, totalPages } }

GET /api/courses/:id [Public]
- Trả chi tiết 1 khóa học (bất kể status — để instructor/admin xem được)
- JOIN category và instructor
- Không tìm thấy → 404 { success: false, message: "Không tìm thấy khóa học" }
- Response 200: { success: true, data: { id, title, description, price, thumbnail, status, created_at, category, instructor } }

### Mount vào app.js
app.use('/api/categories', coursesRoutes)
app.use('/api/courses', coursesRoutes)

## Lưu ý kỹ thuật
- Dùng better-sqlite3 (synchronous), không async/await cho DB
- Parameterized queries
- Xây dựng WHERE clause động cho filter/search
- Dùng COUNT(*) riêng để tính total trước khi LIMIT/OFFSET
```

---

## TASK 3 — Giỏ hàng & Thanh toán (Student)

```
Tiếp tục dự án CourseDemy. Đã có sẵn: Auth middleware, module courses/categories.

Yêu cầu: Code module Cart, Orders, Enrollments cho Student.

## Chuẩn response (BẮT BUỘC)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }

## Schema liên quan
- cart_items: id, user_id, course_id, created_at | UNIQUE(user_id, course_id)
- orders: id, user_id, total_amount, status, created_at
- order_items: id, order_id, course_id, price
- enrollments: id, user_id, course_id, enrolled_at | UNIQUE(user_id, course_id)
- courses: id, title, price, thumbnail, instructor_id, status

## Endpoints cần implement

GET /api/cart [Student - authenticate + authorize('student')]
- Lấy giỏ hàng của req.user.id
- JOIN course info + instructor
- Response 200: { success: true, data: [ { id, created_at, course: { id, title, price, thumbnail, instructor: { full_name } } } ] }

POST /api/cart [Student]
- Body: { course_id (required) }
- course không tồn tại hoặc status!='approved' → 404 "Khóa học không tồn tại hoặc chưa được duyệt"
- Đã có trong enrollments → 409 "Bạn đã sở hữu khóa học này"
- Đã có trong cart_items → 409 "Khóa học đã có trong giỏ hàng"
- Response 201: { success: true, message: "Đã thêm vào giỏ hàng" }

DELETE /api/cart/:courseId [Student]
- Không tìm thấy item → 404 "Không tìm thấy khóa học trong giỏ hàng"
- Response 200: { success: true, message: "Đã xóa khỏi giỏ hàng" }

POST /api/orders/checkout [Student]
- Lấy toàn bộ cart của user
- Giỏ rỗng → 400 { success: false, message: "Giỏ hàng trống" }
- Dùng DB transaction (db.transaction):
  1. INSERT vào orders (status='paid')
  2. INSERT từng course vào order_items (price = giá tại thời điểm mua)
  3. INSERT OR IGNORE từng course vào enrollments
  4. DELETE toàn bộ cart_items của user
- Response 201: { success: true, message: "Thanh toán thành công", data: { order_id, total_amount, status: "paid", items: [ { course_id, title, price } ] } }

GET /api/orders [Student]
- Lịch sử đơn hàng của user, mới nhất trước
- Mỗi order có mảng items (JOIN order_items + courses)
- Response 200: { success: true, data: [ { id, total_amount, status, created_at, items: [...] } ] }

GET /api/enrollments [Student]
- Danh sách khóa học đã mua
- JOIN course + instructor
- Response 200: { success: true, data: [ { id, enrolled_at, course: { id, title, thumbnail, instructor: { full_name } } } ] }

### Mount vào app.js
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/enrollments', enrollmentRoutes)

## Lưu ý
- Dùng better-sqlite3 transaction: db.transaction(fn)() cho checkout
- INSERT OR IGNORE cho enrollments
```

---

## TASK 4 — Module Instructor

```
Tiếp tục dự án CourseDemy. Đã có sẵn: Auth middleware, modules courses/cart/orders.

Yêu cầu: Code module Instructor (CRUD khóa học, xem học viên).

## Chuẩn response (BẮT BUỘC)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }

## Endpoints — tất cả yêu cầu: authenticate + authorize('instructor')

GET /api/instructor/courses
- Lấy courses của instructor đang đăng nhập (WHERE instructor_id = req.user.id)
- JOIN category
- Response 200: { success: true, data: [ { id, title, price, status, thumbnail, created_at, category: { id, name } } ] }

POST /api/instructor/courses
- Body: { title (required), description, price (default 0), category_id, thumbnail }
- title rỗng → 400
- category_id được truyền nhưng không tồn tại → 404 "Danh mục không tồn tại"
- Tạo course với instructor_id = req.user.id, status = 'pending'
- Response 201: { success: true, message: "Tạo khóa học thành công, đang chờ duyệt", data: { id, title, status, created_at } }

PUT /api/instructor/courses/:id
- course không tồn tại → 404
- course không thuộc instructor → 403 "Bạn không có quyền chỉnh sửa khóa học này"
- Body (tất cả optional): { title, description, price, category_id, thumbnail }
- Chỉ update các field được gửi lên
- Response 200: { success: true, message: "Cập nhật khóa học thành công", data: { id, title, description, price, status, thumbnail } }

DELETE /api/instructor/courses/:id
- course không tồn tại → 404
- course không thuộc instructor → 403 "Bạn không có quyền xóa khóa học này"
- Xóa course + cart_items liên quan
- Response 200: { success: true, message: "Đã xóa khóa học" }

GET /api/instructor/courses/:id/students
- course không tồn tại → 404
- course không thuộc instructor → 403
- JOIN enrollments + users
- Response 200: { success: true, data: [ { id, full_name, email, enrolled_at } ] }

### Mount vào app.js
app.use('/api/instructor', instructorRoutes)
```

---

## TASK 5 — Module Admin

```
Tiếp tục dự án CourseDemy. Đã có sẵn: Auth middleware, modules courses/cart/orders/instructor.

Yêu cầu: Code module Admin (duyệt khóa học, quản lý user, quản lý category).

## Chuẩn response (BẮT BUỘC)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }

## Endpoints — tất cả yêu cầu: authenticate + authorize('admin')

GET /api/admin/courses/pending
- Lấy courses status='pending', JOIN instructor + category
- Response 200: { success: true, data: [ { id, title, price, created_at, instructor: { id, full_name, email }, category: { id, name } } ] }

PUT /api/admin/courses/:id/approve
- course không tồn tại → 404
- status != 'pending' → 400 "Khóa học không ở trạng thái chờ duyệt"
- Cập nhật status = 'approved'
- Response 200: { success: true, message: "Đã phê duyệt khóa học" }

PUT /api/admin/courses/:id/reject
- Body: { reason } (optional)
- course không tồn tại → 404
- status != 'pending' → 400 "Khóa học không ở trạng thái chờ duyệt"
- Cập nhật status = 'rejected'
- Response 200: { success: true, message: "Đã từ chối khóa học" }

GET /api/admin/users
- Query params (optional): role, status
- Trả danh sách users, mới nhất trước, KHÔNG trả field password
- Response 200: { success: true, data: [ { id, full_name, email, role, status, created_at } ] }

PUT /api/admin/users/:id/lock
- user không tồn tại → 404
- user.role = 'admin' → 400 "Không thể khóa tài khoản admin"
- Toggle: active→locked, locked→active
- Response 200: { success: true, message: "Đã khóa tài khoản" / "Đã mở khóa tài khoản", data: { id, status } }

POST /api/admin/categories
- Body: { name (required), description }
- Thiếu name → 400
- Trùng tên → 409 "Tên danh mục đã tồn tại"
- Response 201: { success: true, message: "Tạo danh mục thành công", data: { id, name, description } }

PUT /api/admin/categories/:id
- Body: { name, description } (optional)
- Không tìm thấy → 404
- Tên mới trùng danh mục khác → 409
- Response 200: { success: true, message: "Cập nhật danh mục thành công", data: { id, name, description } }

DELETE /api/admin/categories/:id
- Không tìm thấy → 404
- Có courses đang dùng category này → 400 "Không thể xóa danh mục đang có khóa học"
- Response 200: { success: true, message: "Đã xóa danh mục" }

### Mount vào app.js
app.use('/api/admin', adminRoutes)
```

---

## TASK 6 — Frontend HTML thuần

```
Tiếp tục dự án CourseDemy. Backend đã hoàn chỉnh với các API sau (base URL: http://localhost:3000):

Auth: POST /api/auth/register | POST /api/auth/login | GET /api/auth/me | PUT /api/auth/profile
Public: GET /api/courses | GET /api/courses/:id | GET /api/categories
Student: GET|POST|DELETE /api/cart | POST /api/orders/checkout | GET /api/orders | GET /api/enrollments
Instructor: GET|POST /api/instructor/courses | PUT|DELETE /api/instructor/courses/:id | GET /api/instructor/courses/:id/students
Admin: GET /api/admin/courses/pending | PUT /api/admin/courses/:id/approve | PUT /api/admin/courses/:id/reject | GET /api/admin/users | PUT /api/admin/users/:id/lock | POST|PUT|DELETE /api/admin/categories/:id

Chuẩn response: { success: true/false, message: "...", data: {...} }
Token lưu localStorage key "token", user info lưu key "user" (JSON.stringify).

Yêu cầu: Xây dựng toàn bộ frontend HTML thuần (không dùng framework).

## Cấu trúc thư mục frontend/
frontend/
├── index.html
├── login.html
├── register.html
├── course.html              # ?id=X
├── cart.html
├── checkout.html
├── my-courses.html
├── profile.html
├── instructor.html
├── instructor-course-form.html   # ?id=X nếu edit
├── instructor-students.html      # ?courseId=X
├── admin.html
├── admin-courses.html
├── admin-users.html
├── admin-categories.html
├── css/style.css
└── js/api.js

## Yêu cầu js/api.js
const API_BASE = 'http://localhost:3000/api';

Cần implement:
- apiFetch(endpoint, options): fetch wrapper tự thêm Authorization Bearer header nếu có token
- getToken(), getUser(), setAuth(token, user), clearAuth(), isLoggedIn()
- requireAuth(redirectTo): redirect nếu chưa đăng nhập
- requireRole(role): redirect nếu không đúng role

## Yêu cầu từng trang

index.html (Trang chủ — Public)
- Navbar: logo + đăng nhập/đăng ký (chưa login) hoặc tên user + nút logout (đã login)
- Thanh tìm kiếm theo tên
- Dropdown lọc theo category (GET /api/categories)
- Grid khóa học (GET /api/courses): thumbnail, title, instructor name, price, nút "Xem chi tiết"
- Phân trang đơn giản (Prev/Next)

login.html
- Form: email + password
- Đã đăng nhập → redirect trang chủ
- Login thành công → lưu token + user, redirect theo role (student/instructor → /, admin → /admin.html)
- Link "Chưa có tài khoản? Đăng ký"

register.html
- Form: full_name + email + password + role (radio: Học viên / Giảng viên)
- Thành công → redirect login.html

course.html?id=X
- GET /api/courses/:id
- Hiển thị: thumbnail, title, instructor, category, price, description
- Chưa login: nút "Đăng nhập để mua"
- Đã login (student): nút "Thêm vào giỏ hàng" → POST /api/cart
- Đã enroll: hiển thị "Bạn đã sở hữu khóa học này"

cart.html [Student only]
- GET /api/cart
- Danh sách: thumbnail, title, price, nút xóa (DELETE /api/cart/:courseId)
- Tổng tiền
- Nút "Thanh toán ngay" → redirect checkout.html

checkout.html [Student only]
- GET /api/cart để hiển thị tóm tắt
- Tổng tiền
- Nút "Xác nhận thanh toán" → POST /api/orders/checkout → redirect my-courses.html

my-courses.html [Student only]
- GET /api/enrollments → grid khóa học đã mua

profile.html [Logged in]
- GET /api/auth/me
- Form sửa full_name → PUT /api/auth/profile

instructor.html [Instructor only]
- GET /api/instructor/courses
- Bảng: title, category, price, status (badge màu: pending=vàng, approved=xanh, rejected=đỏ)
- Nút Sửa, Xóa, Xem học viên
- Nút "Tạo khóa học mới"

instructor-course-form.html?id=X [Instructor only]
- Có ?id=X → load GET /api/courses/:id vào form (edit mode)
- Không có id → form trống (create mode)
- Form: title, description, price, category_id (select từ API categories), thumbnail (text)
- Submit → POST hoặc PUT → redirect instructor.html

instructor-students.html?courseId=X [Instructor only]
- GET /api/instructor/courses/:id/students
- Bảng: full_name, email, enrolled_at

admin.html [Admin only]
- Hiển thị số courses pending
- Links đến các trang quản lý

admin-courses.html [Admin only]
- GET /api/admin/courses/pending
- Bảng: title, instructor, category, price, created_at
- Nút "Duyệt" → PUT /api/admin/courses/:id/approve
- Nút "Từ chối" → confirm → PUT /api/admin/courses/:id/reject

admin-users.html [Admin only]
- GET /api/admin/users
- Bộ lọc role + status
- Bảng: full_name, email, role, status (badge), created_at
- Nút "Khóa/Mở khóa" → PUT /api/admin/users/:id/lock (ẩn với admin)

admin-categories.html [Admin only]
- GET /api/categories → bảng danh mục
- Nút "Thêm mới" → modal form
- Nút "Sửa" → modal form điền sẵn
- Nút "Xóa" → confirm → DELETE

## Yêu cầu UI chung
- CSS thuần trong style.css, có navbar chung dùng JS inject
- Responsive cơ bản
- Hiển thị thông báo lỗi/thành công rõ ràng (không chỉ dùng alert)
- Spinner khi gọi API
- Màu sắc nhất quán
```

---

> **Lưu ý khi dùng prompts:**
> - Thực hiện theo thứ tự Task 0 → 1 → 2 → 3 → 4 → 5 → 6
> - Sau mỗi task, test bằng Postman để xác nhận trước khi làm task tiếp theo
> - Nếu AI trả lời không đầy đủ, nhắc: "Hãy hoàn thiện toàn bộ, bao gồm file X còn thiếu"
> - Khi giao Task 6, có thể thêm yêu cầu màu sắc/font cụ thể nếu muốn style riêng
