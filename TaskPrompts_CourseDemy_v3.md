# TASK PROMPTS — COURSEDEMY (PHẦN 3)

> Sử dụng từng prompt dưới đây để giao việc cho AI. Copy toàn bộ nội dung mỗi task và dán vào chat với AI.
> Tiếp nối các Task từ Giai đoạn 1 & Giai đoạn 2 (đã hoàn tất đến Task 12).
> Thực hiện theo thứ tự: Task 13 → 14 → 15 → 16.

---

## TASK 13 — Wishlist, Đánh giá khóa học & Lọc theo sao (Backend)

```
Tiếp tục dự án CourseDemy. Đã có sẵn: Auth middleware, các module courses/cart/orders/coupons/content/progress/payments (Task 0-12).

Yêu cầu: Code backend cho các chức năng: Wishlist (Khóa học yêu thích), Đánh giá 1-5 sao kèm nhận xét, và cập nhật bộ lọc tìm kiếm khóa học theo sao trung bình.

## Chuẩn response (BẮT BUỘC)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }

## Migration database.js — thêm bảng mới
Thêm vào file src/config/database.js (chạy CREATE TABLE IF NOT EXISTS):

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

## Files cần tạo hoặc chỉnh sửa

### 1. src/routes/wishlist.routes.js + src/controllers/wishlist.controller.js
Tất cả endpoint yêu cầu: authenticate + authorize('student')

GET /api/wishlist
- Lấy danh sách wishlist của học viên hiện tại (req.user.id)
- JOIN bảng courses + categories + users (instructor) để lấy thông tin khóa học đầy đủ
- Response 200: { success: true, data: [ { id, created_at, course: { id, title, price, thumbnail, category: { name }, instructor: { full_name } } } ] }

POST /api/wishlist
- Body: { course_id (required) }
- Kiểm tra course_id có hợp lệ và đã duyệt (status = 'approved') chưa, nếu không -> 404 { success: false, message: "Khóa học không tồn tại hoặc chưa được duyệt" }
- Nếu đã tồn tại trong wishlist của user -> 409 { success: false, message: "Khóa học đã có trong danh sách yêu thích" }
- Thêm mới vào wishlists
- Response 201: { success: true, message: "Đã thêm vào danh sách yêu thích" }

DELETE /api/wishlist/:courseId
- Xóa khóa học khỏi wishlist của user dựa trên courseId và req.user.id
- Không tìm thấy -> 404 { success: false, message: "Không tìm thấy khóa học trong danh sách yêu thích" }
- Response 200: { success: true, message: "Đã xóa khỏi danh sách yêu thích" }

### 2. src/routes/reviews.routes.js + src/controllers/reviews.controller.js

POST /api/courses/:id/reviews [authenticate + authorize('student')]
- Tham số `:id` là courseId. Body: { rating (required, INTEGER từ 1 đến 5), comment (optional) }
- Kiểm tra xem courseId có tồn tại hay không -> 404
- Kiểm tra xem student đã mua khóa học này chưa (phải tồn tại trong bảng `enrollments`) -> 403 { success: false, message: "Bạn cần mua khóa học này để có thể đánh giá" }
- Kiểm tra xem học viên đã đánh giá khóa học này chưa (một học viên chỉ được đánh giá một khóa học 1 lần) -> 409 { success: false, message: "Bạn đã đánh giá khóa học này rồi" }
- Nếu rating không trong khoảng 1-5 -> 400 { success: false, message: "Số sao đánh giá phải từ 1 đến 5" }
- Lưu đánh giá vào bảng `reviews`
- Response 201: { success: true, message: "Đánh giá khóa học thành công", data: { id, rating, comment, created_at } }

GET /api/courses/:id/reviews [Public]
- Trả danh sách đánh giá của khóa học `:id`, sắp xếp mới nhất trước
- Query params: page (default 1), limit (default 10)
- JOIN bảng users để lấy full_name của người đánh giá (ẩn email/password)
- Response 200: { success: true, data: { reviews: [ { id, rating, comment, created_at, user: { full_name } } ], total, page, totalPages } }

### 3. Cập nhật src/controllers/courses.controller.js
- Cập nhật API lấy danh sách khóa học `GET /api/courses` [Public]:
  - Query param mới (optional): `rating` (nhận giá trị số từ 1 đến 5)
  - Sử dụng phép toán LEFT JOIN với bảng `reviews` và hàm `AVG(reviews.rating)` để lấy điểm số sao trung bình của mỗi khóa học (`avg_rating`), và `COUNT(reviews.id)` làm tổng số lượt đánh giá (`reviews_count`). Nếu khóa học chưa có đánh giá nào, `avg_rating` bằng 0 hoặc NULL.
  - Khi có query param `rating` (ví dụ `rating=4`), lọc và chỉ trả về các khóa học có điểm trung bình sao `avg_rating >= 4`.
  - Mỗi phần tử khóa học trong mảng trả về phải có thêm thuộc tính: `avg_rating` (làm tròn 1 chữ số thập phân) và `reviews_count`.
- Cập nhật API chi tiết khóa học `GET /api/courses/:id` [Public]:
  - Trả về thêm `avg_rating` và `reviews_count` trong object data của khóa học.

### Mount vào app.js
- app.use('/api/wishlist', wishlistRoutes)
- app.use('/api/courses', reviewsRoutes)  // Hoặc mount thích hợp để chạy đúng định tuyến mong muốn

## Lưu ý kỹ thuật
- Sử dụng thư viện `better-sqlite3` (synchronous), thực hiện parameterized queries để chống SQL Injection.
- Viết query SQL lấy danh sách có GROUP BY courses.id để tính toán chính xác `AVG` và `COUNT`.
```

---

## TASK 14 — Ví tiền học viên, Rút tiền giảng viên & Phê duyệt admin (Backend)

```
Tiếp tục dự án CourseDemy. Đã có sẵn: Auth middleware, các module courses/cart/orders/coupons/content/progress/payments/reviews (Task 0-13).

Yêu cầu: Xây dựng hệ thống Ví tiền (Wallet) cho học viên và giảng viên, cho phép nạp tiền (giả lập), thanh toán mua khóa học bằng ví, giảng viên rút tiền từ ví của họ, và admin duyệt yêu cầu rút tiền.

## Chuẩn response (BẮT BUỘC)
Thành công: { "success": true, "message": "...", "data": {...} }
Lỗi: { "success": false, "message": "..." }

## Migration database.js — thêm bảng và cột mới
Thêm vào file src/config/database.js:

-- 1. Thêm cột balance vào bảng users nếu chưa có (kiểm tra bằng PRAGMA table_info trước):
ALTER TABLE users ADD COLUMN balance REAL NOT NULL DEFAULT 0;

-- 2. Tạo bảng wallet_transactions để ghi lịch sử giao dịch ví:
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('deposit','payment','withdrawal','refund','income')),
  status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('pending','success','failed')),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Tạo bảng withdrawal_requests để ghi nhận yêu cầu rút tiền của giảng viên:
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  reason TEXT, -- lý do từ chối (nếu có)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

-- 4. Thêm 'wallet' vào CHECK constraint của cột payment_method trong bảng orders (ở tầng code application).

## Files cần tạo hoặc chỉnh sửa

### 1. src/routes/wallet.routes.js + src/controllers/wallet.controller.js

GET /api/wallet [authenticate + authorize('student','instructor')]
- Lấy số dư ví hiện tại (`balance`) từ bảng `users`.
- Lấy danh sách lịch sử giao dịch ví từ bảng `wallet_transactions` của user (sắp xếp mới nhất trước).
- Response 200: { success: true, data: { balance, transactions: [ { id, amount, type, status, description, created_at } ] } }

POST /api/wallet/deposit [authenticate + authorize('student')]
- Nạp tiền giả lập vào ví học viên. Body: { amount (required, số dương) }
- Thiếu hoặc số tiền <= 0 -> 400 { success: false, message: "Số tiền nạp không hợp lệ" }
- Sử dụng db.transaction:
  1. Cập nhật `balance = balance + amount` trong bảng `users` cho học viên.
  2. Thêm bản ghi vào `wallet_transactions` (type='deposit', status='success', description="Nạp tiền vào ví").
- Response 200: { success: true, message: "Nạp tiền vào ví thành công", data: { new_balance } }

### 2. Sửa luồng thanh toán qua Ví — Cập nhật src/controllers/payments.controller.js
Tạo API thanh toán đơn hàng bằng ví:

POST /api/payments/wallet/pay [authenticate + authorize('student')]
- Body: { order_id (required) }
- Kiểm tra order có thuộc student và status = 'pending' không, nếu không -> lỗi tương ứng.
- Lấy `balance` hiện tại của student. Nếu `balance < order.total_amount` -> 400 { success: false, message: "Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền" }
- Sử dụng db.transaction:
  1. Trừ số dư ví của student: `balance = balance - order.total_amount`.
  2. Ghi nhận giao dịch ví cho student: `wallet_transactions` (type='payment', amount=order.total_amount, status='success', description=`Thanh toán đơn hàng #${order_id}`).
  3. Cập nhật trạng thái đơn hàng: `orders.status = 'paid'`, `payment_method = 'wallet'`.
  4. Tạo bản ghi `enrollments` cho từng khóa học trong đơn hàng.
  5. Cộng tiền trực tiếp cho từng giảng viên sở hữu các khóa học trong đơn hàng:
     - Lấy danh sách các khóa học từ `order_items` kèm theo `instructor_id` và giá thực tế đã mua của mỗi khóa học (sau khi chia tỉ lệ giảm giá nếu có áp dụng coupon).
     - Với mỗi khóa học, cộng tiền vào ví giảng viên: `users.balance = users.balance + actual_price` cho `instructor_id`.
     - Ghi nhận giao dịch ví cho giảng viên: `wallet_transactions` (user_id=instructor_id, type='income', amount=actual_price, status='success', description=`Thu nhập từ bán khóa học trong đơn hàng #${order_id}`).
  6. Tăng `used_count` của coupon nếu có.
  7. Xóa `cart_items` của student.
- Response 200: { success: true, message: "Thanh toán đơn hàng bằng ví thành công", data: { order_id, status: "paid" } }

### 3. API rút tiền cho Giảng viên (src/routes/instructor.routes.js & src/controllers/instructor.controller.js)

POST /api/instructor/withdrawals [authenticate + authorize('instructor')]
- Giảng viên yêu cầu rút tiền về tài khoản ngân hàng.
- Body: { amount (required, số dương), bank_name (required), account_number (required), account_holder (required) }
- Thiếu trường bắt buộc hoặc amount <= 0 -> 400
- Lấy `balance` hiện tại của giảng viên. Nếu `balance < amount` -> 400 { success: false, message: "Số dư tài khoản không đủ để rút" }
- Sử dụng db.transaction:
  1. Trừ số dư ví giảng viên ngay khi tạo yêu cầu: `balance = balance - amount`.
  2. Thêm bản ghi vào `withdrawal_requests` với status='pending'.
  3. Thêm bản ghi vào `wallet_transactions` (type='withdrawal', status='pending', description="Yêu cầu rút tiền về ngân hàng").
- Response 201: { success: true, message: "Tạo yêu cầu rút tiền thành công, đang chờ Admin duyệt", data: { withdrawal_id: id, amount } }

GET /api/instructor/withdrawals [authenticate + authorize('instructor')]
- Lấy lịch sử yêu cầu rút tiền của giảng viên hiện tại, mới nhất trước.
- Response 200: { success: true, data: [ { id, amount, bank_name, account_number, account_holder, status, reason, created_at, processed_at } ] }

### 4. API phê duyệt rút tiền của Admin (src/routes/admin.routes.js & src/controllers/admin.controller.js)

GET /api/admin/withdrawals [authenticate + authorize('admin')]
- Query param (optional): status ('pending', 'approved', 'rejected')
- Trả về toàn bộ yêu cầu rút tiền kèm theo tên giảng viên (`full_name`, `email`) lấy từ bảng `users`.
- Response 200: { success: true, data: [ { id, amount, bank_name, account_number, account_holder, status, reason, created_at, processed_at, instructor: { full_name, email } } ] }

PUT /api/admin/withdrawals/:id/approve [authenticate + authorize('admin')]
- Duyệt yêu cầu rút tiền.
- Kiểm tra yêu cầu rút tiền `:id` tồn tại không -> 404.
- Nếu trạng thái yêu cầu không phải 'pending' -> 400 { success: false, message: "Yêu cầu đã được xử lý từ trước" }
- Sử dụng db.transaction:
  1. Cập nhật `withdrawal_requests.status = 'approved'`, `processed_at = datetime('now')`.
  2. Cập nhật trạng thái trong `wallet_transactions` tương ứng thành `status = 'success'`.
- Response 200: { success: true, message: "Đã phê duyệt yêu cầu rút tiền" }

PUT /api/admin/withdrawals/:id/reject [authenticate + authorize('admin')]
- Từ chối yêu cầu rút tiền. Body: { reason (required) }
- Thiếu reason -> 400 { success: false, message: "Vui lòng cung cấp lý do từ chối" }
- Kiểm tra yêu cầu rút tiền `:id` tồn tại không -> 404.
- Nếu trạng thái yêu cầu không phải 'pending' -> 400.
- Sử dụng db.transaction:
  1. Cập nhật `withdrawal_requests.status = 'rejected'`, `reason = reason`, `processed_at = datetime('now')`.
  2. Cập nhật trạng thái trong `wallet_transactions` tương ứng thành `status = 'failed'`, và cập nhật description thành `Từ chối rút tiền: ${reason}`.
  3. Hoàn tiền lại vào số dư ví của giảng viên: `balance = balance + amount` trong bảng `users` cho giảng viên đó.
  4. Ghi một giao dịch ví mới hoàn tiền: `wallet_transactions` (user_id=instructor_id, type='refund', amount=amount, status='success', description=`Hoàn tiền yêu cầu rút tiền bị từ chối #${id}`).
- Response 200: { success: true, message: "Đã từ chối yêu cầu rút tiền" }

### Mount vào app.js
- app.use('/api/wallet', walletRoutes)
- Đảm bảo mount chính xác các API mới của admin/instructor vào các file routes tương ứng.
```

---

## TASK 15 — Giao diện Wishlist, Đánh giá & Lọc theo sao (Frontend)

```
Tiếp tục dự án CourseDemy. Backend đã hỗ trợ đầy đủ các API về Wishlist, Đánh giá khóa học và Lọc theo sao (Task 13).

Yêu cầu: Thiết kế và cập nhật các trang frontend (HTML, CSS, JS thuần) để tích hợp các tính năng trên.

## Cấu trúc thư mục frontend/ cập nhật
frontend/
├── index.html                # Cập nhật: Thêm bộ lọc sao, hiển thị sao trung bình, nút Wishlist nhanh
├── course.html               # Cập nhật: Hiển thị điểm sao trung bình, danh sách đánh giá, form đánh giá
└── wishlist.html             # Mới: Trang hiển thị danh sách khóa học yêu thích của học viên

## Yêu cầu chi tiết từng trang

### 1. index.html (Trang chủ)
- **Bộ lọc theo sao:**
  - Thêm một khu vực lọc trong thanh sidebar (bên cạnh lọc danh mục): dropdown hoặc nhóm radio buttons để chọn điểm đánh giá (Ví dụ: "Tất cả", "4 sao trở lên" [rating=4], "3 sao trở lên" [rating=3], ...).
  - Khi người dùng thay đổi bộ lọc sao, gọi API `GET /api/courses` truyền tham số `rating` tương ứng để cập nhật danh sách khóa học hiển thị.
- **Thẻ khóa học (Course Card):**
  - Hiển thị điểm đánh giá trung bình của khóa học dạng: `⭐ {avg_rating} ({reviews_count} đánh giá)`. Nếu chưa có đánh giá nào, hiển thị `⭐ 0 (0 đánh giá)` hoặc `Chưa có đánh giá`.
  - Trên mỗi thẻ khóa học, thêm một nút hình trái tim nhỏ ở góc. Khi student đã đăng nhập:
    - Nếu khóa học đã nằm trong wishlist của họ (kiểm tra trạng thái), trái tim có màu đỏ.
    - Click vào trái tim: nếu chưa có trong wishlist -> gọi `POST /api/wishlist` để thêm (đổi tim sang đỏ); nếu đã có -> gọi `DELETE /api/wishlist/:courseId` để xóa (đổi tim sang viền trống).
    - Nếu chưa đăng nhập, click vào trái tim sẽ chuyển hướng đến `login.html`.

### 2. course.html?id=X (Chi tiết khóa học)
- **Thông tin đánh giá tổng quan:**
  - Hiển thị điểm số sao trung bình và tổng số lượt đánh giá bên cạnh tên khóa học.
- **Nút Wishlist:**
  - Thêm nút "Yêu thích" (hoặc icon trái tim) bên cạnh nút "Thêm vào giỏ hàng". Logic hoạt động tương tự như ở trang chủ.
- **Khu vực Đánh giá (Đặt ở dưới cùng trang):**
  - Load và hiển thị danh sách các đánh giá từ API `GET /api/courses/:id/reviews` (sử dụng phân trang đơn giản nếu nhiều đánh giá).
  - **Form gửi Đánh giá:** Chỉ hiển thị khi người dùng là Học viên (student) ĐÃ mua khóa học này (`enrolled = true` lấy từ API sections hoặc check lịch sử enrollments), và CHƯA từng đánh giá khóa học này.
    - Form gồm: Chọn số sao từ 1 đến 5 (thiết kế dạng 5 ngôi sao click chọn để mang lại trải nghiệm premium) và 1 ô textarea nhập nội dung nhận xét.
    - Nút "Gửi đánh giá" -> gọi `POST /api/courses/:id/reviews`. Gửi thành công -> ẩn form, hiển thị thông báo thành công và load lại danh sách đánh giá cũng như điểm số sao trung bình mà không cần load lại cả trang.

### 3. wishlist.html [Student only]
- Kiểm tra đăng nhập và role student khi truy cập (requireAuth, requireRole).
- Lấy danh sách khóa học yêu thích từ API `GET /api/wishlist`.
- Render dưới dạng grid các thẻ khóa học tương tự trang chủ (có ảnh thumbnail, tiêu đề, tên giảng viên, giá tiền, điểm đánh giá).
- Mỗi thẻ có thêm nút "Xóa khỏi danh sách yêu thích" (icon thùng rác hoặc nút chữ). Click vào sẽ gọi API `DELETE /api/wishlist/:courseId` và reload danh sách wishlist.
- Nếu wishlist trống, hiển thị thông báo thân thiện: "Danh sách yêu thích của bạn đang trống. Hãy khám phá các khóa học ngay!" kèm nút quay lại trang chủ.

## Yêu cầu UI & UX
- Hiệu ứng hover mềm mại khi click chọn số sao trên form đánh giá.
- Sử dụng spinner khi đang gửi đánh giá hoặc đang tải wishlist.
- Tải file `js/api.js` và sử dụng `apiFetch` để thực hiện các yêu cầu API an toàn.
```

---

## TASK 16 — Giao diện Ví tiền học viên, Rút tiền giảng viên & Phê duyệt admin (Frontend)

```
Tiếp tục dự án CourseDemy. Backend đã hoàn thiện đầy đủ các API liên quan đến Ví tiền, Rút tiền giảng viên và phê duyệt rút tiền của Admin (Task 14).

Yêu cầu: Thiết kế và cập nhật các trang frontend (HTML, CSS, JS thuần) để triển khai các tính năng ví tiền, rút tiền và phê duyệt.

## Cấu trúc thư mục frontend/ cập nhật hoặc tạo mới
frontend/
├── wallet.html               # Mới: Trang quản lý ví tiền của học viên (nạp tiền, xem lịch sử giao dịch)
├── checkout.html             # Cập nhật: Chọn phương thức Ví tiền, hiển thị số dư, nạp nhanh tiền
├── instructor-wallet.html    # Mới: Trang ví tiền của giảng viên (xem doanh thu, yêu cầu rút tiền)
└── admin-withdrawals.html    # Mới: Trang quản lý phê duyệt yêu cầu rút tiền dành cho Admin

## Yêu cầu chi tiết từng trang

### 1. wallet.html [Student only]
- Yêu cầu đăng nhập và phân quyền student.
- Hiển thị số dư ví hiện tại bằng định dạng tiền tệ bắt mắt.
- **Form nạp tiền giả lập:**
  - Người dùng nhập số tiền muốn nạp.
  - Nút "Nạp tiền ngay" -> gọi API `POST /api/wallet/deposit`. Thành công -> cập nhật lại số dư ví trên màn hình và làm mới bảng lịch sử giao dịch.
- **Bảng lịch sử giao dịch:**
  - Hiển thị danh sách giao dịch gồm: Mã giao dịch, loại giao dịch (Nạp tiền, Thanh toán đơn hàng, Hoàn tiền), số tiền (màu xanh nếu cộng tiền, màu đỏ nếu trừ tiền), trạng thái (Thành công, Thất bại) và thời gian thực hiện.

### 2. Cập nhật checkout.html [Student only]
- **Tích hợp phương thức thanh toán ví:**
  - Thêm một radio button chọn phương thức: "Ví điện tử CourseDemy".
  - Hiển thị số dư ví của học viên tại trang này.
  - Nếu số dư ví nhỏ hơn tổng số tiền thanh toán của đơn hàng:
    - Vô hiệu hóa (disable) radio button "Ví điện tử CourseDemy".
    - Hiển thị thông báo màu đỏ cảnh báo: "Số dư ví không đủ. Vui lòng [Nạp thêm tiền]" (Nút Nạp thêm tiền sẽ mở một modal nạp tiền nhanh hoặc chuyển hướng sang trang `wallet.html`).
- **Xử lý nút "Xác nhận thanh toán":**
  - Nếu chọn Ví điện tử: sau khi POST tạo order thành công, gọi tiếp API `POST /api/payments/wallet/pay { order_id }`. Thanh toán thành công -> chuyển hướng ngay tới `my-courses.html`.

### 3. instructor-wallet.html [Instructor only]
- Yêu cầu đăng nhập và phân quyền instructor.
- Hiển thị số dư doanh thu hiện tại của giảng viên.
- **Form yêu cầu rút tiền:**
  - Nhập số tiền cần rút, Tên ngân hàng, Số tài khoản, Tên chủ tài khoản.
  - Nút "Gửi yêu cầu rút tiền" -> gọi API `POST /api/instructor/withdrawals`.
  - Kiểm tra nếu số tiền rút lớn hơn số dư ví hiện tại -> báo lỗi trực tiếp trên giao diện không cho gửi.
  - Tạo yêu cầu thành công -> trừ số dư hiển thị, thêm dòng mới vào bảng lịch sử yêu cầu rút tiền.
- **Bảng lịch sử yêu cầu rút tiền:**
  - Liệt kê các cột: Số tiền rút, Ngân hàng nhận, Số tài khoản, Trạng thái (chờ duyệt, đã duyệt, bị từ chối - có badge màu tương ứng), Lý do từ chối (nếu có), Ngày tạo, Ngày xử lý.

### 4. admin-withdrawals.html [Admin only]
- Yêu cầu đăng nhập và phân quyền admin.
- Hiển thị danh sách toàn bộ các yêu cầu rút tiền lấy từ API `GET /api/admin/withdrawals`.
- Cho phép lọc danh sách theo trạng thái (Tất cả, Chờ duyệt, Đã duyệt, Bị từ chối).
- **Hành động duyệt:**
  - Với các yêu cầu có trạng thái `pending`, hiển thị 2 nút: "Duyệt" và "Từ chối".
  - Click "Duyệt" -> hiện hộp thoại xác nhận (Confirm) -> gọi API phê duyệt rút tiền.
  - Click "Từ chối" -> hiển thị một Modal nhỏ yêu cầu nhập lý do từ chối -> người dùng nhập lý do -> click gửi -> gọi API từ chối rút tiền kèm theo lý do.
  - Sau khi xử lý xong (duyệt/từ chối), load lại danh sách để cập nhật trạng thái mới nhất trên bảng.

### 5. Cập nhật các menu điều hướng (Navbar / Sidebar)
- Học viên (Student): Thêm liên kết đến trang `wallet.html` và `wishlist.html` trên navbar.
- Giảng viên (Instructor): Thêm liên kết đến trang `instructor-wallet.html` trên thanh điều hướng của giảng viên.
- Admin: Thêm liên kết đến trang `admin-withdrawals.html` trên trang quản trị `admin.html`.

## Yêu cầu UI & UX chung
- Các bảng lịch sử cần có phân trang hoặc hiển thị cuộn nếu số lượng bản ghi lớn.
- Sử dụng các màu sắc nhất quán và trực quan (ví dụ: xanh lá cho đã duyệt/thành công, vàng cho chờ duyệt, đỏ cho bị từ chối/thất bại).
- Đảm bảo thiết kế đáp ứng (Responsive) tốt trên các giao diện thiết bị di động.
```

---

> **Lưu ý tổng quan khi thực hiện Giai đoạn 3 (Task 13-16):**
> - Thực hiện tuần tự các Task để đảm bảo backend hoạt động trơn tru trước khi dựng giao diện frontend.
> - Sau mỗi Task backend, sử dụng các phần mềm test API (Postman/Thunder Client) hoặc viết script để tự động kiểm thử.
> - Lưu ý tính toàn vẹn của dữ liệu trong các file migration database.js. Tránh lỗi trùng lặp khi chạy lại server nhiều lần.
> - Đảm bảo các giao dịch trừ/cộng tiền trong ví phải được đặt bên trong transaction để tránh lỗi race conditions hoặc không đồng bộ số dư.
