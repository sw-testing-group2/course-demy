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
function courseCard(course, linkPrefix = '/course.html') {
  const thumb = course.thumbnail
    ? `<img src="${course.thumbnail}" alt="${course.title}" class="card-thumb">`
    : `<div class="card-thumb-placeholder"><span>📚</span></div>`;
  return `
    <div class="course-card">
      <a href="${linkPrefix}?id=${course.id}" class="card-thumb-wrap">${thumb}</a>
      <div class="card-body">
        <h3 class="card-title"><a href="${linkPrefix}?id=${course.id}">${course.title}</a></h3>
        <p class="card-instructor">👤 ${course.instructor?.full_name || '—'}</p>
        ${course.category ? `<span class="badge badge-outline">${course.category.name}</span>` : ''}
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
        <a href="/my-courses.html" class="nav-link ${activePage==='my-courses'?'active':''}">📚 Khóa học của tôi</a>`;
    } else if (user.role === 'instructor') {
      roleLinks = `<a href="/instructor.html" class="nav-link ${activePage==='instructor'?'active':''}">🎓 Giảng dạy</a>`;
    } else if (user.role === 'admin') {
      roleLinks = `<a href="/admin.html" class="nav-link ${activePage==='admin'?'active':''}">⚙️ Admin</a>`;
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
