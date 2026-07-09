# KẾ HOẠCH XÂY DỰNG WEBSITE "COURSEDEMY"
### (Website bán khóa học online – phục vụ đề tài kiểm thử API bằng Postman)

---

## 1. Mục tiêu đề tài

Xây dựng một website bán khóa học online ở **mức cơ bản**, đủ chức năng để:
- Có backend cung cấp REST API rõ ràng, dễ kiểm thử bằng **Postman**.
- Có frontend đơn giản, chạy được luồng nghiệp vụ đầu-cuối (Student, Instructor, Admin).
- Có đủ 3 role: **Học viên (Student)**, **Giảng viên (Instructor)**, **Quản trị viên (Admin)**.
- Có thể viết test case, test suite, test flow trên Postman (Collection + Environment).

---

## 2. Công nghệ sử dụng

| Thành phần | Công nghệ | Lý do |
|---|---|---|
| Backend | Node.js + Express.js | Nhẹ, dễ viết REST API, dễ test bằng Postman |
| Database | **SQLite** (file `database.sqlite`) | Không cần cài server, relational, dễ reset/seed, phù hợp dự án học thuật |
| ORM | **better-sqlite3** (query thuần, synchronous) | Đơn giản, không cần async/await cho DB, dễ debug |
| Auth | JWT (`jsonwebtoken`) + `bcrypt` | Đủ dùng để phân quyền 3 role |
| Frontend | HTML + CSS + JavaScript thuần | Không cần React/Vue, đủ chạy luồng nghiệp vụ |
| Upload ảnh | Lưu local `/uploads`, dùng `multer` | Đơn giản hóa, không cần cloud storage |

> **Tại sao không dùng MongoDB?** Data có cấu trúc quan hệ chặt (users → courses → orders → enrollments → cart). MongoDB sẽ phải tự xử lý join thủ công, thêm phức tạp không cần thiết. SQLite là lựa chọn tối ưu cho scope này.

> **Tại sao không dùng MySQL?** MySQL yêu cầu cài server riêng. SQLite là file duy nhất, không cần setup, phù hợp để chạy và demo nhanh.

---

## 3. Phân tích vai trò (Role) & quyền hạn

### 3.1 Học viên (Student)
- Đăng ký / Đăng nhập / Đăng xuất
- Xem danh sách khóa học, xem chi tiết khóa học
- Tìm kiếm khóa học (theo tên, danh mục, giá)
- Thêm khóa học vào giỏ hàng
- Xem giỏ hàng, xóa khỏi giỏ hàng
- Thanh toán (giả lập, không tích hợp cổng thanh toán thật)
- Xem danh sách khóa học đã mua ("Khóa học của tôi")
- Xem thông tin cá nhân, cập nhật hồ sơ

### 3.2 Giảng viên (Instructor)
- Đăng ký / Đăng nhập
- Tạo khóa học mới (trạng thái: **Chờ duyệt**)
- Sửa / Xóa khóa học của mình (chỉ khi đang `pending`)
- Xem danh sách khóa học của mình kèm trạng thái duyệt
- Xem danh sách học viên đã đăng ký từng khóa học

### 3.3 Quản trị viên (Admin)
- Đăng nhập admin (tài khoản seed sẵn, không có chức năng đăng ký admin)
- Xem danh sách khóa học chờ duyệt
- Phê duyệt / Từ chối khóa học
- Quản lý tài khoản người dùng (khóa/mở khóa tài khoản, xem danh sách)
- Quản lý danh mục khóa học (thêm/sửa/xóa category)

---

## 4. Thiết kế cơ sở dữ liệu

### Bảng `users`
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| full_name | TEXT NOT NULL | |
| email | TEXT UNIQUE NOT NULL | |
| password | TEXT NOT NULL | đã hash bằng bcrypt |
| role | TEXT CHECK IN ('student','instructor','admin') | |
| status | TEXT DEFAULT 'active' CHECK IN ('active','locked') | |
| created_at | TEXT | ISO 8601 string |

### Bảng `categories`
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| name | TEXT UNIQUE NOT NULL | |
| description | TEXT | |

### Bảng `courses`
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| title | TEXT NOT NULL | |
| description | TEXT | |
| price | REAL DEFAULT 0 | |
| category_id | INTEGER REFERENCES categories(id) | |
| instructor_id | INTEGER REFERENCES users(id) | |
| thumbnail | TEXT | đường dẫn ảnh, ví dụ `/uploads/abc.jpg` |
| status | TEXT DEFAULT 'pending' CHECK IN ('pending','approved','rejected') | |
| created_at | TEXT | |

### Bảng `cart_items`
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| user_id | INTEGER REFERENCES users(id) | |
| course_id | INTEGER REFERENCES courses(id) | |
| created_at | TEXT | |
| UNIQUE(user_id, course_id) | | tránh thêm trùng |

### Bảng `orders`
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| user_id | INTEGER REFERENCES users(id) | |
| total_amount | REAL | |
| status | TEXT DEFAULT 'paid' CHECK IN ('pending','paid','cancelled') | |
| created_at | TEXT | |

### Bảng `order_items`
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| order_id | INTEGER REFERENCES orders(id) | |
| course_id | INTEGER REFERENCES courses(id) | |
| price | REAL | giá tại thời điểm mua |

### Bảng `enrollments`
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| user_id | INTEGER REFERENCES users(id) | |
| course_id | INTEGER REFERENCES courses(id) | |
| enrolled_at | TEXT | |
| UNIQUE(user_id, course_id) | | tránh enrollment trùng |

---

## 5. Cấu hình Auth (JWT)

- **Secret key**: lưu trong `.env` dưới tên `JWT_SECRET`
- **Token expiry**: `7d` (7 ngày, đủ dùng cho demo/test)
- **Header format**: `Authorization: Bearer <token>`
- **Không có refresh token** (đơn giản hóa)
- Khi user bị `locked`, middleware trả về `403 Tài khoản đã bị khóa`

---

## 6. Chuẩn định dạng Response (API Standard)

**Mọi API đều trả về JSON theo cấu trúc thống nhất:**

### Thành công
```json
{
  "success": true,
  "message": "Mô tả ngắn (tuỳ endpoint)",
  "data": { ... }
}
```

### Thất bại / Lỗi
```json
{
  "success": false,
  "message": "Mô tả lỗi rõ ràng"
}
```

### Bảng HTTP Status Code chuẩn
| Code | Ý nghĩa | Ví dụ |
|---|---|---|
| 200 | OK | Lấy/cập nhật dữ liệu thành công |
| 201 | Created | Tạo tài nguyên mới thành công |
| 400 | Bad Request | Thiếu field bắt buộc, dữ liệu không hợp lệ |
| 401 | Unauthorized | Không có token hoặc token không hợp lệ |
| 403 | Forbidden | Có token nhưng không đủ quyền / tài khoản bị khóa |
| 404 | Not Found | Tài nguyên không tồn tại |
| 409 | Conflict | Trùng lặp (email đã đăng ký, đã thêm vào giỏ...) |
| 500 | Internal Server Error | Lỗi server không mong muốn |

---

## 7. Danh sách API chi tiết (Request & Response)

### 7.1 Auth

#### `POST /api/auth/register`
**Role**: Public

**Request body:**
```json
{
  "full_name": "Nguyen Van A",
  "email": "student@example.com",
  "password": "123456",
  "role": "student"
}
```
> `role` chỉ chấp nhận `"student"` hoặc `"instructor"`. Không thể tự đăng ký làm admin.

**Response 201:**
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "id": 1,
    "full_name": "Nguyen Van A",
    "email": "student@example.com",
    "role": "student"
  }
}
```
**Lỗi:** `400` thiếu field | `409` email đã tồn tại

---

#### `POST /api/auth/login`
**Role**: Public

**Request body:**
```json
{
  "email": "student@example.com",
  "password": "123456"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": 1,
      "full_name": "Nguyen Van A",
      "email": "student@example.com",
      "role": "student",
      "status": "active"
    }
  }
}
```
**Lỗi:** `400` thiếu field | `401` sai mật khẩu | `404` email không tồn tại | `403` tài khoản bị khóa

---

#### `GET /api/auth/me`
**Role**: Đã đăng nhập (mọi role)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "full_name": "Nguyen Van A",
    "email": "student@example.com",
    "role": "student",
    "status": "active",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### `PUT /api/auth/profile`
**Role**: Đã đăng nhập

**Request body** (các field đều optional, chỉ gửi field muốn cập nhật):
```json
{
  "full_name": "Nguyen Van B"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Cập nhật hồ sơ thành công",
  "data": {
    "id": 1,
    "full_name": "Nguyen Van B",
    "email": "student@example.com",
    "role": "student"
  }
}
```

---

### 7.2 Courses & Categories (Public)

#### `GET /api/courses`
**Query params** (tất cả optional):
- `search` — tìm theo title (LIKE)
- `category_id` — lọc theo danh mục
- `minPrice`, `maxPrice` — lọc theo giá
- `page` (default: 1), `limit` (default: 10)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": 1,
        "title": "Lập trình Python cơ bản",
        "description": "...",
        "price": 299000,
        "thumbnail": "/uploads/python.jpg",
        "status": "approved",
        "category": { "id": 1, "name": "Lập trình" },
        "instructor": { "id": 2, "full_name": "Tran Thi B" },
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "totalPages": 1
  }
}
```
> Chỉ trả về các khóa học có `status = 'approved'`

---

#### `GET /api/courses/:id`
**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Lập trình Python cơ bản",
    "description": "Mô tả chi tiết...",
    "price": 299000,
    "thumbnail": "/uploads/python.jpg",
    "status": "approved",
    "category": { "id": 1, "name": "Lập trình" },
    "instructor": { "id": 2, "full_name": "Tran Thi B" },
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```
**Lỗi:** `404` không tìm thấy

---

#### `GET /api/categories`
**Response 200:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Lập trình", "description": "..." },
    { "id": 2, "name": "Thiết kế", "description": "..." }
  ]
}
```

---

### 7.3 Cart & Checkout (Student)

#### `GET /api/cart`
**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "course": {
        "id": 1,
        "title": "Lập trình Python cơ bản",
        "price": 299000,
        "thumbnail": "/uploads/python.jpg",
        "instructor": { "full_name": "Tran Thi B" }
      },
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### `POST /api/cart`
**Request body:**
```json
{ "course_id": 1 }
```

**Response 201:**
```json
{
  "success": true,
  "message": "Đã thêm vào giỏ hàng"
}
```
**Lỗi:** `400` thiếu course_id | `404` khóa học không tồn tại | `409` đã có trong giỏ hoặc đã mua rồi

---

#### `DELETE /api/cart/:courseId`
**Response 200:**
```json
{
  "success": true,
  "message": "Đã xóa khỏi giỏ hàng"
}
```
**Lỗi:** `404` không có item này trong giỏ

---

#### `POST /api/orders/checkout`
> Tạo đơn hàng từ toàn bộ giỏ hàng, tự động tạo enrollment, xóa giỏ hàng.

**Request body:** Không cần (checkout toàn bộ giỏ)

**Response 201:**
```json
{
  "success": true,
  "message": "Thanh toán thành công",
  "data": {
    "order_id": 5,
    "total_amount": 598000,
    "status": "paid",
    "items": [
      { "course_id": 1, "title": "Python cơ bản", "price": 299000 },
      { "course_id": 2, "title": "JavaScript nâng cao", "price": 299000 }
    ]
  }
}
```
**Lỗi:** `400` giỏ hàng rỗng

---

#### `GET /api/orders`
**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "total_amount": 598000,
      "status": "paid",
      "created_at": "2024-01-01T00:00:00.000Z",
      "items": [
        { "course_id": 1, "title": "Python cơ bản", "price": 299000 }
      ]
    }
  ]
}
```

---

#### `GET /api/enrollments`
**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "enrolled_at": "2024-01-01T00:00:00.000Z",
      "course": {
        "id": 1,
        "title": "Lập trình Python cơ bản",
        "thumbnail": "/uploads/python.jpg",
        "instructor": { "full_name": "Tran Thi B" }
      }
    }
  ]
}
```

---

### 7.4 Instructor

#### `GET /api/instructor/courses`
**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "title": "Docker cho người mới bắt đầu",
      "price": 199000,
      "status": "pending",
      "category": { "id": 1, "name": "Lập trình" },
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### `POST /api/instructor/courses`
**Request body:**
```json
{
  "title": "Docker cho người mới bắt đầu",
  "description": "Mô tả khóa học...",
  "price": 199000,
  "category_id": 1,
  "thumbnail": "/uploads/docker.jpg"
}
```
> `title` là bắt buộc. `price` default 0 nếu không truyền. `thumbnail` optional.

**Response 201:**
```json
{
  "success": true,
  "message": "Tạo khóa học thành công, đang chờ duyệt",
  "data": {
    "id": 3,
    "title": "Docker cho người mới bắt đầu",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```
**Lỗi:** `400` thiếu title | `404` category_id không tồn tại

---

#### `PUT /api/instructor/courses/:id`
**Request body** (các field đều optional):
```json
{
  "title": "Docker nâng cao",
  "price": 299000
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Cập nhật khóa học thành công",
  "data": { "id": 3, "title": "Docker nâng cao", "price": 299000, "status": "pending" }
}
```
**Lỗi:** `403` không phải khóa học của mình | `404` không tìm thấy

---

#### `DELETE /api/instructor/courses/:id`
**Response 200:**
```json
{
  "success": true,
  "message": "Đã xóa khóa học"
}
```
**Lỗi:** `403` không phải khóa học của mình | `404` không tìm thấy

---

#### `GET /api/instructor/courses/:id/students`
**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "full_name": "Nguyen Van A",
      "email": "student@example.com",
      "enrolled_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```
**Lỗi:** `403` không phải khóa học của mình | `404` không tìm thấy

---

### 7.5 Admin

#### `GET /api/admin/courses/pending`
**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "title": "Docker cho người mới bắt đầu",
      "price": 199000,
      "instructor": { "id": 2, "full_name": "Tran Thi B", "email": "instructor@example.com" },
      "category": { "id": 1, "name": "Lập trình" },
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### `PUT /api/admin/courses/:id/approve`
**Response 200:**
```json
{
  "success": true,
  "message": "Đã phê duyệt khóa học"
}
```
**Lỗi:** `404` không tìm thấy | `400` khóa học không ở trạng thái pending

---

#### `PUT /api/admin/courses/:id/reject`
**Request body** (optional):
```json
{ "reason": "Nội dung không phù hợp" }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Đã từ chối khóa học"
}
```

---

#### `GET /api/admin/users`
**Query params**: `role` (optional: student/instructor/admin), `status` (optional: active/locked)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "full_name": "Nguyen Van A",
      "email": "student@example.com",
      "role": "student",
      "status": "active",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### `PUT /api/admin/users/:id/lock`
> Toggle: nếu đang `active` → `locked`, nếu đang `locked` → `active`.

**Response 200:**
```json
{
  "success": true,
  "message": "Đã khóa tài khoản",
  "data": { "id": 1, "status": "locked" }
}
```
**Lỗi:** `404` user không tồn tại | `400` không thể khóa tài khoản admin

---

#### `POST /api/admin/categories`
**Request body:**
```json
{
  "name": "Kinh doanh",
  "description": "Các khóa học về kinh doanh và khởi nghiệp"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Tạo danh mục thành công",
  "data": { "id": 4, "name": "Kinh doanh", "description": "..." }
}
```
**Lỗi:** `400` thiếu name | `409` tên danh mục đã tồn tại

---

#### `PUT /api/admin/categories/:id`
**Request body** (các field đều optional):
```json
{ "name": "Kinh doanh & Khởi nghiệp", "description": "..." }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Cập nhật danh mục thành công",
  "data": { "id": 4, "name": "Kinh doanh & Khởi nghiệp" }
}
```

---

#### `DELETE /api/admin/categories/:id`
**Response 200:**
```json
{
  "success": true,
  "message": "Đã xóa danh mục"
}
```
**Lỗi:** `404` không tìm thấy | `400` không thể xóa danh mục đang có khóa học

---

## 8. Seed dữ liệu mẫu

Khi khởi động lần đầu (hoặc chạy `node seed.js`), hệ thống tạo sẵn:

### Users
| full_name | email | password (gốc) | role |
|---|---|---|---|
| Admin CourseDemy | admin@coursedemy.com | admin123 | admin |
| Tran Thi Instructor | instructor1@example.com | 123456 | instructor |
| Le Van Instructor | instructor2@example.com | 123456 | instructor |
| Nguyen Van Student | student1@example.com | 123456 | student |
| Pham Thi Student | student2@example.com | 123456 | student |
| Hoang Van Student | student3@example.com | 123456 | student |

### Categories
| name | description |
|---|---|
| Lập trình | Các khóa học về lập trình và phát triển phần mềm |
| Thiết kế | Các khóa học về UI/UX và đồ họa |
| Ngoại ngữ | Các khóa học học tiếng Anh, Nhật, Hàn |
| Kinh doanh | Các khóa học về kinh doanh và khởi nghiệp |

### Courses (5 khóa học, status approved)
| title | instructor | category | price |
|---|---|---|---|
| Lập trình Python cơ bản | instructor1 | Lập trình | 299000 |
| JavaScript từ A-Z | instructor1 | Lập trình | 399000 |
| Thiết kế UI/UX với Figma | instructor2 | Thiết kế | 249000 |
| Tiếng Anh giao tiếp B1 | instructor2 | Ngoại ngữ | 199000 |
| Khởi nghiệp từ ý tưởng | instructor1 | Kinh doanh | 0 |

> Thêm 1-2 khóa học có `status = 'pending'` để test luồng admin duyệt.

---

## 9. Frontend (đơn giản, theo role)

Multi-page HTML, mỗi page gọi API bằng `fetch()`.

| Trang | URL | Mô tả |
|---|---|---|
| Trang chủ | `/` | Danh sách khóa học approved, thanh tìm kiếm, lọc theo category |
| Đăng nhập | `/login.html` | Form đăng nhập, lưu token vào `localStorage` |
| Đăng ký | `/register.html` | Form đăng ký (chọn role student/instructor) |
| Chi tiết khóa học | `/course.html?id=X` | Thông tin khóa học, nút "Thêm vào giỏ" |
| Giỏ hàng | `/cart.html` | Danh sách giỏ, nút xóa, nút checkout |
| Thanh toán | `/checkout.html` | Xác nhận đơn hàng, nút "Thanh toán ngay" |
| Khóa học của tôi | `/my-courses.html` | Danh sách khóa học đã mua (student) |
| Hồ sơ cá nhân | `/profile.html` | Xem và sửa thông tin |
| Instructor Dashboard | `/instructor.html` | Danh sách khóa học của giảng viên, nút tạo mới |
| Thêm/sửa khóa học | `/instructor-course-form.html` | Form tạo/sửa khóa học |
| Danh sách học viên | `/instructor-students.html?courseId=X` | Học viên đã đăng ký khóa học |
| Admin Dashboard | `/admin.html` | Tổng quan: khóa học chờ duyệt, danh sách user |
| Duyệt khóa học | `/admin-courses.html` | Danh sách pending, nút approve/reject |
| Quản lý user | `/admin-users.html` | Danh sách user, nút lock/unlock |
| Quản lý danh mục | `/admin-categories.html` | CRUD danh mục |

---

## 10. Kế hoạch triển khai theo giai đoạn

### Giai đoạn 0 — Khởi tạo dự án & CSDL (0.5 ngày)
- [ ] Khởi tạo project Node.js + Express, cấu trúc thư mục
- [ ] Cài đặt dependencies: `express`, `better-sqlite3`, `jsonwebtoken`, `bcrypt`, `dotenv`, `multer`, `cors`
- [ ] Tạo file `database.sqlite`, viết script tạo toàn bộ 7 bảng
- [ ] Viết `seed.js` — tạo dữ liệu mẫu theo mục 8

### Giai đoạn 1 — Auth & Middleware (1 ngày)
- [ ] API đăng ký/đăng nhập, hash mật khẩu, sinh JWT
- [ ] Middleware `authenticate` — kiểm tra Bearer token
- [ ] Middleware `authorize(role)` — kiểm tra role
- [ ] Test thủ công bằng Postman: đăng ký, đăng nhập, gọi API sai role → 401/403

### Giai đoạn 2 — Module Courses & Categories (Public) (1 ngày)
- [ ] API danh sách khóa học + tìm kiếm/lọc/phân trang
- [ ] API chi tiết khóa học
- [ ] API danh mục
- [ ] Frontend: trang chủ, trang chi tiết khóa học

### Giai đoạn 3 — Giỏ hàng & Thanh toán (1 ngày)
- [ ] API thêm/xóa/xem giỏ hàng
- [ ] API checkout → tạo order + enrollment + xóa cart
- [ ] API lịch sử đơn hàng & enrollments
- [ ] Frontend: cart, checkout, my-courses

### Giai đoạn 4 — Module Instructor (1 ngày)
- [ ] API CRUD khóa học cho instructor
- [ ] API xem danh sách học viên theo khóa học
- [ ] Frontend: instructor dashboard, form tạo/sửa khóa học, danh sách học viên

### Giai đoạn 5 — Module Admin (1 ngày)
- [ ] API duyệt/từ chối khóa học
- [ ] API quản lý user (lock/unlock)
- [ ] API CRUD danh mục
- [ ] Frontend: admin dashboard, duyệt khóa học, quản lý user, quản lý danh mục

### Giai đoạn 6 — Hoàn thiện & tích hợp (0.5 ngày)
- [ ] Kiểm tra toàn bộ luồng đầu-cuối: đăng ký → mua khóa học → xem
- [ ] Kiểm tra luồng instructor → admin duyệt → student thấy
- [ ] Viết README hướng dẫn cài đặt và chạy

---

## 11. Cấu trúc thư mục đề xuất

```
coursedemy/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js      # kết nối SQLite, khởi tạo bảng
│   │   ├── middlewares/
│   │   │   ├── authenticate.js  # verify JWT
│   │   │   └── authorize.js     # kiểm tra role
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── courses.routes.js
│   │   │   ├── cart.routes.js
│   │   │   ├── orders.routes.js
│   │   │   ├── instructor.routes.js
│   │   │   └── admin.routes.js
│   │   ├── controllers/         # xử lý logic cho từng route
│   │   └── app.js               # setup Express, mount routes
│   ├── seed.js                  # seed dữ liệu mẫu
│   ├── database.sqlite          # file DB (gitignore)
│   ├── .env                     # JWT_SECRET, PORT
│   └── package.json
├── frontend/
│   ├── index.html               # trang chủ
│   ├── login.html
│   ├── register.html
│   ├── course.html
│   ├── cart.html
│   ├── checkout.html
│   ├── my-courses.html
│   ├── profile.html
│   ├── instructor.html
│   ├── instructor-course-form.html
│   ├── instructor-students.html
│   ├── admin.html
│   ├── admin-courses.html
│   ├── admin-users.html
│   ├── admin-categories.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js               # hàm fetch wrapper dùng chung
│       └── auth.js              # lưu/đọc token localStorage
└── README.md
```

---

## 12. Gợi ý test case tiêu biểu (kiểm thử thủ công bằng Postman)

| STT | Test case | Endpoint | Kết quả mong đợi |
|---|---|---|---|
| 1 | Đăng ký với email đã tồn tại | POST /api/auth/register | 409 – email đã tồn tại |
| 2 | Đăng nhập sai mật khẩu | POST /api/auth/login | 401 – sai mật khẩu |
| 3 | Gọi API không có token | GET /api/auth/me | 401 – Unauthorized |
| 4 | Student gọi API tạo khóa học | POST /api/instructor/courses | 403 – không đủ quyền |
| 5 | Instructor tạo khóa học | POST /api/instructor/courses | 201 – status = pending |
| 6 | Student tìm khóa học vừa tạo (chưa duyệt) | GET /api/courses?search=... | Không thấy trong danh sách |
| 7 | Admin duyệt khóa học | PUT /api/admin/courses/:id/approve | 200 – status = approved |
| 8 | Student tìm lại khóa học sau khi duyệt | GET /api/courses?search=... | Thấy trong danh sách |
| 9 | Thêm khóa học vào giỏ hàng | POST /api/cart | 201 |
| 10 | Thêm cùng khóa học lần 2 | POST /api/cart | 409 – đã có trong giỏ |
| 11 | Checkout giỏ hàng | POST /api/orders/checkout | 201 – tạo order + enrollment |
| 12 | Checkout khi giỏ rỗng | POST /api/orders/checkout | 400 – giỏ hàng rỗng |
| 13 | Xem "khóa học của tôi" sau khi mua | GET /api/enrollments | Thấy khóa học vừa mua |
| 14 | Admin khóa tài khoản user | PUT /api/admin/users/:id/lock | 200 – status = locked |
| 15 | User bị khóa cố đăng nhập | POST /api/auth/login | 403 – tài khoản bị khóa |
