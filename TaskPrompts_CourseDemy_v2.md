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

---

## TASK 7 — Coupon giảm giá

```
Tiếp tục dự án CourseDemy. Đã có sẵn: Auth middleware, modules courses/cart/orders/instructor/admin (Task 0-5).

Yêu cầu: Code module Coupon giảm giá (Admin quản lý, Student áp dụng khi checkout).

## Chuẩn response (BẮT BUỘC)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }

## Migration database.js — thêm bảng và cột mới
Thêm vào file src/config/database.js (chạy CREATE TABLE IF NOT EXISTS + kiểm tra cột đã tồn tại chưa trước khi ALTER, vì SQLite không hỗ trợ "ADD COLUMN IF NOT EXISTS"):

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK(discount_type IN ('percent','fixed')),
  discount_value REAL NOT NULL,
  max_discount REAL,
  min_order_amount REAL NOT NULL DEFAULT 0,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Thêm cột vào bảng orders nếu chưa có (dùng PRAGMA table_info(orders) để kiểm tra trước khi ALTER):
ALTER TABLE orders ADD COLUMN coupon_id INTEGER REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;

## Files cần tạo

### src/routes/coupons.routes.js + src/controllers/coupons.controller.js

POST /api/admin/coupons [authenticate + authorize('admin')]
- Body: { code (required), description, discount_type (required: 'percent'|'fixed'), discount_value (required), max_discount, min_order_amount (default 0), usage_limit, valid_from (required), valid_to (required) }
- Thiếu field bắt buộc → 400
- discount_type không hợp lệ → 400 "discount_type không hợp lệ"
- code đã tồn tại (không phân biệt hoa thường, tự động uppercase code trước khi lưu) → 409 "Mã coupon đã tồn tại"
- Response 201: { success: true, message: "Tạo coupon thành công", data: { id, code, status: "active" } }

GET /api/admin/coupons [authenticate + authorize('admin')]
- Query param optional: status
- Response 200: { success: true, data: [ { id, code, description, discount_type, discount_value, max_discount, min_order_amount, usage_limit, used_count, valid_from, valid_to, status, created_at } ] }

PUT /api/admin/coupons/:id [authenticate + authorize('admin')]
- Body: tất cả field optional (như trên, thêm status: 'active'|'inactive')
- Không tìm thấy → 404
- code mới trùng coupon khác → 409
- Response 200: { success: true, message: "Cập nhật coupon thành công", data: {...} }

DELETE /api/admin/coupons/:id [authenticate + authorize('admin')]
- Không tìm thấy → 404
- Response 200: { success: true, message: "Đã xóa coupon" }

POST /api/coupons/validate [authenticate + authorize('student')]
- Body: { code (required) }
- Lấy giỏ hàng hiện tại của req.user.id, tính subtotal = SUM(course.price)
- Giỏ hàng trống → 400 "Giỏ hàng trống"
- code không tồn tại (so sánh uppercase) → 404 "Mã giảm giá không tồn tại"
- status='inactive' → 400 "Mã giảm giá đã bị vô hiệu hóa"
- now ngoài khoảng [valid_from, valid_to] → 400 "Mã giảm giá đã hết hạn hoặc chưa có hiệu lực"
- usage_limit không null và used_count >= usage_limit → 400 "Mã giảm giá đã hết lượt sử dụng"
- subtotal < min_order_amount → 400 "Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã này"
- Tính discount_amount:
  - discount_type='fixed': discount_amount = min(discount_value, subtotal)
  - discount_type='percent': discount_amount = subtotal * discount_value / 100, nếu có max_discount thì discount_amount = min(discount_amount, max_discount)
- Response 200: { success: true, data: { code, subtotal, discount_amount, total_amount: subtotal - discount_amount } }

### Cập nhật src/controllers/orders.controller.js — sửa hàm checkout hiện có
- Body checkout giờ nhận thêm: { coupon_code } (optional)
- Nếu có coupon_code: chạy lại toàn bộ logic validate ở trên (không gọi lại API, viết hàm dùng chung validateCoupon(userId, code, subtotal))
- Nếu hợp lệ: lưu coupon_id + discount_amount vào order khi tạo, total_amount = subtotal - discount_amount
- Nếu coupon không hợp lệ: trả lỗi tương ứng, KHÔNG tạo order
- LƯU Ý: việc tăng used_count của coupon sẽ làm ở bước xác nhận thanh toán thành công (Task 10), KHÔNG tăng ở bước checkout này

### Mount vào app.js
app.use('/api/admin/coupons', couponsRoutes)
app.use('/api/coupons', couponsRoutes)

## Output mong đợi
- Code đầy đủ, chạy được ngay với database.sqlite hiện có (viết migration an toàn, không lỗi khi chạy lại nhiều lần)
```

---

## TASK 8 — Nội dung khóa học: Chương / Bài học / Quiz (phía Instructor)

```
Tiếp tục dự án CourseDemy. Đã có sẵn: Auth middleware, modules courses/instructor (Task 0-5).

Yêu cầu: Code module quản lý nội dung khóa học — Chương (section), Bài học (lesson: video/content/quiz), Câu hỏi quiz — dành cho Instructor.

## Chuẩn response (BẮT BUỘC)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }

## Migration database.js — thêm bảng mới

CREATE TABLE IF NOT EXISTS course_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES course_sections(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('video','content','quiz')),
  video_url TEXT,
  content_body TEXT,
  duration_seconds INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  is_preview INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id),
  question_text TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

## Files cần tạo: src/routes/content.routes.js + src/controllers/content.controller.js

Tất cả endpoint dưới đây yêu cầu: authenticate + authorize('instructor'), VÀ course/section/lesson/question liên quan phải thuộc về req.user.id (instructor_id của course) — nếu không → 403 "Bạn không có quyền thao tác trên nội dung này"; không tồn tại → 404.

GET /api/instructor/courses/:courseId/sections
- Trả toàn bộ sections (order by position) của course, mỗi section kèm mảng lessons (order by position), mỗi lesson nếu type='quiz' thì kèm mảng questions (order by position) — bao gồm cả correct_index (vì đây là phía instructor, được phép thấy đáp án)
- Response 200: { success: true, data: [ { id, title, position, lessons: [ { id, title, type, video_url, content_body, duration_seconds, position, is_preview, questions: [...] } ] } ] }

POST /api/instructor/courses/:courseId/sections
- Body: { title (required), position (default: số section hiện có) }
- Response 201: { success: true, message: "Tạo chương thành công", data: { id, title, position } }

PUT /api/instructor/sections/:id
- Body optional: { title, position }
- Response 200: { success: true, message: "Cập nhật chương thành công", data: {...} }

DELETE /api/instructor/sections/:id
- Dùng transaction: xóa quiz_questions của các lesson thuộc section, xóa lesson_progress liên quan, xóa lessons, cuối cùng xóa section
- Response 200: { success: true, message: "Đã xóa chương" }

POST /api/instructor/sections/:sectionId/lessons
- Body: { title (required), type (required: 'video'|'content'|'quiz'), video_url, content_body, duration_seconds, is_preview (default false), position (default: số lesson hiện có trong section) }
- title hoặc type thiếu/sai → 400
- course_id lấy tự động từ section.course_id
- Response 201: { success: true, message: "Tạo bài học thành công", data: { id, title, type, position } }

PUT /api/instructor/lessons/:id
- Body optional: { title, video_url, content_body, duration_seconds, is_preview, position } (KHÔNG cho đổi type sau khi tạo, để tránh dữ liệu quiz mồ côi)
- Response 200: { success: true, message: "Cập nhật bài học thành công", data: {...} }

DELETE /api/instructor/lessons/:id
- Transaction: xóa quiz_questions, lesson_progress liên quan, rồi xóa lesson
- Response 200: { success: true, message: "Đã xóa bài học" }

POST /api/instructor/lessons/:lessonId/questions
- Kiểm tra lesson.type phải là 'quiz', nếu không → 400 "Bài học này không phải dạng quiz"
- Body: { question_text (required), options (required, mảng string tối thiểu 2 phần tử), correct_index (required, số nguyên) }
- correct_index không nằm trong khoảng [0, options.length-1] → 400 "correct_index không hợp lệ"
- Lưu options dưới dạng JSON.stringify vào cột options
- Response 201: { success: true, message: "Thêm câu hỏi thành công", data: { id, question_text, options, correct_index } }

PUT /api/instructor/questions/:id
- Body optional: { question_text, options, correct_index, position }
- Response 200: { success: true, message: "Cập nhật câu hỏi thành công", data: {...} }

DELETE /api/instructor/questions/:id
- Response 200: { success: true, message: "Đã xóa câu hỏi" }

### Mount vào app.js
app.use('/api/instructor', contentRoutes)   // gộp chung prefix với instructor.routes.js đã có, hoặc mount route riêng theo path đầy đủ nêu trên

## Lưu ý kỹ thuật
- Dùng better-sqlite3 transaction (db.transaction(fn)()) cho các thao tác xóa liên quan nhiều bảng
- Parse/stringify JSON cho cột options khi đọc/ghi
```

---

## TASK 9 — Xem nội dung & Tiến độ học (phía Student)

```
Tiếp tục dự án CourseDemy. Đã có sẵn: Auth middleware, modules courses/enrollments/instructor content (Task 8).

Yêu cầu: Code API cho Student xem nội dung khóa học theo quyền, đánh dấu hoàn thành bài học, làm quiz, xem tiến độ.

## Chuẩn response (BẮT BUỘC)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }

## Migration database.js — thêm bảng mới

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  lesson_id INTEGER NOT NULL REFERENCES lessons(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  is_completed INTEGER NOT NULL DEFAULT 0,
  quiz_score REAL,
  completed_at TEXT,
  UNIQUE(user_id, lesson_id)
);

## Files cần tạo: src/routes/progress.routes.js + src/controllers/progress.controller.js

GET /api/courses/:id/sections [Public — không bắt buộc authenticate, nhưng nếu có token thì đọc req.user]
- Xác định "enrolled": nếu có req.user (student) và tồn tại bản ghi enrollments(user_id, course_id) → true; nếu req.user là chính instructor sở hữu course hoặc role='admin' → coi như enrolled=true (xem full); ngược lại false
- Lấy toàn bộ sections + lessons (order by position)
- Với mỗi lesson:
  - Nếu enrolled=true: trả đầy đủ { id, title, type, video_url, content_body, duration_seconds, position, is_preview }, nếu type='quiz' trả thêm questions: [ { id, question_text, options, position } ] (KHÔNG trả correct_index), và trả progress: { is_completed, quiz_score } lấy từ lesson_progress của req.user.id (nếu chưa có bản ghi thì { is_completed: false, quiz_score: null })
  - Nếu enrolled=false: chỉ trả { id, title, type, position, is_preview, duration_seconds }; nếu is_preview=1 thì trả thêm video_url/content_body (và questions không kèm đáp án nếu type='quiz'); nếu is_preview=0 thì video_url/content_body/questions đều là null
- Tính progress_percent tổng của khóa (chỉ tính khi enrolled=true): (số lesson có is_completed=1 của user) / (tổng số lesson của course) * 100, làm tròn số nguyên; nếu course chưa có lesson nào → progress_percent = 0
- Response 200: { success: true, data: { enrolled, progress_percent, sections: [ { id, title, lessons: [...] } ] } }
- course không tồn tại → 404

POST /api/lessons/:id/complete [authenticate + authorize('student')]
- Lấy lesson, suy ra course_id
- Chưa enroll course này → 403 "Bạn chưa mua khóa học này"
- INSERT hoặc UPDATE (dùng INSERT ... ON CONFLICT(user_id, lesson_id) DO UPDATE) lesson_progress: is_completed=1, completed_at=datetime('now')
- Tính lại progress_percent của course cho user này
- Response 200: { success: true, message: "Đã đánh dấu hoàn thành", data: { progress_percent } }

POST /api/lessons/:id/submit-quiz [authenticate + authorize('student')]
- Lấy lesson, kiểm tra type='quiz', nếu không → 400 "Bài học này không phải quiz"
- Chưa enroll → 403 "Bạn chưa mua khóa học này"
- Body: { answers: [ { question_id, selected_index } ] }
- Lấy toàn bộ quiz_questions của lesson, đối chiếu answers với correct_index để tính correct_count
- quiz_score = round(correct_count / total_questions * 100)
- is_completed = quiz_score >= 50 ? 1 : 0
- INSERT/UPDATE lesson_progress (is_completed, quiz_score, completed_at nếu is_completed=1)
- Tính lại progress_percent của course
- Response 200: { success: true, data: { quiz_score, is_completed, correct_count, total_questions, progress_percent } }

GET /api/enrollments/:courseId/progress [authenticate + authorize('student')]
- Chưa enroll course này → 403 "Bạn chưa mua khóa học này"
- total_lessons = COUNT lessons theo course_id
- completed_lessons = COUNT lesson_progress WHERE user_id=req.user.id AND course_id=:courseId AND is_completed=1
- progress_percent = total_lessons=0 ? 0 : round(completed_lessons/total_lessons*100)
- Response 200: { success: true, data: { course_id, total_lessons, completed_lessons, progress_percent } }

### Cập nhật GET /api/enrollments (đã có ở Task 3)
- Với mỗi enrollment trả kèm progress_percent (tính như trên) trong object course

### Mount vào app.js
app.use('/api/courses', progressRoutes)      // cho route GET /api/courses/:id/sections
app.use('/api/lessons', progressRoutes)      // cho route complete/submit-quiz
app.use('/api/enrollments', progressRoutes)  // cho route progress

## Lưu ý kỹ thuật
- Dùng better-sqlite3, viết hàm dùng chung calculateCourseProgress(userId, courseId) để tái sử dụng ở nhiều endpoint
- Parse cột options (JSON string) thành mảng khi trả response
```

---

## TASK 10 — Thanh toán sandbox: MoMo, VNPay & Demo

```
Tiếp tục dự án CourseDemy. Đã có sẵn: Auth middleware, module cart/orders/coupons (Task 7).

Yêu cầu: Tách luồng checkout khỏi thanh toán, tích hợp thanh toán sandbox MoMo, VNPay, và giữ 1 phương thức "demo" để test nhanh không cần trình duyệt.

## Chuẩn response (BẮT BUỘC)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }

## Migration database.js — thêm bảng + cột mới

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  method TEXT NOT NULL CHECK(method IN ('momo','vnpay','demo')),
  amount REAL NOT NULL,
  request_id TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed')),
  gateway_response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

-- Thêm cột payment_method vào orders nếu chưa có (kiểm tra bằng PRAGMA table_info trước khi ALTER):
ALTER TABLE orders ADD COLUMN payment_method TEXT;
-- CHECK constraint của orders.status cần cho phép thêm giá trị 'failed' (nếu SQLite bản hiện tại không cho sửa CHECK dễ dàng, bỏ qua enforce ở DB và enforce ở code tầng application là đủ)

## SỬA đổi orders.controller.js — hàm checkout (đã có coupon ở Task 7)
- Đổi hành vi: checkout CHỈ tạo order (status='pending') + order_items, KHÔNG tạo enrollment, KHÔNG xóa cart_items
- Response 201: { success: true, message: "Đã tạo đơn hàng, vui lòng chọn phương thức thanh toán", data: { order_id, subtotal, discount_amount, total_amount, status: "pending" } }

## File cần tạo: src/utils/momo.util.js
- Export hàm createMomoSignature(params, secretKey): build rawSignature theo đúng thứ tự "accessKey=...&amount=...&extraData=...&ipnUrl=...&orderId=...&orderInfo=...&partnerCode=...&redirectUrl=...&requestId=...&requestType=...", HMAC SHA256 bằng crypto module Node
- Export hàm verifyMomoSignature(body, secretKey): tái tạo rawSignature từ body IPN gửi lên, so sánh với body.signature

## File cần tạo: src/utils/vnpay.util.js
- Export hàm buildVnpayUrl(params, hashSecret, baseUrl): sort key alphabet, build querystring KHÔNG encode dấu cách thành +, HMAC SHA512, trả về full URL kèm vnp_SecureHash
- Export hàm verifyVnpaySignature(query, hashSecret): tách vnp_SecureHash ra khỏi query, sort phần còn lại, tính lại HMAC SHA512, so sánh

## File cần tạo: src/routes/payments.routes.js + src/controllers/payments.controller.js

POST /api/payments/demo/pay [authenticate + authorize('student')]
- Body: { order_id (required) }
- order không tồn tại → 404 | không thuộc user → 403 | status != 'pending' → 400 "Đơn hàng không ở trạng thái chờ thanh toán"
- Dùng db.transaction:
  1. INSERT payments (method='demo', amount=order.total_amount, status='success')
  2. UPDATE orders SET status='paid', payment_method='demo'
  3. INSERT OR IGNORE từng course trong order_items vào enrollments
  4. Nếu order.coupon_id: UPDATE coupons SET used_count = used_count + 1
  5. DELETE cart_items của user
- Response 200: { success: true, message: "Thanh toán thành công (demo)", data: { order_id, status: "paid" } }

POST /api/payments/momo/create [authenticate + authorize('student')]
- Body: { order_id (required) }
- Cấu hình .env: MOMO_PARTNER_CODE=MOMO, MOMO_ACCESS_KEY=F8BBA842ECF85, MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz, MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create, MOMO_REDIRECT_URL=http://localhost:3000/api/payments/momo/return, MOMO_IPN_URL=http://localhost:3000/api/payments/momo/ipn
  (đây là bộ khóa test công khai của MoMo dành cho môi trường sandbox học tập, KHÔNG dùng cho giao dịch thật)
- Kiểm tra order thuộc user + status='pending', nếu không → lỗi tương ứng (404/403/400)
- requestId = `MOMO${order_id}${Date.now()}`, orderId (gửi Momo) = requestId
- requestType = 'captureWallet', amount = String(Math.round(order.total_amount)), orderInfo = `Thanh toan don hang #${order_id} CourseDemy`, extraData = ''
- Ký signature bằng momo.util.js, gọi POST tới MOMO_ENDPOINT bằng fetch/axios
- Lưu payments (method='momo', request_id=requestId, status='pending', gateway_response=JSON response)
- Response 200: { success: true, data: { payUrl: <trả về từ Momo>, orderId: requestId } }
- Gọi Momo lỗi/network → 502 { success: false, message: "Không thể kết nối cổng thanh toán MoMo" }

POST /api/payments/momo/ipn [Public — MoMo gọi server-to-server, không cần authenticate]
- Nhận body JSON từ MoMo, verify signature bằng momo.util.js
- Sai chữ ký → trả HTTP 204, không xử lý gì thêm
- Tìm payments theo request_id = body.requestId
- resultCode === 0: transaction (như bước demo/pay ở trên: cập nhật payments.status='success', orders.status='paid', tạo enrollments, tăng used_count coupon nếu có, xóa cart_items)
- resultCode !== 0: payments.status='failed', orders.status='failed'
- Luôn trả HTTP 204 No Content (không có body)

GET /api/payments/momo/return [Public]
- Đọc query string MoMo redirect về (resultCode, orderId, ...)
- Verify signature nếu MoMo có gửi kèm; nếu sai vẫn cho qua nhưng đánh dấu unverified trong log
- Trả về HTTP redirect (302) tới FRONTEND_URL + `/payment-result.html?orderId=<order gốc>&status=<paid|failed>`

POST /api/payments/vnpay/create [authenticate + authorize('student')]
- Body: { order_id (required) }
- .env: VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html, VNPAY_RETURN_URL=http://localhost:3000/api/payments/vnpay/return
  (VNPAY_TMN_CODE/VNPAY_HASH_SECRET học viên tự đăng ký miễn phí tại https://sandbox.vnpayment.vn/devreg/ — nếu chưa có, để trống trong .env và API này sẽ trả lỗi rõ ràng thay vì crash)
- Nếu thiếu VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET trong .env → 503 { success: false, message: "Chưa cấu hình VNPay sandbox, vui lòng đăng ký merchant test tại sandbox.vnpayment.vn/devreg" }
- Kiểm tra order thuộc user + status='pending'
- Build params: vnp_Version=2.1.0, vnp_Command=pay, vnp_TmnCode, vnp_Amount=Math.round(order.total_amount*100), vnp_CurrCode=VND, vnp_TxnRef=`${order_id}-${Date.now()}`, vnp_OrderInfo=`Thanh toan don hang ${order_id}`, vnp_OrderType=other, vnp_Locale=vn, vnp_ReturnUrl=VNPAY_RETURN_URL, vnp_IpAddr=req.ip, vnp_CreateDate=<yyyyMMddHHmmss giờ VN, dùng thư viện dayjs hoặc tính thủ công>
- Build URL bằng vnpay.util.js
- Lưu payments (method='vnpay', request_id=vnp_TxnRef, status='pending')
- Response 200: { success: true, data: { payUrl } }

GET /api/payments/vnpay/ipn [Public]
- req.query chứa toàn bộ vnp_*, verify bằng vnpay.util.js
- Sai chữ ký → trả JSON { "RspCode": "97", "Message": "Invalid signature" }
- Tìm payments theo request_id = vnp_TxnRef
- Không tìm thấy order → { "RspCode": "01", "Message": "Order not found" }
- vnp_ResponseCode === '00': cập nhật thành công (như bước demo/pay), trả { "RspCode": "00", "Message": "Confirm Success" }
- Khác '00': payments.status='failed', orders.status='failed', vẫn trả { "RspCode": "00", "Message": "Confirm Success" }

GET /api/payments/vnpay/return [Public]
- Verify signature, redirect (302) tới FRONTEND_URL + `/payment-result.html?orderId=...&status=...`

GET /api/payments/:orderId/status [authenticate + authorize('student')]
- order không thuộc user → 403 | không tồn tại → 404
- Response 200: { success: true, data: { order_id, status, payment_method, total_amount } }

### Mount vào app.js
app.use('/api/payments', paymentsRoutes)

## Lưu ý kỹ thuật
- Dùng node-fetch hoặc axios để gọi API MoMo (thêm vào package.json nếu chưa có)
- Toàn bộ transaction cập nhật trạng thái thanh toán thành công PHẢI dùng db.transaction để đảm bảo tính toàn vẹn (payments + orders + enrollments + coupons + cart_items cùng lúc)
- Thêm các biến môi trường mẫu vào file .env.example
```

---

## TASK 11 — Frontend: Instructor quản lý nội dung khóa học

```
Tiếp tục dự án CourseDemy. Backend đã có đầy đủ API nội dung khóa học (Task 8): base URL http://localhost:3000/api

Instructor content APIs:
GET /api/instructor/courses/:courseId/sections
POST /api/instructor/courses/:courseId/sections { title, position }
PUT /api/instructor/sections/:id { title, position }
DELETE /api/instructor/sections/:id
POST /api/instructor/sections/:sectionId/lessons { title, type, video_url, content_body, duration_seconds, is_preview, position }
PUT /api/instructor/lessons/:id
DELETE /api/instructor/lessons/:id
POST /api/instructor/lessons/:lessonId/questions { question_text, options, correct_index, position }
PUT /api/instructor/questions/:id
DELETE /api/instructor/questions/:id

Chuẩn response: { success: true/false, message, data }. Token Bearer lấy từ localStorage key "token" (dùng lại js/api.js đã có ở Task 6, hàm apiFetch).

Yêu cầu: Cập nhật trang frontend/instructor-course-form.html — thêm khu vực "Nội dung khóa học" (chỉ hiển thị khi đang ở chế độ edit, tức đã có ?id=X, vì phải tạo course trước mới có course_id để gắn nội dung).

## Yêu cầu UI khu vực "Nội dung khóa học"
- Đặt bên dưới form thông tin cơ bản của khóa học, chỉ hiện khi có ?id=X
- Gọi GET /api/instructor/courses/:courseId/sections khi load trang, render danh sách chương dạng accordion/collapse
- Mỗi chương hiển thị: tiêu đề, nút "Sửa", nút "Xóa" (confirm trước khi xóa), nút "Thêm bài học"
- Nút "Thêm chương mới" ở đầu khu vực → modal/form nhỏ nhập title → POST section
- Trong mỗi chương, danh sách bài học hiển thị: icon theo loại (video/content/quiz), tiêu đề, badge "Xem thử" nếu is_preview=true, nút Sửa, nút Xóa
- Form thêm/sửa bài học (modal):
  - Chọn loại: Video / Bài đọc / Quiz (radio, chỉ chọn được lúc tạo mới, không cho đổi lúc sửa)
  - Nếu Video: input title, video_url (URL), duration_seconds (số giây, optional), checkbox is_preview
  - Nếu Bài đọc: input title, textarea content_body, checkbox is_preview
  - Nếu Quiz: input title, checkbox is_preview — sau khi tạo lesson quiz xong, hiện thêm khu vực quản lý câu hỏi ngay bên dưới lesson đó trong danh sách
- Với lesson type='quiz': hiển thị danh sách câu hỏi đã có (question_text + 4 lựa chọn, đánh dấu đáp án đúng), nút "Thêm câu hỏi" → form: question_text, 2-4 input cho options (tối thiểu 2), radio chọn đáp án đúng trong các option đã nhập → POST question
- Toàn bộ thao tác thêm/sửa/xóa xong thì gọi lại GET sections để refresh danh sách (đơn giản hóa, không cần optimistic update)
- Hiển thị thông báo thành công/lỗi rõ ràng, không dùng alert() thô

## Yêu cầu chung
- Tái sử dụng css/style.css hiện có, bổ sung style cho accordion/badge/modal nếu chưa có
- Toàn bộ fetch dùng qua apiFetch() trong js/api.js
```

---

## TASK 12 — Frontend: Trang học, Checkout với Coupon/Thanh toán, Admin quản lý Coupon

```
Tiếp tục dự án CourseDemy. Backend đã có đầy đủ API: base URL http://localhost:3000/api

Progress/content (student):
GET /api/courses/:id/sections
POST /api/lessons/:id/complete
POST /api/lessons/:id/submit-quiz { answers: [{question_id, selected_index}] }
GET /api/enrollments/:courseId/progress
GET /api/enrollments (giờ trả kèm progress_percent mỗi khóa)

Coupon:
POST /api/coupons/validate { code }
Admin coupon: GET/POST/PUT/DELETE /api/admin/coupons(/:id)

Payment:
POST /api/orders/checkout { coupon_code } → trả order_id ở trạng thái pending
POST /api/payments/demo/pay { order_id }
POST /api/payments/momo/create { order_id } → trả payUrl
POST /api/payments/vnpay/create { order_id } → trả payUrl
GET /api/payments/:orderId/status

Chuẩn response: { success, message, data }. Token Bearer từ localStorage "token" qua js/api.js đã có.

Yêu cầu: Tạo/cập nhật các trang frontend sau (không dùng framework, HTML+CSS+JS thuần, tái sử dụng css/style.css và js/api.js hiện có).

## 1. frontend/learn.html?courseId=X [Student, phải đã enroll]
- requireAuth + kiểm tra role student
- GET /api/courses/:id/sections
- Nếu data.enrolled=false → hiển thị thông báo "Bạn cần mua khóa học này để xem đầy đủ nội dung" + link course.html?id=X, vẫn cho xem các lesson is_preview=true
- Layout 2 cột: cột trái danh sách chương/bài học dạng sidebar (đánh dấu ✓ xanh nếu lesson.progress.is_completed=true), cột phải nội dung bài học đang chọn
- Thanh tiến độ (progress bar) hiển thị data.progress_percent ở đầu trang, cập nhật lại sau mỗi lần hoàn thành bài/nộp quiz (không cần reload trang, chỉ update state JS)
- Click 1 lesson trong sidebar → hiện nội dung bên phải theo type:
  - video: thẻ <video controls src="..."> hoặc <iframe> nếu là link YouTube (kiểm tra domain youtube.com/youtu.be để convert sang embed URL), có nút "Đánh dấu hoàn thành" → POST /api/lessons/:id/complete
  - content: hiển thị content_body dạng text/HTML, có nút "Đánh dấu hoàn thành" → POST /api/lessons/:id/complete
  - quiz: hiển thị từng câu hỏi (radio 4 lựa chọn), nút "Nộp bài" → POST /api/lessons/:id/submit-quiz, sau khi có kết quả hiển thị điểm số + số câu đúng, không cho nộp lại nhiều lần trong cùng lượt xem (disable nút sau khi nộp, nhưng vẫn có thể chọn lesson khác rồi quay lại nộp lại là hợp lệ về mặt API)
  - Lesson chưa mở khóa (is_preview=false và enrolled=false): hiển thị icon khóa + text "Mua khóa học để mở khóa bài này"

## 2. Cập nhật frontend/my-courses.html [Student]
- Với mỗi khóa học trong GET /api/enrollments, hiển thị thêm thanh progress_percent và nút "Vào học" → learn.html?courseId=X

## 3. Cập nhật frontend/checkout.html [Student]
- Bước 1: hiển thị tóm tắt giỏ hàng (giữ nguyên logic cũ)
- Thêm ô nhập "Mã giảm giá" + nút "Áp dụng" → POST /api/coupons/validate, hiển thị subtotal/discount_amount/total_amount trả về
- Thêm phần chọn "Phương thức thanh toán": 3 radio button MoMo / VNPay / Demo (thanh toán nhanh - test)
- Nút "Xác nhận thanh toán":
  1. Gọi POST /api/orders/checkout { coupon_code (nếu có áp dụng) } → nhận order_id
  2. Tùy phương thức đã chọn:
     - Demo: gọi POST /api/payments/demo/pay { order_id } → thành công thì redirect my-courses.html
     - MoMo: gọi POST /api/payments/momo/create { order_id } → nhận payUrl → window.location.href = payUrl (chuyển sang trang MoMo)
     - VNPay: tương tự, gọi POST /api/payments/vnpay/create { order_id } → redirect payUrl
- Xử lý lỗi rõ ràng (ví dụ VNPay chưa cấu hình → hiển thị message trả về từ server)

## 4. frontend/payment-result.html?orderId=X&status=Y [mới]
- Đọc query string orderId, status
- Gọi GET /api/payments/:orderId/status để lấy trạng thái mới nhất (phòng trường hợp status trên URL bị cũ)
- Nếu status='paid': hiển thị "Thanh toán thành công 🎉" + nút "Xem khóa học của tôi" → my-courses.html
- Nếu status='pending': polling GET /api/payments/:orderId/status mỗi 3 giây tối đa 10 lần, cập nhật khi có kết quả
- Nếu status='failed'/'cancelled': hiển thị "Thanh toán thất bại" + nút "Thử lại" → checkout.html

## 5. frontend/admin-coupons.html [Admin, mới]
- GET /api/admin/coupons → bảng: code, discount_type, discount_value, used_count/usage_limit, valid_from → valid_to, status (badge)
- Nút "Thêm coupon" → modal form đầy đủ field (code, description, discount_type select, discount_value, max_discount, min_order_amount, usage_limit, valid_from/valid_to dùng input type="datetime-local")
- Nút "Sửa" → modal điền sẵn dữ liệu → PUT
- Nút "Xóa" → confirm → DELETE
- Thêm link "Quản lý Coupon" vào admin.html

## Yêu cầu chung
- Toàn bộ gọi API qua apiFetch() trong js/api.js đã có
- Spinner khi đang gọi API, thông báo lỗi/thành công rõ ràng không dùng alert() thô
- Responsive cơ bản, giữ nhất quán màu sắc/style với các trang đã có ở Task 6
```

---

> **Lưu ý khi dùng prompts Giai đoạn 2 (Task 7-12):**
> - Thứ tự khuyến nghị: Task 7 (Coupon) → Task 8 (Nội dung - Instructor) → Task 9 (Nội dung - Student/Progress) → Task 10 (Thanh toán sandbox) → Task 11 (Frontend Instructor) → Task 12 (Frontend Student/Checkout/Admin)
> - Task 10 sửa đổi hành vi của `POST /api/orders/checkout` đã làm ở Task 3 — nhắc AI đọc lại code cũ trước khi sửa, tránh viết đè mất phần coupon đã làm ở Task 7
> - MoMo dùng được ngay với bộ khóa test công khai nêu trong Task 10, không cần đăng ký. VNPay bắt buộc phải tự đăng ký merchant sandbox miễn phí tại https://sandbox.vnpayment.vn/devreg/ trước, nếu chưa có key thì test bằng MoMo hoặc phương thức "demo" trước
> - Sau mỗi task, test bằng Postman (đặc biệt là IPN endpoint có thể giả lập bằng cách tự POST/GET body/query mẫu tới localhost) trước khi làm task tiếp theo
