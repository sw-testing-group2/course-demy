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

---

## 13. GIAI ĐOẠN 2 — TÍNH NĂNG MỞ RỘNG

> Bổ sung trên nền hệ thống đã có ở mục 1-12: **Coupon giảm giá có hạn dùng**, **Thanh toán sandbox MoMo/VNPay**, **Nội dung khóa học (chương/bài học/video/quiz)**, **Tiến độ học (progress)**, và cập nhật khu vực Instructor để quản lý nội dung.

### 13.1 Mục tiêu

- Học viên có thể nhập **mã coupon** khi checkout để được giảm giá, coupon có hạn sử dụng và giới hạn lượt dùng.
- Học viên thanh toán qua **MoMo sandbox** hoặc **VNPay sandbox** (thay vì chỉ giả lập "paid" ngay lập tức như trước) — vẫn giữ thêm 1 phương thức "demo" để test nhanh bằng Postman không cần trình duyệt.
- Mỗi khóa học có cấu trúc **Chương (section) → Bài học (lesson)**, mỗi bài học có 1 trong 3 loại: `video`, `content` (bài đọc/text), `quiz` (câu hỏi trắc nghiệm ngắn).
- Học viên đã enroll học từng bài, đánh dấu hoàn thành, làm quiz, hệ thống tính **% tiến độ (progress)** của khóa học.
- Phía Instructor: form tạo/sửa khóa học có thêm khu vực **quản lý nội dung** (thêm/sửa/xóa chương, bài học, câu hỏi quiz).

### 13.2 Cập nhật cơ sở dữ liệu

#### ALTER bảng `orders` (đã có ở mục 4)
```sql
ALTER TABLE orders ADD COLUMN coupon_id INTEGER REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN payment_method TEXT; -- 'momo' | 'vnpay' | 'demo'
-- orders.status bổ sung giá trị 'failed' ngoài 'pending' | 'paid' | 'cancelled'
```
> **Lưu ý quan trọng**: với luồng thanh toán thật (MoMo/VNPay), `POST /api/orders/checkout` giờ chỉ **tạo đơn hàng ở trạng thái `pending`**, KHÔNG tạo `enrollment` ngay. `enrollment` chỉ được tạo khi thanh toán thành công (qua IPN/callback hoặc qua phương thức `demo`). Xem chi tiết ở mục 13.4.

#### Bảng `coupons` (mới)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| code | TEXT UNIQUE NOT NULL | mã coupon, viết hoa, ví dụ `SALE50` |
| description | TEXT | |
| discount_type | TEXT CHECK IN ('percent','fixed') | giảm theo % hoặc số tiền cố định |
| discount_value | REAL NOT NULL | % (0-100) hoặc số tiền VNĐ |
| max_discount | REAL | trần giảm tối đa, chỉ áp dụng khi discount_type='percent' (NULL = không giới hạn) |
| min_order_amount | REAL DEFAULT 0 | đơn hàng phải đạt giá trị tối thiểu này mới áp dụng được |
| usage_limit | INTEGER | tổng số lượt dùng tối đa (NULL = không giới hạn) |
| used_count | INTEGER DEFAULT 0 | số lượt đã dùng |
| valid_from | TEXT NOT NULL | ISO datetime, coupon có hiệu lực từ |
| valid_to | TEXT NOT NULL | ISO datetime, hết hạn sau thời điểm này |
| status | TEXT DEFAULT 'active' CHECK IN ('active','inactive') | admin có thể tắt thủ công |
| created_at | TEXT | |

#### Bảng `payments` (mới)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| order_id | INTEGER REFERENCES orders(id) | |
| method | TEXT CHECK IN ('momo','vnpay','demo') | |
| amount | REAL NOT NULL | |
| request_id | TEXT | mã request gửi sang cổng thanh toán |
| transaction_id | TEXT | mã giao dịch phía cổng thanh toán trả về |
| status | TEXT DEFAULT 'pending' CHECK IN ('pending','success','failed') | |
| gateway_response | TEXT | lưu nguyên JSON response/callback để debug |
| created_at | TEXT | |
| updated_at | TEXT | |

#### Bảng `course_sections` (mới — Chương)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| course_id | INTEGER REFERENCES courses(id) | |
| title | TEXT NOT NULL | ví dụ "Chương 1: Giới thiệu" |
| position | INTEGER DEFAULT 0 | thứ tự hiển thị |
| created_at | TEXT | |

#### Bảng `lessons` (mới — Bài học)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| section_id | INTEGER REFERENCES course_sections(id) | |
| course_id | INTEGER REFERENCES courses(id) | trùng dữ liệu có chủ đích, để query nhanh không cần join qua section |
| title | TEXT NOT NULL | |
| type | TEXT CHECK IN ('video','content','quiz') | |
| video_url | TEXT | dùng khi type='video' (link YouTube/mp4) |
| content_body | TEXT | dùng khi type='content' (text/HTML/markdown) |
| duration_seconds | INTEGER | ước lượng thời lượng, optional |
| position | INTEGER DEFAULT 0 | thứ tự trong chương |
| is_preview | INTEGER DEFAULT 0 | 1 = học viên chưa mua vẫn xem được (bài học thử) |
| created_at | TEXT | |

#### Bảng `quiz_questions` (mới)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| lesson_id | INTEGER REFERENCES lessons(id) | lesson.type phải là 'quiz' |
| question_text | TEXT NOT NULL | |
| options | TEXT NOT NULL | chuỗi JSON mảng, ví dụ `["A","B","C","D"]` |
| correct_index | INTEGER NOT NULL | index đáp án đúng trong `options` (0-based) |
| position | INTEGER DEFAULT 0 | |

#### Bảng `lesson_progress` (mới)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| user_id | INTEGER REFERENCES users(id) | |
| lesson_id | INTEGER REFERENCES lessons(id) | |
| course_id | INTEGER REFERENCES courses(id) | |
| is_completed | INTEGER DEFAULT 0 | 0/1 |
| quiz_score | REAL | % đúng, chỉ có khi lesson.type='quiz' |
| completed_at | TEXT | |
| UNIQUE(user_id, lesson_id) | | mỗi học viên có tối đa 1 dòng progress / bài học |

> `% tiến độ khóa học` = (số lesson có `is_completed=1` của user trong course) / (tổng số lesson của course) × 100 — tính động (query on-the-fly), không cache trong bảng `enrollments` để tránh lệch dữ liệu.

---

### 13.3 Coupon giảm giá — API

#### `POST /api/admin/coupons` — Admin tạo coupon
**Request body:**
```json
{
  "code": "SALE50",
  "description": "Giảm 50% tối đa 100k cho đơn từ 200k",
  "discount_type": "percent",
  "discount_value": 50,
  "max_discount": 100000,
  "min_order_amount": 200000,
  "usage_limit": 100,
  "valid_from": "2026-07-01T00:00:00.000Z",
  "valid_to": "2026-08-31T23:59:59.000Z"
}
```
**Response 201:**
```json
{ "success": true, "message": "Tạo coupon thành công", "data": { "id": 1, "code": "SALE50", "status": "active" } }
```
**Lỗi:** `400` thiếu field bắt buộc (code, discount_type, discount_value, valid_from, valid_to) hoặc `discount_type` không hợp lệ | `409` code đã tồn tại

---

#### `GET /api/admin/coupons` — Admin xem danh sách
**Query params optional:** `status`
**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1, "code": "SALE50", "discount_type": "percent", "discount_value": 50,
      "max_discount": 100000, "min_order_amount": 200000,
      "usage_limit": 100, "used_count": 12,
      "valid_from": "2026-07-01T00:00:00.000Z", "valid_to": "2026-08-31T23:59:59.000Z",
      "status": "active", "created_at": "2026-07-01T00:00:00.000Z"
    }
  ]
}
```

---

#### `PUT /api/admin/coupons/:id` — Admin sửa coupon
**Request body** (tất cả optional): giống các field ở trên, thêm `status`
**Response 200:** `{ "success": true, "message": "Cập nhật coupon thành công", "data": { ... } }`
**Lỗi:** `404` không tìm thấy | `409` code mới bị trùng

---

#### `DELETE /api/admin/coupons/:id` — Admin xóa coupon
**Response 200:** `{ "success": true, "message": "Đã xóa coupon" }`
**Lỗi:** `404` không tìm thấy

---

#### `POST /api/coupons/validate` — Học viên kiểm tra mã trước khi checkout
**Role**: Student (authenticate)
**Request body:**
```json
{ "code": "SALE50" }
```
> Server tự tính `subtotal` từ giỏ hàng hiện tại của `req.user.id`.

**Response 200 (hợp lệ):**
```json
{
  "success": true,
  "data": {
    "code": "SALE50",
    "subtotal": 598000,
    "discount_amount": 100000,
    "total_amount": 498000
  }
}
```
**Lỗi (mã không dùng được, vẫn trả 400 kèm lý do rõ ràng):**
- `404` mã không tồn tại — `"Mã giảm giá không tồn tại"`
- `400` `status='inactive'` — `"Mã giảm giá đã bị vô hiệu hóa"`
- `400` ngoài khoảng `valid_from`–`valid_to` — `"Mã giảm giá đã hết hạn hoặc chưa có hiệu lực"`
- `400` `used_count >= usage_limit` — `"Mã giảm giá đã hết lượt sử dụng"`
- `400` `subtotal < min_order_amount` — `"Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã này"`
- `400` giỏ hàng trống — `"Giỏ hàng trống"`

**Công thức tính `discount_amount`:**
- `discount_type='fixed'` → `discount_amount = discount_value` (không vượt quá `subtotal`)
- `discount_type='percent'` → `discount_amount = subtotal * discount_value / 100`, nếu có `max_discount` thì lấy `min(discount_amount, max_discount)`

---

### 13.4 Thanh toán sandbox MoMo & VNPay — API

> **Cập nhật luồng checkout**: tách `checkout` (tạo đơn hàng) ra khỏi `thanh toán` (xác nhận tiền vào). Đơn hàng sinh ra ở trạng thái `pending`; chỉ khi thanh toán thành công (callback từ cổng, hoặc phương thức `demo`) hệ thống mới tạo `enrollment`, xóa giỏ hàng, và cộng `used_count` cho coupon.

#### `POST /api/orders/checkout` — Tạo đơn hàng (CẬP NHẬT so với mục 7.3)
**Role**: Student
**Request body:**
```json
{ "coupon_code": "SALE50" }
```
> `coupon_code` optional. Không xóa giỏ hàng ở bước này (giữ lại để có thể hủy/tạo lại nếu người dùng đổi ý trước khi thanh toán).

**Response 201:**
```json
{
  "success": true,
  "message": "Đã tạo đơn hàng, vui lòng chọn phương thức thanh toán",
  "data": {
    "order_id": 10,
    "subtotal": 598000,
    "discount_amount": 100000,
    "total_amount": 498000,
    "status": "pending"
  }
}
```
**Lỗi:** `400` giỏ hàng trống | các lỗi coupon như mục 13.3 nếu `coupon_code` không hợp lệ

---

#### `POST /api/payments/demo/pay` — Thanh toán giả lập tức thì (dùng để test nhanh bằng Postman)
**Role**: Student
**Request body:** `{ "order_id": 10 }`
**Xử lý (transaction):**
1. Kiểm tra order thuộc về user, `status='pending'` (nếu không → `400`/`403`/`404` tương ứng)
2. Tạo `payments` row: method='demo', status='success'
3. Cập nhật `orders.status='paid'`, `payment_method='demo'`
4. `INSERT OR IGNORE` từng course trong đơn vào `enrollments`
5. Nếu đơn có `coupon_id` → `used_count += 1`
6. Xóa `cart_items` của user

**Response 200:**
```json
{ "success": true, "message": "Thanh toán thành công (demo)", "data": { "order_id": 10, "status": "paid" } }
```

---

#### `POST /api/payments/momo/create` — Tạo yêu cầu thanh toán MoMo sandbox
**Role**: Student
**Request body:** `{ "order_id": 10 }`

**Cấu hình sandbox (.env), dùng bộ test công khai của MoMo cho môi trường thử nghiệm:**
```
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=http://localhost:3000/api/payments/momo/return
MOMO_IPN_URL=http://localhost:3000/api/payments/momo/ipn
```
> Đây là bộ khóa test công khai MoMo cấp cho môi trường sandbox học tập/demo (không dùng cho giao dịch thật). Chữ ký `signature` ký bằng **HMAC SHA256** trên chuỗi `accessKey=...&amount=...&extraData=...&ipnUrl=...&orderId=...&orderInfo=...&partnerCode=...&redirectUrl=...&requestId=...&requestType=...` theo đúng thứ tự tham số này.

**Xử lý:**
1. Lấy order, kiểm tra thuộc user + `status='pending'`
2. Sinh `orderId` gửi MoMo = `MOMO<order_id>-<timestamp>` (MoMo yêu cầu orderId không trùng), `requestId` tương tự
3. Gọi API MoMo (`requestType: "captureWallet"`) với `amount = order.total_amount`
4. Lưu `payments` row: method='momo', status='pending', request_id
5. Trả về `payUrl` do MoMo cung cấp để frontend redirect sang trang thanh toán MoMo

**Response 200:**
```json
{ "success": true, "data": { "payUrl": "https://test-payment.momo.vn/v2/gateway/pay?...", "orderId": "MOMO10-1721000000000" } }
```
**Lỗi:** `404` order không tồn tại | `403` không thuộc user | `400` order không ở trạng thái pending | `502` lỗi gọi API MoMo

---

#### `POST /api/payments/momo/ipn` — MoMo gọi về khi có kết quả (Server-to-Server)
**Role**: Public (được MoMo gọi, không phải người dùng)
- Xác thực lại `signature` trong body bằng `MOMO_SECRET_KEY` — sai chữ ký → trả `204` và không xử lý
- `resultCode === 0` → thanh toán thành công: cập nhật `payments.status='success'`, `orders.status='paid'`, tạo `enrollments`, `used_count += 1` (nếu có coupon), xóa `cart_items`
- `resultCode !== 0` → `payments.status='failed'`, `orders.status='failed'`
- Luôn phản hồi MoMo bằng `204 No Content`

#### `GET /api/payments/momo/return` — Trang chuyển hướng sau khi thanh toán (trình duyệt)
- Đọc query string MoMo trả về, xác thực chữ ký, redirect người dùng về `frontend/payment-result.html?orderId=...&status=...`

---

#### `POST /api/payments/vnpay/create` — Tạo URL thanh toán VNPay sandbox
**Role**: Student
**Request body:** `{ "order_id": 10 }`

**Cấu hình sandbox (.env):**
```
VNPAY_TMN_CODE=<đăng ký tại https://sandbox.vnpayment.vn/devreg/>
VNPAY_HASH_SECRET=<đăng ký tại https://sandbox.vnpayment.vn/devreg/>
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/api/payments/vnpay/return
```
> **Khác với MoMo, VNPay KHÔNG có bộ khóa test dùng chung công khai** — cần tự đăng ký merchant sandbox miễn phí tại `sandbox.vnpayment.vn/devreg` để lấy `vnp_TmnCode` và `vnp_HashSecret` (email phản hồi tự động, kèm thẻ ngân hàng test để nhập OTP giả lập khi thanh toán). Trước khi có key thật, có thể để `.env` trống và ưu tiên test bằng MoMo hoặc `demo`.

**Xử lý:**
1. Lấy order, kiểm tra thuộc user + `status='pending'`
2. Build query params: `vnp_Version=2.1.0, vnp_Command=pay, vnp_TmnCode, vnp_Amount=<total_amount*100> (VNPay yêu cầu nhân 100, không thập phân), vnp_CurrCode=VND, vnp_TxnRef=<order_id>-<timestamp>, vnp_OrderInfo, vnp_OrderType=other, vnp_Locale=vn, vnp_ReturnUrl, vnp_IpAddr, vnp_CreateDate=<yyyyMMddHHmmss giờ VN>`
3. Sắp xếp key theo alphabet, nối thành `signData`, ký **HMAC SHA512** bằng `VNPAY_HASH_SECRET` → `vnp_SecureHash`
4. Lưu `payments` row: method='vnpay', status='pending'
5. Trả `payUrl = VNPAY_URL + '?' + querystring + '&vnp_SecureHash=' + hash`

**Response 200:**
```json
{ "success": true, "data": { "payUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..." } }
```
**Lỗi:** giống MoMo create

---

#### `GET /api/payments/vnpay/ipn` — VNPay gọi về xác nhận (query string, GET)
**Role**: Public
- Lấy toàn bộ `vnp_*` params, tách `vnp_SecureHash`, sort lại các key còn lại, build `signData`, tính lại HMAC SHA512, so sánh
- Sai chữ ký → trả `{ "RspCode": "97", "Message": "Invalid signature" }`
- Đúng chữ ký + `vnp_ResponseCode === '00'` → thanh toán thành công (cập nhật tương tự MoMo IPN ở trên) → trả `{ "RspCode": "00", "Message": "Confirm Success" }`
- Khác `'00'` → `payments.status='failed'`, `orders.status='failed'` → trả `{ "RspCode": "00", "Message": "Confirm Success" }` (vẫn phải trả 00 để xác nhận đã nhận được, theo đúng chuẩn VNPay)

#### `GET /api/payments/vnpay/return` — Trang chuyển hướng trình duyệt
- Tương tự MoMo return, redirect về `frontend/payment-result.html?orderId=...&status=...`

---

#### `GET /api/payments/:orderId/status` — Poll trạng thái thanh toán
**Role**: Student (chỉ xem đơn của mình)
**Response 200:**
```json
{ "success": true, "data": { "order_id": 10, "status": "paid", "payment_method": "momo", "total_amount": 498000 } }
```
> Dùng cho frontend polling khi đang chờ callback (setInterval 2-3 giây, dừng khi status khác 'pending').

---

### 13.5 Nội dung khóa học (Content/Video/Quiz) — API

#### Phía Instructor (authenticate + authorize('instructor'), chỉ thao tác trên khóa học của chính mình)

`GET /api/instructor/courses/:courseId/sections` — lấy toàn bộ chương + bài học (kèm câu hỏi quiz nếu type='quiz') để hiển thị màn hình quản lý nội dung
```json
{
  "success": true,
  "data": [
    {
      "id": 1, "title": "Chương 1: Giới thiệu", "position": 0,
      "lessons": [
        { "id": 1, "title": "Video giới thiệu khóa học", "type": "video", "video_url": "https://...", "duration_seconds": 300, "position": 0, "is_preview": 1 },
        { "id": 2, "title": "Quiz kiểm tra nhanh", "type": "quiz", "position": 1, "is_preview": 0,
          "questions": [ { "id": 1, "question_text": "...", "options": ["A","B","C","D"], "correct_index": 1, "position": 0 } ] }
      ]
    }
  ]
}
```

`POST /api/instructor/courses/:courseId/sections` — Body: `{ "title", "position" }` → 201, tạo chương mới
`PUT /api/instructor/sections/:id` — Body: `{ "title", "position" }` (optional) → 200
`DELETE /api/instructor/sections/:id` — xóa chương + toàn bộ lesson/quiz bên trong (transaction) → 200

`POST /api/instructor/sections/:sectionId/lessons` — Body:
```json
{ "title": "Bài 1", "type": "video", "video_url": "https://...", "duration_seconds": 300, "is_preview": false, "position": 0 }
```
> `type='content'` thì gửi `content_body` thay vì `video_url`. `type='quiz'` không cần `video_url`/`content_body`, câu hỏi thêm riêng ở endpoint bên dưới. `title` và `type` bắt buộc; `type` phải thuộc `video|content|quiz` → sai → `400`.
→ 201, trả về lesson vừa tạo

`PUT /api/instructor/lessons/:id` — cập nhật field bất kỳ (optional) → 200
`DELETE /api/instructor/lessons/:id` — xóa lesson + quiz_questions liên quan + lesson_progress liên quan → 200

`POST /api/instructor/lessons/:lessonId/questions` — Body (chỉ khi lesson.type='quiz'):
```json
{ "question_text": "HTML là gì?", "options": ["Ngôn ngữ lập trình", "Ngôn ngữ đánh dấu", "Hệ quản trị CSDL", "Framework"], "correct_index": 1, "position": 0 }
```
- `correct_index` phải nằm trong khoảng hợp lệ của `options` → sai → `400`
- lesson.type != 'quiz' → `400` "Bài học này không phải dạng quiz"
→ 201

`PUT /api/instructor/questions/:id` — sửa câu hỏi (optional field) → 200
`DELETE /api/instructor/questions/:id` — xóa câu hỏi → 200

> Toàn bộ endpoint trên: nếu `course`/`section`/`lesson`/`question` không thuộc instructor đang đăng nhập → `403`; không tồn tại → `404`.

---

#### Phía Student / Public (xem nội dung)

`GET /api/courses/:id/sections` — Public, nhưng nội dung trả về khác nhau tùy trạng thái:
- Nếu **chưa đăng nhập** hoặc **chưa enroll**: mỗi lesson chỉ trả `{ id, title, type, position, is_preview, duration_seconds }`; nếu `is_preview=1` thì trả thêm `video_url`/`content_body` (xem thử miễn phí), nếu `is_preview=0` thì các field nội dung là `null` (khóa)
- Nếu **đã enroll** (hoặc là chính instructor của khóa/admin): trả đầy đủ nội dung mọi lesson, kèm `questions` (không kèm `correct_index` để tránh lộ đáp án) và kèm `progress: { is_completed, quiz_score }` của user cho từng lesson

```json
{
  "success": true,
  "data": {
    "enrolled": true,
    "progress_percent": 40,
    "sections": [
      {
        "id": 1, "title": "Chương 1: Giới thiệu",
        "lessons": [
          { "id": 1, "title": "Video giới thiệu", "type": "video", "video_url": "https://...", "is_preview": true,
            "progress": { "is_completed": true, "quiz_score": null } },
          { "id": 2, "title": "Quiz nhanh", "type": "quiz",
            "questions": [ { "id": 1, "question_text": "...", "options": ["A","B","C","D"] } ],
            "progress": { "is_completed": false, "quiz_score": null } }
        ]
      }
    ]
  }
}
```

`POST /api/lessons/:id/complete` — Student, đánh dấu hoàn thành bài học loại `video`/`content`
- Chỉ cho phép nếu user đã enroll khóa học chứa lesson này → không thì `403` "Bạn chưa mua khóa học này"
- `INSERT OR REPLACE` vào `lesson_progress` với `is_completed=1, completed_at=now`
- Response 200: `{ success: true, message: "Đã đánh dấu hoàn thành", data: { progress_percent: 45 } }` (trả kèm % tiến độ mới của cả khóa)

`POST /api/lessons/:id/submit-quiz` — Student, nộp bài quiz
**Body:**
```json
{ "answers": [ { "question_id": 1, "selected_index": 1 }, { "question_id": 2, "selected_index": 0 } ] }
```
- lesson.type != 'quiz' → `400`
- Chưa enroll → `403`
- Chấm điểm: `quiz_score = (số câu đúng / tổng số câu) * 100`
- Lưu vào `lesson_progress`: `is_completed = (quiz_score >= 50 ? 1 : 0)` (ngưỡng đạt có thể chỉnh), `quiz_score`, `completed_at`
- Response 200:
```json
{ "success": true, "data": { "quiz_score": 100, "is_completed": true, "correct_count": 2, "total_questions": 2, "progress_percent": 60 } }
```

`GET /api/enrollments/:courseId/progress` — Student, xem nhanh % tiến độ 1 khóa đã mua (dùng cho trang "Khóa học của tôi")
**Response 200:**
```json
{ "success": true, "data": { "course_id": 1, "total_lessons": 10, "completed_lessons": 4, "progress_percent": 40 } }
```
**Lỗi:** `403` chưa enroll khóa này

> **Cập nhật `GET /api/enrollments`** (mục 7.3): mỗi phần tử trả kèm `progress_percent` để hiển thị thanh tiến độ ngay ở trang "Khóa học của tôi" mà không cần gọi thêm API.

---

### 13.6 Cập nhật giai đoạn triển khai

### Giai đoạn 7 — Coupon giảm giá (0.5 ngày)
- [ ] Bảng `coupons`, migrate cột mới cho `orders`
- [ ] API admin CRUD coupon
- [ ] API `POST /api/coupons/validate`
- [ ] Cập nhật `POST /api/orders/checkout` để nhận `coupon_code`

### Giai đoạn 8 — Nội dung khóa học & Tiến độ học (1.5 ngày)
- [ ] Bảng `course_sections`, `lessons`, `quiz_questions`, `lesson_progress`
- [ ] API Instructor CRUD chương/bài học/câu hỏi quiz
- [ ] API Student xem nội dung theo quyền (preview / đã enroll)
- [ ] API đánh dấu hoàn thành bài học, nộp quiz, tính progress
- [ ] Frontend: khu vực "Quản lý nội dung" trong `instructor-course-form.html`
- [ ] Frontend: trang học `learn.html?courseId=X` cho student (danh sách chương/bài, video player, quiz UI, thanh tiến độ)

### Giai đoạn 9 — Thanh toán sandbox MoMo/VNPay (1 ngày)
- [ ] Bảng `payments`
- [ ] Tách `checkout` (tạo order pending) khỏi bước thanh toán
- [ ] API `POST /api/payments/demo/pay` (test nhanh Postman)
- [ ] API MoMo: create / ipn / return (dùng bộ key sandbox công khai của MoMo)
- [ ] API VNPay: create / ipn / return (cần đăng ký merchant sandbox riêng tại sandbox.vnpayment.vn/devreg)
- [ ] API `GET /api/payments/:orderId/status`
- [ ] Frontend: `checkout.html` thêm ô nhập coupon + chọn phương thức thanh toán, trang `payment-result.html`

### Giai đoạn 10 — Hoàn thiện Giai đoạn 2 (0.5 ngày)
- [ ] Test toàn bộ luồng: tạo nội dung (instructor) → học viên mua → thanh toán MoMo/VNPay/demo → học bài → làm quiz → xem tiến độ
- [ ] Test coupon: hết hạn, hết lượt, dưới min_order_amount
- [ ] Cập nhật README + Postman Collection

---

### 13.7 Cập nhật cấu trúc thư mục

```
coursedemy/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js        # thêm CREATE TABLE cho 5 bảng mới + ALTER orders
│   │   ├── routes/
│   │   │   ├── coupons.routes.js        # mới
│   │   │   ├── payments.routes.js       # mới (demo/momo/vnpay)
│   │   │   ├── content.routes.js        # mới (sections/lessons/questions, cả instructor & public)
│   │   │   └── progress.routes.js       # mới (complete lesson, submit quiz, progress)
│   │   ├── controllers/
│   │   │   ├── coupons.controller.js
│   │   │   ├── payments.controller.js
│   │   │   ├── content.controller.js
│   │   │   └── progress.controller.js
│   │   └── utils/
│   │       ├── momo.util.js       # build request + verify signature MoMo
│   │       └── vnpay.util.js      # build query + verify signature VNPay
├── frontend/
│   ├── instructor-course-form.html   # cập nhật: thêm tab "Nội dung khóa học"
│   ├── learn.html                    # mới: trang học (?courseId=X)
│   ├── checkout.html                 # cập nhật: ô coupon + chọn phương thức
│   ├── payment-result.html           # mới: trang kết quả sau redirect MoMo/VNPay
│   └── admin-coupons.html            # mới: admin quản lý coupon
```

### 13.8 Cập nhật seed dữ liệu (Giai đoạn 2)

- Thêm 2 coupon mẫu:
  - `WELCOME10` — percent 10%, max_discount 50000, min_order_amount 0, usage_limit 50, còn hiệu lực
  - `EXPIRED20` — percent 20%, `valid_to` là ngày trong quá khứ (để test case coupon hết hạn)
- Với khóa học "Lập trình Python cơ bản": seed sẵn 2 chương, mỗi chương 2-3 bài học (ít nhất 1 video, 1 content, 1 quiz có 2 câu hỏi) để có dữ liệu demo ngay khi chạy `seed.js`

### 13.9 Test case bổ sung (Postman)

| STT | Test case | Endpoint | Kết quả mong đợi |
|---|---|---|---|
| 16 | Áp coupon hết hạn | POST /api/coupons/validate | 400 – mã đã hết hạn |
| 17 | Áp coupon khi đơn chưa đạt min_order_amount | POST /api/coupons/validate | 400 – chưa đạt giá trị tối thiểu |
| 18 | Checkout kèm coupon hợp lệ | POST /api/orders/checkout | 201 – total_amount đã trừ giảm giá, status=pending |
| 19 | Thanh toán demo cho order pending | POST /api/payments/demo/pay | 200 – order.status=paid, có enrollment |
| 20 | Tạo yêu cầu thanh toán MoMo | POST /api/payments/momo/create | 200 – trả về payUrl hợp lệ |
| 21 | IPN MoMo sai chữ ký | POST /api/payments/momo/ipn | Không cập nhật order, trả 204 |
| 22 | Instructor thêm chương + bài học video | POST /api/instructor/courses/:id/sections, POST .../lessons | 201 |
| 23 | Student xem nội dung khi chưa mua | GET /api/courses/:id/sections | Lesson không phải preview → nội dung null |
| 24 | Student xem nội dung sau khi mua | GET /api/courses/:id/sections | Trả đầy đủ nội dung mọi lesson |
| 25 | Đánh dấu hoàn thành bài học khi chưa mua | POST /api/lessons/:id/complete | 403 – chưa mua khóa học |
| 26 | Nộp quiz và tính điểm | POST /api/lessons/:id/submit-quiz | 200 – quiz_score đúng theo số câu đúng |
| 27 | Xem tiến độ khóa học sau khi hoàn thành 1 vài bài | GET /api/enrollments/:courseId/progress | progress_percent tăng đúng tỉ lệ |
