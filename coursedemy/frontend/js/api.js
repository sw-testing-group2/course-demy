const API_BASE = 'http://localhost:3000/api';

// ══════════════════════════════════════════════════════
//  AUTH HELPERS
// ══════════════════════════════════════════════════════
function getToken() { return localStorage.getItem('token'); }
function getUser()  {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}
function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
function isLoggedIn() { return !!getToken(); }

function requireAuth(redirectTo = '/login.html') {
  if (!isLoggedIn()) { window.location.href = redirectTo; return false; }
  return true;
}
function requireRole(role, redirectTo = '/index.html') {
  const user = getUser();
  if (!user || user.role !== role) { window.location.href = redirectTo; return false; }
  return true;
}

// ══════════════════════════════════════════════════════
//  FETCH WRAPPER
// ══════════════════════════════════════════════════════
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { success: false, message: 'Không thể kết nối server' } };
  }
}

// ══════════════════════════════════════════════════════
//  UI UTILITIES
// ══════════════════════════════════════════════════════
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-fade'); setTimeout(() => toast.remove(), 400); }, 3600);
}

function showSpinner() { document.getElementById('spinner')?.classList.remove('hidden'); }
function hideSpinner() { document.getElementById('spinner')?.classList.add('hidden'); }

// ══════════════════════════════════════════════════════
//  FORMAT HELPERS
// ══════════════════════════════════════════════════════
function formatPrice(price) {
  if (price === 0) return '<span class="badge badge-success">Miễn phí</span>';
  return `<span class="price">${price.toLocaleString('vi-VN')}₫</span>`;
}
function formatPriceText(price) {
  return price === 0 ? 'Miễn phí' : `${price.toLocaleString('vi-VN')}₫`;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function statusBadge(status) {
  const cfg = {
    pending:  { cls: 'badge-warning',  label: 'Chờ duyệt' },
    approved: { cls: 'badge-success',  label: 'Đã duyệt' },
    rejected: { cls: 'badge-danger',   label: 'Từ chối' },
    active:   { cls: 'badge-success',  label: 'Hoạt động' },
    locked:   { cls: 'badge-danger',   label: 'Đã khóa' },
    paid:     { cls: 'badge-success',  label: 'Đã thanh toán' },
    student:  { cls: 'badge-info',     label: 'Học viên' },
    instructor:{ cls: 'badge-primary', label: 'Giảng viên' },
    admin:    { cls: 'badge-warning',  label: 'Admin' },
  };
  const c = cfg[status] || { cls: 'badge-info', label: status };
  return `<span class="badge ${c.cls}">${c.label}</span>`;
}
// ══════════════════════════════════════════════════════
//  STAR HELPERS
// ══════════════════════════════════════════════════════
function renderStars(rating) {
  const r = Math.round((rating || 0) * 2) / 2; // round to nearest 0.5
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (r >= i) stars += '★';
    else if (r >= i - 0.5) stars += '½';
    else stars += '☆';
  }
  return stars;
}
function starDisplayHtml(course) {
  const avg = parseFloat(course.avg_rating) || 0;
  const cnt = parseInt(course.reviews_count) || 0;
  if (cnt === 0) return `<span class="star-display"><span class="stars">☆☆☆☆☆</span> <span class="rating-count">Chưa có đánh giá</span></span>`;
  return `<span class="star-display"><span class="stars">${renderStars(avg)}</span> <span class="rating-val">${avg.toFixed(1)}</span> <span class="rating-count">(${cnt} đánh giá)</span></span>`;
}

// ══════════════════════════════════════════════════════
//  WISHLIST HEART
// ══════════════════════════════════════════════════════
// Set of wished course IDs (populated after login)
window._wishedIds = new Set();

async function loadWishlistIds() {
  if (!isLoggedIn() || getUser()?.role !== 'student') return;
  const { ok, data } = await apiFetch('/wishlist');
  if (ok && data.data) {
    window._wishedIds = new Set(data.data.map(item => String(item.course?.id ?? item.id)));
  }
}

async function toggleWishlist(courseId, btn) {
  if (!isLoggedIn()) { window.location.href = '/login.html'; return; }
  const idStr = String(courseId);
  const wished = window._wishedIds.has(idStr);
  btn.disabled = true;
  if (wished) {
    const { ok, data } = await apiFetch(`/wishlist/${courseId}`, { method: 'DELETE' });
    if (ok) {
      window._wishedIds.delete(idStr);
      btn.classList.remove('wished');
      btn.title = 'Thêm vào yêu thích';
      showToast('Đã xóa khỏi danh sách yêu thích', 'info');
    } else { showToast(data.message || 'Lỗi xử lý', 'error'); }
  } else {
    const { ok, data } = await apiFetch('/wishlist', { method: 'POST', body: JSON.stringify({ course_id: parseInt(courseId) }) });
    if (ok) {
      window._wishedIds.add(idStr);
      btn.classList.add('wished');
      btn.title = 'Xóa khỏi yêu thích';
      showToast('Đã thêm vào yêu thích ❤️', 'success');
    } else { showToast(data.message || 'Lỗi xử lý', 'error'); }
  }
  btn.disabled = false;
}

function wishHeartHtml(courseId) {
  if (!isLoggedIn() || getUser()?.role !== 'student') {
    // still show heart for guests but clicking redirects to login
    return `<button class="wish-btn" title="Đăng nhập để yêu thích" onclick="window.location.href='/login.html'" aria-label="Yêu thích">♡</button>`;
  }
  const wished = window._wishedIds.has(String(courseId));
  return `<button class="wish-btn${wished?' wished':''}" title="${wished?'Xóa khỏi yêu thích':'Thêm vào yêu thích'}" onclick="toggleWishlist(${courseId},this)" aria-label="Yêu thích">${wished?'♥':'♡'}</button>`;
}

function courseCard(course, linkPrefix = '/course.html') {
  const thumb = course.thumbnail
    ? `<img src="${course.thumbnail}" alt="${course.title}" class="card-thumb">`
    : `<div class="card-thumb-placeholder"><span>📚</span></div>`;
  return `
    <div class="course-card">
      <a href="${linkPrefix}?id=${course.id}" class="card-thumb-wrap">${thumb}${wishHeartHtml(course.id)}</a>
      <div class="card-body">
        <h3 class="card-title"><a href="${linkPrefix}?id=${course.id}">${course.title}</a></h3>
        <p class="card-instructor">👤 ${course.instructor?.full_name || '—'}</p>
        ${course.category ? `<span class="badge badge-outline">${course.category.name}</span>` : ''}
        ${starDisplayHtml(course)}
        <div class="card-footer">
          ${formatPrice(course.price)}
          <a href="${linkPrefix}?id=${course.id}" class="btn btn-sm btn-primary">Xem chi tiết</a>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  NAVBAR
// ══════════════════════════════════════════════════════
function renderNavbar(activePage = '') {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const user = getUser();

  let rightHtml = '';
  if (user) {
    let roleLinks = '';
    if (user.role === 'student') {
      roleLinks = `
        <a href="/cart.html" class="nav-link ${activePage==='cart'?'active':''}">🛒 Giỏ hàng</a>
        <a href="/my-courses.html" class="nav-link ${activePage==='my-courses'?'active':''}">📚 Khóa học của tôi</a>
        <a href="/wishlist.html" class="nav-link ${activePage==='wishlist'?'active':''}">❤️ Yêu thích</a>
        <a href="/wallet.html" class="nav-link ${activePage==='wallet'?'active':''}">&#128176; Ví tiền</a>`;
    } else if (user.role === 'instructor') {
      roleLinks = `
        <a href="/instructor-stats.html" class="nav-link ${activePage==='instructor-stats'?'active':''}">📊 Thống kê</a>
        <a href="/instructor.html" class="nav-link ${activePage==='instructor'?'active':''}">🎓 Giảng dạy</a>
        <a href="/instructor-questions.html" class="nav-link ${activePage==='instructor-qna'?'active':''}">💬 Hỏi &amp; Đáp</a>
        <a href="/instructor-wallet.html" class="nav-link ${activePage==='instructor-wallet'?'active':''}">&#128176; Ví doanh thu</a>`;
    } else if (user.role === 'admin') {
      roleLinks = `
        <a href="/admin-dashboard.html" class="nav-link ${activePage==='admin-dashboard'?'active':''}">📊 Tổng quan</a>
        <a href="/admin-users.html" class="nav-link ${activePage==='admin-users'?'active':''}">👥 Người dùng</a>
        <a href="/admin.html" class="nav-link ${activePage==='admin'?'active':''}">⚙️ Admin</a>
        <a href="/admin-withdrawals.html" class="nav-link ${activePage==='admin-withdrawals'?'active':''}">&#128176; Rút tiền</a>`;
    }
    rightHtml = `
      ${roleLinks}
      <a href="/profile.html" class="nav-avatar" title="Hồ sơ của tôi">
        <span class="avatar-circle">${user.full_name.charAt(0).toUpperCase()}</span>
      </a>
      <button onclick="logout()" class="btn btn-sm btn-outline-danger">Đăng xuất</button>`;
  } else {
    rightHtml = `
      <a href="/login.html" class="btn btn-sm btn-ghost">Đăng nhập</a>
      <a href="/register.html" class="btn btn-sm btn-primary">Đăng ký</a>`;
  }

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="/index.html" class="nav-logo">
        <span class="logo-icon">🎓</span>
        <span class="logo-text">CourseDemy</span>
      </a>
      <div class="nav-links">${rightHtml}</div>
    </div>`;
}

function logout() {
  clearAuth();
  window.location.href = '/index.html';
}
