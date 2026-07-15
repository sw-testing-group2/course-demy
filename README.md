# CourseDemy — Website Bán Khóa Học Online

**CourseDemy** là một hệ thống website bán khóa học online đầy đủ tính năng. Dự án cung cấp **REST API** rõ ràng phục vụ học tập, thực hành và kiểm thử phần mềm (đặc biệt kiểm thử API bằng **Postman**), đồng thời bao gồm **Frontend** hoàn chỉnh (HTML/CSS/JS thuần).

---

## 🚀 Công Nghệ Sử Dụng

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| **Backend** | Node.js + Express.js | RESTful API gọn nhẹ, hiệu năng tốt |
| **Database** | SQLite (file `database.sqlite`) | Quan hệ dạng file, không cần cài server DB |
| **Database Driver** | better-sqlite3 | Kết nối đồng bộ, dễ viết query và debug |
| **Xác thực & Phân quyền** | JWT (`jsonwebtoken`) + `bcrypt` | Phân quyền 3 vai trò: Student / Instructor / Admin |
| **HTTP Client** | axios | Gọi API cổng thanh toán MoMo (sandbox) |
| **Upload File** | multer | Lưu ảnh thumbnail cục bộ tại `/uploads` |
| **Frontend** | HTML + CSS + JavaScript thuần | Fetch API, không dùng framework |

---

## 📂 Cấu Trúc Dự Án

```text
KTPM/
├── coursedemy/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── database.js        # Migration tự động khi khởi động
│   │   │   ├── controllers/           # Logic xử lý cho mỗi module
│   │   │   ├── middlewares/           # authenticate.js, authorize.js, optionalAuth.js
│   │   │   ├── routes/                # Route definitions
│   │   │   └── utils/
│   │   │       ├── momo.util.js       # HMAC-SHA256 signature cho MoMo
│   │   │       └── vnpay.util.js      # HMAC-SHA512 URL builder cho VNPay
│   │   │   └── app.js                 # Entry point Express server
│   │   ├── database.sqlite            # Sinh ra sau khi chạy lần đầu
│   │   ├── seed.js                    # Reset & khởi tạo dữ liệu mẫu
│   │   ├── .env                       # Biến môi trường (xem bên dưới)
│   │   ├── .env.example               # Template cấu hình
│   │   └── package.json
│   │
│   └── frontend/
│       ├── css/style.css              # Design system dark-mode
│       ├── js/api.js                  # apiFetch, auth helpers, toast, spinner
│       ├── index.html                 # Trang chủ khóa học
│       ├── login.html / register.html
│       ├── course.html                # Chi tiết khóa học
│       ├── cart.html / checkout.html  # Giỏ hàng & Thanh toán
│       ├── my-courses.html            # Khóa học đã mua + tiến độ
│       ├── learn.html                 # Giao diện học tập (video/content/quiz)
│       ├── payment-result.html        # Kết quả thanh toán (polling)
│       ├── profile.html
│       ├── instructor.html            # Instructor Dashboard
│       ├── instructor-course-form.html # Tạo/sửa khóa học + quản lý nội dung
│       ├── instructor-students.html
│       ├── admin.html                 # Admin Dashboard
│       ├── admin-courses.html         # Duyệt khóa học
│       ├── admin-users.html           # Quản lý người dùng
│       ├── admin-categories.html      # Quản lý danh mục
│       └── admin-coupons.html         # Quản lý mã giảm giá
│
├── README.md                          # Tài liệu này
├── HUONGDAN_CHAY_VA_TEST.md           # Hướng dẫn chạy & 58+ testcase Postman
└── KeHoach_CourseDemy_v2.md           # Kế hoạch chi tiết & thiết kế DB
```

---

## 👥 Vai Trò & Quyền Hạn

| Vai trò | Quyền hạn chính |
|---|---|
| **Student** | Xem khóa học, giỏ hàng, thanh toán (MoMo/VNPay/Demo), áp dụng coupon, xem nội dung bài học, làm quiz, theo dõi tiến độ |
| **Instructor** | Quản lý khóa học của mình, tạo/sửa/xóa chương (section), bài học (video/bài đọc/quiz), câu hỏi quiz; xem danh sách học viên |
| **Admin** | Duyệt/từ chối khóa học, quản lý người dùng (lock/unlock), danh mục, mã giảm giá (coupon) |

---

## 🛠️ Hướng Dẫn Khởi Chạy

### Yêu cầu
- **Node.js** v18+ | **npm** v9+ | **Postman** (để test API)

### 1. Cài đặt

```bash
cd coursedemy/backend
npm install
```

### 2. Cấu hình `.env`

File `.env` đã có sẵn. Nội dung mặc định:

```env
PORT=3000
JWT_SECRET=coursedemy_secret_key
FRONTEND_URL=http://localhost:3000

# MoMo Sandbox (dùng được ngay — public test keys)
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=http://localhost:3000/api/payments/momo/return
MOMO_IPN_URL=http://localhost:3000/api/payments/momo/ipn

# VNPay Sandbox (cần đăng ký tại sandbox.vnpayment.vn/devreg)
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/api/payments/vnpay/return
```

> **MoMo**: dùng được ngay với key mặc định (sandbox học tập).  
> **VNPay**: cần đăng ký merchant test miễn phí tại [sandbox.vnpayment.vn/devreg](https://sandbox.vnpayment.vn/devreg), sau đó điền `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET`. Nếu chưa cấu hình, API trả lỗi 503 thay vì crash.

### 3. Seed dữ liệu mẫu (lần đầu hoặc khi muốn reset)

```bash
node seed.js
```

**Tài khoản mặc định:**

| Vai trò | Email | Mật khẩu |
|---|---|---|
| **Admin** | `admin@coursedemy.com` | `admin123` |
| **Instructor 1** | `instructor1@example.com` | `123456` |
| **Instructor 2** | `instructor2@example.com` | `123456` |
| **Student 1** | `student1@example.com` | `123456` |
| **Student 2** | `student2@example.com` | `123456` |
| **Student 3** | `student3@example.com` | `123456` |

### 4. Khởi động server

```bash
node src/app.js
# hoặc trong dev mode:
npm run dev
```

Output mong đợi:
```
Database connected
Server running on port 3000
```

### 5. Truy cập

Frontend được serve trực tiếp từ backend:

| Trang | URL |
|---|---|
| Trang chủ | http://localhost:3000 |
| Đăng nhập | http://localhost:3000/login.html |
| Giỏ hàng | http://localhost:3000/cart.html |
| Thanh toán | http://localhost:3000/checkout.html |
| Học tập | http://localhost:3000/learn.html?courseId=1 |
| Khóa học của tôi | http://localhost:3000/my-courses.html |
| Kết quả thanh toán | http://localhost:3000/payment-result.html |
| Instructor Dashboard | http://localhost:3000/instructor.html |
| Quản lý nội dung KH | http://localhost:3000/instructor-course-form.html?id=1 |
| Admin Dashboard | http://localhost:3000/admin.html |
| Quản lý Coupon | http://localhost:3000/admin-coupons.html |

### 6. Reset dữ liệu

```bash
# Windows
del backend\database.sqlite
node seed.js
node src/app.js
```

---

## 📡 Danh Sách API

### Auth

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Đăng ký (student/instructor) |
| POST | `/api/auth/login` | Public | Đăng nhập → trả JWT token |
| GET | `/api/auth/me` | Any | Thông tin tài khoản hiện tại |
| PUT | `/api/auth/profile` | Any | Cập nhật hồ sơ |

### Courses & Categories (Public)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/categories` | Public | Danh sách danh mục |
| GET | `/api/courses` | Public | Danh sách khóa học (search, filter, page) |
| GET | `/api/courses/:id` | Public | Chi tiết khóa học |
| GET | `/api/courses/:id/sections` | Optional Auth | Nội dung khóa học (enrolled/preview) |

### Cart, Orders, Enrollments (Student)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET/POST | `/api/cart` | Student | Xem / Thêm vào giỏ |
| DELETE | `/api/cart/:courseId` | Student | Xóa khỏi giỏ |
| POST | `/api/orders/checkout` | Student | Tạo đơn hàng pending (có thể kèm `coupon_code`) |
| GET | `/api/orders` | Student | Lịch sử đơn hàng |
| GET | `/api/enrollments` | Student | Khóa học đã mua (kèm `progress_percent`) |
| GET | `/api/enrollments/:courseId/progress` | Student | Tiến độ học của 1 khóa |

### Coupon

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/api/coupons/validate` | Student | Kiểm tra & tính giảm giá |
| GET | `/api/admin/coupons` | Admin | Danh sách coupon |
| POST | `/api/admin/coupons` | Admin | Tạo coupon |
| PUT | `/api/admin/coupons/:id` | Admin | Cập nhật coupon |
| DELETE | `/api/admin/coupons/:id` | Admin | Xóa coupon |

### Thanh toán (Student)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/api/payments/demo/pay` | Student | Thanh toán tức thì (test) |
| POST | `/api/payments/momo/create` | Student | Tạo link MoMo → `payUrl` |
| POST | `/api/payments/momo/ipn` | Public | IPN callback từ MoMo |
| GET | `/api/payments/momo/return` | Public | Redirect sau thanh toán MoMo |
| POST | `/api/payments/vnpay/create` | Student | Tạo link VNPay → `payUrl` |
| GET | `/api/payments/vnpay/ipn` | Public | IPN callback từ VNPay |
| GET | `/api/payments/vnpay/return` | Public | Redirect sau thanh toán VNPay |
| GET | `/api/payments/:orderId/status` | Student | Trạng thái đơn hàng |

### Nội dung khóa học & Tiến độ (Student)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/api/lessons/:id/complete` | Student | Đánh dấu hoàn thành bài học |
| POST | `/api/lessons/:id/submit-quiz` | Student | Nộp bài quiz (tính điểm) |

### Instructor — Quản lý nội dung

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/instructor/courses` | Instructor | DS khóa học của mình |
| POST | `/api/instructor/courses` | Instructor | Tạo khóa học mới |
| PUT | `/api/instructor/courses/:id` | Instructor | Cập nhật thông tin |
| DELETE | `/api/instructor/courses/:id` | Instructor | Xóa khóa học |
| GET | `/api/instructor/courses/:id/students` | Instructor | DS học viên |
| GET | `/api/instructor/courses/:courseId/sections` | Instructor | Cây nội dung (sections + lessons + questions) |
| POST | `/api/instructor/courses/:courseId/sections` | Instructor | Tạo chương |
| PUT | `/api/instructor/sections/:id` | Instructor | Sửa chương |
| DELETE | `/api/instructor/sections/:id` | Instructor | Xóa chương (cascade) |
| POST | `/api/instructor/sections/:sectionId/lessons` | Instructor | Tạo bài học (video/content/quiz) |
| PUT | `/api/instructor/lessons/:id` | Instructor | Sửa bài học |
| DELETE | `/api/instructor/lessons/:id` | Instructor | Xóa bài học (cascade) |
| POST | `/api/instructor/lessons/:lessonId/questions` | Instructor | Thêm câu hỏi quiz |
| PUT | `/api/instructor/questions/:id` | Instructor | Sửa câu hỏi |
| DELETE | `/api/instructor/questions/:id` | Instructor | Xóa câu hỏi |

### Admin

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/admin/courses/pending` | Admin | DS khóa học chờ duyệt |
| PUT | `/api/admin/courses/:id/approve` | Admin | Duyệt khóa học |
| PUT | `/api/admin/courses/:id/reject` | Admin | Từ chối + lý do |
| GET | `/api/admin/users` | Admin | DS người dùng (filter role/status) |
| PUT | `/api/admin/users/:id/lock` | Admin | Khóa/Mở khóa tài khoản |
| POST/PUT/DELETE | `/api/admin/categories(/:id)` | Admin | Quản lý danh mục |

---

## 🧪 Kiểm Thử API với Postman

### Thiết lập Environment `CourseDemy Local`

| Variable | Giá trị | Ghi chú |
|---|---|---|
| `base_url` | `http://localhost:3000/api` | Base URL |
| `token_student` | *(tự điền sau login)* | JWT student |
| `token_instructor` | *(tự điền sau login)* | JWT instructor |
| `token_admin` | *(tự điền sau login)* | JWT admin |
| `course_id` | `1` | ID khóa học test |

**Auto-save token (tab Tests của request login):**
```javascript
if (pm.response.json().success) {
  pm.environment.set("token_student", pm.response.json().data.token);
}
```

> 📄 Xem **58+ testcase chi tiết** tại [HUONGDAN_CHAY_VA_TEST.md](./HUONGDAN_CHAY_VA_TEST.md)

---

## 🔄 Luồng Nghiệp Vụ Chính

### Luồng mua khóa học (có coupon + thanh toán)
```
Student đăng nhập
  → Thêm khóa học vào giỏ
  → POST /coupons/validate { code } (tùy chọn)
  → POST /orders/checkout { coupon_code } → nhận order_id (status=pending)
  → Chọn phương thức:
      Demo  → POST /payments/demo/pay         → enrolled ngay
      MoMo  → POST /payments/momo/create      → redirect payUrl → IPN → enrolled
      VNPay → POST /payments/vnpay/create     → redirect payUrl → IPN → enrolled
  → my-courses.html hiển thị khóa học + progress_percent
```

### Luồng học tập (Student)
```
learn.html?courseId=X
  → GET /courses/:id/sections (enrolled check)
  → Chọn bài học trong sidebar
      Video   → Xem → "Đánh dấu hoàn thành" → POST /lessons/:id/complete
      Content → Đọc → "Đánh dấu hoàn thành" → POST /lessons/:id/complete
      Quiz    → Trả lời → "Nộp bài" → POST /lessons/:id/submit-quiz → hiển thị điểm
  → Progress bar cập nhật realtime (không reload trang)
```

### Luồng Instructor tạo nội dung
```
instructor-course-form.html?id=X
  → Tạo/sửa thông tin khóa học cơ bản
  → Thêm chương (section)
  → Thêm bài học trong chương (video / bài đọc / quiz)
  → Với bài quiz: thêm câu hỏi + 2-4 lựa chọn + đánh dấu đáp án đúng
```

### Luồng Admin quản lý coupon
```
Admin tạo coupon (percent % hoặc fixed đ, giới hạn lượt dùng, thời hạn)
  → Student áp dụng tại trang checkout
  → Sau thanh toán thành công: used_count tự động tăng (trong transaction)
```

---

## 🗄️ Cấu Trúc Database

| Bảng | Mô tả |
|---|---|
| `users` | Tài khoản (student / instructor / admin) |
| `categories` | Danh mục khóa học |
| `courses` | Khóa học (pending / approved / rejected) |
| `cart_items` | Giỏ hàng |
| `orders` | Đơn hàng (pending / paid / failed) |
| `order_items` | Chi tiết đơn hàng |
| `enrollments` | Đăng ký học (UNIQUE user+course) |
| `coupons` | Mã giảm giá |
| `course_sections` | Chương của khóa học |
| `lessons` | Bài học (video / content / quiz) |
| `quiz_questions` | Câu hỏi quiz + đáp án |
| `lesson_progress` | Tiến độ học viên theo từng bài |
| `payments` | Giao dịch thanh toán (momo / vnpay / demo) |

---

## 🛠️ Xử Lý Sự Cố Thường Gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Cannot connect to server` | Server chưa chạy | `node src/app.js` |
| `401 Không có token` | Thiếu Authorization header | Thêm `Bearer {{token}}` |
| `401 Token không hợp lệ` | Token hết hạn | Đăng nhập lại |
| `403 Tài khoản bị khóa` | Admin đã lock | `PUT /admin/users/:id/lock` |
| `503 Chưa cấu hình VNPay` | Thiếu env VNPAY_TMN_CODE | Đăng ký tại sandbox.vnpayment.vn/devreg |
| `Database locked` | Nhiều process dùng chung SQLite | Đóng process khác, restart server |
| Seed thất bại | Database đang bị lock | Stop server → seed → start lại |
