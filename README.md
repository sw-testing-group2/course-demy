# CourseDemy — Website Bán Khóa Học Online

**CourseDemy** là một hệ thống website bán khóa học online ở mức độ cơ bản. Dự án được xây dựng với mục tiêu chính là cung cấp một bộ **REST API** rõ ràng, dễ hiểu để phục vụ cho việc học tập, thực hành và kiểm thử phần mềm (đặc biệt là kiểm thử API bằng **Postman**).

Dự án bao gồm cả phần **Backend** (REST API) và **Frontend** (giao diện người dùng đơn giản sử dụng HTML/CSS/JS thuần).

---

## 🚀 Công Nghệ Sử Dụng

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| **Backend** | Node.js + Express.js | Xây dựng RESTful API gọn nhẹ, hiệu năng tốt. |
| **Database** | **SQLite** (file `database.sqlite`) | Cơ sở dữ liệu quan hệ dạng file, không cần cài đặt server DB phức tạp. |
| **Database Driver** | **better-sqlite3** | Thư viện kết nối SQLite đồng bộ (synchronous), dễ viết query và debug. |
| **Xác thực & Phân quyền** | JWT (`jsonwebtoken`) + `bcrypt` | Phân quyền rõ ràng cho 3 vai trò (Student, Instructor, Admin). |
| **Upload File** | `multer` | Lưu trữ file ảnh thumbnail khóa học cục bộ tại thư mục `/uploads`. |
| **Frontend** | HTML + CSS + JavaScript thuần | Sử dụng fetch API để tương tác với Backend, không dùng framework (React/Vue) để tối giản cấu trúc. |

---

## 📂 Cấu Trúc Dự Án

```text
KTPM/
├── coursedemy/
│   ├── backend/             # Mã nguồn Backend (Node.js & SQLite)
│   │   ├── src/
│   │   │   ├── controllers/ # Xử lý logic API
│   │   │   ├── middlewares/ # Bộ lọc phân quyền, xác thực JWT
│   │   │   ├── routes/      # Định tuyến các endpoint API
│   │   │   └── app.js       # File khởi chạy server Express
│   │   ├── database.sqlite  # File cơ sở dữ liệu SQLite (sinh ra sau khi chạy)
│   │   ├── seed.js          # Script khởi tạo/reset dữ liệu mẫu
│   │   └── package.json
│   │
│   └── frontend/            # Giao diện người dùng dạng Multi-page HTML
│       ├── css/             # CSS styling
│       ├── js/              # Logic xử lý gọi API bằng fetch
│       ├── uploads/         # Nơi chứa ảnh thumbnail khóa học
│       ├── index.html       # Trang chủ danh sách khóa học
│       └── [các trang].html # Đăng nhập, giỏ hàng, dashboard...
│
├── KeHoach_CourseDemy.md    # Kế hoạch chi tiết và thiết kế DB, API
├── HUONGDAN_CHAY_VA_TEST.md # Hướng dẫn chạy dự án & Testcase Postman chi tiết
└── README.md                # Tài liệu giới thiệu tổng quan (File này)
```

---

## 👥 Vai Trò & Quyền Hạn Trong Hệ Thống

Dự án phân quyền chặt chẽ thông qua 3 vai trò chính:

1. **Học viên (Student)**:
   - Đăng ký, đăng nhập và quản lý thông tin cá nhân.
   - Tìm kiếm, lọc khóa học theo danh mục, giá tiền.
   - Quản lý giỏ hàng (thêm/xóa khóa học).
   - Thanh toán đơn hàng (giả lập) và xem danh sách khóa học đã mua ("Khóa học của tôi").
2. **Giảng viên (Instructor)**:
   - Đăng ký và đăng nhập tài khoản giảng viên.
   - Quản lý khóa học của bản thân (Tạo mới, chỉnh sửa, xóa khi khóa học ở trạng thái *Chờ duyệt*).
   - Xem danh sách học viên đã mua khóa học của mình.
3. **Quản trị viên (Admin)**:
   - Đăng nhập (tài khoản Admin được cài đặt sẵn thông qua seed dữ liệu).
   - Duyệt hoặc từ chối các khóa học mới do giảng viên tải lên.
   - Quản lý người dùng (xem danh sách, khóa/mở khóa tài khoản).
   - Quản lý danh mục khóa học (thêm, sửa, xóa danh mục).

---

## 🛠️ Hướng Dẫn Khởi Chạy Nhanh

### 1. Cài đặt các thư viện phụ thuộc (Dependencies)
Truy cập vào thư mục backend và cài đặt:
```bash
cd coursedemy/backend
npm install
```

### 2. Cấu hình biến môi trường
File `.env` mặc định đã được tạo sẵn trong thư mục `backend/` với nội dung:
```env
PORT=3000
JWT_SECRET=coursedemy_secret_key
```

### 3. Seed dữ liệu mẫu (Khuyên dùng khi chạy lần đầu)
Chạy script sau từ thư mục `backend/` để khởi tạo database SQLite và nạp dữ liệu mẫu:
```bash
node seed.js
```
*Sau khi seed thành công, hệ thống sẽ tạo ra file `database.sqlite` cùng các tài khoản mặc định:*
* **Admin**: `admin@coursedemy.com` / `admin123`
* **Giảng viên 1**: `instructor1@example.com` / `123456`
* **Học viên 1**: `student1@example.com` / `123456`

### 4. Khởi động Server
Khởi động backend server (mặc định chạy tại port 3000):
```bash
node src/app.js
```

### 5. Truy cập ứng dụng
Vì phần frontend được tích hợp chung và phục vụ tĩnh từ backend, bạn có thể mở trình duyệt và truy cập trực tiếp:
* **Trang chủ**: [http://localhost:3000](http://localhost:3000)
* **Trang đăng nhập**: [http://localhost:3000/login.html](http://localhost:3000/login.html)
* **Trang quản trị (Admin)**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 🧪 Kiểm Thử API với Postman

Để bắt đầu viết testcase hoặc chạy thử API bằng Postman:
1. Đọc hướng dẫn thiết lập Environment và danh sách 50+ API mẫu tại file [HUONGDAN_CHAY_VA_TEST.md](file:///c:/Users/quang/Workspace/KTPM/HUONGDAN_CHAY_VA_TEST.md).
2. Tạo các biến môi trường trên Postman gồm `base_url` (`http://localhost:3000/api`), `token_student`, `token_instructor`, `token_admin` để lưu JWT sau khi đăng nhập thành công.

---

## 📖 Tài Liệu Chi Tiết
* Để xem chi tiết cấu trúc database, danh sách tham số truyền vào của từng API: Đọc [KeHoach_CourseDemy.md](file:///c:/Users/quang/Workspace/KTPM/KeHoach_CourseDemy.md).
* Để xem hướng dẫn từng bước chạy testcase trên Postman: Đọc [HUONGDAN_CHAY_VA_TEST.md](file:///c:/Users/quang/Workspace/KTPM/HUONGDAN_CHAY_VA_TEST.md).
