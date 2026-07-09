# HƯỚNG DẪN CHẠY & TEST POSTMAN — COURSEDEMY

> **Base URL:** `http://localhost:3000`  
> **Database:** SQLite (file `backend/database.sqlite`)  
> **Công nghệ:** Node.js + Express + better-sqlite3 + JWT

---

## PHẦN 1 — CÁCH CHẠY DỰ ÁN

### Yêu cầu cài đặt trước
| Công cụ | Phiên bản tối thiểu | Link tải |
|---|---|---|
| Node.js | v18+ | https://nodejs.org |
| npm | v9+ (đi kèm Node.js) | — |
| Git | bất kỳ | https://git-scm.com |
| Postman | bất kỳ | https://www.postman.com/downloads |

---

### 1.1 Clone và cài đặt

```bash
# Bước 1 — Clone repo
git clone <link-repo>
cd KTPM/coursedemy/backend

# Bước 2 — Cài dependencies
npm install
```

### 1.2 Cấu hình môi trường

File `.env` đã có sẵn trong `backend/`. Nội dung mặc định:

```
PORT=3000
JWT_SECRET=coursedemy_secret_key
```

> ⚠️ **Không cần thay đổi** nếu chạy local.

---

### 1.3 Seed dữ liệu mẫu

> Chạy lần đầu, hoặc khi muốn **reset lại toàn bộ dữ liệu**:

```bash
# Chạy từ thư mục backend/
node seed.js
```

**Output mong đợi:**
```
Database connected
Seeding data...
✓ Inserted 6 users
✓ Inserted 4 categories
✓ Inserted 7 courses
Seed completed!
```

**Tài khoản mặc định sau khi seed:**

| Vai trò | Email | Mật khẩu |
|---|---|---|
| **Admin** | `admin@coursedemy.com` | `admin123` |
| **Instructor 1** | `instructor1@example.com` | `123456` |
| **Instructor 2** | `instructor2@example.com` | `123456` |
| **Student 1** | `student1@example.com` | `123456` |
| **Student 2** | `student2@example.com` | `123456` |
| **Student 3** | `student3@example.com` | `123456` |

---

### 1.4 Khởi động server

```bash
# Chạy từ thư mục backend/
node src/app.js
```

**Output mong đợi:**
```
Database connected
Server running on port 3000
```

---

### 1.5 Truy cập Frontend

Mở trình duyệt, vào các địa chỉ sau:

| Trang | URL |
|---|---|
| **Trang chủ** | http://localhost:3000 |
| **Đăng nhập** | http://localhost:3000/login.html |
| **Đăng ký** | http://localhost:3000/register.html |
| **Chi tiết khóa học** | http://localhost:3000/course.html?id=1 |
| **Giỏ hàng** | http://localhost:3000/cart.html |
| **Thanh toán** | http://localhost:3000/checkout.html |
| **Khóa học của tôi** | http://localhost:3000/my-courses.html |
| **Hồ sơ cá nhân** | http://localhost:3000/profile.html |
| **Instructor Dashboard** | http://localhost:3000/instructor.html |
| **Tạo/Sửa khóa học** | http://localhost:3000/instructor-course-form.html |
| **Danh sách học viên** | http://localhost:3000/instructor-students.html?courseId=1 |
| **Admin Dashboard** | http://localhost:3000/admin.html |
| **Duyệt khóa học** | http://localhost:3000/admin-courses.html |
| **Quản lý người dùng** | http://localhost:3000/admin-users.html |
| **Quản lý danh mục** | http://localhost:3000/admin-categories.html |

---

### 1.6 Reset dữ liệu (khi cần)

```bash
# Xóa file database rồi seed lại
del backend\database.sqlite    # Windows
node seed.js
node src/app.js
```

---

## PHẦN 2 — HƯỚNG DẪN TEST POSTMAN

### 2.0 Thiết lập Postman Environment

Tạo một **Environment** trong Postman tên `CourseDemy Local` với các biến:

| Variable | Initial Value | Ghi chú |
|---|---|---|
| `base_url` | `http://localhost:3000/api` | Base URL của API |
| `token_student` | *(để trống)* | Tự động điền sau khi login |
| `token_instructor` | *(để trống)* | Tự động điền sau khi login |
| `token_admin` | *(để trống)* | Tự động điền sau khi login |
| `course_id` | `1` | ID khóa học để test |
| `user_id` | `4` | ID user để test lock |

> Trong mỗi request cần auth, dùng header:  
> `Authorization: Bearer {{token_student}}` (hoặc token tương ứng)

---

## PHẦN 2.1 — MODULE AUTH (Đăng ký / Đăng nhập)

> **Phụ trách:** Thành viên 1  
> **File backend:** `src/controllers/auth.controller.js`, `src/routes/auth.routes.js`

---

### TEST 1 — Đăng ký tài khoản Student

```
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "full_name": "Nguyen Test",
  "email": "test_new@example.com",
  "password": "123456",
  "role": "student"
}
```
**✅ Kết quả mong đợi:** `201 Created`
```json
{ "success": true, "message": "Đăng ký thành công", "data": { "id": ..., "role": "student" } }
```

---

### TEST 2 — Đăng ký với email đã tồn tại (lỗi 409)

```
POST {{base_url}}/auth/register

{
  "full_name": "Duplicate",
  "email": "student1@example.com",
  "password": "123456",
  "role": "student"
}
```
**❌ Kết quả mong đợi:** `409 Conflict`
```json
{ "success": false, "message": "Email đã được sử dụng" }
```

---

### TEST 3 — Đăng ký với role admin (lỗi 400)

```
POST {{base_url}}/auth/register

{
  "full_name": "Hacker",
  "email": "hacker@test.com",
  "password": "123456",
  "role": "admin"
}
```
**❌ Kết quả mong đợi:** `400 Bad Request`
```json
{ "success": false, "message": "Role không hợp lệ" }
```

---

### TEST 4 — Đăng nhập Student (lưu token)

```
POST {{base_url}}/auth/login

{
  "email": "student1@example.com",
  "password": "123456"
}
```
**✅ Kết quả mong đợi:** `200 OK` — copy `data.token` → lưu vào biến `token_student`

> 💡 **Tip Postman:** Trong tab **Tests** của request này, thêm:
> ```javascript
> if (pm.response.json().success) {
>   pm.environment.set("token_student", pm.response.json().data.token);
> }
> ```

---

### TEST 5 — Đăng nhập Instructor (lưu token)

```
POST {{base_url}}/auth/login

{
  "email": "instructor1@example.com",
  "password": "123456"
}
```
> 💡 Lưu token vào `token_instructor`

---

### TEST 6 — Đăng nhập Admin (lưu token)

```
POST {{base_url}}/auth/login

{
  "email": "admin@coursedemy.com",
  "password": "admin123"
}
```
> 💡 Lưu token vào `token_admin`

---

### TEST 7 — Đăng nhập sai mật khẩu (lỗi 401)

```
POST {{base_url}}/auth/login

{
  "email": "student1@example.com",
  "password": "wrongpassword"
}
```
**❌ Kết quả mong đợi:** `401 Unauthorized`

---

### TEST 8 — GET /auth/me (xem thông tin bản thân)

```
GET {{base_url}}/auth/me
Authorization: Bearer {{token_student}}
```
**✅ Kết quả mong đợi:** `200 OK` — trả về thông tin user hiện tại (không có password)

---

### TEST 9 — GET /auth/me không có token (lỗi 401)

```
GET {{base_url}}/auth/me
(không có Authorization header)
```
**❌ Kết quả mong đợi:** `401 Unauthorized`

---

### TEST 10 — PUT /auth/profile (cập nhật hồ sơ)

```
PUT {{base_url}}/auth/profile
Authorization: Bearer {{token_student}}

{
  "full_name": "Nguyen Van Updated"
}
```
**✅ Kết quả mong đợi:** `200 OK` — full_name đã thay đổi

---

## PHẦN 2.2 — MODULE COURSES & CATEGORIES (Public)

> **Phụ trách:** Thành viên 2  
> **File backend:** `src/controllers/courses.controller.js`, `src/routes/courses.routes.js`

---

### TEST 11 — GET /categories (lấy danh mục)

```
GET {{base_url}}/categories
```
**✅ Kết quả mong đợi:** `200 OK` — mảng 4 danh mục (Lập trình, Thiết kế, Ngoại ngữ, Kinh doanh)

---

### TEST 12 — GET /courses (danh sách khóa học)

```
GET {{base_url}}/courses
```
**✅ Kết quả mong đợi:** `200 OK` — `data.courses` chỉ chứa các khóa học `status=approved`  
Mỗi course có `category: {...}` và `instructor: {...}`

---

### TEST 13 — GET /courses với tìm kiếm

```
GET {{base_url}}/courses?search=Python
```
**✅ Kết quả mong đợi:** Trả về khóa học có "Python" trong tên

---

### TEST 14 — GET /courses lọc theo category

```
GET {{base_url}}/courses?category_id=1
```
**✅ Kết quả mong đợi:** Chỉ trả về khóa học thuộc danh mục Lập trình

---

### TEST 15 — GET /courses lọc theo giá

```
GET {{base_url}}/courses?minPrice=200000&maxPrice=400000
```

---

### TEST 16 — GET /courses phân trang

```
GET {{base_url}}/courses?page=1&limit=2
```
**✅ Kết quả mong đợi:** Trả về `total`, `page`, `totalPages` trong data

---

### TEST 17 — GET /courses/:id (chi tiết khóa học)

```
GET {{base_url}}/courses/1
```
**✅ Kết quả mong đợi:** `200 OK` — thông tin đầy đủ khóa học id=1

---

### TEST 18 — GET /courses/:id không tồn tại (lỗi 404)

```
GET {{base_url}}/courses/999
```
**❌ Kết quả mong đợi:** `404 Not Found`

---

## PHẦN 2.3 — MODULE CART, ORDERS, ENROLLMENTS (Student)

> **Phụ trách:** Thành viên 3  
> **File backend:** `src/controllers/cart.controller.js`, `src/controllers/order.controller.js`, `src/controllers/enrollment.controller.js`

> ⚠️ **Yêu cầu:** Phải có `token_student` từ TEST 4

---

### TEST 19 — GET /cart (xem giỏ hàng)

```
GET {{base_url}}/cart
Authorization: Bearer {{token_student}}
```
**✅ Kết quả mong đợi:** `200 OK` — mảng items trong giỏ (có thể rỗng)

---

### TEST 20 — POST /cart (thêm khóa học vào giỏ)

```
POST {{base_url}}/cart
Authorization: Bearer {{token_student}}

{
  "course_id": 3
}
```
**✅ Kết quả mong đợi:** `201 Created` — `"Đã thêm vào giỏ hàng"`

---

### TEST 21 — POST /cart thêm trùng (lỗi 409)

```
POST {{base_url}}/cart
Authorization: Bearer {{token_student}}

{
  "course_id": 3
}
```
**❌ Kết quả mong đợi:** `409 Conflict` — `"Khóa học đã có trong giỏ hàng"`

---

### TEST 22 — POST /cart khóa học chưa duyệt (lỗi 404)

```
POST {{base_url}}/cart
Authorization: Bearer {{token_student}}

{
  "course_id": 6
}
```
> Course id=6 có `status=pending`

**❌ Kết quả mong đợi:** `404` — `"Khóa học không tồn tại hoặc chưa được duyệt"`

---

### TEST 23 — POST /cart dùng token Instructor (lỗi 403)

```
POST {{base_url}}/cart
Authorization: Bearer {{token_instructor}}

{
  "course_id": 1
}
```
**❌ Kết quả mong đợi:** `403 Forbidden`

---

### TEST 24 — GET /cart sau khi thêm

```
GET {{base_url}}/cart
Authorization: Bearer {{token_student}}
```
**✅ Kết quả mong đợi:** Thấy khóa học vừa thêm (có `course.title`, `course.price`, `course.instructor.full_name`)

---

### TEST 25 — POST /orders/checkout (thanh toán)

> Thêm thêm vài khóa học vào giỏ trước (TEST 20 với course_id 4, 5)

```
POST {{base_url}}/orders/checkout
Authorization: Bearer {{token_student}}
```
**✅ Kết quả mong đợi:** `201 Created`
```json
{
  "success": true,
  "message": "Thanh toán thành công",
  "data": { "order_id": 1, "total_amount": ..., "status": "paid", "items": [...] }
}
```

---

### TEST 26 — POST /orders/checkout giỏ rỗng (lỗi 400)

```
POST {{base_url}}/orders/checkout
Authorization: Bearer {{token_student}}
```
**❌ Kết quả mong đợi:** `400 Bad Request` — `"Giỏ hàng trống"`

---

### TEST 27 — GET /orders (lịch sử đơn hàng)

```
GET {{base_url}}/orders
Authorization: Bearer {{token_student}}
```
**✅ Kết quả mong đợi:** Danh sách đơn hàng, mỗi đơn có `items[]`

---

### TEST 28 — GET /enrollments (khóa học đã mua)

```
GET {{base_url}}/enrollments
Authorization: Bearer {{token_student}}
```
**✅ Kết quả mong đợi:** Các khóa học đã checkout thành công

---

### TEST 29 — DELETE /cart/:courseId (xóa khỏi giỏ)

> Thêm lại 1 khóa học vào giỏ (course chưa mua), rồi xóa:

```
POST {{base_url}}/cart
Authorization: Bearer {{token_student}}
{ "course_id": 2 }

---

DELETE {{base_url}}/cart/2
Authorization: Bearer {{token_student}}
```
**✅ Kết quả mong đợi:** `200 OK` — `"Đã xóa khỏi giỏ hàng"`

---

### TEST 30 — DELETE /cart item không tồn tại (lỗi 404)

```
DELETE {{base_url}}/cart/999
Authorization: Bearer {{token_student}}
```
**❌ Kết quả mong đợi:** `404 Not Found`

---

## PHẦN 2.4 — MODULE INSTRUCTOR

> **Phụ trách:** Thành viên 4  
> **File backend:** `src/controllers/instructor.controller.js`, `src/routes/instructor.routes.js`

> ⚠️ **Yêu cầu:** Phải có `token_instructor` từ TEST 5

---

### TEST 31 — GET /instructor/courses (xem danh sách khóa học của mình)

```
GET {{base_url}}/instructor/courses
Authorization: Bearer {{token_instructor}}
```
**✅ Kết quả mong đợi:** Danh sách courses có `instructor_id` = instructor1, kèm `category`

---

### TEST 32 — GET /instructor/courses dùng token Student (lỗi 403)

```
GET {{base_url}}/instructor/courses
Authorization: Bearer {{token_student}}
```
**❌ Kết quả mong đợi:** `403 Forbidden`

---

### TEST 33 — POST /instructor/courses (tạo khóa học mới)

```
POST {{base_url}}/instructor/courses
Authorization: Bearer {{token_instructor}}

{
  "title": "React.js từ cơ bản đến nâng cao",
  "description": "Học React Hooks, Context, Redux",
  "price": 499000,
  "category_id": 1
}
```
**✅ Kết quả mong đợi:** `201 Created` — `status: "pending"`, đang chờ admin duyệt

> 💡 Lưu lại `data.id` → đặt vào biến `new_course_id`

---

### TEST 34 — POST /instructor/courses thiếu title (lỗi 400)

```
POST {{base_url}}/instructor/courses
Authorization: Bearer {{token_instructor}}

{
  "price": 100000
}
```
**❌ Kết quả mong đợi:** `400 Bad Request`

---

### TEST 35 — POST /instructor/courses category không tồn tại (lỗi 404)

```
POST {{base_url}}/instructor/courses
Authorization: Bearer {{token_instructor}}

{
  "title": "Test Course",
  "category_id": 999
}
```
**❌ Kết quả mong đợi:** `404 Not Found` — `"Danh mục không tồn tại"`

---

### TEST 36 — PUT /instructor/courses/:id (cập nhật khóa học)

```
PUT {{base_url}}/instructor/courses/{{new_course_id}}
Authorization: Bearer {{token_instructor}}

{
  "price": 350000,
  "description": "Cập nhật mô tả mới"
}
```
**✅ Kết quả mong đợi:** `200 OK` — data trả về giá mới

---

### TEST 37 — PUT /instructor/courses/:id của instructor khác (lỗi 403)

> Dùng instructor2 token cố sửa course của instructor1:

```
PUT {{base_url}}/instructor/courses/1
Authorization: Bearer {{token_instructor2}}

{
  "title": "Hack"
}
```
**❌ Kết quả mong đợi:** `403 Forbidden`

---

### TEST 38 — GET /instructor/courses/:id/students (xem học viên)

```
GET {{base_url}}/instructor/courses/1/students
Authorization: Bearer {{token_instructor}}
```
**✅ Kết quả mong đợi:** Danh sách học viên đã mua course id=1 (id, full_name, email, enrolled_at)

---

### TEST 39 — DELETE /instructor/courses/:id (xóa khóa học)

```
DELETE {{base_url}}/instructor/courses/{{new_course_id}}
Authorization: Bearer {{token_instructor}}
```
**✅ Kết quả mong đợi:** `200 OK` — `"Đã xóa khóa học"`

---

### TEST 40 — DELETE /instructor/courses/:id không tồn tại (lỗi 404)

```
DELETE {{base_url}}/instructor/courses/999
Authorization: Bearer {{token_instructor}}
```
**❌ Kết quả mong đợi:** `404 Not Found`

---

## PHẦN 2.5 — MODULE ADMIN

> **Phụ trách:** Thành viên 5  
> **File backend:** `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`

> ⚠️ **Yêu cầu:** Phải có `token_admin` từ TEST 6

---

### TEST 41 — GET /admin/courses/pending (xem khóa học chờ duyệt)

```
GET {{base_url}}/admin/courses/pending
Authorization: Bearer {{token_admin}}
```
**✅ Kết quả mong đợi:** `200 OK` — Danh sách courses có `status=pending`  
Mỗi course có `instructor: { id, full_name, email }` và `category: { id, name }`

---

### TEST 42 — GET /admin/courses/pending dùng token Student (lỗi 403)

```
GET {{base_url}}/admin/courses/pending
Authorization: Bearer {{token_student}}
```
**❌ Kết quả mong đợi:** `403 Forbidden`

---

### TEST 43 — PUT /admin/courses/:id/approve (duyệt khóa học)

> Lấy id của 1 course pending từ TEST 41 (ví dụ id=6):

```
PUT {{base_url}}/admin/courses/6/approve
Authorization: Bearer {{token_admin}}
```
**✅ Kết quả mong đợi:** `200 OK` — `"Đã phê duyệt khóa học"`

---

### TEST 44 — Duyệt lại khóa học đã approved (lỗi 400)

```
PUT {{base_url}}/admin/courses/6/approve
Authorization: Bearer {{token_admin}}
```
**❌ Kết quả mong đợi:** `400 Bad Request` — `"Khóa học không ở trạng thái chờ duyệt"`

---

### TEST 45 — PUT /admin/courses/:id/reject (từ chối khóa học)

```
PUT {{base_url}}/admin/courses/7/reject
Authorization: Bearer {{token_admin}}

{
  "reason": "Nội dung chưa đạt yêu cầu chất lượng"
}
```
**✅ Kết quả mong đợi:** `200 OK` — `"Đã từ chối khóa học"`

---

### TEST 46 — Kiểm tra khóa học sau khi duyệt (visible cho student)

```
GET {{base_url}}/courses?search=Docker
```
**✅ Kết quả mong đợi:** Course "Docker" xuất hiện trong danh sách (vì đã approved)

---

### TEST 47 — GET /admin/users (danh sách tất cả users)

```
GET {{base_url}}/admin/users
Authorization: Bearer {{token_admin}}
```
**✅ Kết quả mong đợi:** `200 OK` — Danh sách 6+ users, **không có field password**

---

### TEST 48 — GET /admin/users với filter role=student

```
GET {{base_url}}/admin/users?role=student
Authorization: Bearer {{token_admin}}
```
**✅ Kết quả mong đợi:** Chỉ trả về users có role=student

---

### TEST 49 — GET /admin/users với filter status=locked

```
GET {{base_url}}/admin/users?status=locked
Authorization: Bearer {{token_admin}}
```

---

### TEST 50 — PUT /admin/users/:id/lock (khóa tài khoản)

```
PUT {{base_url}}/admin/users/4/lock
Authorization: Bearer {{token_admin}}
```
**✅ Kết quả mong đợi:** `200 OK` — `"Đã khóa tài khoản"`, `data.status = "locked"`

---

### TEST 51 — Đăng nhập bằng tài khoản bị khóa (lỗi 403)

```
POST {{base_url}}/auth/login

{
  "email": "student1@example.com",
  "password": "123456"
}
```
**❌ Kết quả mong đợi:** `403 Forbidden` — `"Tài khoản đã bị khóa"`

---

### TEST 52 — PUT /admin/users/:id/lock lần 2 (mở khóa - toggle)

```
PUT {{base_url}}/admin/users/4/lock
Authorization: Bearer {{token_admin}}
```
**✅ Kết quả mong đợi:** `200 OK` — `"Đã mở khóa tài khoản"`, `data.status = "active"`

---

### TEST 53 — PUT lock tài khoản admin (lỗi 400)

```
PUT {{base_url}}/admin/users/1/lock
Authorization: Bearer {{token_admin}}
```
**❌ Kết quả mong đợi:** `400 Bad Request` — `"Không thể khóa tài khoản admin"`

---

### TEST 54 — POST /admin/categories (tạo danh mục mới)

```
POST {{base_url}}/admin/categories
Authorization: Bearer {{token_admin}}

{
  "name": "Sức khỏe & Thể thao",
  "description": "Yoga, gym, dinh dưỡng"
}
```
**✅ Kết quả mong đợi:** `201 Created`

---

### TEST 55 — POST /admin/categories tên trùng (lỗi 409)

```
POST {{base_url}}/admin/categories
Authorization: Bearer {{token_admin}}

{
  "name": "Lập trình"
}
```
**❌ Kết quả mong đợi:** `409 Conflict` — `"Tên danh mục đã tồn tại"`

---

### TEST 56 — PUT /admin/categories/:id (cập nhật danh mục)

```
PUT {{base_url}}/admin/categories/5
Authorization: Bearer {{token_admin}}

{
  "name": "Sức khỏe & Fitness",
  "description": "Cập nhật mô tả"
}
```
**✅ Kết quả mong đợi:** `200 OK`

---

### TEST 57 — DELETE /admin/categories/:id (xóa danh mục)

```
DELETE {{base_url}}/admin/categories/5
Authorization: Bearer {{token_admin}}
```
**✅ Kết quả mong đợi:** `200 OK` — `"Đã xóa danh mục"`

---

### TEST 58 — DELETE danh mục đang có khóa học (lỗi 400)

```
DELETE {{base_url}}/admin/categories/1
Authorization: Bearer {{token_admin}}
```
**❌ Kết quả mong đợi:** `400 Bad Request` — `"Không thể xóa danh mục đang có khóa học"`

---

## PHẦN 3 — LUỒNG TEST END-TO-END (Toàn nhóm)

> Chạy theo thứ tự để kiểm tra toàn bộ hệ thống hoạt động liên tục.

### Luồng 1 — Student mua khóa học

```
1. [Student] Đăng nhập → lấy token
2. [Public]  GET /courses → xem danh sách
3. [Public]  GET /courses/1 → xem chi tiết
4. [Student] POST /cart { course_id: 1 } → thêm vào giỏ
5. [Student] POST /cart { course_id: 2 } → thêm vào giỏ
6. [Student] GET /cart → xem giỏ (2 items)
7. [Student] POST /orders/checkout → thanh toán
8. [Student] GET /enrollments → thấy 2 khóa học đã mua
9. [Student] GET /orders → xem lịch sử đơn
```

### Luồng 2 — Instructor tạo khóa học → Admin duyệt

```
1. [Instructor] Đăng nhập → lấy token
2. [Instructor] POST /instructor/courses → tạo khóa học (status=pending)
3. [Public]     GET /courses?search=... → KHÔNG thấy khóa học mới
4. [Admin]      Đăng nhập → lấy token admin
5. [Admin]      GET /admin/courses/pending → thấy khóa học mới
6. [Admin]      PUT /admin/courses/:id/approve → duyệt
7. [Public]     GET /courses?search=... → GIỜ thấy khóa học
8. [Student]    POST /cart { course_id: new_id } → mua được
9. [Instructor] GET /instructor/courses/:id/students → thấy student mới
```

### Luồng 3 — Admin quản lý user

```
1. [Admin] GET /admin/users → xem tất cả user
2. [Admin] GET /admin/users?role=student → lọc student
3. [Admin] PUT /admin/users/4/lock → khóa student1
4. [Student] POST /auth/login (student1) → lỗi 403
5. [Admin] PUT /admin/users/4/lock → mở khóa
6. [Student] POST /auth/login (student1) → thành công
```

---

## PHẦN 4 — BẢNG TÓM TẮT TẤT CẢ API

| # | Method | Endpoint | Role | Mô tả |
|---|---|---|---|---|
| 1 | POST | `/api/auth/register` | Public | Đăng ký |
| 2 | POST | `/api/auth/login` | Public | Đăng nhập |
| 3 | GET | `/api/auth/me` | Any | Xem thông tin bản thân |
| 4 | PUT | `/api/auth/profile` | Any | Cập nhật hồ sơ |
| 5 | GET | `/api/categories` | Public | Danh sách danh mục |
| 6 | GET | `/api/courses` | Public | Danh sách khóa học (filter, search, page) |
| 7 | GET | `/api/courses/:id` | Public | Chi tiết khóa học |
| 8 | GET | `/api/cart` | Student | Xem giỏ hàng |
| 9 | POST | `/api/cart` | Student | Thêm vào giỏ |
| 10 | DELETE | `/api/cart/:courseId` | Student | Xóa khỏi giỏ |
| 11 | POST | `/api/orders/checkout` | Student | Thanh toán |
| 12 | GET | `/api/orders` | Student | Lịch sử đơn hàng |
| 13 | GET | `/api/enrollments` | Student | Khóa học đã mua |
| 14 | GET | `/api/instructor/courses` | Instructor | DS khóa học của mình |
| 15 | POST | `/api/instructor/courses` | Instructor | Tạo khóa học |
| 16 | PUT | `/api/instructor/courses/:id` | Instructor | Cập nhật khóa học |
| 17 | DELETE | `/api/instructor/courses/:id` | Instructor | Xóa khóa học |
| 18 | GET | `/api/instructor/courses/:id/students` | Instructor | DS học viên |
| 19 | GET | `/api/admin/courses/pending` | Admin | DS khóa học chờ duyệt |
| 20 | PUT | `/api/admin/courses/:id/approve` | Admin | Duyệt khóa học |
| 21 | PUT | `/api/admin/courses/:id/reject` | Admin | Từ chối khóa học |
| 22 | GET | `/api/admin/users` | Admin | DS người dùng |
| 23 | PUT | `/api/admin/users/:id/lock` | Admin | Khóa/Mở khóa tài khoản |
| 24 | POST | `/api/admin/categories` | Admin | Tạo danh mục |
| 25 | PUT | `/api/admin/categories/:id` | Admin | Cập nhật danh mục |
| 26 | DELETE | `/api/admin/categories/:id` | Admin | Xóa danh mục |

---

## PHẦN 5 — XỬ LÝ SỰ CỐ THƯỜNG GẶP

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Cannot connect to server` | Server chưa chạy | Chạy `node src/app.js` |
| `401 Không có token` | Quên thêm Authorization header | Thêm `Bearer {{token}}` vào header |
| `401 Token không hợp lệ` | Token hết hạn hoặc sai | Đăng nhập lại để lấy token mới |
| `403 Tài khoản đã bị khóa` | User bị admin lock | Dùng admin unlock: `PUT /admin/users/:id/lock` |
| `404 Not Found` | Sai URL hoặc ID không tồn tại | Kiểm tra lại endpoint và ID |
| `409 Conflict` | Trùng dữ liệu | Email trùng, khóa học đã trong giỏ... |
| `Database locked` | Nhiều process dùng chung SQLite | Đóng các process khác, restart server |
| Seed thất bại | Database đang bị lock | Stop server, chạy seed, rồi start lại |
