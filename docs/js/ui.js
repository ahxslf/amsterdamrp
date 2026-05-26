/**
 * AMSTERDAM RP - UI UTILITIES v3.0
 * Toast, Modal, Loader, Theme, Notifications Bell, Formatters
 */

// ===== TOAST =====
const Toast = {
  container: null,
  ensure() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type='info', duration=3200) {
    this.ensure();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
    el.innerHTML = `<span style="display:flex;align-items:center;gap:8px;"><span style="font-weight:800;font-size:1.1rem;">${icons[type]||icons.info}</span> <span>${message}</span></span>`;
    this.container.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(120%)'; setTimeout(()=>el.remove(),300); }, duration);
  },
  success(m,d){this.show(m,'success',d);},
  error(m,d){this.show(m,'error',d);},
  warning(m,d){this.show(m,'warning',d);},
  info(m,d){this.show(m,'info',d);}
};
window.toast = Toast.show.bind(Toast);

// ===== FORMATTERS =====
function formatTL(n) { return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'EUR'}).format(n); }
function formatDate(d) { if(!d) return '—'; return new Date(d).toLocaleDateString('tr-TR',{year:'numeric',month:'2-digit',day:'2-digit'}); }
function formatDateTime(d,t) { return `${formatDate(d)} ${t||''}`.trim(); }
function todayISO() { return new Date().toISOString().split('T')[0]; }

// ===== MODAL =====
const Modal = {
  open(htmlContent, onClose) {
    let overlay = document.getElementById('rp-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'rp-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `<div class="modal" id="rp-modal"></div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => { if(e.target===overlay){overlay.classList.remove('active'); if(onClose) onClose();} });
    }
    const modal = document.getElementById('rp-modal');
    modal.innerHTML = htmlContent;
    overlay.classList.add('active');
  },
  close() {
    const overlay = document.getElementById('rp-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }
};

// ===== THEME =====
const Theme = {
  init() {
    const saved = localStorage.getItem(APP_CONFIG.keys.theme);
    if (saved==='dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  },
  toggle() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(APP_CONFIG.keys.theme, isDark?'dark':'light');
  },
  isDark() { return document.documentElement.classList.contains('dark'); }
};

// ===== PRINT =====
function printSection(selector, title) {
  const el = document.querySelector(selector);
  if (!el) return;
  const win = window.open('','_blank');
  win.document.write(`<html><head><title>${title}</title><style>body{font-family:system-ui,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{padding:8px;border:1px solid #ccc;text-align:left;}th{background:#f3f4f6;}</style></head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  win.print();
}

// ===== LOADING =====
function showLoading(msg='İşlem yapılıyor...') {
  let el = document.getElementById('rp-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rp-loader';
    el.innerHTML = `<div style="position:fixed;inset:0;background:rgba(255,255,255,0.85);backdrop-filter:blur(4px);z-index:300;display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;"><div style="width:48px;height:48px;border:4px solid var(--border);border-top-color:var(--primary-blue);border-radius:50%;animation:spin 1s linear infinite;"></div><div style="font-weight:600;color:var(--text-muted);">${msg}</div></div>`;
    document.body.appendChild(el);
  }
  el.firstElementChild.style.display = 'flex';
}
function hideLoading() {
  const el = document.getElementById('rp-loader');
  if (el) el.firstElementChild.style.display = 'none';
}

// ===== RECEIPT =====
function generateReceiptHTML(payment) {
  return `
    <div style="max-width:420px;margin:0 auto;text-align:center;font-family:system-ui,sans-serif;">
      <div style="font-size:2.5rem;margin-bottom:8px;">🧾</div>
      <h2 style="margin:0;font-size:1.1rem;">AMSTERDAM RP e-DEVLET KAPISI</h2>
      <p style="margin:4px 0 16px;font-size:0.82rem;color:#666;">Elektronik Ödeme Makbuzu</p>
      <hr style="border:none;border-top:1px dashed #ccc;margin:12px 0;">
      <table style="width:100%;text-align:left;font-size:0.9rem;">
        <tr><td style="padding:6px 0;border-bottom:1px solid #eee;">Makbuz No</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:700;text-align:right;">${payment.receiptNo||'—'}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #eee;">İşlem Tarihi</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:700;text-align:right;">${formatDate(payment.date)}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #eee;">Plaka</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:700;text-align:right;">${payment.plate||'—'}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #eee;">Tutar</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:700;text-align:right;color:#065f46;">${formatTL(payment.amount)}</td></tr>
        <tr><td style="padding:6px 0;">Durum</td><td style="padding:6px 0;font-weight:700;text-align:right;color:#065f46;">BAŞARILI</td></tr>
      </table>
      <hr style="border:none;border-top:1px dashed #ccc;margin:12px 0;">
      <p style="font-size:0.75rem;color:#888;margin-top:12px;">Bu belge elektronik ortamda düzenlenmiştir. amsterdam-rp.nl</p>
    </div>`;
}

// ===== SIDEBAR =====
function injectSidebar(activePage) {
  const user = Auth.getUser();
  const container = document.querySelector('.dash-grid') || document.querySelector('.sidebar-container');
  if (!container || !user) return;
  const sidebar = container.querySelector('aside.sidebar');
  if (!sidebar) return;
  const nameEl = sidebar.querySelector('#dash-name');
  const tcEl = sidebar.querySelector('#dash-tc');
  if (nameEl) nameEl.textContent = `${user.firstName} ${user.lastName}`;
  if (tcEl) tcEl.textContent = user.tc;
  sidebar.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href')?.includes(activePage));
  });
  // Police link
  const nav = sidebar.querySelector('.sidebar-nav');
  if (nav && Auth.isPolice()) {
    if (!nav.querySelector('a[href="polis.html"]')) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="polis.html"><i class="fas fa-shield-alt"></i> Polis Paneli</a>`;
      nav.insertBefore(li, nav.querySelector('a[href="ayarlar.html"]')?.parentElement || null);
    }
  }
  // Justice link
  if (nav && (Auth.isJudge() || Auth.isProsecutor() || Auth.isLawyer())) {
    if (!nav.querySelector('a[href="eadalet.html"]')) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="eadalet.html"><i class="fas fa-balance-scale"></i> e-Adalet</a>`;
      nav.insertBefore(li, nav.querySelector('a[href="ayarlar.html"]')?.parentElement || null);
    }
  }
}

// ===== PAGINATION =====
function paginate(items, page=1, perPage=10) {
  const total = Math.ceil(items.length / perPage);
  const start = (page-1)*perPage;
  return { data:items.slice(start, start+perPage), total, page, perPage };
}
function sortTable(rows, key, dir='asc') {
  return [...rows].sort((a,b) => {
    const av=a[key]??''; const bv=b[key]??'';
    if (typeof av==='number' && typeof bv==='number') return dir==='asc'?av-bv:bv-av;
    return dir==='asc'?String(av).localeCompare(String(bv),'tr'):String(bv).localeCompare(String(av),'tr');
  });
}

// ===== NOTIFICATIONS BELL =====
const NotifBell = {
  inject() {
    const user = Auth.getUser();
    if (!user) return;
    const count = DB.getUnreadCount(user.tc);
    const headerAuth = document.getElementById('header-auth');
    if (!headerAuth) return;
    // Remove existing bell
    const existing = document.getElementById('notif-bell-wrap');
    if (existing) existing.remove();
    const wrap = document.createElement('div');
    wrap.id = 'notif-bell-wrap';
    wrap.style.cssText = 'position:relative;margin-right:4px;';
    wrap.innerHTML = `
      <button onclick="NotifBell.toggle()" class="btn btn-sm" style="border:1px solid var(--border);position:relative;padding:8px 10px;">
        <i class="fas fa-bell" style="font-size:1.05rem;"></i>
        ${count > 0 ? `<span class="notif-badge">${count > 9 ? '9+' : count}</span>` : ''}
      </button>
      <div id="notif-dropdown" class="notif-dropdown" style="display:none;">
        <div class="notif-dropdown-header">
          <strong>Bildirimler</strong>
          <button onclick="NotifBell.markAllRead()" style="background:none;border:none;color:var(--primary-blue);font-size:0.78rem;cursor:pointer;font-weight:600;">Tümünü Oku</button>
        </div>
        <div id="notif-dropdown-list" class="notif-dropdown-list"></div>
        <div class="notif-dropdown-footer">
          <a href="bildirimler.html" style="font-size:0.82rem;color:var(--primary-blue);font-weight:600;text-decoration:none;">Tüm Bildirimleri Gör →</a>
        </div>
      </div>
    `;
    headerAuth.insertBefore(wrap, headerAuth.firstChild);
    this.renderList();
  },

  renderList() {
    const user = Auth.getUser();
    if (!user) return;
    const list = document.getElementById('notif-dropdown-list');
    if (!list) return;
    const notifs = DB.getNotifications(user.tc).slice(0, 8);
    if (notifs.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">Bildirim bulunmuyor.</div>';
      return;
    }
    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="NotifBell.readAndGo(${n.id})">
        <div class="notif-item-icon notif-type-${n.type||'info'}"><i class="${n.icon||'fas fa-info-circle'}"></i></div>
        <div class="notif-item-body">
          <div class="notif-item-title">${n.title}</div>
          <div class="notif-item-text">${n.body.length > 80 ? n.body.substring(0,80)+'...' : n.body}</div>
          <div class="notif-item-date">${formatDate(n.date)}</div>
        </div>
      </div>
    `).join('');
  },

  toggle() {
    const dd = document.getElementById('notif-dropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'flex' : 'none';
  },

  markAllRead() {
    const user = Auth.getUser();
    if (user) { DB.markAllRead(user.tc); this.inject(); Toast.success('Tüm bildirimler okundu.'); }
  },

  readAndGo(id) {
    DB.markNotifRead(id);
    window.location.href = 'bildirimler.html';
  }
};

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const bell = document.getElementById('notif-bell-wrap');
  if (bell && !bell.contains(e.target)) {
    const dd = document.getElementById('notif-dropdown');
    if (dd) dd.style.display = 'none';
  }
});
