/**
 * js/notifications.js
 * Chuông thông báo dùng chung — nhúng vào MỌI trang có navbar + đã đăng nhập.
 * Yêu cầu: api.js đã được load trước script này.
 */
(function () {
  'use strict';

  // ── Trạng thái module ──────────────────────────────────────────────────────
  let _unreadCount  = 0;
  let _pollTimer    = null;
  let _dropOpen     = false;
  const POLL_INTERVAL = 45000; // 45 giây

  // ── Helper: thời gian tương đối ────────────────────────────────────────────
  function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)      return 'vừa xong';
    if (diff < 3600)    return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400)   return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800)  return `${Math.floor(diff / 86400)} ngày trước`;
    if (diff < 2592000) return `${Math.floor(diff / 604800)} tuần trước`;
    return `${Math.floor(diff / 2592000)} tháng trước`;
  }

  // ── Cập nhật badge số ──────────────────────────────────────────────────────
  function updateBadge(count) {
    _unreadCount = count;
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (count <= 0) {
      badge.style.display = 'none';
      badge.textContent = '';
    } else {
      badge.style.display = 'flex';
      badge.textContent = count > 9 ? '9+' : String(count);
    }
  }

  // ── Fetch unread count ─────────────────────────────────────────────────────
  async function fetchUnreadCount() {
    if (!isLoggedIn()) return;
    try {
      const { ok, data } = await apiFetch('/notifications/unread-count');
      if (ok) updateBadge(data.data?.unread_count ?? 0);
    } catch (_) { /* silent */ }
  }

  // ── Render 1 item trong dropdown ───────────────────────────────────────────
  function renderDropItem(n) {
    const isUnread = !n.is_read;
    const excerpt  = (n.content || '').slice(0, 80) + ((n.content || '').length > 80 ? '…' : '');
    return `
      <div class="notif-drop-item${isUnread ? ' unread' : ''}"
           id="ndrop-${n.id}"
           onclick="window._notifClickItem(${n.id}, ${JSON.stringify(n.link || '')})">
        <div class="notif-drop-header">
          ${isUnread ? '<span class="notif-dot"></span>' : '<span class="notif-dot read"></span>'}
          <span class="notif-drop-title">${escHtmlN(n.title)}</span>
        </div>
        <div class="notif-drop-excerpt">${escHtmlN(excerpt)}</div>
        <div class="notif-drop-time">${timeAgo(n.created_at)}</div>
      </div>`;
  }

  function escHtmlN(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Mở/đóng dropdown ──────────────────────────────────────────────────────
  async function openDrop() {
    const drop = document.getElementById('notif-dropdown');
    if (!drop) return;
    _dropOpen = true;
    drop.classList.add('open');

    drop.innerHTML = `
      <div class="notif-drop-top">
        <span class="notif-drop-heading">🔔 Thông báo</span>
        <a href="/notifications.html" class="notif-drop-all">Xem tất cả →</a>
      </div>
      <div class="notif-drop-list" id="notif-drop-list">
        <div style="padding:20px;text-align:center;color:var(--text-muted)">
          <div class="spinner-ring" style="width:28px;height:28px;border-width:3px;margin:0 auto 8px"></div>
          Đang tải...
        </div>
      </div>`;

    try {
      const { ok, data } = await apiFetch('/notifications?limit=5');
      const listEl = document.getElementById('notif-drop-list');
      if (!listEl) return;

      if (!ok || !data.data?.notifications?.length) {
        listEl.innerHTML = `<div class="notif-drop-empty">🔕 Không có thông báo nào</div>`;
        return;
      }

      listEl.innerHTML = data.data.notifications.map(renderDropItem).join('');
    } catch (_) {
      const listEl = document.getElementById('notif-drop-list');
      if (listEl) listEl.innerHTML = `<div class="notif-drop-empty">Không thể tải thông báo</div>`;
    }
  }

  function closeDrop() {
    _dropOpen = false;
    document.getElementById('notif-dropdown')?.classList.remove('open');
  }

  function toggleDrop() {
    if (_dropOpen) { closeDrop(); } else { openDrop(); }
  }

  // ── Click item → mark read → navigate ────────────────────────────────────
  window._notifClickItem = async function (id, link) {
    // Cập nhật giao diện ngay
    const itemEl = document.getElementById(`ndrop-${id}`);
    if (itemEl) {
      itemEl.classList.remove('unread');
      itemEl.querySelector('.notif-dot')?.classList.add('read');
    }

    // Gọi API đánh dấu đã đọc (fire-and-forget)
    apiFetch(`/notifications/${id}/read`, { method: 'PUT' }).then(({ ok }) => {
      if (ok && _unreadCount > 0) updateBadge(_unreadCount - 1);
    });

    // Điều hướng nếu có link
    if (link) {
      closeDrop();
      window.location.href = link;
    }
  };

  // ── Inject bell icon vào navbar ───────────────────────────────────────────
  function injectBell() {
    if (!isLoggedIn()) return;
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || document.getElementById('notif-bell-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'notif-bell-wrap';
    wrap.id = 'notif-bell-wrap';
    wrap.innerHTML = `
      <button class="notif-bell-btn" id="notif-bell-btn"
              onclick="window._notifToggle()" aria-label="Thông báo" title="Thông báo">
        🔔
        <span class="notif-badge" id="notif-badge" style="display:none"></span>
      </button>
      <div class="notif-dropdown" id="notif-dropdown"></div>`;

    // Chèn trước avatar (nav-avatar)
    const avatar = navLinks.querySelector('.nav-avatar');
    if (avatar) {
      navLinks.insertBefore(wrap, avatar);
    } else {
      navLinks.appendChild(wrap);
    }
  }

  window._notifToggle = toggleDrop;

  // Đóng dropdown khi click ra ngoài
  document.addEventListener('click', (e) => {
    if (!_dropOpen) return;
    const wrap = document.getElementById('notif-bell-wrap');
    if (wrap && !wrap.contains(e.target)) closeDrop();
  });

  // Focus tab → refresh count
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fetchUnreadCount();
  });

  // ── Khởi động ─────────────────────────────────────────────────────────────
  function init() {
    if (!isLoggedIn()) return;

    // Inject bell sau khi renderNavbar() đã chạy
    // Dùng MutationObserver để chờ #navbar populated
    const nav = document.getElementById('navbar');
    if (!nav) return;

    const observer = new MutationObserver(() => {
      if (nav.querySelector('.nav-links')) {
        observer.disconnect();
        injectBell();
        fetchUnreadCount();
        // Polling
        if (_pollTimer) clearInterval(_pollTimer);
        _pollTimer = setInterval(fetchUnreadCount, POLL_INTERVAL);
      }
    });
    observer.observe(nav, { childList: true, subtree: true });

    // Nếu nav đã có sẵn (renderNavbar đã chạy trước)
    if (nav.querySelector('.nav-links')) {
      observer.disconnect();
      injectBell();
      fetchUnreadCount();
      if (_pollTimer) clearInterval(_pollTimer);
      _pollTimer = setInterval(fetchUnreadCount, POLL_INTERVAL);
    }
  }

  // Chạy sau DOMContentLoaded hoặc ngay nếu DOM đã ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
