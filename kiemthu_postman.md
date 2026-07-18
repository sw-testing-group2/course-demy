# HƯỚNG DẪN KIỂM THỬ API VỚI POSTMAN - COURSEDEMY
Tài liệu này hướng dẫn chi tiết cách thực hiện kiểm thử các API của dự án CourseDemy dựa trên danh sách test case của Nhóm 2.
## ⚙️ Hướng dẫn Thiết lập Môi trường (Environment)
Trước khi bắt đầu chạy các test case, bạn cần tạo một Environment trên Postman với các biến sau:
* `base_url`: `http://localhost:3000/api`
* `token_student`: JWT Token của Học viên sau khi đăng nhập thành công.
* `token_instructor`: JWT Token của Giảng viên sau khi đăng nhập thành công.
* `token_admin`: JWT Token của Admin sau khi đăng nhập thành công.
* `new_course_id`: ID của khóa học mới được tạo ra để thực hiện kiểm thử liên quan.
* `new_lesson_id`: ID của bài học mới được tạo ra.
* `certificate_code`: Mã chứng chỉ dùng để xác thực.

---

## 1. Đăng ký
### 📍 TC001 — Đăng ký thành công
* **Tên Test Case:** Đăng ký hợp lệ
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Chưa có tài khoản
* **Các bước thực hiện:** Mở trang > Nhập thông tin > Đăng ký
* **Dữ liệu kiểm thử:** `Email mới`
* **Kết quả mong đợi:** Tạo tài khoản

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "full_name": "Nguyen Van A",
  "email": "student_test_new@gmail.com",
  "password": "password123",
  "role": "student"
}
```

---
### 📍 TC002 — Email tồn tại
* **Tên Test Case:** Đăng ký email tồn tại
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Email đã tồn tại
* **Các bước thực hiện:** Nhập email đã tồn tại
* **Dữ liệu kiểm thử:** `admin@gmail.com`
* **Kết quả mong đợi:** Thông báo email đã tồn tại

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "full_name": "Nguyen Van A",
  "email": "admin@gmail.com",
  "password": "password123",
  "role": "student"
}
```

---
### 📍 TC003 — Thiếu email
* **Tên Test Case:** Đăng ký thiếu email
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Để trống email
* **Dữ liệu kiểm thử:** `Trống`
* **Kết quả mong đợi:** Yêu cầu nhập email

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "full_name": "Nguyen Van A",
  "email": "",
  "password": "password123",
  "role": "student"
}
```

---
### 📍 TC004 — Thiếu mật khẩu
* **Tên Test Case:** Đăng ký thiếu mật khẩu
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Để trống mật khẩu
* **Dữ liệu kiểm thử:** `Trống`
* **Kết quả mong đợi:** Yêu cầu nhập mật khẩu

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "full_name": "Nguyen Van A",
  "email": "student_test@gmail.com",
  "password": "",
  "role": "student"
}
```

---
### 📍 TC005 — Mật khẩu quá ngắn
* **Tên Test Case:** Đăng ký mật khẩu dưới 6 ký tự
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Nhập mật khẩu ngắn
* **Dữ liệu kiểm thử:** `123`
* **Kết quả mong đợi:** Thông báo mật khẩu phải từ 6 ký tự trở lên

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "full_name": "Nguyen Van A",
  "email": "student_test@gmail.com",
  "password": "123",
  "role": "student"
}
```

---
### 📍 TC006 — Mật khẩu không khớp
* **Tên Test Case:** Đăng ký nhập lại mật khẩu sai
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Nhập hai mật khẩu khác nhau
* **Dữ liệu kiểm thử:** `Pass: 123456; Confirm: 123457`
* **Kết quả mong đợi:** Thông báo mật khẩu nhập lại không khớp

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "full_name": "Nguyen Van A",
  "email": "student_test@gmail.com",
  "password": "password123",
  "confirm_password": "different_pass",
  "role": "student"
}
```

---
### 📍 TC007 — Email sai định dạng
* **Tên Test Case:** Đăng ký email thiếu @
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Nhập email sai cấu trúc
* **Dữ liệu kiểm thử:** `testgmail.com`
* **Kết quả mong đợi:** Thông báo email không đúng định dạng

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "full_name": "Nguyen Van A",
  "email": "testgmail.com",
  "password": "password123",
  "role": "student"
}
```

---
### 📍 TC008 — Ký tự đặc biệt trong tên
* **Tên Test Case:** Đăng ký tên chứa ký tự lạ
* **Độ ưu tiên:** `Low`
* **Các bước thực hiện:** Nhập tên có ký tự đặc biệt
* **Dữ liệu kiểm thử:** `@#$%`
* **Kết quả mong đợi:** Thông báo tên không hợp lệ hoặc tự động loại bỏ

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "full_name": "@#$%",
  "email": "student_spec@gmail.com",
  "password": "password123",
  "role": "student"
}
```

---

## 2. Đăng nhập
### 📍 TC09 — Đăng nhập thành công
* **Tên Test Case:** Login hợp lệ
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Có tài khoản
* **Các bước thực hiện:** Nhập đúng thông tin
* **Dữ liệu kiểm thử:** `QuangAnh@gmail.com`
* **Kết quả mong đợi:** Đăng nhập thành công

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "student@gmail.com",
  "password": "password123"
}
```

---
### 📍 TC10 — Sai mật khẩu
* **Tên Test Case:** Login sai mật khẩu
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Có tài khoản
* **Các bước thực hiện:** Nhập sai mật khẩu
* **Dữ liệu kiểm thử:** `wrongpass`
* **Kết quả mong đợi:** Sai email hoặc mật khẩu

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "student@gmail.com",
  "password": "wrongpass"
}
```

---
### 📍 TC11 — Sai email
* **Tên Test Case:** Login sai email
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Có tài khoản
* **Các bước thực hiện:** Nhập email sai
* **Dữ liệu kiểm thử:** `wrongmail@gmail.com`
* **Kết quả mong đợi:** Sai email hoặc mật khẩu

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "wrongmail@gmail.com",
  "password": "password123"
}
```

---
### 📍 TC12 — Thiếu email
* **Tên Test Case:** Login thiếu email
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Có tài khoản
* **Các bước thực hiện:** Để trống email
* **Kết quả mong đợi:** Yêu cầu nhập email

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "",
  "password": "password123"
}
```

---
### 📍 TC13 — Thiếu mật khẩu
* **Tên Test Case:** Login thiếu mật khẩu
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Có tài khoản
* **Các bước thực hiện:** Để trống mật khẩu
* **Kết quả mong đợi:** Yêu cầu nhập mật khẩu

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "student@gmail.com",
  "password": ""
}
```

---
### 📍 TC14 — Sai định dạng email
* **Tên Test Case:** Login nhập sai định dạng
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Có tài khoản
* **Các bước thực hiện:** Nhập email sai định dạng
* **Dữ liệu kiểm thử:** `example@ggmai.com`
* **Kết quả mong đợi:** Thông báo email không hợp lệ

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "example@ggmai.com",
  "password": "password123"
}
```

---
### 📍 TC15 — Tài khoản bị khóa
* **Tên Test Case:** Đăng nhập vào tk bị khóa
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản bị khóa trước đó
* **Các bước thực hiện:** Nhập đúng thông tin đăng nhập
* **Dữ liệu kiểm thử:** `locked@gmail.com`
* **Kết quả mong đợi:** Thông báo tài khoản đã bị khóa

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "locked@gmail.com",
  "password": "password123"
}
```

---
### 📍 TC16 — Brute Force ngăn chặn
* **Tên Test Case:** Nhập sai mật khẩu liên tiếp 5 lần
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Có tài khoản
* **Các bước thực hiện:** Nhập sai pass 5 lần liên tục
* **Dữ liệu kiểm thử:** `Đăng nhập sai 5 lần`
* **Kết quả mong đợi:** Tạm khóa tài khoản trong 15 phút

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "student@gmail.com",
  "password": "wrongpass_attempt"
}
```

---
### 📍 TC17 — Quên mật khẩu
* **Tên Test Case:** Yêu cầu lại mật khẩu qua email
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Có tài khoản
* **Các bước thực hiện:** Click Quên mật khẩu > Nhập email
* **Dữ liệu kiểm thử:** `QuangAnh@gmail.com`
* **Kết quả mong đợi:** Hệ thống gửi link/mã đặt lại mật khẩu về email

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/forgot-password
Content-Type: application/json

{
  "email": "QuangAnh@gmail.com"
}
```

---
### 📍 TC18 — Duy trì đăng nhập
* **Tên Test Case:** Chọn Ghi nhớ đăng nhập
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Tích chọn "Remember me" rồi login
* **Kết quả mong đợi:** Phiên đăng nhập được lưu giữ khi tắt trình duyệt

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "student@gmail.com",
  "password": "password123",
  "remember_me": true
}
```

---

## 3. Tìm kiếm
### 📍 TC019 — Tìm theo tên
* **Tên Test Case:** Tìm khóa học
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Nhập Java
* **Dữ liệu kiểm thử:** `Java`
* **Kết quả mong đợi:** Hiển thị kết quả

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?search=Java
Authorization: Bearer {{token_student}}
```

---
### 📍 TC020 — Theo giảng viên
* **Tên Test Case:** Tìm theo giảng viên
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Nhập tên GV
* **Dữ liệu kiểm thử:** `Tran Tien Dung`
* **Kết quả mong đợi:** Hiển thị khóa học

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?search=Tran Tien Dung
Authorization: Bearer {{token_student}}
```

---
### 📍 TC021 — Không có kết quả
* **Tên Test Case:** Từ khóa lạ
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Tìm
* **Dữ liệu kiểm thử:** `ABCXYZ`
* **Kết quả mong đợi:** Thông báo không tìm thấy

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?search=ABCXYZ
Authorization: Bearer {{token_student}}
```

---
### 📍 TC022 — Ký tự đặc biệt
* **Tên Test Case:** Tìm ký tự
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Tìm
* **Dữ liệu kiểm thử:** `@#$`
* **Kết quả mong đợi:** Không lỗi hệ thống / Trả về không tìm thấy

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?search=@#$
Authorization: Bearer {{token_student}}
```

---
### 📍 TC023 — Chuỗi quá dài
* **Tên Test Case:** Tìm kiếm với từ khóa > 255 ký tự
* **Độ ưu tiên:** `Low`
* **Các bước thực hiện:** Nhập chuỗi cực dài
* **Dữ liệu kiểm thử:** `Chuỗi 300 ký tự`
* **Kết quả mong đợi:** Cắt chuỗi hoặc thông báo từ khóa quá dài

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?search=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
Authorization: Bearer {{token_student}}
```

---
### 📍 TC024 — Khoảng trắng
* **Tên Test Case:** Tìm kiếm chỉ chứa khoảng trắng
* **Độ ưu tiên:** `Low`
* **Các bước thực hiện:** Nhập toàn dấu cách
* **Dữ liệu kiểm thử:** `"   "`
* **Kết quả mong đợi:** Không thực hiện tìm kiếm hoặc hiển thị toàn bộ

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?search=   
Authorization: Bearer {{token_student}}
```

---

## 4. Bộ lọc
### 📍 TC025 — Theo danh mục
* **Tên Test Case:** Lọc danh mục
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Chọn Lập trình
* **Kết quả mong đợi:** Hiển thị đúng khóa học Lập trình

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?category_id=1
Authorization: Bearer {{token_student}}
```

---
### 📍 TC026 — Theo giá
* **Tên Test Case:** Lọc giá
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Chọn khoảng giá từ 200k-500k
* **Kết quả mong đợi:** Đúng khoảng giá hiển thị

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?price_min=200000&price_max=500000
Authorization: Bearer {{token_student}}
```

---
### 📍 TC027 — Theo sao
* **Tên Test Case:** Lọc đánh giá
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Chọn >=4 sao
* **Kết quả mong đợi:** Đúng kết quả từ 4 sao trở lên

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?rating_min=4
Authorization: Bearer {{token_student}}
```

---
### 📍 TC028 — Theo cấp độ
* **Tên Test Case:** Lọc cấp độ
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Chọn Cơ bản
* **Kết quả mong đợi:** Đúng kết quả cấp độ Cơ bản

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?level=basic
Authorization: Bearer {{token_student}}
```

---
### 📍 TC029 — Kết hợp nhiều bộ lọc
* **Tên Test Case:** Lọc danh mục + giá + đánh giá
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Chọn Lập trình + 200k + 5 sao
* **Kết quả mong đợi:** Hiển thị kết quả thỏa mãn đồng thời tất cả điều kiện

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses?category_id=1&price_min=200000&rating_min=5
Authorization: Bearer {{token_student}}
```

---
### 📍 TC030 — Xóa bộ lọc
* **Tên Test Case:** Bỏ tất cả bộ lọc đã chọn
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Đang chọn bộ lọc
* **Các bước thực hiện:** Nhấn nút "Xóa tất cả"
* **Kết quả mong đợi:** Giao diện quay về danh sách khóa học mặc định

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses
Authorization: Bearer {{token_student}}
```

---

## 5. Khóa học
### 📍 TC031 — Chi tiết
* **Tên Test Case:** Xem chi tiết
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Mở khóa học
* **Dữ liệu kiểm thử:** `101`
* **Kết quả mong đợi:** Hiển thị đầy đủ thông tin, giá, đề cương

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses/1
Authorization: Bearer {{token_student}}
```

---
### 📍 TC032 — Preview
* **Tên Test Case:** Xem video thử
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Nhấn xem video preview
* **Kết quả mong đợi:** Video chạy bình thường kèm âm thanh

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses/1
Authorization: Bearer {{token_student}}
```

---
### 📍 TC033 — Khóa học không tồn tại
* **Tên Test Case:** Truy cập qua URL sai
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Nhập ID khóa học bừa
* **Dữ liệu kiểm thử:** `URL /course/999999`
* **Kết quả mong đợi:** Hiển thị trang 404 Not Found

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses/999999
Authorization: Bearer {{token_student}}
```

---
### 📍 TC034 — Thêm yêu thích
* **Tên Test Case:** Danh sách yêu thích
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Nhấn tim
* **Dữ liệu kiểm thử:** `101`
* **Kết quả mong đợi:** Đã thêm vào danh sách yêu thích

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/wishlist
Authorization: Bearer {{token_student}}

{
  "course_id": 1
}
```

---
### 📍 TC035 — Xóa yêu thích
* **Tên Test Case:** Bỏ yêu thích
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Nhấn tim lần nữa (khi đã thích)
* **Dữ liệu kiểm thử:** `101`
* **Kết quả mong đợi:** Đã xóa khỏi danh sách yêu thích

**HTTP Request mẫu trên Postman:**
```http
DELETE {{base_url}}/wishlist/1
Authorization: Bearer {{token_student}}
```

---
### 📍 TC036 — Xem danh sách
* **Tên Test Case:** Kiểm tra trang Wishlist
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Đã có khóa học yêu thích
* **Các bước thực hiện:** Vào trang Yêu thích
* **Kết quả mong đợi:** Hiển thị toàn bộ các khóa học đã lưu yêu thích

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/wishlist
Authorization: Bearer {{token_student}}
```

---

## 6. Giỏ hàng
### 📍 TC037 — Thêm 1 khóa học
* **Tên Test Case:** Thêm vào giỏ
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Thêm
* **Dữ liệu kiểm thử:** `101`
* **Kết quả mong đợi:** Thành công, cập nhật số lượng giỏ hàng = 1

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/cart
Authorization: Bearer {{token_student}}

{
  "course_id": 1
}
```

---
### 📍 TC038 — Thêm khóa học không tồn tại
* **Tên Test Case:** Thêm vào giỏ
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Thêm qua API/URL ảo
* **Dữ liệu kiểm thử:** `9999`
* **Kết quả mong đợi:** Không thành công, báo lỗi

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/cart
Authorization: Bearer {{token_student}}

{
  "course_id": 9999
}
```

---
### 📍 TC039 — Thêm khóa học đã mua
* **Tên Test Case:** Thêm vào giỏ
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Thêm khóa học đã sở hữu
* **Dữ liệu kiểm thử:** `101`
* **Kết quả mong đợi:** Không thành công, nút chuyển thành "Vào học ngay"

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/cart
Authorization: Bearer {{token_student}}

{
  "course_id": 1
}
```

---
### 📍 TC040 — Trùng
* **Tên Test Case:** Thêm trùng
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Thêm lại khóa học đang có trong giỏ
* **Dữ liệu kiểm thử:** `101`
* **Kết quả mong đợi:** Thông báo sản phẩm đã có trong giỏ hàng

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/cart
Authorization: Bearer {{token_student}}

{
  "course_id": 1
}
```

---
### 📍 TC041 — Xóa
* **Tên Test Case:** Xóa khỏi giỏ
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Nhấn Xóa ở dòng khóa học
* **Dữ liệu kiểm thử:** `101`
* **Kết quả mong đợi:** Đã xóa khỏi giỏ, cập nhật lại tổng tiền

**HTTP Request mẫu trên Postman:**
```http
DELETE {{base_url}}/cart/1
Authorization: Bearer {{token_student}}
```

---
### 📍 TC042 — Giỏ trống
* **Tên Test Case:** Xem giỏ
* **Độ ưu tiên:** `Low`
* **Các bước thực hiện:** Mở giỏ hàng khi chưa thêm gì
* **Kết quả mong đợi:** Thông báo giỏ hàng trống kèm nút "Mua ngay"

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/cart
Authorization: Bearer {{token_student}}
```

---
### 📍 TC043 — Số lượng tối đa
* **Tên Test Case:** Thêm quá nhiều khóa học vào giỏ
* **Độ ưu tiên:** `Low`
* **Các bước thực hiện:** Thêm liên tục 50 khóa học
* **Kết quả mong đợi:** Thông báo đạt giới hạn giỏ hàng (nếu có hệ thống chặn)

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/cart
Authorization: Bearer {{token_student}}

{
  "course_id": 2
}
```

---

## 7. Ưu đãi và thanh toán
### 📍 TC044 — Coupon hợp lệ
* **Tên Test Case:** Áp dụng coupon còn hạn
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Nhập SALE20
* **Dữ liệu kiểm thử:** `SALE20`
* **Kết quả mong đợi:** Giảm giá thành công, hiển thị số tiền được giảm

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/cart/coupon
Authorization: Bearer {{token_student}}

{
  "code": "SALE20"
}
```

---
### 📍 TC045 — Coupon hết hạn
* **Tên Test Case:** Áp dụng coupon hết hạn
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Nhập OLD2025
* **Dữ liệu kiểm thử:** `OLD2025`
* **Kết quả mong đợi:** Thông báo mã giảm giá đã hết hạn

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/cart/coupon
Authorization: Bearer {{token_student}}

{
  "code": "OLD2025"
}
```

---
### 📍 TC046 — Coupon sai ký tự
* **Tên Test Case:** Áp dụng mã không tồn tại
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Nhập mã bừa
* **Dữ liệu kiểm thử:** `SAISAI123`
* **Kết quả mong đợi:** Thông báo mã giảm giá không hợp lệ

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/cart/coupon
Authorization: Bearer {{token_student}}

{
  "code": "SAISAI123"
}
```

---
### 📍 TC047 — Không đủ điều kiện giá
* **Tên Test Case:** Áp dụng coupon cho đơn tối thiểu
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Áp dụng mã yêu cầu đơn > 500k cho đơn 100k
* **Dữ liệu kiểm thử:** `MIN500`
* **Kết quả mong đợi:** Thông báo đơn hàng không đủ điều kiện áp dụng mã

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/cart/coupon
Authorization: Bearer {{token_student}}

{
  "code": "MIN500"
}
```

---
### 📍 TC048 — Hủy áp dụng
* **Tên Test Case:** Xóa mã giảm giá đã nhập
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Đang áp dụng mã thành công
* **Các bước thực hiện:** Nhấn nút "Xóa/Hủy mã"
* **Kết quả mong đợi:** Tổng số tiền quay về giá gốc ban đầu

**HTTP Request mẫu trên Postman:**
```http
DELETE {{base_url}}/cart/coupon
Authorization: Bearer {{token_student}}
```

---
### 📍 TC049 — Momo thành công
* **Tên Test Case:** Thanh toán qua ví Momo
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Chọn Momo -> Quét mã thành công
* **Kết quả mong đợi:** Thanh toán thành công, chuyển hướng về trang xác nhận đơn hàng

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/payments/momo/simulate
Authorization: Bearer {{token_student}}

{
  "order_id": 123
}
```

---
### 📍 TC050 — VNPay thành công
* **Tên Test Case:** Thanh toán qua VNPay
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Chọn VNPay -> Nhập OTP ngân hàng hợp lệ
* **Kết quả mong đợi:** Thanh toán thành công, chuyển hướng về trang xác nhận đơn hàng

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/payments/vnpay/simulate
Authorization: Bearer {{token_student}}

{
  "order_id": 123
}
```

---
### 📍 TC051 — Momo thất bại
* **Tên Test Case:** Hủy thanh toán giữa chừng
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Chọn Momo -> Tắt app Momo/Hủy giao dịch
* **Kết quả mong đợi:** Thông báo thanh toán không thành công, đơn hàng giữ trạng thái chờ

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/payments/momo/simulate
Authorization: Bearer {{token_student}}

{
  "order_id": 123,
  "cancel": true
}
```

---
### 📍 TC052 — VNPay lỗi
* **Tên Test Case:** Nhập sai OTP ngân hàng
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Chọn VNPay -> Nhập sai OTP 3 lần
* **Kết quả mong đợi:** Thông báo giao dịch thất bại từ cổng thanh toán

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/payments/vnpay/simulate
Authorization: Bearer {{token_student}}

{
  "order_id": 123,
  "otp": "wrong"
}
```

---
### 📍 TC053 — Đơn hàng 0 đồng
* **Tên Test Case:** Thanh toán đơn hàng được giảm 100%
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Áp dụng coupon 100%
* **Các bước thực hiện:** Nhấn Thanh toán
* **Kết quả mong đợi:** Hệ thống xử lý thành công ngay không qua cổng thanh toán

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/orders/checkout
Authorization: Bearer {{token_student}}
```

---

## 8. Học tập
### 📍 TC054 — Video
* **Tên Test Case:** Xem video bài học
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Nhấn phát video
* **Kết quả mong đợi:** Video chạy bình thường

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses/1/lessons/1
Authorization: Bearer {{token_student}}
```

---
### 📍 TC055 — Tốc độ video
* **Tên Test Case:** Thay đổi tốc độ phát
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Chọn tốc độ x1.5 hoặc x2
* **Kết quả mong đợi:** Video phát nhanh hơn đúng tốc độ chọn

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses/1/lessons/1
Authorization: Bearer {{token_student}}
```

---
### 📍 TC056 — Chuyển bài tự động
* **Tên Test Case:** Học hết bài tự động chuyển bài
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Xem hết 100% video bài hiện tại
* **Kết quả mong đợi:** Hệ thống tự động chuyển sang bài tiếp theo và tích v bài cũ

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses/1/lessons/1
Authorization: Bearer {{token_student}}
```

---
### 📍 TC057 — Làm quiz
* **Tên Test Case:** Nộp quiz
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Làm đầy đủ các câu hỏi và nhấn Nộp
* **Kết quả mong đợi:** Hiển thị điểm số và đáp án chi tiết (nếu có)

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/lessons/1/quiz/submit
Authorization: Bearer {{token_student}}

{
  "answers": [
    {"question_id": 1, "answer_id": 3}
  ]
}
```

---
### 📍 TC058 — Nộp trống
* **Tên Test Case:** Nộp quiz khi chưa chọn đáp án
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Nhấn Nộp ngay khi chưa tích câu nào
* **Kết quả mong đợi:** Hiển thị cảnh báo hoặc tính 0 điểm

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/lessons/1/quiz/submit
Authorization: Bearer {{token_student}}

{
  "answers": []
}
```

---
### 📍 TC059 — Hết giờ tự động nộp
* **Tên Test Case:** Làm quiz quá thời gian quy định
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Đợi thời gian đếm ngược về 0
* **Kết quả mong đợi:** Hệ thống tự khóa bài và tự động nộp kết quả

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/lessons/1/quiz/submit
Authorization: Bearer {{token_student}}

{
  "answers": [],
  "timeout": true
}
```

---
### 📍 TC060 — Lưu tiến độ
* **Tên Test Case:** Lưu vị trí video đang xem
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Xem video đến phút thứ 10 rồi tắt trình duyệt
* **Kết quả mong đợi:** Khi mở lại, video hiển thị đúng từ phút thứ 10

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/courses/1/lessons/1/progress
Authorization: Bearer {{token_student}}

{
  "watched_seconds": 600
}
```

---
### 📍 TC061 — Cập nhật % tiến trình
* **Tên Test Case:** Tiến độ học tập tổng quan
* **Độ ưu tiên:** `High`
* **Các bước thực hiện:** Hoàn thành 5 trên 10 bài học
* **Kết quả mong đợi:** Tiến trình học tập hiển thị chính xác 50% ở dashboard

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses/1/progress
Authorization: Bearer {{token_student}}
```

---
### 📍 TC062 — Đặt câu hỏi
* **Tên Test Case:** Gửi câu hỏi trong bài học
* **Độ ưu tiên:** `Medium`
* **Các bước thực hiện:** Nhập câu hỏi và gửi
* **Kết quả mong đợi:** Lưu câu hỏi thành công, hiển thị ở tab thảo luận

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/lessons/1/questions
Authorization: Bearer {{token_student}}

{
  "title": "Lỗi kết nối database",
  "body": "Tôi gặp lỗi khi chạy lệnh npm run dev..."
}
```

---
### 📍 TC063 — Câu hỏi trống
* **Tên Test Case:** Gửi nội dung rỗng
* **Độ ưu tiên:** `Low`
* **Các bước thực hiện:** Để trống khung thảo luận và bấm gửi
* **Kết quả mong đợi:** Nút gửi bị ẩn hoặc báo lỗi không được để trống

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/lessons/1/questions
Authorization: Bearer {{token_student}}

{
  "title": "",
  "body": ""
}
```

---
### 📍 TC064 — Đánh giá
* **Tên Test Case:** Đánh giá 5 sao kèm bình luận
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Đã hoàn thành khóa học
* **Các bước thực hiện:** Chọn 5 sao -> Nhập nhận xét -> Gửi
* **Kết quả mong đợi:** Đã lưu đánh giá, hiển thị công khai ở trang chi tiết khóa học

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/courses/1/reviews
Authorization: Bearer {{token_student}}

{
  "rating": 5,
  "comment": "Khóa học rất hay và bổ ích!"
}
```

---
### 📍 TC065 — Sửa đánh giá
* **Tên Test Case:** Thay đổi nội dung review
* **Độ ưu tiên:** `Low`
* **Điều kiện tiên quyết (Preconditions):** Đã đánh giá trước đó
* **Các bước thực hiện:** Nhấn sửa -> Đổi thành 4 sao -> Lưu
* **Kết quả mong đợi:** Cập nhật điểm đánh giá mới của khóa học thành công

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/courses/1/reviews
Authorization: Bearer {{token_student}}

{
  "rating": 4,
  "comment": "Cập nhật đánh giá thành 4 sao"
}
```

---
### 📍 TC066 — Tải PDF
* **Tên Test Case:** Chứng chỉ hoàn thành
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Đạt 100% tiến trình học
* **Các bước thực hiện:** Nhấn nút Tải chứng chỉ
* **Kết quả mong đợi:** File PDF tải về máy chứa đầy đủ tên học viên và tên khóa học

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses/1/certificate
Authorization: Bearer {{token_student}}
```

---
### 📍 TC067 — Chưa đủ điều kiện tải
* **Tên Test Case:** Kiểm tra nút tải chứng chỉ
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Tiến trình < 100%
* **Các bước thực hiện:** Vào trang chứng chỉ
* **Kết quả mong đợi:** Nút tải bị ẩn hoặc hiển thị thông báo chưa hoàn thành khóa học

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/courses/2/certificate
Authorization: Bearer {{token_student}}
```

---

## 9. Quản lí khóa học
### 📍 TC068 — Tạo khóa học
* **Tên Test Case:** Tạo mới khóa học (Draft)
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Giảng viên
* **Các bước thực hiện:** Nhập tiêu đề, mô tả -> Lưu nháp
* **Kết quả mong đợi:** Khóa học được tạo ở trạng thái Chờ duyệt hoặc Bản nháp

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/instructor/courses
Authorization: Bearer {{token_instructor}}

{
  "title": "Khóa học Node.js cơ bản",
  "category_id": 1,
  "price": 200000,
  "description": "Lưu nháp khóa học mới",
  "level": "basic"
}
```

---
### 📍 TC069 — Thiếu thông tin bắt buộc
* **Tên Test Case:** Tạo khóa học để trống tiêu đề
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Giảng viên
* **Các bước thực hiện:** Để trống tiêu đề -> Lưu
* **Kết quả mong đợi:** Báo lỗi trường tiêu đề không được bỏ trống

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/instructor/courses
Authorization: Bearer {{token_instructor}}

{
  "title": "",
  "category_id": 1,
  "price": 200000
}
```

---
### 📍 TC070 — Sửa khóa học
* **Tên Test Case:** Cập nhật thông tin khóa học
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Khóa học ở trạng thái bản nháp
* **Các bước thực hiện:** Thay đổi giá khóa học -> Lưu
* **Kết quả mong đợi:** Thông tin giá mới được cập nhật thành công

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/instructor/courses/{{new_course_id}}
Authorization: Bearer {{token_instructor}}

{
  "price": 300000
}
```

---
### 📍 TC071 — Upload video hợp lệ
* **Tên Test Case:** Tải lên video bài học (.mp4)
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Giảng viên
* **Các bước thực hiện:** Chọn file video bài học (.mp4) dưới 500MB
* **Kết quả mong đợi:** Tải lên thành công, hệ thống xử lý (processing) video tốt

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/instructor/courses/{{new_course_id}}/lessons
Authorization: Bearer {{token_instructor}}

{
  "title": "Bài 1: Giới thiệu",
  "video_url": "https://example.com/intro.mp4"
}
```

---
### 📍 TC072 — Upload video sai định dạng
* **Tên Test Case:** Tải lên file định dạng khác (.txt, .exe)
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Giảng viên
* **Các bước thực hiện:** Chọn file .exe tải lên trường video
* **Kết quả mong đợi:** Thông báo định dạng file không hỗ trợ

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/instructor/courses/{{new_course_id}}/lessons
Authorization: Bearer {{token_instructor}}

{
  "title": "Bài 1: Giới thiệu",
  "video_url": "https://example.com/intro.exe"
}
```

---
### 📍 TC073 — Upload video quá dung lượng
* **Tên Test Case:** Tải lên file video dung lượng quá lớn
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Giảng viên
* **Các bước thực hiện:** Chọn file nặng 5GB tải lên
* **Kết quả mong đợi:** Thông báo file vượt quá dung lượng cho phép

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/instructor/courses/{{new_course_id}}/lessons
Authorization: Bearer {{token_instructor}}

{
  "title": "Bài 1: Giới thiệu",
  "video_url": "https://example.com/heavy_5gb.mp4"
}
```

---
### 📍 TC074 — Tạo quiz
* **Tên Test Case:** Thêm câu hỏi trắc nghiệm vào bài học
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Giảng viên
* **Các bước thực hiện:** Nhập câu hỏi, 4 đáp án, chọn đáp án đúng -> Lưu
* **Kết quả mong đợi:** Đã tạo thành công bài quiz trong chương mục

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/instructor/lessons/{{new_lesson_id}}/quiz
Authorization: Bearer {{token_instructor}}

{
  "question": "Node.js là gì?",
  "options": ["Runtime", "Framework", "Library", "Language"],
  "correct_option": 0
}
```

---
### 📍 TC075 — Trả lời câu hỏi
* **Tên Test Case:** Giảng viên phản hồi học viên
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Có câu hỏi của học viên
* **Các bước thực hiện:** Chọn câu hỏi -> Nhập câu trả lời -> Gửi
* **Kết quả mong đợi:** Hệ thống hiển thị câu trả lời của giảng viên ngay dưới câu hỏi

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/questions/1/answers
Authorization: Bearer {{token_instructor}}

{
  "body": "Chào bạn, bạn cần kiểm tra lại config..."
}
```

---
### 📍 TC076 — Rút tiền hợp lệ
* **Tên Test Case:** Yêu cầu rút tiền trên doanh thu
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Số dư tài khoản > 200k
* **Các bước thực hiện:** Tạo yêu cầu rút -> Nhập số tiền -> Gửi
* **Kết quả mong đợi:** Tạo yêu cầu rút thành công, trạng thái "Chờ duyệt"

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/instructor/withdraw
Authorization: Bearer {{token_instructor}}

{
  "amount": 250000,
  "bank_info": "Techcombank - 1900123456789"
}
```

---
### 📍 TC077 — Rút tiền vượt số dư
* **Tên Test Case:** Yêu cầu rút số tiền lớn hơn số dư
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Số dư hiện tại 1 triệu
* **Các bước thực hiện:** Nhập số tiền rút là 2 triệu -> Gửi
* **Kết quả mong đợi:** Thông báo số dư không đủ để thực hiện giao dịch

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/instructor/withdraw
Authorization: Bearer {{token_instructor}}

{
  "amount": 2000000,
  "bank_info": "Techcombank - 1900123456789"
}
```

---
### 📍 TC078 — Rút tiền dưới mức tối thiểu
* **Tên Test Case:** Rút số tiền nhỏ hơn quy định
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Mức tối thiểu là 50k
* **Các bước thực hiện:** Nhập số tiền rút là 20k -> Gửi
* **Kết quả mong đợi:** Thông báo số tiền rút tối thiểu phải từ 50k trở lên

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/instructor/withdraw
Authorization: Bearer {{token_instructor}}

{
  "amount": 20000,
  "bank_info": "Techcombank - 1900123456789"
}
```

---
### 📍 TC079 — Xem thống kê doanh thu
* **Tên Test Case:** Kiểm tra biểu đồ doanh thu
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Đã có doanh thu khóa học
* **Các bước thực hiện:** Vào trang Thống kê doanh thu
* **Kết quả mong đợi:** Hiển thị biểu đồ doanh thu chính xác theo tháng/năm

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/instructor/stats/revenue
Authorization: Bearer {{token_instructor}}
```

---
### 📍 TC080 — Thống kê học viên
* **Tên Test Case:** Xem danh sách học viên đăng ký
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Có học viên mua khóa học
* **Các bước thực hiện:** Vào trang quản lý học viên
* **Kết quả mong đợi:** Hiển thị đầy đủ danh sách, ngày tham gia, tiến độ học của từng người

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/instructor/stats/students
Authorization: Bearer {{token_instructor}}
```

---
### 📍 TC081 — Xóa khóa học nháp
* **Tên Test Case:** Xóa bỏ khóa học chưa xuất bản
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Khóa học ở trạng thái bản nháp
* **Các bước thực hiện:** Nhấn Xóa khóa học -> Xác nhận
* **Kết quả mong đợi:** Khóa học biến mất khỏi danh sách quản lý của giảng viên

**HTTP Request mẫu trên Postman:**
```http
DELETE {{base_url}}/instructor/courses/{{new_course_id}}
Authorization: Bearer {{token_instructor}}
```

---

## Chức năng - Giảng viên
### 📍 TC082 — Duyệt khóa học
* **Tên Test Case:** Approve khóa học hợp lệ
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Admin
* **Các bước thực hiện:** Vào danh sách chờ duyệt -> Nhấp Approve
* **Kết quả mong đợi:** Khóa học chuyển sang trạng thái "Đã xuất bản" (Published), công khai trên web

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/admin/courses/{{new_course_id}}/approve
Authorization: Bearer {{token_admin}}
```

---
### 📍 TC083 — Từ chối duyệt khóa học
* **Tên Test Case:** Reject khóa học vi phạm chính sách
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Admin
* **Các bước thực hiện:** Vào danh sách chờ duyệt -> Nhấp Reject -> Nhập lý do
* **Kết quả mong đợi:** Khóa học chuyển sang trạng thái "Bị từ chối", gửi lý do về cho GV

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/admin/courses/{{new_course_id}}/reject
Authorization: Bearer {{token_admin}}

{
  "reason": "Nội dung không đạt chất lượng"
}
```

---
### 📍 TC084 — Khóa user
* **Tên Test Case:** Khóa tài khoản vi phạm tiêu chuẩn
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Admin
* **Các bước thực hiện:** Tìm user -> Nhấn Khóa tài khoản -> Xác nhận
* **Kết quả mong đợi:** User bị khóa ngay lập tức, bị đăng xuất khỏi hệ thống

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/admin/users/2/lock
Authorization: Bearer {{token_admin}}
```

---
### 📍 TC085 — Mở khóa user
* **Tên Test Case:** Mở lại tài khoản bị khóa trước đó
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Admin
* **Các bước thực hiện:** Tìm user bị khóa -> Nhấn Mở khóa
* **Kết quả mong đợi:** Tài khoản hoạt động trở lại bình thường

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/admin/users/2/unlock
Authorization: Bearer {{token_admin}}
```

---
### 📍 TC086 — Tạo coupon hệ thống
* **Tên Test Case:** Tạo mã giảm giá toàn sàn
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Admin
* **Các bước thực hiện:** Nhập thông tin mã SALE30, % giảm, ngày hết hạn -> Lưu
* **Kết quả mong đợi:** Mã coupon mới hiển thị trong hệ thống và có hiệu lực

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/admin/coupons
Authorization: Bearer {{token_admin}}

{
  "code": "SALE30",
  "discount_percent": 30,
  "expired_at": "2026-12-31"
}
```

---
### 📍 TC087 — Duyệt rút tiền thành công
* **Tên Test Case:** Xử lý lệnh rút tiền tài khoản GV
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Có yêu cầu rút tiền Chờ duyệt
* **Các bước thực hiện:** Nhấn Duyệt lệnh rút tiền
* **Kết quả mong đợi:** Trạng thái chuyển sang "Thành công", số dư giảng viên bị trừ tiền

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/admin/withdrawals/1/approve
Authorization: Bearer {{token_admin}}
```

---
### 📍 TC088 — Từ chối lệnh rút tiền
* **Tên Test Case:** Từ chối lệnh rút tiền nghi vấn
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Có yêu cầu rút tiền Chờ duyệt
* **Các bước thực hiện:** Nhấn Từ chối -> Ghi lý do
* **Kết quả mong đợi:** Trạng thái chuyển thành "Bị hủy", số tiền hoàn lại số dư giảng viên

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/admin/withdrawals/1/reject
Authorization: Bearer {{token_admin}}

{
  "reason": "Thông tin tài khoản ngân hàng sai lệch"
}
```

---
### 📍 TC089 — Thống kê tổng quan
* **Tên Test Case:** Xem dashboard hệ thống
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Admin
* **Các bước thực hiện:** Mở trang tổng quan
* **Kết quả mong đợi:** Hiển thị đúng tổng số User, tổng doanh thu, tổng số khóa học hiện tại

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/admin/stats
Authorization: Bearer {{token_admin}}
```

---
### 📍 TC090 — Phân quyền tài khoản
* **Tên Test Case:** Chuyển user thường thành Giảng viên
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Tài khoản Admin
* **Các bước thực hiện:** Vào quản lý user -> Sửa Role thành Instructor -> Lưu
* **Kết quả mong đợi:** User đăng nhập lại sẽ có đầy đủ tính năng của Giảng viên

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/admin/users/2/role
Authorization: Bearer {{token_admin}}

{
  "role": "instructor"
}
```

---

## 10. Admin
### 📍 TC091 — Thay đổi avatar
* **Tên Test Case:** Cập nhật ảnh đại diện mới
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Đã đăng nhập
* **Các bước thực hiện:** Chọn ảnh .jpg dưới 2MB -> Lưu
* **Kết quả mong đợi:** Avatar mới được hiển thị trên thanh menu và trang cá nhân

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/profile/avatar
Authorization: Bearer {{token_student}}

{
  "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150"
}
```

---
### 📍 TC092 — Đổi mật khẩu thành công
* **Tên Test Case:** Thay đổi mật khẩu tài khoản
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Đã đăng nhập
* **Các bước thực hiện:** Nhập mật khẩu cũ + mật khẩu mới -> Lưu
* **Kết quả mong đợi:** Mật khẩu đổi thành công, hệ thống yêu cầu đăng nhập lại bằng pass mới

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/profile/password
Authorization: Bearer {{token_student}}

{
  "current_password": "password123",
  "new_password": "newpassword123",
  "confirm_password": "newpassword123"
}
```

---
### 📍 TC093 — Đổi mật khẩu sai pass cũ
* **Tên Test Case:** Nhập sai mật khẩu hiện tại
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Đã đăng nhập
* **Các bước thực hiện:** Nhập mật khẩu cũ sai -> Nhập mật khẩu mới -> Lưu
* **Kết quả mong đợi:** Thông báo mật khẩu hiện tại không chính xác

**HTTP Request mẫu trên Postman:**
```http
PUT {{base_url}}/profile/password
Authorization: Bearer {{token_student}}

{
  "current_password": "wrongpassword",
  "new_password": "newpassword123",
  "confirm_password": "newpassword123"
}
```

---
### 📍 TC094 — Nhận thông báo mua khóa học
* **Tên Test Case:** Thông báo real-time khi mua thành công
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** Học viên mua khóa học
* **Các bước thực hiện:** Kiểm tra biểu tượng chuông thông báo
* **Kết quả mong đợi:** Bạn đã đăng ký thành công khóa học...

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/notifications
Authorization: Bearer {{token_student}}
```

---
### 📍 TC095 — Thông báo có câu trả lời
* **Tên Test Case:** Học viên nhận được phản hồi từ GV
* **Độ ưu tiên:** `Medium`
* **Điều kiện tiên quyết (Preconditions):** GV đã trả lời câu hỏi Q&A
* **Các bước thực hiện:** Kiểm tra thông báo của học viên
* **Kết quả mong đợi:** Giảng viên đã trả lời câu hỏi của bạn...

**HTTP Request mẫu trên Postman:**
```http
GET {{base_url}}/notifications
Authorization: Bearer {{token_student}}
```

---
### 📍 TC096 — Đăng xuất
* **Tên Test Case:** Đăng xuất tài khoản khỏi hệ thống
* **Độ ưu tiên:** `High`
* **Điều kiện tiên quyết (Preconditions):** Đang đăng nhập
* **Các bước thực hiện:** Click Đăng xuất -> Xác nhận
* **Kết quả mong đợi:** Xóa token/session, đưa người dùng quay lại trang chủ ở trạng thái chưa đăng nhập

**HTTP Request mẫu trên Postman:**
```http
POST {{base_url}}/auth/logout
Authorization: Bearer {{token_student}}
```

---
