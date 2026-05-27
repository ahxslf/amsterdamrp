/**
 * AMSTERDAM RP - Async fixes + RP kurum panelleri v45
 * Not: Yeni DMV/Vergi/Şirket sistemleri ek tablo gerektirmeden localStorage üzerinde çalışır.
 */
(function () {
  const EXT_KEY = 'ams_rp_ext_v1';

  const safe = (v, fallback = []) => Array.isArray(v) ? v : fallback;
  const asArray = async (v) => safe(await Promise.resolve(v));
  const asNumber = (v) => Number(v || 0);
  const uid = (p = 'ID') => p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  const iso = (d = new Date()) => d.toISOString().split('T')[0];
  const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return iso(d); };
  const fullName = (u) => `${u?.firstName || u?.first_name || ''} ${u?.lastName || u?.last_name || ''}`.trim() || u?.discord_username || 'Bilinmiyor';

  function loadExt() {
    try {
      const raw = localStorage.getItem(EXT_KEY);
      if (raw) return { ...defaults(), ...JSON.parse(raw) };
    } catch (_) {}
    return defaults();
  }

  function defaults() {
    return {
      accounts: {},
      policeQueue: [],
      installmentPlans: [],
      invoices: [],
      companies: [],
      dmvApplications: [],
      dmvVehicles: []
    };
  }

  function saveExt(data) { localStorage.setItem(EXT_KEY, JSON.stringify(data)); }
  function getAccount(data, tc) {
    if (!tc) return { income: 0, expense: 0, balance: 0, suspicious: false, notes: [] };
    data.accounts[tc] = data.accounts[tc] || { income: 0, expense: 0, balance: 0, suspicious: false, notes: [] };
    return data.accounts[tc];
  }

  function requireLogin() {
    const user = RPAuth.getUser();
    if (!user) {
      window.location.href = 'giris.html';
      return null;
    }
    return user;
  }

  function accessCard(el, title = 'Yetkisiz Erişim', text = 'Bu paneli kullanmak için yetkiniz yok.') {
    if (!el) return;
    el.innerHTML = `<div class="card" style="text-align:center;padding:45px 20px;border-left:4px solid #ef4444;">
      <div style="font-size:3rem;margin-bottom:12px;">🚫</div><h2>${title}</h2><p style="color:var(--text-muted);margin-top:8px;">${text}</p>
      <a href="panel.html" class="btn btn-primary" style="margin-top:18px;">Panele Dön</a>
    </div>`;
  }

  // ===== Admin bütün mesleki panellere erişsin =====
  if (window.RPAuth) {
    const old = {
      isPolice: RPAuth.isPolice?.bind(RPAuth),
      isJudge: RPAuth.isJudge?.bind(RPAuth),
      isProsecutor: RPAuth.isProsecutor?.bind(RPAuth),
      isLawyer: RPAuth.isLawyer?.bind(RPAuth),
      isJustice: RPAuth.isJustice?.bind(RPAuth)
    };
    const jobHas = (words) => {
      const u = RPAuth.getUser();
      const job = String(u?.job || '').toLocaleLowerCase('tr-TR');
      return words.some(w => job.includes(w.toLocaleLowerCase('tr-TR')));
    };
    RPAuth.isPolice = () => RPAuth.isAdmin() || !!old.isPolice?.();
    RPAuth.isJudge = () => RPAuth.isAdmin() || !!old.isJudge?.();
    RPAuth.isProsecutor = () => RPAuth.isAdmin() || !!old.isProsecutor?.();
    RPAuth.isLawyer = () => RPAuth.isAdmin() || !!old.isLawyer?.();
    RPAuth.isJustice = () => RPAuth.isAdmin() || !!old.isJustice?.();
    RPAuth.isDMV = () => RPAuth.isAdmin() || jobHas(['dmv', 'rdw', 'ehliyet', 'ulaştırma']);
    RPAuth.isTaxOfficer = () => RPAuth.isAdmin() || jobHas(['vergi', 'maliye', 'belasting']);
    RPAuth.isDigiSignOfficer = () => RPAuth.isAdmin() || jobHas(['digisign', 'e-imza', 'e imza']);
    RPAuth.isCompanyOfficer = () => RPAuth.isAdmin() || jobHas(['ticaret', 'şirket', 'sirket']);
    RPAuth.isAuthorized = () => RPAuth.isAdmin() || RPAuth.isPolice() || RPAuth.isJustice() || RPAuth.isDMV() || RPAuth.isTaxOfficer() || RPAuth.isDigiSignOfficer();
  }

  // ===== Sidebar'a yeni paneller =====
  if (typeof window.injectSidebar === 'function') {
    const oldInjectSidebar = window.injectSidebar;
    window.injectSidebar = function (activePage) {
      oldInjectSidebar(activePage);
      const user = RPAuth.getUser();
      const nav = document.querySelector('.sidebar-nav');
      if (!user || !nav) return;
      const before = nav.querySelector('a[href="ayarlar.html"]')?.parentElement || nav.lastElementChild;
      const add = (href, icon, label, allowed) => {
        if (!allowed || nav.querySelector(`a[href="${href}"]`)) return;
        const li = document.createElement('li');
        li.innerHTML = `<a href="${href}" class="${href.includes(activePage) ? 'active' : ''}"><i class="${icon}"></i> ${label}</a>`;
        nav.insertBefore(li, before);
      };
      add('dmv.html', 'fas fa-id-card', 'DMV Paneli', RPAuth.isDMV());
      add('vergi.html', 'fas fa-receipt', 'Vergi Dairesi', RPAuth.isTaxOfficer());
      add('digisign-panel.html', 'fas fa-certificate', 'DigiSign Yetkili', RPAuth.isDigiSignOfficer());
      add('sirket.html', 'fas fa-store', 'Şirket Paneli', true);
      add('admin.html', 'fas fa-crown', 'Admin Paneli', RPAuth.isAdmin());
    };
  }

  // ===== Bildirim zili async düzeltmesi =====
  if (typeof NotifBell !== 'undefined') {
    NotifBell.inject = async function () {
      const user = RPAuth.getUser();
      if (!user || !user.tc) return;
      const headerAuth = document.getElementById('header-auth');
      if (!headerAuth) return;
      const count = await Promise.resolve(DB.getUnreadCount(user.tc)).catch(() => 0);
      document.getElementById('notif-bell-wrap')?.remove();
      const wrap = document.createElement('div');
      wrap.id = 'notif-bell-wrap';
      wrap.style.cssText = 'position:relative;margin-right:4px;';
      wrap.innerHTML = `
        <button onclick="NotifBell.toggle()" class="btn btn-sm" style="border:1px solid var(--border);position:relative;padding:8px 10px;">
          <i class="fas fa-bell" style="font-size:1.05rem;"></i>
          ${count > 0 ? `<span class="notif-badge">${count > 9 ? '9+' : count}</span>` : ''}
        </button>
        <div id="notif-dropdown" class="notif-dropdown" style="display:none;">
          <div class="notif-dropdown-header"><strong>Bildirimler</strong><button onclick="NotifBell.markAllRead()" style="background:none;border:none;color:var(--primary-blue);font-size:0.78rem;cursor:pointer;font-weight:600;">Tümünü Oku</button></div>
          <div id="notif-dropdown-list" class="notif-dropdown-list"></div>
          <div class="notif-dropdown-footer"><a href="bildirimler.html" style="font-size:0.82rem;color:var(--primary-blue);font-weight:600;text-decoration:none;">Tüm Bildirimleri Gör →</a></div>
        </div>`;
      headerAuth.insertBefore(wrap, headerAuth.firstChild);
      await this.renderList();
    };
    NotifBell.renderList = async function () {
      const user = RPAuth.getUser();
      const list = document.getElementById('notif-dropdown-list');
      if (!user || !user.tc || !list) return;
      const notifs = (await asArray(DB.getNotifications(user.tc))).slice(0, 8);
      if (notifs.length === 0) { list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">Bildirim bulunmuyor.</div>'; return; }
      list.innerHTML = notifs.map(n => `<div class="notif-item ${n.read ? '' : 'unread'}" onclick="NotifBell.readAndGo(${n.id})"><div class="notif-item-icon notif-type-${n.type||'info'}"><i class="${n.icon||'fas fa-info-circle'}"></i></div><div class="notif-item-body"><div class="notif-item-title">${n.title||'Bildirim'}</div><div class="notif-item-text">${String(n.body||'').length > 80 ? String(n.body).substring(0,80)+'...' : (n.body||'')}</div><div class="notif-item-date">${formatDate(n.date)}</div></div></div>`).join('');
    };
    NotifBell.markAllRead = async function () { const u = RPAuth.getUser(); if (u?.tc) { await DB.markAllRead(u.tc); await this.inject(); Toast.success('Tüm bildirimler okundu.'); } };
  }

  // ===== Profil async düzeltmesi =====
  window.initProfilePage = async function initProfilePage() {
    const user = RPAuth.getUser();
    const c = document.getElementById('profile-content');
    if (!user) { if (c) c.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><h4>Giriş Gerekli</h4><a href="giris.html" class="btn btn-primary btn-sm" style="margin-top:10px;">Giriş Yap</a></div>`; return; }
    try {
      const params = new URLSearchParams(window.location.search);
      let tc = user.tc;
      if (RPAuth.isAuthorized() && params.get('tc')) tc = params.get('tc');
      let targetUser = tc ? await Promise.resolve(DB.getUserByTC(tc)) : null;
      if (!targetUser && user.discord_id) targetUser = await Promise.resolve(DB.getUserByDiscord(user.discord_id));
      targetUser = RPAuth.normalizeUser ? RPAuth.normalizeUser(targetUser || user) : (targetUser || user);
      tc = targetUser.tc || user.tc;

      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '—'; };
      set('prof-name', fullName(targetUser)); set('prof-tc', tc || '—'); set('prof-birth', formatDate(targetUser.birthDate || targetUser.birth_date));
      set('prof-city', targetUser.city || '—'); set('prof-address', targetUser.address || '—'); set('prof-job', targetUser.job || '—'); set('prof-blood', targetUser.bloodType || targetUser.blood_type || '—'); set('prof-phone', targetUser.phone || '—'); set('prof-email', targetUser.email || '—');

      const [vehicles, fines, records, appts] = await Promise.all([
        asArray(DB.getVehicles({ ownerTc: tc })),
        asArray(DB.getActiveFines({ tc })),
        asArray(DB.getCriminalRecords({ tc })),
        asArray(DB.getAppointments({ tc }))
      ]);
      const vEl = document.getElementById('prof-vehicles');
      if (vEl) vEl.innerHTML = vehicles.length ? vehicles.map(v => `<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:600;">${v.brand||'Araç'} ${v.model||''} (${v.year||'—'})</div><div style="font-size:0.78rem;color:var(--text-muted);">${v.color||'—'}</div></div><span style="font-weight:700;">${v.plate||'—'}</span></div>`).join('') : '<p style="color:var(--text-muted);">Kayıtlı araç yok.</p>';
      const fEl = document.getElementById('prof-fines');
      if (fEl) { const unpaid = fines.filter(f => f.status === 'Ödenmedi'); fEl.innerHTML = fines.length ? fines.map(f => `<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;"><div style="font-size:0.9rem;"><div style="font-weight:600;">${f.reason||'Trafik cezası'}</div><div style="font-size:0.78rem;color:var(--text-muted);">${f.plate||'—'} • ${formatDate(f.date)}</div></div><span class="status-badge ${f.status==='Ödenmedi'?'status-odenmedi':'status-odendi'}">${formatTL(asNumber(f.amount))}</span></div>`).join('') : '<p style="color:var(--text-muted);">Ceza yok.</p>'; if (unpaid.length) fEl.insertAdjacentHTML('beforeend', `<div style="margin-top:10px;font-weight:700;text-align:right;color:#991b1b;">Borç: ${formatTL(unpaid.reduce((a,b)=>a+asNumber(b.amount),0))}</div>`); }
      const rEl = document.getElementById('prof-records');
      if (rEl) rEl.innerHTML = records.length ? records.map(r => `<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;"><div><div style="font-weight:600;">${r.crime||r.reason||'Kayıt'}</div><div style="font-size:0.78rem;color:var(--text-muted);">${r.caseNo||r.case_no||'—'}</div></div><span class="status-badge ${r.status==='Kapalı'?'status-odendi':'status-odenmedi'}">${r.status||'Açık'}</span></div>`).join('') : '<p style="color:var(--text-muted);">Sicil temiz.</p>';
      const aEl = document.getElementById('prof-appts');
      if (aEl) { const active = appts.filter(a => a.status === 'Aktif'); aEl.innerHTML = active.length ? active.map(a => `<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;"><div><div style="font-weight:600;">${a.service||'Randevu'}</div><div style="font-size:0.78rem;color:var(--text-muted);">${a.institution||'—'} • ${formatDate(a.date||a.appointment_date)}</div></div><span class="status-badge status-guvluk">${a.status}</span></div>`).join('') : '<p style="color:var(--text-muted);">Randevu yok.</p>'; }
    } catch (err) { console.error(err); if (c) c.innerHTML = `<div class="card" style="border-left:4px solid #ef4444;color:#991b1b;">Profil yüklenemedi: ${err.message}</div>`; }
  };

  // ===== Dashboard async düzeltmesi =====
  window.initDashboardPage = async function initDashboardPage() {
    const user = RPAuth.requireAuth(); if (!user) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('dash-name', `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.discord_username || 'Kullanıcı'); set('dash-tc', user.tc || '—');
    const [myFines, myRecords, myVehicles, myAppts] = await Promise.all([asArray(DB.getActiveFines({tc:user.tc})), asArray(DB.getCriminalRecords({tc:user.tc})), asArray(DB.getVehicles({ownerTc:user.tc})), asArray(DB.getAppointments({tc:user.tc}))]);
    set('stat-fines', myFines.filter(f=>f.status==='Ödenmedi').length); set('stat-records', myRecords.length); set('stat-vehicles', myVehicles.length); set('stat-appts', myAppts.filter(a=>a.status==='Aktif').length);
    const sBal=document.getElementById('stat-balance'); if(sBal)sBal.textContent=formatTL(myFines.filter(f=>f.status==='Ödenmedi').reduce((a,b)=>a+asNumber(b.amount),0));
    const recent=document.getElementById('recent-list'); if(recent){const logs=[...myFines,...myRecords].sort((a,b)=>new Date(b.date||b.created_at)-new Date(a.date||a.created_at)).slice(0,6); recent.innerHTML = logs.length ? logs.map(l=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);"><div><div style="font-weight:600;font-size:0.9rem;">${l.reason||l.crime||'İşlem'}</div><div style="font-size:0.78rem;color:var(--text-muted);">${formatDate(l.date||l.created_at)}</div></div><span class="status-badge ${l.status==='Ödenmedi'?'status-odenmedi':l.status==='Ödendi'||l.status==='Kapalı'?'status-odendi':'status-acik'}">${l.status||'—'}</span></div>`).join('') : `<div class="empty-state"><div class="icon">📭</div><p>İşlem yok.</p></div>`; }
    const quick = document.getElementById('dash-quick');
    if (quick && RPAuth.isAdmin()) quick.insertAdjacentHTML('beforeend', `<a href="dmv.html" class="btn btn-outline" style="justify-content:center;"><i class="fas fa-id-card"></i> DMV</a><a href="vergi.html" class="btn btn-outline" style="justify-content:center;"><i class="fas fa-receipt"></i> Vergi</a><a href="digisign-panel.html" class="btn btn-outline" style="justify-content:center;"><i class="fas fa-certificate"></i> DigiSign</a><a href="sirket.html" class="btn btn-outline" style="justify-content:center;"><i class="fas fa-store"></i> Şirket</a>`);
  };

  // ===== Kurumlar override =====
  window.initKurumlar = function initKurumlar(){const grid=document.getElementById('kurum-grid');if(!grid)return;const k=[{name:'Amsterdam Politie',icon:'fas fa-shield-alt',color:'#0d47a1',desc:'Asayiş, trafik, soruşturma ve bildirimler.',links:[{label:'Polis Paneli',href:'polis.html'}]},{name:'DMV / RDW',icon:'fas fa-id-card',color:'#059669',desc:'Ehliyet başvurusu, sınavlar, sürüş testi ve araç kayıt işlemleri.',links:[{label:'DMV Paneli',href:'dmv.html'},{label:'Araçlarım',href:'arac.html'}]},{name:'Vergi Dairesi',icon:'fas fa-receipt',color:'#f59e0b',desc:'Gelir/gider kontrolü, fatura, taksitlendirme ve haciz işlemleri.',links:[{label:'Vergi Paneli',href:'vergi.html'}]},{name:'Amsterdam Adliyesi',icon:'fas fa-gavel',color:'#7c3aed',desc:'Dava takibi, savcılık/hâkim/avukat işlemleri.',links:[{label:'e-Adalet',href:'eadalet.html'},{label:'Sicil',href:'sicil.html'}]},{name:`${APP_CONFIG.eSignProvider.shortName}`,icon:'fas fa-certificate',color:'#7c3aed',desc:`${APP_CONFIG.eSignProvider.slogan}`,links:[{label:'e-İmza',href:'eimza.html'},{label:'DigiSign Yetkili',href:'digisign-panel.html'}]},{name:'Ticaret / Şirketler',icon:'fas fa-store',color:'#0ea5e9',desc:'Şirket veya dükkân başvurusu, fatura kesme ve itiraz işlemleri.',links:[{label:'Şirket Paneli',href:'sirket.html'}]}];grid.innerHTML=k.map(x=>`<div class="card" style="border-left:4px solid ${x.color};"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;"><div style="width:46px;height:46px;border-radius:50%;background:${x.color}15;color:${x.color};display:grid;place-items:center;font-size:1.2rem;"><i class="${x.icon}"></i></div><h3 style="font-size:1.05rem;">${x.name}</h3></div><p style="font-size:0.86rem;color:var(--text-muted);margin-bottom:14px;">${x.desc}</p><div style="display:flex;gap:8px;flex-wrap:wrap;">${x.links.map(l=>`<a href="${l.href}" class="btn btn-outline btn-sm">${l.label}</a>`).join('')}</div></div>`).join('');};

  // ===== Vergi Paneli =====
  window.initTaxPanel = async function initTaxPanel() {
    const el = document.getElementById('tax-panel'); const user = requireLogin(); if (!el || !user) return;
    if (!RPAuth.isTaxOfficer()) return accessCard(el, 'Vergi Dairesi Yetkisi Gerekli', 'Bu panel yalnızca admin/vergi yetkilileri tarafından kullanılabilir.');
    const data = loadExt(); const users = await asArray(DB.getUsers()); const fines = await asArray(DB.getFines());
    const plans = data.installmentPlans; const invoices = data.invoices;
    el.innerHTML = `<div class="card" style="border-left:4px solid #f59e0b;"><div class="card-header"><i class="fas fa-receipt" style="color:#f59e0b;"></i><h3>Vergi Dairesi Kontrol Paneli</h3></div><p style="font-size:0.86rem;color:var(--text-muted);">Gelir/gider, şüpheli işlem, kara para yönlendirme, ceza/fatura taksitlendirme ve haciz işaretleme.</p></div>
      <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:start;">
        <div class="card"><h3 style="margin-bottom:12px;">Vatandaş Finans Kayıtları</h3><div style="overflow-x:auto;"><table class="data-table" style="font-size:.82rem;"><thead><tr><th>T.C.</th><th>Ad Soyad</th><th>Gelir</th><th>Gider</th><th>Bakiye</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${users.map(u=>{const a=getAccount(data,u.tc);return `<tr><td>${u.tc||'—'}</td><td>${fullName(u)}</td><td>${formatTL(a.income)}</td><td>${formatTL(a.expense)}</td><td style="font-weight:700;color:${a.balance<0?'#ef4444':'#059669'};">${formatTL(a.balance)}</td><td>${a.suspicious?'<span class="status-badge status-odenmedi">Şüpheli</span>':'<span class="status-badge status-odendi">Normal</span>'}</td><td><button class="btn btn-sm btn-outline" onclick="TaxPanel.editAccount('${u.tc}')">Düzenle</button><button class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;margin-left:4px;" onclick="TaxPanel.flag('${u.tc}')">Şüpheli</button><button class="btn btn-sm" style="background:#0d47a1;color:#fff;border:none;margin-left:4px;" onclick="TaxPanel.police('${u.tc}')">Politie</button></td></tr>`}).join('')}</tbody></table></div></div>
        <div class="card"><h3 style="margin-bottom:12px;">Trafik Cezası Taksitlendirme</h3>${fines.filter(f=>f.status==='Ödenmedi').length?fines.filter(f=>f.status==='Ödenmedi').map(f=>`<div style="padding:10px;border-bottom:1px solid var(--border);"><strong>${f.plate}</strong> — ${formatTL(f.amount)}<br><span style="font-size:.78rem;color:var(--text-muted);">${f.tc} • ${f.reason||'Ceza'}</span><br><button class="btn btn-sm btn-outline" style="margin-top:6px;" onclick="TaxPanel.installment('fine','${f.id}','${f.tc}',${asNumber(f.amount)})">4 Taksit Yap</button></div>`).join(''):'<p style="color:var(--text-muted);">Ödenmemiş ceza yok.</p>'}</div>
      </div>
      <div class="card" style="margin-top:20px;"><h3 style="margin-bottom:12px;">Aktif Taksit / Haciz</h3>${plans.length?plans.map(p=>`<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;"><div><strong>${p.kind==='invoice'?'Fatura':'Ceza'}:</strong> ${p.sourceId} • T.C. ${p.tc} • ${formatTL(p.total)} ${p.seized?'<span class="status-badge status-odenmedi">Haciz Gönderildi</span>':''}</div><button class="btn btn-sm btn-red" onclick="TaxPanel.seize('${p.id}')">Haciz Gönderildi İşaretle</button></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;margin-top:8px;">${p.parts.map((part,i)=>`<button class="btn btn-sm ${part.paid?'btn-outline':'btn-primary'}" onclick="TaxPanel.payPart('${p.id}',${i})">${i+1}. ${formatTL(part.amount)}<br><small>${part.due} ${part.paid?'✓':''}</small></button>`).join('')}</div></div>`).join(''):'<p style="color:var(--text-muted);">Aktif taksit yok.</p>'}</div>
      <div class="card" style="margin-top:20px;"><h3>Fatura Taksitlendirme</h3>${invoices.filter(i=>i.status==='Kesildi'||i.status==='İtiraz Edildi').map(i=>`<div style="padding:10px;border-bottom:1px solid var(--border);"><strong>${i.title}</strong> — ${formatTL(i.amount)} • ${i.toTc}<button class="btn btn-sm btn-outline" style="margin-left:8px;" onclick="TaxPanel.installment('invoice','${i.id}','${i.toTc}',${asNumber(i.amount)})">4 Taksit Yap</button></div>`).join('')||'<p style="color:var(--text-muted);">Taksitlenebilir fatura yok.</p>'}</div>`;
  };

  window.TaxPanel = {
    editAccount(tc){const data=loadExt();const a=getAccount(data,tc);const income=Number(prompt('Gelir:',a.income)||a.income);const expense=Number(prompt('Gider:',a.expense)||a.expense);a.income=income;a.expense=expense;a.balance=income-expense;saveExt(data);Toast.success('Finans kaydı güncellendi.');initTaxPanel();},
    flag(tc){const data=loadExt();const a=getAccount(data,tc);a.suspicious=true;(a.notes=a.notes||[]).push({date:iso(),text:'Vergi dairesi tarafından şüpheli işaretlendi.'});saveExt(data);Toast.warning('Şüpheli işaretlendi.');initTaxPanel();},
    police(tc){const data=loadExt();data.policeQueue.push({id:uid('POL'),date:iso(),type:'Vergi/Kara Para',tc,status:'Politieye Yönlendirildi',body:'Vergi dairesi kara para/şüpheli finans bildirimi gönderdi.'});saveExt(data);Toast.success('Amsterdam Politie kuyruğuna yönlendirildi.');initTaxPanel();},
    installment(kind,sourceId,tc,total){const data=loadExt();if(data.installmentPlans.some(p=>p.kind===kind&&String(p.sourceId)===String(sourceId))){Toast.info('Bu kayıt zaten taksitli.');return;}const amount=Number(total)/4;data.installmentPlans.push({id:uid('TAK'),kind,sourceId,tc,total:Number(total),createdAt:iso(),seized:false,parts:[1,2,3,4].map(i=>({amount,due:addDays(i*7),paid:false}))});saveExt(data);Toast.success('4 eşit haftalık taksit oluşturuldu.');initTaxPanel();},
    payPart(id,i){const data=loadExt();const p=data.installmentPlans.find(x=>x.id===id);if(p){p.parts[i].paid=!p.parts[i].paid;saveExt(data);initTaxPanel();}},
    seize(id){const data=loadExt();const p=data.installmentPlans.find(x=>x.id===id);if(p){p.seized=true;const a=getAccount(data,p.tc);a.balance-=p.parts.filter(x=>!x.paid).reduce((s,x)=>s+x.amount,0);a.expense+=p.parts.filter(x=>!x.paid).reduce((s,x)=>s+x.amount,0);saveExt(data);Toast.warning('Haciz gönderildi olarak işaretlendi, bakiye güncellendi.');initTaxPanel();}}
  };

  // ===== Şirket Paneli =====
  window.initCompanyPanel = async function initCompanyPanel(){const el=document.getElementById('company-panel');const user=requireLogin();if(!el||!user)return;const data=loadExt();const myCompanies=data.companies.filter(c=>c.ownerTc===user.tc&&c.status==='Onaylandı');const pending=data.companies.filter(c=>c.status==='Bekliyor');const myInvoices=data.invoices.filter(i=>i.toTc===user.tc||i.fromTc===user.tc||myCompanies.some(c=>c.id===i.companyId));el.innerHTML=`<div class="card" style="border-left:4px solid #0ea5e9;"><div class="card-header"><i class="fas fa-store" style="color:#0ea5e9;"></i><h3>Şirket / Dükkan Paneli</h3></div><p style="font-size:.86rem;color:var(--text-muted);">Şirket başvurusu, fatura kesme, fatura itirazı ve politie bildirimi.</p></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;"><div class="card"><h3>Şirket/Dükkan Başvurusu</h3><form onsubmit="CompanyPanel.apply(event)" style="margin-top:12px;"><div class="form-group"><label>İşletme Adı</label><input id="co-name" required></div><div class="form-group"><label>Tür</label><select id="co-type"><option>Şirket</option><option>Dükkan</option><option>Holding</option><option>Servis İşletmesi</option></select></div><div class="form-group"><label>Açıklama</label><input id="co-desc" placeholder="Faaliyet alanı"></div><button class="btn btn-primary" type="submit">Başvuru Gönder</button></form></div><div class="card"><h3>Fatura Kes</h3>${myCompanies.length||RPAuth.isCompanyOfficer()?`<form onsubmit="CompanyPanel.invoice(event)" style="margin-top:12px;"><div class="form-group"><label>Şirket</label><select id="inv-company">${(RPAuth.isCompanyOfficer()?data.companies.filter(c=>c.status==='Onaylandı'):myCompanies).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><div class="form-group"><label>Alıcı T.C.</label><input id="inv-tc" required></div><div class="form-group"><label>Başlık</label><input id="inv-title" required></div><div class="form-group"><label>Tutar</label><input id="inv-amount" type="number" min="1" required></div><button class="btn btn-primary" type="submit">Fatura Kes</button></form>`:'<p style="color:var(--text-muted);">Fatura kesmek için onaylı şirketiniz olmalı.</p>'}</div></div>${RPAuth.isCompanyOfficer()?`<div class="card" style="margin-top:20px;"><h3>Yetkili Onay Bekleyen Başvurular</h3>${pending.length?pending.map(c=>`<div style="padding:10px;border-bottom:1px solid var(--border);"><strong>${c.name}</strong> • ${c.ownerName} • ${c.type}<button class="btn btn-sm" style="background:#10b981;color:#fff;border:none;margin-left:8px;" onclick="CompanyPanel.approve('${c.id}')">Onayla</button><button class="btn btn-sm btn-red" onclick="CompanyPanel.reject('${c.id}')">Reddet</button></div>`).join(''):'<p style="color:var(--text-muted);">Bekleyen başvuru yok.</p>'}</div>`:''}<div class="card" style="margin-top:20px;"><h3>Faturalar</h3>${myInvoices.length?myInvoices.map(i=>`<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;"><div><strong>${i.title}</strong> — ${formatTL(i.amount)}<br><span style="font-size:.78rem;color:var(--text-muted);">${i.fromName} → ${i.toTc} • ${i.status}</span></div>${i.toTc===user.tc&&i.status==='Kesildi'?`<button class="btn btn-sm btn-red" onclick="CompanyPanel.object('${i.id}')">İtiraz Et</button>`:''}</div></div>`).join(''):'<p style="color:var(--text-muted);">Fatura yok.</p>'}</div>`;};
  window.CompanyPanel={apply(e){e.preventDefault();const data=loadExt();const u=RPAuth.getUser();data.companies.push({id:uid('CO'),ownerTc:u.tc,ownerName:fullName(u),name:document.getElementById('co-name').value,type:document.getElementById('co-type').value,desc:document.getElementById('co-desc').value,status:'Bekliyor',createdAt:iso()});saveExt(data);Toast.success('Başvuru yetkili paneline gönderildi.');initCompanyPanel();},approve(id){const d=loadExt();const c=d.companies.find(x=>x.id===id);if(c){c.status='Onaylandı';saveExt(d);Toast.success('Şirket onaylandı.');initCompanyPanel();}},reject(id){const d=loadExt();const c=d.companies.find(x=>x.id===id);if(c){c.status='Reddedildi';saveExt(d);initCompanyPanel();}},invoice(e){e.preventDefault();const d=loadExt();const co=d.companies.find(c=>c.id===document.getElementById('inv-company').value);d.invoices.push({id:uid('INV'),companyId:co?.id,fromTc:co?.ownerTc,fromName:co?.name||'Şirket',toTc:document.getElementById('inv-tc').value.trim(),title:document.getElementById('inv-title').value,amount:Number(document.getElementById('inv-amount').value),status:'Kesildi',createdAt:iso()});saveExt(d);Toast.success('Fatura kesildi.');initCompanyPanel();},object(id){const d=loadExt();const i=d.invoices.find(x=>x.id===id);if(i){i.status='İtiraz Edildi';d.policeQueue.push({id:uid('POL'),date:iso(),type:'Fatura İtirazı',tc:i.toTc,status:'Politieye Bildirildi',body:`${i.title} faturası için itiraz oluşturuldu. Dava/soruşturma açılabilir.`});saveExt(d);Toast.warning('İtiraz alındı, politie paneline bildirim gönderildi.');initCompanyPanel();}}};

  // ===== DMV Paneli =====
  window.initDMVPanel = async function initDMVPanel(){const el=document.getElementById('dmv-panel');const user=requireLogin();if(!el||!user)return;const data=loadExt();const apps=data.dmvApplications;const my=apps.filter(a=>a.tc===user.tc).slice(-1)[0];el.innerHTML=`<div class="card" style="border-left:4px solid #059669;"><div class="card-header"><i class="fas fa-id-card" style="color:#059669;"></i><h3>DMV / RDW Paneli</h3></div><p style="font-size:.86rem;color:var(--text-muted);">Ehliyet başvurusu, sürücü aday sınavı, fiziksel sürüş testi, ehliyet çıkartma ve araç kayıt işlemleri.</p></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;"><div class="card"><h3>Ehliyet Başvurusu</h3>${!my||['İptal','Reddedildi','Başarısız'].includes(my.status)?`<button class="btn btn-primary" onclick="DMVPanel.apply()" style="margin-top:12px;">Ehliyet Başvurusu Yap</button>`:`<div style="margin-top:12px;"><strong>Durum:</strong> <span class="status-badge status-acik">${my.status}</span><br><strong>Aşama:</strong> ${my.stage}<br><strong>Başarısızlık:</strong> ${my.failCount}/2</div>`}<p style="font-size:.8rem;color:var(--text-muted);margin-top:10px;">Sürücü aday sınavı tamamlanmadan fiziksel sürüş testine geçilemez. 2 başarısızlıkta başvuru iptal edilir.</p></div><div class="card"><h3>Kayıtlı DMV Araçları</h3>${data.dmvVehicles.filter(v=>v.ownerTc===user.tc||RPAuth.isDMV()).map(v=>`<div style="padding:10px;border-bottom:1px solid var(--border);"><strong>${v.plate}</strong> • ${v.brand} ${v.model} • ${v.ownerTc} ${RPAuth.isDMV()?`<button class="btn btn-sm btn-outline" onclick="DMVPanel.changePlate('${v.id}')">Plaka Değiştir</button><button class="btn btn-sm btn-red" onclick="DMVPanel.delVehicle('${v.id}')">Sil</button>`:''}</div>`).join('')||'<p style="color:var(--text-muted);">Kayıt yok.</p>'}</div></div>${RPAuth.isDMV()?`<div class="card" style="margin-top:20px;"><h3>DMV Yetkili İşlemleri</h3><h4 style="margin:12px 0 8px;">Ehliyet Süreçleri</h4>${apps.length?apps.map(a=>`<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;"><strong>${a.name}</strong> • ${a.tc}<br><span style="font-size:.82rem;color:var(--text-muted);">${a.status} • ${a.stage} • Başarısızlık ${a.failCount}/2</span><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-sm" onclick="DMVPanel.passTheory('${a.id}')">Sınav Onay</button><button class="btn btn-sm btn-red" onclick="DMVPanel.fail('${a.id}','Sürücü Aday Sınavı')">Sınav Başarısız</button><button class="btn btn-sm" onclick="DMVPanel.passDrive('${a.id}')">Sürüş Testi Onay</button><button class="btn btn-sm btn-red" onclick="DMVPanel.fail('${a.id}','Fiziksel Sürüş Testi')">Sürüş Başarısız</button><button class="btn btn-sm" style="background:#10b981;color:#fff;border:none;" onclick="DMVPanel.issue('${a.id}')">Ehliyet Çıkart</button><button class="btn btn-sm btn-red" onclick="DMVPanel.cancel('${a.id}')">İptal</button></div></div>`).join(''):'<p style="color:var(--text-muted);">Başvuru yok.</p>'}<h4 style="margin:16px 0 8px;">Araç Kaydı</h4><form onsubmit="DMVPanel.addVehicle(event)" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;"><input id="dmv-v-tc" placeholder="Sahip TC" required><input id="dmv-v-plate" placeholder="Plaka" required><input id="dmv-v-brand" placeholder="Marka" required><input id="dmv-v-model" placeholder="Model"><button class="btn btn-primary" type="submit">Araç Kaydet</button></form></div>`:''}`;};
  window.DMVPanel={apply(){const d=loadExt();const u=RPAuth.getUser();d.dmvApplications.push({id:uid('DMV'),tc:u.tc,name:fullName(u),status:'Bekliyor',stage:'Başvuru Alındı',failCount:0,createdAt:iso()});saveExt(d);Toast.success('Ehliyet başvurusu DMV paneline gönderildi.');initDMVPanel();},passTheory(id){const d=loadExt();const a=d.dmvApplications.find(x=>x.id===id);if(a){a.status='Sınav Onaylandı';a.stage='Fiziksel Sürüş Testi Bekliyor';saveExt(d);initDMVPanel();}},passDrive(id){const d=loadExt();const a=d.dmvApplications.find(x=>x.id===id);if(a&&a.stage.includes('Fiziksel')){a.status='Sürüş Testi Onaylandı';a.stage='Ehliyet Çıkartılabilir';saveExt(d);initDMVPanel();}else Toast.warning('Önce sürücü aday sınavı tamamlanmalı.');},issue(id){const d=loadExt();const a=d.dmvApplications.find(x=>x.id===id);if(a&&a.stage==='Ehliyet Çıkartılabilir'){a.status='Ehliyet Verildi';a.stage='Tamamlandı';a.licenseNo=uid('LIC');saveExt(d);Toast.success('Ehliyet çıkartıldı.');initDMVPanel();}else Toast.warning('Fiziksel sürüş testi tamamlanmadan ehliyet çıkartılamaz.');},fail(id,stage){const d=loadExt();const a=d.dmvApplications.find(x=>x.id===id);if(a){a.failCount=(a.failCount||0)+1;a.status=a.failCount>=2?'Başarısız':'Başarısız - Tekrar Bekliyor';a.stage=a.failCount>=2?'İptal':'Tekrar '+stage;if(a.failCount>=2)a.status='İptal';saveExt(d);initDMVPanel();}},cancel(id){const d=loadExt();const a=d.dmvApplications.find(x=>x.id===id);if(a){a.status='İptal';a.stage='Başvuru İptal';saveExt(d);initDMVPanel();}},addVehicle(e){e.preventDefault();const d=loadExt();d.dmvVehicles.push({id:uid('VEH'),ownerTc:document.getElementById('dmv-v-tc').value,plate:document.getElementById('dmv-v-plate').value.toUpperCase(),brand:document.getElementById('dmv-v-brand').value,model:document.getElementById('dmv-v-model').value,createdAt:iso()});saveExt(d);Toast.success('Araç kaydı oluşturuldu.');initDMVPanel();},changePlate(id){const d=loadExt();const v=d.dmvVehicles.find(x=>x.id===id);if(v){const np=prompt('Yeni plaka:',v.plate);if(np){v.plate=np.toUpperCase();saveExt(d);initDMVPanel();}}},delVehicle(id){const d=loadExt();d.dmvVehicles=d.dmvVehicles.filter(v=>v.id!==id);saveExt(d);initDMVPanel();}};

  // ===== DigiSign Yetkili =====
  window.initDigiSignPanel = async function initDigiSignPanel(){const el=document.getElementById('digisign-panel');const user=requireLogin();if(!el||!user)return;if(!RPAuth.isDigiSignOfficer())return accessCard(el,'DigiSign Yetkisi Gerekli','Bu panel yalnızca admin/DigiSign yetkilileri içindir.');const apps=await asArray(DB.getESignApplications());const pending=apps.filter(a=>a.status==='Bekliyor');el.innerHTML=`<div class="card" style="border-left:4px solid #7c3aed;"><div class="card-header"><i class="fas fa-certificate" style="color:#7c3aed;"></i><h3>DigiSign Yetkili Paneli</h3></div><p style="font-size:.86rem;color:var(--text-muted);">e-İmza başvurularını onaylama/reddetme paneli.</p></div><div class="card" style="margin-top:20px;"><h3>Bekleyen e-İmza Başvuruları</h3>${pending.length?pending.map(a=>`<div style="padding:12px;border-bottom:1px solid var(--border);"><strong>${a.name}</strong> • ${a.tc} • ${formatDate(a.appliedAt)}<button class="btn btn-sm" style="background:#10b981;color:#fff;border:none;margin-left:8px;" onclick="DigiPanel.approve(${a.id})">Onayla</button><button class="btn btn-sm btn-red" onclick="DigiPanel.reject(${a.id})">Reddet</button></div>`).join(''):'<p style="color:var(--text-muted);">Bekleyen başvuru yok.</p>'}</div>`;};
  window.DigiPanel={async approve(id){await DB.approveESignApplication(id,fullName(RPAuth.getUser()));Toast.success('e-İmza onaylandı.');initDigiSignPanel();},async reject(id){const r=prompt('Red sebebi:');if(!r)return;await DB.rejectESignApplication(id,fullName(RPAuth.getUser()),r);Toast.info('Başvuru reddedildi.');initDigiSignPanel();}};

  // ===== Police queue ek bölümü =====
  window.renderPoliceQueue = function renderPoliceQueue(){const el=document.getElementById('police-finance-queue');if(!el)return;const data=loadExt();const q=data.policeQueue;el.innerHTML=`<div class="card" style="border-left:4px solid #0d47a1;"><div class="card-header"><i class="fas fa-bell" style="color:#0d47a1;"></i><h3>Vergi / Fatura Soruşturma Bildirimleri</h3></div>${q.length?q.map(x=>`<div style="padding:10px;border-bottom:1px solid var(--border);"><strong>${x.type}</strong> • T.C. ${x.tc} • ${formatDate(x.date)}<br><span style="font-size:.82rem;color:var(--text-muted);">${x.body}</span><div style="margin-top:6px;"><button class="btn btn-sm btn-outline" onclick="PoliceFinance.mark('${x.id}','Soruşturma Başlatıldı')">Soruşturma Başlat</button><button class="btn btn-sm" style="background:#7c3aed;color:#fff;border:none;" onclick="PoliceFinance.mark('${x.id}','Dava Açılabilir')">Dava Açılabilir</button></div></div>`).join(''):'<p style="color:var(--text-muted);">Bildirim yok.</p>'}</div>`;};
  window.PoliceFinance={mark(id,status){const d=loadExt();const q=d.policeQueue.find(x=>x.id===id);if(q){q.status=status;saveExt(d);Toast.success(status);renderPoliceQueue();}}};
})();
