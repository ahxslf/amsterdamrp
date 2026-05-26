/**
 * AMSTERDAM RP - ADMIN PANEL v3.1
 * Ceza onay + tebligat belgesi yükleme
 * e-İmza başvuru onay/red
 */

function initAdminPage() {
  const user = Auth.requireAdmin(); if (!user) return;
  renderAdminOverview();
  renderPendingFines();
  renderESignApplications();
  renderUserList();
  renderSystemInfo();
}

function renderAdminOverview() {
  const el = document.getElementById('admin-overview'); if (!el) return;
  const totalUsers = DB.getUsers().length;
  const pendingFines = DB.getPendingFines().length;
  const pendingApps = DB.getESignApplications({status:'Bekliyor'}).length;
  const totalCases = (DB.data.courtCases||[]).length;
  const totalFines = DB.data.fines.length;
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;">
      <div class="card" style="border-left:4px solid #ef4444;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Ceza Onay Bekleyen</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;color:${pendingFines>0?'#ef4444':'var(--text-main)'};">${pendingFines}</div></div>
      <div class="card" style="border-left:4px solid #7c3aed;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">e-İmza Bekleyen</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;color:${pendingApps>0?'#7c3aed':'var(--text-main)'};">${pendingApps}</div></div>
      <div class="card" style="border-left:4px solid var(--primary-blue);"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Kullanıcılar</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">${totalUsers}</div></div>
      <div class="card" style="border-left:4px solid #059669;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Toplam Ceza</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">${totalFines}</div></div>
      <div class="card" style="border-left:4px solid #f59e0b;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Davalar</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">${totalCases}</div></div>
    </div>`;
}

// ==================== CEZA ONAY SİSTEMİ ====================
function renderPendingFines() {
  const el = document.getElementById('admin-pending-fines'); if (!el) return;
  const pending = DB.getPendingFines();
  const allFines = DB.data.fines.filter(f=>f.status!=='Onay Bekliyor').slice(-10).reverse();

  el.innerHTML = `
    <div class="card" style="border-left:4px solid #ef4444;">
      <div class="card-header"><i class="fas fa-file-invoice-dollar" style="color:#ef4444;"></i><h3>Trafik Cezası Onay Sistemi ${pending.length>0?`<span class="status-badge status-odenmedi" style="margin-left:8px;">${pending.length} BEKLEYEN</span>`:''}</h3></div>

      ${pending.length>0?`
        <h4 style="font-size:0.9rem;margin-bottom:10px;color:#ef4444;">⏳ Onay Bekleyen Cezalar</h4>
        ${pending.map(f=>`
          <div class="card" style="padding:16px;margin-bottom:10px;border:2px solid #fecaca;background:rgba(239,68,68,0.03);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
              <div style="flex:1;min-width:200px;">
                <div style="font-weight:800;font-size:1.1rem;margin-bottom:4px;">${f.plate} — ${formatTL(f.amount)}</div>
                <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.6;">
                  <div><strong>Sahibi:</strong> ${f.owner} (${f.tc})</div>
                  <div><strong>İhlal:</strong> ${f.reason}</div>
                  <div><strong>Konum:</strong> ${f.location}</div>
                  <div><strong>Memur:</strong> ${f.officer}</div>
                  <div><strong>Tarih:</strong> ${formatDate(f.date)} — Son Ödeme: ${formatDate(f.dueDate)}</div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;min-width:220px;">
                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.78rem;"><i class="fas fa-paperclip"></i> Tebligat Belgesi (zorunlu)</label>
                  <input type="file" id="tebligat-file-${f.id}" accept="image/*,.pdf" style="font-size:0.82rem;padding:6px;">
                </div>
                <button class="btn btn-sm" style="background:#10b981;color:#fff;border:none;justify-content:center;" onclick="approveFineWithFile(${f.id})"><i class="fas fa-check-circle"></i> Onayla ve Tebliğ Et</button>
                <button class="btn btn-sm btn-red" style="justify-content:center;" onclick="rejectFineAdmin(${f.id})"><i class="fas fa-times"></i> Reddet</button>
              </div>
            </div>
          </div>
        `).join('')}
      `:'<p style="color:var(--text-muted);font-size:0.88rem;">✓ Bekleyen ceza onayı yok.</p>'}

      ${allFines.length>0?`
        <h4 style="font-size:0.9rem;margin:18px 0 10px;">📋 Son İşlem Gören Cezalar</h4>
        <div style="overflow-x:auto;">
          <table class="data-table" style="font-size:0.82rem;">
            <thead><tr><th>Plaka</th><th>Sahibi</th><th>Tutar</th><th>Memur</th><th>Onaylayan</th><th>Tebligat</th><th>Durum</th></tr></thead>
            <tbody>${allFines.map(f=>`<tr>
              <td style="font-weight:600;">${f.plate}</td>
              <td>${f.owner}</td>
              <td>${formatTL(f.amount)}</td>
              <td>${f.officer}</td>
              <td>${f.approvedBy||'—'} ${f.approvedAt?'('+formatDate(f.approvedAt)+')':''}</td>
              <td>${f.tebligatFile?'<span class="status-badge status-odendi"><i class="fas fa-paperclip"></i> Var</span>':'<span style="color:var(--text-muted);">—</span>'}</td>
              <td><span class="status-badge ${f.status==='Ödendi'?'status-odendi':f.status==='Ödenmedi'?'status-odenmedi':f.status==='Reddedildi'?'status-guvluk':'status-acik'}">${f.status}</span></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      `:''}
    </div>`;
}

function approveFineWithFile(id) {
  const fileInput = document.getElementById(`tebligat-file-${id}`);
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    Toast.error('Tebligat belgesi yüklenmeden ceza onaylanamaz!');
    return;
  }
  const file = fileInput.files[0];
  // Max 5MB check
  if (file.size > 5 * 1024 * 1024) {
    Toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır.');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const user = Auth.getUser();
    const tebligatData = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: e.target.result,  // base64 data URI
      uploadedAt: new Date().toISOString()
    };
    const result = DB.approveFine(id, `${user.firstName} ${user.lastName}`, tebligatData);
    if (result) {
      Toast.success(`Ceza onaylandı ve ${result.owner} kişisine tebliğ edildi.`);
      DB.addAdminLog({action:'fine_approve', fineId:id, admin:`${user.firstName} ${user.lastName}`});
      renderPendingFines();
      renderAdminOverview();
    }
  };
  reader.readAsDataURL(file);
}

function rejectFineAdmin(id) {
  const reason = prompt('Red sebebi (ör: yetersiz kanıt, hatalı plaka):');
  if (!reason) return;
  const user = Auth.getUser();
  const result = DB.rejectFine(id, `${user.firstName} ${user.lastName}`, reason);
  if (result) {
    Toast.info(`Ceza reddedildi: ${result.plate}`);
    DB.addAdminLog({action:'fine_reject', fineId:id, admin:`${user.firstName} ${user.lastName}`, reason});
    renderPendingFines();
    renderAdminOverview();
  }
}

// ==================== E-İMZA BAŞVURULARI ====================
function renderESignApplications() {
  const el = document.getElementById('admin-esign-apps'); if (!el) return;
  const apps = DB.getESignApplications();
  const pending = apps.filter(a=>a.status==='Bekliyor');
  const others = apps.filter(a=>a.status!=='Bekliyor');
  el.innerHTML = `
    <div class="card" style="border-left:4px solid #7c3aed;">
      <div class="card-header"><i class="fas fa-certificate" style="color:#7c3aed;"></i><h3>e-İmza Başvuruları ${pending.length>0?`<span class="status-badge status-odenmedi" style="margin-left:8px;">${pending.length} BEKLEYEN</span>`:''}</h3></div>
      ${pending.length>0?`${pending.map(a=>`
        <div class="card" style="padding:14px;margin-bottom:8px;border:1px solid #fecaca;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div><div style="font-weight:700;">${a.name}</div><div style="font-size:0.82rem;color:var(--text-muted);">T.C.: ${a.tc} • ${formatDate(a.appliedAt)}</div></div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-sm" style="background:#10b981;color:#fff;border:none;" onclick="approveESign(${a.id})"><i class="fas fa-check"></i> Onayla</button>
            <button class="btn btn-sm btn-red" onclick="rejectESign(${a.id})"><i class="fas fa-times"></i> Reddet</button>
          </div>
        </div>`).join('')}`:'<p style="color:var(--text-muted);font-size:0.88rem;">✓ Bekleyen başvuru yok.</p>'}
      ${others.length>0?`<div style="overflow-x:auto;margin-top:14px;"><table class="data-table" style="font-size:0.82rem;"><thead><tr><th>İsim</th><th>T.C.</th><th>Başvuru</th><th>Sertifika</th><th>Durum</th></tr></thead><tbody>${others.map(a=>`<tr><td style="font-weight:600;">${a.name}</td><td>${a.tc}</td><td>${formatDate(a.appliedAt)}</td><td style="font-family:monospace;">${a.certificateSerial||'—'}</td><td><span class="status-badge ${a.status==='Onaylandı'?'status-odendi':'status-odenmedi'}">${a.status}</span></td></tr>`).join('')}</tbody></table></div>`:''}
    </div>`;
}
function approveESign(id) { const u=Auth.getUser(); if(!confirm('Onaylamak istediğinize emin misiniz?'))return; const r=DB.approveESignApplication(id,`${u.firstName} ${u.lastName}`); if(r){Toast.success(`${r.name} sertifika: ${r.certificateSerial}`);renderESignApplications();renderAdminOverview();} }
function rejectESign(id) { const reason=prompt('Red sebebi:'); if(!reason)return; const u=Auth.getUser(); const r=DB.rejectESignApplication(id,`${u.firstName} ${u.lastName}`,reason); if(r){Toast.info('Reddedildi.');renderESignApplications();renderAdminOverview();} }

// ==================== KULLANICILAR ====================
function renderUserList() {
  const el = document.getElementById('admin-users'); if (!el) return;
  const users = DB.getUsers();
  el.innerHTML = `
    <div class="card">
      <div class="card-header"><i class="fas fa-users" style="color:var(--primary-blue);"></i><h3>Kayıtlı Vatandaşlar</h3></div>
      <div style="overflow-x:auto;"><table class="data-table" style="font-size:0.82rem;"><thead><tr><th>T.C.</th><th>Ad Soyad</th><th>Meslek</th><th>Şehir</th><th>e-İmza</th></tr></thead><tbody>
      ${users.map(u=>`<tr><td style="font-family:monospace;">${u.tc}</td><td style="font-weight:600;">${u.firstName} ${u.lastName}</td><td>${u.job||'—'}</td><td>${u.city}</td><td>${DB.hasApprovedESign(u.tc)?'<span class="status-badge status-odendi">Aktif</span>':'<span class="status-badge status-acik">Yok</span>'}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
}

// ==================== SİSTEM ====================
function renderSystemInfo() {
  const el = document.getElementById('admin-system'); if (!el) return;
  el.innerHTML = `
    <div class="card" style="border-left:4px solid var(--accent-orange);">
      <div class="card-header"><i class="fas fa-server" style="color:var(--accent-orange);"></i><h3>Sistem</h3></div>
      <div style="font-size:0.88rem;color:var(--text-muted);display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><strong>Versiyon:</strong> ${APP_CONFIG.version}</div>
        <div><strong>Discord:</strong> ${APP_CONFIG.discord.enabled?'<span style="color:#10b981;">Aktif</span>':'Devre Dışı'}</div>
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-red btn-sm" onclick="if(confirm('Tüm veriler sıfırlanacak!')){DB.resetAll();location.reload();}"><i class="fas fa-trash"></i> Sıfırla</button>
        <button class="btn btn-outline btn-sm" onclick="exportData()"><i class="fas fa-download"></i> İndir</button>
      </div>
    </div>`;
}
function exportData() { const d=JSON.stringify(DB.data,null,2); const b=new Blob([d],{type:'application/json'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`ams-rp-backup-${todayISO()}.json`; a.click(); URL.revokeObjectURL(u); Toast.success('İndirildi.'); }
