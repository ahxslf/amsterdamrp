/**
 * AMSTERDAM RP - E-ADALET v4.1
 * Herkes dava açabilir (savcı onayı gerekir)
 * Yargıç/Savcı: tanık, taraf, müdafi, yargıç/savcı değişikliği, karar
 */

function initJusticePage() {
  const user = Auth.getUser();
  if (!user) { renderPublicJustice(); return; }

  const isJusticeRole = Auth.isJustice() || Auth.isAdmin();

  // Herkes dava açma formunu görsün
  renderFileCaseSection();

  // Justice rolleri paneli görsün
  if (isJusticeRole) {
    const rp = document.getElementById('justice-role-panel');
    if (rp) rp.style.display = 'block';
    renderJusticeOverview();
    renderCaseList();
    renderPendingCases(); // Savcı onay bekleyen davalar
    renderRoleTools();
  } else {
    // Vatandaş: sadece kendi davalarını görsün
    renderMyCases();
  }

  initCaseSearch();
}

function renderPublicJustice() {
  const el = document.getElementById('justice-public'); if (!el) return;
  el.innerHTML = '<div class="card" style="border-left:4px solid #7c3aed;text-align:center;padding:40px;"><div style="font-size:3rem;margin-bottom:12px;">⚖️</div><h2 style="margin-bottom:8px;">Amsterdam RP e-Adalet</h2><p style="color:var(--text-muted);max-width:500px;margin:0 auto 20px;">Giriş yapmanız gerekmektedir.</p><a href="giris.html" class="btn btn-primary"><i class="fas fa-sign-in-alt"></i> Giriş Yap</a></div>';
}

// ===================== HERKES: DAVA AÇ =====================
function renderFileCaseSection() {
  const el = document.getElementById('justice-file-case'); if (!el) return;
  const user = Auth.getUser(); if (!user) return;

  el.innerHTML = `
    <div class="card" style="border-left:4px solid #ea580c;">
      <h3 style="font-size:1.05rem;margin-bottom:6px;"><i class="fas fa-folder-plus" style="color:#ea580c;margin-right:8px;"></i>Dava Aç / Şikayette Bulun</h3>
      <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:14px;">Dava başvurunuz Cumhuriyet Savcılığı onayından geçtikten sonra aktif olacaktır.</p>
      <form id="citizen-case-form">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;"><label style="font-size:0.8rem;">Dava/Şikayet Konusu *</label><input type="text" id="cc-title" required placeholder="örn: Dolandırıcılık, Hırsızlık, Sözleşme İhlali"></div>
          <div class="form-group" style="margin:0;"><label style="font-size:0.8rem;">Karşı Taraf (Sanık) T.C. *</label><input type="text" id="cc-defendant-tc" required maxlength="11" placeholder="Şikayet edilen kişinin TC"></div>
          <div class="form-group" style="margin:0;"><label style="font-size:0.8rem;">Dava Türü</label><select id="cc-type" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"><option>Ceza</option><option>Hukuk</option><option>İdari</option></select></div>
          <div class="form-group" style="margin:0;"><label style="font-size:0.8rem;">Kategori</label><select id="cc-category" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"><option>Ağır Ceza</option><option>Asliye Ceza</option><option>Sulh Ceza</option><option>Asliye Hukuk</option><option>İdare</option></select></div>
          <div class="form-group" style="margin:0;grid-column:1/-1;"><label style="font-size:0.8rem;">Açıklama / Olay Özeti *</label><textarea id="cc-description" rows="4" required placeholder="Olayı detaylıca anlatınız..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;resize:vertical;"></textarea></div>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:12px;"><i class="fas fa-paper-plane"></i> Dava Başvurusu Gönder</button>
      </form>
    </div>`;

  document.getElementById('citizen-case-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const defTc = document.getElementById('cc-defendant-tc').value.trim();
    const defUser = DB.getUserByTC(defTc);
    if (!defUser) { Toast.error('Karşı taraf TC bulunamadı.'); return; }
    if (defTc === user.tc) { Toast.error('Kendinize dava açamazsınız.'); return; }

    const newCase = {
      caseNo: 'DAVA-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9999)).padStart(4,'0'),
      type: document.getElementById('cc-type').value,
      category: document.getElementById('cc-category').value,
      title: document.getElementById('cc-title').value.trim(),
      description: document.getElementById('cc-description').value.trim(),
      plaintiff: user.firstName + ' ' + user.lastName,
      plaintiffTc: user.tc,
      defendant: defUser.firstName + ' ' + defUser.lastName,
      defendantTc: defTc,
      judgeTc: '', judge: '',
      prosecutorTc: '', prosecutor: '',
      defenseAttorneyTc: '', defenseAttorney: '',
      status: 'Savcı Onayı Bekliyor',
      nextHearing: '',
      filedDate: todayISO(),
      court: '',
      witnesses: [],
      parties: [
        { tc: user.tc, name: user.firstName + ' ' + user.lastName, role: 'Davacı / Müşteki' },
        { tc: defTc, name: defUser.firstName + ' ' + defUser.lastName, role: 'Sanık / Davalı' }
      ],
      verdict: null, verdictDate: null, verdictDetail: '',
      history: [{ date: todayISO(), action: 'Dava başvurusu yapıldı (savcı onayı bekliyor)', by: user.firstName + ' ' + user.lastName }]
    };
    DB.addCourtCase(newCase);
    Toast.success('Dava başvurunuz gönderildi! Savcılık onayından sonra aktif olacaktır.');
    document.getElementById('citizen-case-form').reset();

    // Bildirim: savcılara
    DB.getUsers().filter(u => (u.job||'').includes('Savcı')).forEach(s => {
      DB.addNotification({ tc: s.tc, title: 'Yeni Dava Başvurusu', body: newCase.caseNo + ' — "' + newCase.title + '" konulu dava başvurusu onayınızı bekliyor. Davacı: ' + newCase.plaintiff, type: 'warning', icon: 'fas fa-folder-plus' });
    });

    if (Auth.isJustice() || Auth.isAdmin()) { renderCaseList(); renderJusticeOverview(); renderPendingCases(); }
    else { renderMyCases(); }
  });
}

// ===================== VATANDAŞ: KENDİ DAVALARIM =====================
function renderMyCases() {
  const el = document.getElementById('justice-my-cases'); if (!el) return;
  const user = Auth.getUser(); if (!user) return;
  const myCases = DB.getCourtCases({ involvedTc: user.tc });
  if (myCases.length === 0) {
    el.innerHTML = '<div class="card"><div class="empty-state"><div class="icon">⚖️</div><h4>Aktif davanız bulunmuyor.</h4></div></div>';
    return;
  }
  const sc = {'Savcı Onayı Bekliyor':'status-acik','Soruşturma':'status-guvluk','Duruşma Bekliyor':'status-acik','Karar Verildi':'status-odendi','Düşürüldü':'status-odenmedi','Temyiz':'status-odenmedi','Reddedildi':'status-odenmedi'};
  el.innerHTML = '<h3 class="section-title" style="margin-bottom:14px;">📁 Davalarım</h3>' +
    myCases.map(c => '<div class="card" style="border-left:4px solid #7c3aed;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;"><div><div style="font-weight:700;">' + c.title + '</div><div style="font-size:0.82rem;color:var(--text-muted);">' + c.caseNo + ' • ' + (c.court||'Mahkeme atanmadı') + ' • ' + c.defendant + '</div></div><div style="display:flex;gap:8px;align-items:center;"><span class="status-badge ' + (sc[c.status]||'status-acik') + '">' + c.status + '</span><button class="btn btn-outline btn-sm" onclick="viewCase(' + c.id + ')"><i class="fas fa-eye"></i></button></div></div>').join('');
}

// ===================== SAVCI: ONAY BEKLEYEN DAVALAR =====================
function renderPendingCases() {
  const el = document.getElementById('justice-pending-cases'); if (!el) return;
  if (!Auth.isProsecutor() && !Auth.isAdmin()) { el.innerHTML = ''; return; }

  const pending = DB.getCourtCases({ status: 'Savcı Onayı Bekliyor' });
  if (pending.length === 0) { el.innerHTML = ''; return; }

  el.innerHTML = '<div class="card" style="border-left:4px solid #f59e0b;"><div class="card-header"><i class="fas fa-hourglass-half" style="color:#f59e0b;"></i><h3>Savcı Onayı Bekleyen Davalar <span class="status-badge status-acik">' + pending.length + '</span></h3></div>' +
    pending.map(c => {
      const plaintiff = DB.getUserByTC(c.plaintiffTc);
      const defendant = DB.getUserByTC(c.defendantTc);
      return '<div class="card" style="padding:16px;margin-bottom:10px;border:2px solid #fef3c7;"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;"><div style="flex:1;min-width:200px;"><div style="font-weight:800;font-size:1.05rem;margin-bottom:4px;">' + c.caseNo + ' — ' + c.title + '</div><div style="font-size:0.85rem;color:var(--text-muted);line-height:1.6;"><div><strong>Davacı:</strong> ' + c.plaintiff + ' (' + c.plaintiffTc + ')</div><div><strong>Sanık:</strong> ' + c.defendant + ' (' + c.defendantTc + ')</div><div><strong>Tür:</strong> ' + c.type + ' — ' + c.category + '</div><div><strong>Başvuru:</strong> ' + formatDate(c.filedDate) + '</div>' + (c.description ? '<div style="margin-top:8px;padding:10px;background:#f8fafc;border-radius:6px;border-left:2px solid #f59e0b;"><strong>Olay Özeti:</strong> ' + c.description + '</div>' : '') + '</div></div><div style="display:flex;flex-direction:column;gap:8px;min-width:200px;"><div class="form-group" style="margin:0;"><label style="font-size:0.78rem;">Mahkeme Atama</label><input type="text" id="approve-court-' + c.id + '" placeholder="Amsterdam Adliyesi 2. Ağır Ceza" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;"></div><button onclick="approveCaseUI(' + c.id + ')" class="btn btn-sm" style="background:#10b981;color:#fff;border:none;justify-content:center;"><i class="fas fa-check-circle"></i> Onayla ve Kabul Et</button><button onclick="rejectCaseUI(' + c.id + ')" class="btn btn-sm btn-red" style="justify-content:center;"><i class="fas fa-times"></i> Reddet</button></div></div></div>';
    }).join('') + '</div>';
}

function approveCaseUI(id) {
  const user = Auth.getUser();
  const court = document.getElementById('approve-court-' + id)?.value?.trim();
  if (!court) { Toast.warning('Mahkeme ataması yapınız.'); return; }
  const c = DB.getCourtCaseById(id); if (!c) return;
  c.status = 'Soruşturma';
  c.court = court;
  c.prosecutorTc = user.tc;
  c.prosecutor = user.firstName + ' ' + user.lastName;
  c.parties.push({ tc: user.tc, name: user.firstName + ' ' + user.lastName, role: 'Savcı' });
  c.history.push({ date: todayISO(), action: 'Dava savcılık tarafından onaylandı. Mahkeme: ' + court, by: user.firstName + ' ' + user.lastName });
  DB.save();
  // Bildirimler
  DB.addNotification({ tc: c.plaintiffTc, title: 'Dava Başvurunuz Onaylandı', body: c.caseNo + ' — "' + c.title + '" davanız kabul edilmiştir. Mahkeme: ' + court, type: 'success', icon: 'fas fa-check-circle' });
  DB.addNotification({ tc: c.defendantTc, title: 'Hakkınızda Dava Açıldı', body: c.caseNo + ' — "' + c.title + '" konulu dava açılmıştır. Mahkeme: ' + court, type: 'error', icon: 'fas fa-gavel' });
  Toast.success('Dava onaylandı: ' + c.caseNo);
  renderPendingCases(); renderCaseList(); renderJusticeOverview();
}

function rejectCaseUI(id) {
  const reason = prompt('Red sebebi:');
  if (!reason) return;
  const c = DB.getCourtCaseById(id); if (!c) return;
  c.status = 'Reddedildi';
  c.history.push({ date: todayISO(), action: 'Dava savcılık tarafından reddedildi. Sebep: ' + reason, by: Auth.getUser()?.firstName + ' ' + Auth.getUser()?.lastName });
  DB.save();
  DB.addNotification({ tc: c.plaintiffTc, title: 'Dava Başvurunuz Reddedildi', body: c.caseNo + ' — Sebep: ' + reason, type: 'error', icon: 'fas fa-times-circle' });
  Toast.info('Dava reddedildi.');
  renderPendingCases(); renderCaseList(); renderJusticeOverview();
}

// ===================== İSTATİSTİKLER =====================
function renderJusticeOverview() {
  const el = document.getElementById('justice-overview'); if (!el) return;
  const all = DB.getCourtCases();
  const active = all.filter(c => c.status !== 'Savcı Onayı Bekliyor' && c.status !== 'Reddedildi');
  el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:20px;">' +
    '<div class="card" style="border-left:4px solid #7c3aed;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Toplam</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">' + active.length + '</div></div>' +
    '<div class="card" style="border-left:4px solid #f59e0b;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Onay Bekleyen</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;color:#f59e0b;">' + all.filter(c=>c.status==='Savcı Onayı Bekliyor').length + '</div></div>' +
    '<div class="card" style="border-left:4px solid #3b82f6;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Soruşturma</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">' + active.filter(c=>c.status==='Soruşturma').length + '</div></div>' +
    '<div class="card" style="border-left:4px solid #ea580c;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Duruşma</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">' + active.filter(c=>c.status==='Duruşma Bekliyor').length + '</div></div>' +
    '<div class="card" style="border-left:4px solid #10b981;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Karar</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">' + active.filter(c=>c.status==='Karar Verildi').length + '</div></div>' +
  '</div>';
}

// ===================== DAVA LİSTESİ =====================
function renderCaseList() {
  const el = document.getElementById('justice-cases'); if (!el) return;
  const user = Auth.getUser();
  let cases = DB.getCourtCases().filter(c => c.status !== 'Savcı Onayı Bekliyor' && c.status !== 'Reddedildi');
  if (Auth.isLawyer() && !Auth.isAdmin()) cases = cases.filter(c => c.defenseAttorneyTc === user.tc || DB.hasActiveMandateFor(user.tc, c.defendantTc));
  if (cases.length === 0) { el.innerHTML = '<div class="empty-state"><div class="icon">⚖️</div><h4>Aktif dava bulunamadı.</h4></div>'; return; }
  const sc = {'Soruşturma':'status-guvluk','Duruşma Bekliyor':'status-acik','Karar Verildi':'status-odendi','Düşürüldü':'status-odenmedi','Temyiz':'status-odenmedi'};
  el.innerHTML = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Dosya No</th><th>Başlık</th><th>Sanık</th><th>Yargıç</th><th>Savcı</th><th>Müdafi</th><th>Tanık</th><th>Durum</th><th></th></tr></thead><tbody>' +
    cases.map(c => '<tr><td style="font-family:monospace;font-size:0.8rem;">' + c.caseNo + '</td><td style="font-weight:600;">' + c.title + '</td><td>' + c.defendant + '</td><td>' + (c.judge||'<em style="color:var(--text-muted);">—</em>') + '</td><td>' + (c.prosecutor||'—') + '</td><td>' + (c.defenseAttorney||'<em style="color:var(--text-muted);">—</em>') + '</td><td style="text-align:center;">' + (c.witnesses||[]).length + '</td><td><span class="status-badge ' + (sc[c.status]||'status-acik') + '">' + c.status + '</span></td><td><button class="btn btn-outline btn-sm" onclick="viewCase(' + c.id + ')"><i class="fas fa-folder-open"></i></button></td></tr>').join('') +
  '</tbody></table></div>';
}

// ===================== DAVA DETAY (TAM PANEL — INLINE, MODAL DEĞİL) =====================
function viewCase(id) {
  const c = DB.getCourtCaseById(id); if (!c) return;
  const canManage = Auth.isJudge() || Auth.isProsecutor() || Auth.isAdmin();

  // Build full-page detail instead of modal for better UX
  Modal.open(`
    <div class="modal-header" style="background:linear-gradient(135deg,#4c1d95,#7c3aed);color:#fff;padding:16px 24px;">
      <div>
        <h3 style="margin:0;"><i class="fas fa-gavel" style="margin-right:8px;"></i>${c.caseNo}</h3>
        <div style="font-size:0.82rem;opacity:0.85;margin-top:2px;">${c.title} • ${c.court||'Mahkeme atanmadı'}</div>
      </div>
      <button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button>
    </div>
    <div style="display:flex;border-bottom:2px solid var(--border);background:rgba(0,0,0,0.02);overflow-x:auto;">
      <button onclick="showTab('info',${id})" id="ctab-info" class="ctab active-ctab" style="flex:1;padding:12px 8px;border:none;background:none;font-weight:600;cursor:pointer;font-size:0.82rem;white-space:nowrap;border-bottom:2px solid var(--primary-blue);color:var(--text-main);">📋 Genel</button>
      <button onclick="showTab('parties',${id})" id="ctab-parties" class="ctab" style="flex:1;padding:12px 8px;border:none;background:none;font-weight:600;cursor:pointer;font-size:0.82rem;white-space:nowrap;color:var(--text-muted);">👥 Taraflar (${(c.parties||[]).length})</button>
      <button onclick="showTab('witnesses',${id})" id="ctab-witnesses" class="ctab" style="flex:1;padding:12px 8px;border:none;background:none;font-weight:600;cursor:pointer;font-size:0.82rem;white-space:nowrap;color:var(--text-muted);">🧑‍⚖️ Tanıklar (${(c.witnesses||[]).length})</button>
      <button onclick="showTab('hearings',${id})" id="ctab-hearings" class="ctab" style="flex:1;padding:12px 8px;border:none;background:none;font-weight:600;cursor:pointer;font-size:0.82rem;white-space:nowrap;color:var(--text-muted);">📅 Duruşmalar (${(c.hearings||[]).length})</button>
      <button onclick="showTab('history',${id})" id="ctab-history" class="ctab" style="flex:1;padding:12px 8px;border:none;background:none;font-weight:600;cursor:pointer;font-size:0.82rem;white-space:nowrap;color:var(--text-muted);">📜 Geçmiş</button>
    </div>
    <div id="ctab-content" style="padding:20px;max-height:60vh;overflow-y:auto;"></div>
  `);
  showTab('info', id);
}

function showTab(tab, caseId) {
  document.querySelectorAll('.ctab').forEach(t => { t.style.borderBottom = 'none'; t.style.color = 'var(--text-muted)'; t.classList.remove('active-ctab'); });
  const act = document.getElementById('ctab-' + tab);
  if (act) { act.style.borderBottom = '2px solid var(--primary-blue)'; act.style.color = 'var(--text-main)'; act.classList.add('active-ctab'); }
  const el = document.getElementById('ctab-content'); if (!el) return;
  const c = DB.getCourtCaseById(caseId); if (!c) return;
  const canManage = Auth.isJudge() || Auth.isProsecutor() || Auth.isAdmin();

  if (tab === 'info') { el.innerHTML = buildInfoTab(c, canManage); }
  else if (tab === 'parties') { el.innerHTML = buildPartiesTab(c, canManage); }
  else if (tab === 'witnesses') { el.innerHTML = buildWitnessesTab(c, canManage); }
  else if (tab === 'hearings') { el.innerHTML = buildHearingsTab(c); }
  else if (tab === 'history') { el.innerHTML = buildHistoryTab(c); }
}

// ===== INFO TAB =====
function buildInfoTab(c, canManage) {
  let h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.9rem;">' +
    '<div><strong>Dosya:</strong> <span style="font-family:monospace;">' + c.caseNo + '</span></div>' +
    '<div><strong>Tür:</strong> ' + c.type + ' — ' + (c.category||'') + '</div>' +
    '<div><strong>Mahkeme:</strong> ' + (c.court||'<em>Atanmadı</em>') + '</div>' +
    '<div><strong>Açılış:</strong> ' + formatDate(c.filedDate) + '</div>' +
    '<div><strong>Davacı:</strong> ' + c.plaintiff + '</div>' +
    '<div><strong>Sanık:</strong> ' + c.defendant + '</div>' +
    '<div><strong>Yargıç:</strong> ' + (c.judge||'<em>Atanmadı</em>') + '</div>' +
    '<div><strong>Savcı:</strong> ' + (c.prosecutor||'—') + '</div>' +
    '<div><strong>Müdafi:</strong> ' + (c.defenseAttorney||'<em>Yok</em>') + '</div>' +
    '<div><strong>Sonraki Duruşma:</strong> ' + (c.nextHearing?formatDate(c.nextHearing):'—') + '</div>' +
    '<div><strong>Durum:</strong> <span class="status-badge status-acik">' + c.status + '</span></div>' +
    '<div><strong>Tanık:</strong> ' + (c.witnesses||[]).length + '</div>' +
    '</div>';

  if (c.description) h += '<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:6px;font-size:0.88rem;border-left:3px solid #7c3aed;"><strong>Olay Özeti:</strong> ' + c.description + '</div>';
  if (c.verdict) h += '<div style="margin-top:12px;padding:14px;background:#d1fae5;border-radius:8px;border-left:4px solid #10b981;"><strong>⚖️ Karar:</strong> ' + c.verdict + '<br><strong>Tarih:</strong> ' + formatDate(c.verdictDate) + (c.verdictDetail?'<br><strong>Detay:</strong> '+c.verdictDetail:'') + '</div>';

  if (canManage) {
    h += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);"><h4 style="font-size:0.92rem;margin-bottom:10px;">⚙️ Yönetim</h4>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      '<div class="form-group" style="margin:0;"><label style="font-size:0.78rem;">Durum</label><select id="cs-status" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"><option value="">Seçiniz</option><option' + (c.status==='Soruşturma'?' selected':'') + '>Soruşturma</option><option' + (c.status==='Duruşma Bekliyor'?' selected':'') + '>Duruşma Bekliyor</option><option' + (c.status==='Karar Verildi'?' selected':'') + '>Karar Verildi</option><option' + (c.status==='Düşürüldü'?' selected':'') + '>Düşürüldü</option><option' + (c.status==='Temyiz'?' selected':'') + '>Temyiz</option></select></div>' +
      '<div style="display:flex;align-items:end;"><button onclick="doUpdateStatus(' + c.id + ')" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;"><i class="fas fa-sync"></i> Güncelle</button></div>' +
      '<div class="form-group" style="margin:0;"><label style="font-size:0.78rem;">Sonraki Duruşma</label><input type="date" id="cs-next" value="' + (c.nextHearing||'') + '" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"></div>' +
      '<div style="display:flex;align-items:end;"><button onclick="doSetNextHearing(' + c.id + ')" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;"><i class="fas fa-calendar"></i> Kaydet</button></div>' +
      '</div>';

    if (Auth.isJudge() && c.status !== 'Karar Verildi') {
      h += '<div style="margin-top:14px;padding:14px;background:rgba(124,58,237,0.06);border-radius:8px;"><h4 style="font-size:0.88rem;margin-bottom:8px;">⚖️ Karar Ver</h4>' +
        '<select id="cs-verdict" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;margin-bottom:8px;font-size:0.85rem;"><option value="">Karar Türü</option><option>Beraat</option><option>Mahkumiyet</option><option>Ceza İndirimi</option><option>Erteleme</option><option>Para Cezası</option><option>Hapis Cezası</option><option>Düşürülme</option><option>Diğer</option></select>' +
        '<textarea id="cs-verdict-detail" rows="3" placeholder="Karar detayı..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;resize:vertical;"></textarea>' +
        '<button onclick="doVerdict(' + c.id + ')" class="btn btn-primary btn-sm" style="margin-top:8px;"><i class="fas fa-gavel"></i> Kararı Onayla</button></div>';
    }
    h += '</div>';
  }
  return h;
}

// ===== PARTIES TAB =====
function buildPartiesTab(c, canManage) {
  const allJudges = DB.getUsers().filter(u=>(u.job||'').includes('Yargıç'));
  const allProsecutors = DB.getUsers().filter(u=>(u.job||'').includes('Savcı'));
  const allLawyers = DB.getUsers().filter(u=>(u.job||'').includes('Avukat'));
  const roleColors = {'Yargıç':'#7c3aed','Savcı':'#ef4444','Müdafi':'#3b82f6','Sanık / Davalı':'#f59e0b','Sanık':'#f59e0b','Davacı / Müşteki':'#059669'};

  let h = '<h4 style="font-size:0.95rem;margin-bottom:12px;">👥 Taraflar</h4>';
  (c.parties||[]).forEach(p => {
    const col = roleColors[p.role] || '#6b7280';
    h += '<div class="card" style="padding:12px;margin-bottom:8px;border-left:3px solid ' + col + ';display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:700;">' + p.name + '</div><div style="font-size:0.78rem;color:var(--text-muted);">TC: ' + p.tc + ' • <span class="status-badge" style="background:' + col + '15;color:' + col + ';font-size:0.65rem;">' + p.role + '</span></div></div>';
    if (canManage && p.role !== 'Sanık' && p.role !== 'Sanık / Davalı' && p.role !== 'Yargıç' && p.role !== 'Savcı') {
      h += '<button class="btn btn-sm" style="border:1px solid #ef4444;color:#ef4444;" onclick="doRemoveParty(' + c.id + ',\'' + p.tc + '\')"><i class="fas fa-times"></i></button>';
    }
    h += '</div>';
  });

  if (canManage) {
    h += '<div style="margin-top:16px;padding:14px;background:rgba(0,0,0,0.02);border-radius:8px;"><h4 style="font-size:0.88rem;margin-bottom:10px;">⚙️ Taraf Yönetimi</h4>';

    // Müdafi
    h += '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:end;"><div class="form-group" style="margin:0;flex:1;min-width:180px;"><label style="font-size:0.78rem;">Müdafi (Avukat)</label><select id="cp-lawyer" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"><option value="">Avukat Seçin</option>' + allLawyers.map(l => '<option value="' + l.tc + '"' + (c.defenseAttorneyTc===l.tc?' selected':'') + '>' + l.firstName + ' ' + l.lastName + '</option>').join('') + '</select></div><button onclick="doSetDefense(' + c.id + ')" class="btn btn-sm" style="background:#3b82f6;color:#fff;border:none;"><i class="fas fa-user-shield"></i> Ata</button>' + (c.defenseAttorney ? '<button onclick="doRemoveDefense(' + c.id + ')" class="btn btn-sm" style="border:1px solid #ef4444;color:#ef4444;"><i class="fas fa-user-minus"></i> Çıkar</button>' : '') + '</div>';

    // Yargıç
    h += '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:end;"><div class="form-group" style="margin:0;flex:1;min-width:150px;"><label style="font-size:0.78rem;">Yargıç</label><select id="cp-judge" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"><option value="">Seçin</option>' + allJudges.map(j => '<option value="' + j.tc + '"' + (c.judgeTc===j.tc?' selected':'') + '>' + j.firstName + ' ' + j.lastName + '</option>').join('') + '</select></div><div class="form-group" style="margin:0;flex:1;min-width:100px;"><label style="font-size:0.78rem;">Sebep</label><input type="text" id="cp-judge-reason" placeholder="Sebep..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"></div><button onclick="doChangeJudge(' + c.id + ')" class="btn btn-sm" style="background:#7c3aed;color:#fff;border:none;"><i class="fas fa-exchange-alt"></i></button></div>';

    // Savcı
    h += '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:end;"><div class="form-group" style="margin:0;flex:1;min-width:150px;"><label style="font-size:0.78rem;">Savcı</label><select id="cp-prosecutor" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"><option value="">Seçin</option>' + allProsecutors.map(p => '<option value="' + p.tc + '"' + (c.prosecutorTc===p.tc?' selected':'') + '>' + p.firstName + ' ' + p.lastName + '</option>').join('') + '</select></div><div class="form-group" style="margin:0;flex:1;min-width:100px;"><label style="font-size:0.78rem;">Sebep</label><input type="text" id="cp-pros-reason" placeholder="Sebep..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"></div><button onclick="doChangeProsecutor(' + c.id + ')" class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;"><i class="fas fa-exchange-alt"></i></button></div>';

    // Yeni taraf
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;"><div class="form-group" style="margin:0;flex:1;min-width:120px;"><label style="font-size:0.78rem;">TC</label><input type="text" id="cp-new-tc" maxlength="11" placeholder="TC" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"></div><div class="form-group" style="margin:0;flex:1;min-width:120px;"><label style="font-size:0.78rem;">Rol</label><select id="cp-new-role" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"><option>Müşteki</option><option>Katılan</option><option>Müdahil</option><option>Bilirkişi</option><option>Tercüman</option><option>Diğer</option></select></div><button onclick="doAddParty(' + c.id + ')" class="btn btn-sm" style="background:#059669;color:#fff;border:none;"><i class="fas fa-plus"></i> Ekle</button></div>';

    h += '</div>';
  }
  return h;
}

// ===== WITNESSES TAB =====
function buildWitnessesTab(c, canManage) {
  let h = '<h4 style="font-size:0.95rem;margin-bottom:12px;">🧑‍⚖️ Tanıklar (' + (c.witnesses||[]).length + ')</h4>';
  if ((c.witnesses||[]).length === 0) h += '<p style="color:var(--text-muted);font-size:0.88rem;">Tanık eklenmedi.</p>';
  else (c.witnesses||[]).forEach(w => {
    h += '<div class="card" style="padding:14px;margin-bottom:8px;border-left:3px solid #14b8a6;"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;"><div><div style="font-weight:700;">' + w.name + ' <span class="status-badge status-guvluk" style="font-size:0.65rem;">' + w.role + '</span></div><div style="font-size:0.78rem;color:var(--text-muted);">TC: ' + w.tc + ' • ' + formatDate(w.date) + '</div>' + (w.statement?'<div style="margin-top:8px;padding:10px;background:#f8fafc;border-radius:6px;font-size:0.85rem;border-left:2px solid #14b8a6;"><strong>İfade:</strong> '+w.statement+'</div>':'') + '</div>' + (canManage?'<button class="btn btn-sm" style="border:1px solid #ef4444;color:#ef4444;" onclick="doRemoveWitness('+c.id+',\''+w.tc+'\')"><i class="fas fa-times"></i></button>':'') + '</div></div>';
  });

  if (canManage) {
    h += '<div style="margin-top:16px;padding:14px;background:rgba(0,0,0,0.02);border-radius:8px;"><h4 style="font-size:0.88rem;margin-bottom:10px;">➕ Tanık Ekle</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="form-group" style="margin:0;"><label style="font-size:0.78rem;">Tanık TC</label><input type="text" id="cw-tc" maxlength="11" placeholder="TC" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"></div><div class="form-group" style="margin:0;"><label style="font-size:0.78rem;">Tür</label><select id="cw-role" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"><option>Görgü Tanığı</option><option>Bilirkişi</option><option>Uzman Tanık</option><option>Karakter Tanığı</option><option>Gizli Tanık</option></select></div></div><div class="form-group" style="margin:10px 0 0;"><label style="font-size:0.78rem;">İfade</label><textarea id="cw-statement" rows="3" placeholder="İfade..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;resize:vertical;"></textarea></div><button onclick="doAddWitness(' + c.id + ')" class="btn btn-sm" style="background:#14b8a6;color:#fff;border:none;margin-top:8px;"><i class="fas fa-plus"></i> Ekle</button></div>';
  }
  return h;
}

// ===== HEARINGS TAB =====
function buildHearingsTab(c) {
  let h = '<h4 style="font-size:0.95rem;margin-bottom:12px;">📅 Duruşmalar (' + (c.hearings||[]).length + ')</h4>';
  if ((c.hearings||[]).length === 0) h += '<p style="color:var(--text-muted);font-size:0.88rem;">Duruşma yapılmadı.</p>';
  else (c.hearings||[]).forEach((hr, i) => {
    h += '<div style="padding:14px;background:#f8fafc;border-radius:8px;border-left:3px solid var(--primary-blue);margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-muted);margin-bottom:6px;"><span><strong>' + (i+1) + '. ' + (hr.type||'Duruşma') + '</strong> — ' + formatDate(hr.date) + '</span><span>Yargıç: ' + hr.judge + '</span></div><div style="font-size:0.9rem;line-height:1.5;">' + hr.summary + '</div></div>';
  });
  if (Auth.isJudge()) {
    h += '<div style="margin-top:16px;padding:14px;background:rgba(0,0,0,0.02);border-radius:8px;"><h4 style="font-size:0.88rem;margin-bottom:10px;">📝 Not Ekle</h4><select id="ch-type" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;margin-bottom:8px;"><option>Duruşma</option><option>Keşif</option><option>Bilirkişi Raporu</option><option>Ara Karar</option><option>Ek Süre</option></select><textarea id="ch-note" rows="4" placeholder="Özet..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;resize:vertical;"></textarea><button onclick="doAddHearing(' + c.id + ')" class="btn btn-primary btn-sm" style="margin-top:8px;"><i class="fas fa-save"></i> Kaydet</button></div>';
  }
  return h;
}

// ===== HISTORY TAB =====
function buildHistoryTab(c) {
  let h = '<h4 style="font-size:0.95rem;margin-bottom:12px;">📜 Geçmiş</h4>';
  if ((c.history||[]).length === 0) h += '<p style="color:var(--text-muted);">Kayıt yok.</p>';
  else [...(c.history||[])].reverse().forEach(hr => {
    h += '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.05);font-size:0.88rem;"><div style="font-size:0.78rem;color:var(--text-muted);min-width:80px;">' + formatDate(hr.date) + '</div><div style="flex:1;"><strong>' + hr.action + '</strong>' + (hr.by?' <span style="color:var(--text-muted);font-size:0.78rem;">— '+hr.by+'</span>':'') + '</div></div>';
  });
  return h;
}

// ===================== ACTION HANDLERS =====================
function doUpdateStatus(id) { const s=document.getElementById('cs-status')?.value; if(!s){Toast.warning('Seçiniz.');return;} DB.updateCaseStatus(id,s); Toast.success('Güncellendi: '+s); const c=DB.getCourtCaseById(id); if(c)DB.addNotification({tc:c.defendantTc,title:'Dava Durumu',body:c.caseNo+' — '+s,type:'warning',icon:'fas fa-gavel'}); viewCase(id); }
function doSetNextHearing(id) { const d=document.getElementById('cs-next')?.value; if(!d){Toast.warning('Tarih seçiniz.');return;} const c=DB.getCourtCaseById(id); if(c){c.nextHearing=d;c.history.push({date:todayISO(),action:'Duruşma tarihi: '+formatDate(d),by:Auth.getUser()?.firstName+' '+Auth.getUser()?.lastName});DB.save();DB.addNotification({tc:c.defendantTc,title:'Duruşma Tarihi',body:c.caseNo+' — '+formatDate(d),type:'info',icon:'fas fa-calendar'});if(c.defenseAttorneyTc)DB.addNotification({tc:c.defenseAttorneyTc,title:'Duruşma Tarihi',body:c.caseNo+' — '+formatDate(d),type:'info',icon:'fas fa-calendar'});Toast.success('Tarih kaydedildi.');viewCase(id);} }
function doVerdict(id) { const v=document.getElementById('cs-verdict')?.value; const d=document.getElementById('cs-verdict-detail')?.value?.trim(); if(!v){Toast.warning('Karar türü seçiniz.');return;} if(!confirm('"'+v+'" kararını onaylıyor musunuz?'))return; DB.setVerdict(id,v,d||''); Toast.success('Karar verildi.'); viewCase(id); }
function doSetDefense(id) { const tc=document.getElementById('cp-lawyer')?.value; if(!tc){Toast.warning('Avukat seçiniz.');return;} const l=DB.getUserByTC(tc); if(!l)return; DB.setDefenseAttorney(id,tc,l.firstName+' '+l.lastName); Toast.success('Müdafi atandı.'); viewCase(id); }
function doRemoveDefense(id) { if(!confirm('Müdafiyi çıkar?'))return; DB.removeDefenseAttorney(id); Toast.info('Çıkarıldı.'); viewCase(id); }
function doChangeJudge(id) { const tc=document.getElementById('cp-judge')?.value; const r=document.getElementById('cp-judge-reason')?.value?.trim()||'Belirtilmedi'; if(!tc){Toast.warning('Seçiniz.');return;} const j=DB.getUserByTC(tc); if(!j)return; DB.changeJudge(id,tc,j.firstName+' '+j.lastName,r); Toast.success('Yargıç değiştirildi.'); viewCase(id); }
function doChangeProsecutor(id) { const tc=document.getElementById('cp-prosecutor')?.value; const r=document.getElementById('cp-pros-reason')?.value?.trim()||'Belirtilmedi'; if(!tc){Toast.warning('Seçiniz.');return;} const p=DB.getUserByTC(tc); if(!p)return; DB.changeProsecutor(id,tc,p.firstName+' '+p.lastName,r); Toast.success('Savcı değiştirildi.'); viewCase(id); }
function doAddParty(id) { const tc=document.getElementById('cp-new-tc')?.value?.trim(); const role=document.getElementById('cp-new-role')?.value; if(!tc||!role){Toast.warning('Doldurunuz.');return;} const u=DB.getUserByTC(tc); if(!u){Toast.error('Bulunamadı.');return;} const c=DB.getCourtCaseById(id); if(c&&c.parties.some(p=>p.tc===tc)){Toast.warning('Zaten ekli.');return;} DB.addParty(id,{tc,name:u.firstName+' '+u.lastName,role,addedBy:Auth.getUser()?.firstName+' '+Auth.getUser()?.lastName}); DB.addNotification({tc,title:'Davaya Eklendiniz',body:c.caseNo+' — "'+role+'" olarak',type:'info',icon:'fas fa-gavel'}); Toast.success('Eklendi.'); viewCase(id); }
function doRemoveParty(id, tc) { if(!confirm('Çıkar?'))return; DB.removeParty(id,tc); Toast.info('Çıkarıldı.'); viewCase(id); }
function doAddWitness(id) { const tc=document.getElementById('cw-tc')?.value?.trim(); const role=document.getElementById('cw-role')?.value; const st=document.getElementById('cw-statement')?.value?.trim(); if(!tc){Toast.warning('TC giriniz.');return;} const u=DB.getUserByTC(tc); if(!u){Toast.error('Bulunamadı.');return;} DB.addWitness(id,{tc,name:u.firstName+' '+u.lastName,role,statement:st||'',date:todayISO(),addedBy:Auth.getUser()?.firstName+' '+Auth.getUser()?.lastName}); DB.addNotification({tc,title:'Tanık Çağrısı',body:DB.getCourtCaseById(id)?.caseNo+' — "'+role+'"',type:'warning',icon:'fas fa-user-check'}); Toast.success('Eklendi.'); viewCase(id); }
function doRemoveWitness(id, tc) { if(!confirm('Çıkar?'))return; DB.removeWitness(id,tc); Toast.info('Çıkarıldı.'); viewCase(id); }
function doAddHearing(id) { const n=document.getElementById('ch-note')?.value?.trim(); const t=document.getElementById('ch-type')?.value||'Duruşma'; if(!n){Toast.warning('Not giriniz.');return;} const u=Auth.getUser(); DB.addHearing(id,{date:todayISO(),summary:n,judge:u.firstName+' '+u.lastName,type:t}); Toast.success('Eklendi.'); viewCase(id); }

// ===================== ROL ARAÇLARI =====================
function renderRoleTools() {
  const el = document.getElementById('justice-role-tools'); if (!el) return;
  if (Auth.isProsecutor() || Auth.isAdmin()) {
    // Savcı: doğrudan dava açma (onay gerekmez)
    el.innerHTML = '<div class="card" style="border-left:4px solid #ef4444;"><h4 style="margin-bottom:6px;"><i class="fas fa-user-tie" style="color:#ef4444;margin-right:8px;"></i>Savcı — Doğrudan Dava Aç</h4><p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px;">Savcı olarak doğrudan dava açabilirsiniz (onay gerektirmez).</p>' +
      '<form id="prosecutor-case-form"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="form-group" style="margin:0;"><label style="font-size:0.78rem;">Başlık *</label><input type="text" id="pc-title" required placeholder="Silahlı Gasp" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"></div><div class="form-group" style="margin:0;"><label style="font-size:0.78rem;">Sanık TC *</label><input type="text" id="pc-def-tc" required maxlength="11" placeholder="55555555555" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"></div><div class="form-group" style="margin:0;"><label style="font-size:0.78rem;">Tür</label><select id="pc-type" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"><option>Ceza</option><option>Hukuk</option><option>İdari</option></select></div><div class="form-group" style="margin:0;"><label style="font-size:0.78rem;">Kategori</label><select id="pc-cat" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"><option>Ağır Ceza</option><option>Asliye Ceza</option><option>Sulh Ceza</option><option>Asliye Hukuk</option></select></div><div class="form-group" style="margin:0;grid-column:1/-1;"><label style="font-size:0.78rem;">Mahkeme *</label><input type="text" id="pc-court" required placeholder="Amsterdam Adliyesi 2. Ağır Ceza" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;"></div></div><button type="submit" class="btn btn-red" style="margin-top:10px;"><i class="fas fa-folder-plus"></i> Dava Aç</button></form></div>';
    document.getElementById('prosecutor-case-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = Auth.getUser();
      const dTc = document.getElementById('pc-def-tc').value.trim();
      const dU = DB.getUserByTC(dTc);
      if (!dU) { Toast.error('Sanık bulunamadı.'); return; }
      const nc = { caseNo:'DAVA-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*9999)).padStart(4,'0'), type:document.getElementById('pc-type').value, category:document.getElementById('pc-cat').value, title:document.getElementById('pc-title').value.trim(), plaintiff:'Amsterdam C. Savcılığı', plaintiffTc:user.tc, defendant:dU.firstName+' '+dU.lastName, defendantTc:dTc, judgeTc:'',judge:'', prosecutorTc:user.tc, prosecutor:user.firstName+' '+user.lastName, defenseAttorneyTc:'',defenseAttorney:'', status:'Soruşturma', nextHearing:'', filedDate:todayISO(), court:document.getElementById('pc-court').value.trim(), witnesses:[], parties:[{tc:dTc,name:dU.firstName+' '+dU.lastName,role:'Sanık'},{tc:user.tc,name:user.firstName+' '+user.lastName,role:'Savcı'}], verdict:null,verdictDate:null,verdictDetail:'', description:'', history:[{date:todayISO(),action:'Dava açıldı (Savcılık)',by:user.firstName+' '+user.lastName}] };
      DB.addCourtCase(nc);
      DB.addNotification({tc:dTc,title:'Hakkınızda Dava Açıldı',body:nc.caseNo+' — '+nc.title,type:'error',icon:'fas fa-gavel'});
      Toast.success('Dava açıldı: '+nc.caseNo);
      document.getElementById('prosecutor-case-form').reset();
      renderCaseList(); renderJusticeOverview();
    });
  } else if (Auth.isJudge()) {
    el.innerHTML = '<div class="card" style="border-left:4px solid #7c3aed;"><h4><i class="fas fa-gavel" style="color:#7c3aed;margin-right:8px;"></i>Yargıç</h4><p style="font-size:0.85rem;color:var(--text-muted);margin-top:8px;">Dava listesinden bir dava seçerek tüm işlemleri yapabilirsiniz: duruşma notu, karar verme, tanık/taraf yönetimi, yargıç/savcı değişikliği.</p></div>';
  } else if (Auth.isLawyer()) {
    el.innerHTML = '<div class="card" style="border-left:4px solid #3b82f6;"><h4><i class="fas fa-briefcase" style="color:#3b82f6;margin-right:8px;"></i>Avukat</h4><p style="font-size:0.85rem;color:var(--text-muted);margin-top:8px;">Müvekkillerinizin davalarını takip edin.</p><div style="display:flex;gap:8px;margin-top:10px;"><a href="eimza.html" class="btn btn-outline btn-sm"><i class="fas fa-file-signature"></i> e-İmza</a><button onclick="openCaseMessaging()" class="btn btn-outline btn-sm"><i class="fas fa-envelope"></i> Mesajlar</button></div></div>';
  }
}

// ===================== DAVA ARAMA =====================
function initCaseSearch() {
  const form = document.getElementById('case-search-form'); if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tc = document.getElementById('case-tc')?.value.trim();
    const caseNo = document.getElementById('case-no')?.value.trim();
    let results = DB.getCourtCases().filter(c => c.status !== 'Reddedildi');
    if (tc) results = results.filter(c => c.defendantTc===tc || c.plaintiffTc===tc || (c.parties||[]).some(p=>p.tc===tc));
    if (caseNo) results = results.filter(c => c.caseNo.toUpperCase().includes(caseNo.toUpperCase()));
    const el = document.getElementById('case-search-results'); if (!el) return;
    if (results.length === 0) el.innerHTML = '<div class="empty-state"><div class="icon">⚖️</div><h4>Bulunamadı.</h4></div>';
    else el.innerHTML = results.map(c => '<div class="card" style="border-left:4px solid #7c3aed;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;"><div><div style="font-weight:700;">' + c.title + '</div><div style="font-size:0.82rem;color:var(--text-muted);">' + c.caseNo + ' • ' + (c.court||'—') + ' • Sanık: ' + c.defendant + '</div></div><div style="display:flex;gap:8px;"><span class="status-badge status-acik">' + c.status + '</span><button class="btn btn-outline btn-sm" onclick="viewCase(' + c.id + ')"><i class="fas fa-eye"></i></button></div></div>').join('');
  });
}
