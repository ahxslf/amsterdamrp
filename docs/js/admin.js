/**
 * AMSTERDAM RP - ADMIN PANEL v4.3
 * Discord admin rolü + Supabase async panel
 */

function adminName() {
  const u = RPAuth.getUser() || {};
  return `${u.firstName || u.first_name || u.discord_username || 'Admin'} ${u.lastName || u.last_name || ''}`.trim();
}

function adminError(el, err) {
  if (el) el.innerHTML = `<div class="card" style="border-left:4px solid #ef4444;color:#991b1b;">Hata: ${err.message || err}</div>`;
  console.error(err);
}

async function initAdminPage() {
  const user = RPAuth.requireAdmin();
  if (!user) return;
  try {
    await Promise.all([
      renderAdminOverview(),
      renderPendingFines(),
      renderESignApplications(),
      renderUserList(),
      renderSystemInfo()
    ]);
  } catch (err) {
    Toast.error('Admin panel yüklenirken hata oluştu: ' + err.message);
    console.error(err);
  }
}

async function renderAdminOverview() {
  const el = document.getElementById('admin-overview');
  if (!el) return;
  el.innerHTML = '<div class="card">Yükleniyor...</div>';
  try {
    const [users, pendingUsers, pendingFines, apps, cases, fines] = await Promise.all([
      DB.getUsers(),
      DB.getPendingUsers(),
      DB.getPendingFines(),
      DB.getESignApplications({ status: 'Bekliyor' }),
      DB.getCourtCases(),
      DB.getFines()
    ]);
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;">
        <div class="card" style="border-left:4px solid #f59e0b;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Karakter Onay Bekleyen</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;color:${pendingUsers.length>0?'#f59e0b':'var(--text-main)'};">${pendingUsers.length}</div></div>
        <div class="card" style="border-left:4px solid #ef4444;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Ceza Onay Bekleyen</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;color:${pendingFines.length>0?'#ef4444':'var(--text-main)'};">${pendingFines.length}</div></div>
        <div class="card" style="border-left:4px solid #7c3aed;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">e-İmza Bekleyen</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;color:${apps.length>0?'#7c3aed':'var(--text-main)'};">${apps.length}</div></div>
        <div class="card" style="border-left:4px solid var(--primary-blue);"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Kullanıcılar</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">${users.length}</div></div>
        <div class="card" style="border-left:4px solid #059669;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Toplam Ceza</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">${fines.length}</div></div>
        <div class="card" style="border-left:4px solid #f59e0b;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Davalar</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">${cases.length}</div></div>
      </div>`;
  } catch (err) { adminError(el, err); }
}

// ==================== KARAKTER BAŞVURULARI + KULLANICILAR ====================
async function renderUserList() {
  const el = document.getElementById('admin-users');
  if (!el) return;
  el.innerHTML = '<div class="card">Kullanıcılar yükleniyor...</div>';
  try {
    const [users, eApps] = await Promise.all([DB.getUsers(), DB.getESignApplications()]);
    const pending = users.filter(u => u.status === 'Onay Bekliyor');
    const approvedESign = new Set(eApps.filter(a => a.status === 'Onaylandı').map(a => a.tc));

    el.innerHTML = `
      <div class="card" style="margin-bottom:20px;border-left:4px solid #f59e0b;">
        <div class="card-header"><i class="fas fa-user-clock" style="color:#f59e0b;"></i><h3>Karakter Başvuruları ${pending.length>0?`<span class="status-badge status-odenmedi" style="margin-left:8px;">${pending.length} BEKLEYEN</span>`:''}</h3></div>
        ${pending.length ? pending.map(u => `
          <div class="card" style="padding:14px;margin-bottom:8px;border:1px solid #fde68a;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
              <div>
                <div style="font-weight:800;">${u.firstName} ${u.lastName}</div>
                <div style="font-size:0.82rem;color:var(--text-muted);">T.C.: ${u.tc} • Discord: ${u.discord_username || '—'} • ${formatDate(u.created_at)}</div>
                <div style="font-size:0.82rem;color:var(--text-muted);">Doğum: ${formatDate(u.birthDate)} • Kan: ${u.bloodType || '—'} • Şehir: ${u.city || '—'}</div>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-sm" style="background:#10b981;color:#fff;border:none;" onclick="approveCharacter('${u.discord_id}')"><i class="fas fa-check"></i> Onayla</button>
                <button class="btn btn-sm btn-red" onclick="rejectCharacter('${u.discord_id}')"><i class="fas fa-times"></i> Reddet</button>
              </div>
            </div>
          </div>`).join('') : '<p style="color:var(--text-muted);font-size:0.88rem;">✓ Bekleyen karakter başvurusu yok.</p>'}
      </div>

      <div class="card">
        <div class="card-header"><i class="fas fa-users" style="color:var(--primary-blue);"></i><h3>Kayıtlı Vatandaşlar</h3></div>
        <div style="overflow-x:auto;"><table class="data-table" style="font-size:0.82rem;"><thead><tr><th>T.C.</th><th>Ad Soyad</th><th>Durum</th><th>Meslek</th><th>Şehir</th><th>e-İmza</th></tr></thead><tbody>
        ${users.map(u=>`<tr><td style="font-family:monospace;">${u.tc || '—'}</td><td style="font-weight:600;">${u.firstName} ${u.lastName}</td><td><span class="status-badge ${u.status==='Aktif'?'status-odendi':u.status==='Onay Bekliyor'?'status-acik':'status-odenmedi'}">${u.status || '—'}</span></td><td>${u.job||'—'}</td><td>${u.city || '—'}</td><td>${approvedESign.has(u.tc)?'<span class="status-badge status-odendi">Aktif</span>':'<span class="status-badge status-acik">Yok</span>'}</td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
  } catch (err) { adminError(el, err); }
}

async function approveCharacter(discordId) {
  if (!confirm('Karakter başvurusunu onaylamak istediğinize emin misiniz?')) return;
  try {
    const u = await DB.approveUser(discordId, adminName());
    Toast.success(`${u.firstName} ${u.lastName} onaylandı.`);
    await renderUserList();
    await renderAdminOverview();
  } catch (err) { Toast.error('Onay hatası: ' + err.message); console.error(err); }
}

async function rejectCharacter(discordId) {
  const reason = prompt('Red sebebi:');
  if (!reason) return;
  try {
    await DB.rejectUser(discordId, adminName(), reason);
    Toast.info('Karakter başvurusu reddedildi.');
    await renderUserList();
    await renderAdminOverview();
  } catch (err) { Toast.error('Red hatası: ' + err.message); console.error(err); }
}

// ==================== CEZA ONAY SİSTEMİ ====================
async function renderPendingFines() {
  const el = document.getElementById('admin-pending-fines');
  if (!el) return;
  el.innerHTML = '<div class="card">Cezalar yükleniyor...</div>';
  try {
    const [pending, fines] = await Promise.all([DB.getPendingFines(), DB.getFines()]);
    const allFines = fines.filter(f => f.status !== 'Onay Bekliyor').slice(0, 10);

    el.innerHTML = `
      <div class="card" style="border-left:4px solid #ef4444;">
        <div class="card-header"><i class="fas fa-file-invoice-dollar" style="color:#ef4444;"></i><h3>Trafik Cezası Onay Sistemi ${pending.length>0?`<span class="status-badge status-odenmedi" style="margin-left:8px;">${pending.length} BEKLEYEN</span>`:''}</h3></div>
        ${pending.length>0?`
          <h4 style="font-size:0.9rem;margin-bottom:10px;color:#ef4444;">⏳ Onay Bekleyen Cezalar</h4>
          ${pending.map(f=>`
            <div class="card" style="padding:16px;margin-bottom:10px;border:2px solid #fecaca;background:rgba(239,68,68,0.03);">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
                <div style="flex:1;min-width:200px;">
                  <div style="font-weight:800;font-size:1.1rem;margin-bottom:4px;">${f.plate} — ${formatTL(Number(f.amount || 0))}</div>
                  <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.6;">
                    <div><strong>Sahibi/T.C.:</strong> ${f.owner || '—'} (${f.tc || '—'})</div>
                    <div><strong>İhlal:</strong> ${f.reason || '—'}</div>
                    <div><strong>Konum:</strong> ${f.location || '—'}</div>
                    <div><strong>Memur:</strong> ${f.officer || '—'}</div>
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
              <thead><tr><th>Plaka</th><th>Sahibi/T.C.</th><th>Tutar</th><th>Memur</th><th>Onaylayan</th><th>Tebligat</th><th>Durum</th></tr></thead>
              <tbody>${allFines.map(f=>`<tr>
                <td style="font-weight:600;">${f.plate}</td>
                <td>${f.owner || f.tc || '—'}</td>
                <td>${formatTL(Number(f.amount || 0))}</td>
                <td>${f.officer || '—'}</td>
                <td>${f.approvedBy||'—'} ${f.approvedAt?'('+formatDate(f.approvedAt)+')':''}</td>
                <td>${f.tebligatFile?'<span class="status-badge status-odendi"><i class="fas fa-paperclip"></i> Var</span>':'<span style="color:var(--text-muted);">—</span>'}</td>
                <td><span class="status-badge ${f.status==='Ödendi'?'status-odendi':f.status==='Ödenmedi'?'status-odenmedi':f.status==='Reddedildi'?'status-guvluk':'status-acik'}">${f.status}</span></td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        `:''}
      </div>`;
  } catch (err) { adminError(el, err); }
}

async function approveFineWithFile(id) {
  const fileInput = document.getElementById(`tebligat-file-${id}`);
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    Toast.error('Tebligat belgesi yüklenmeden ceza onaylanamaz!');
    return;
  }
  const file = fileInput.files[0];
  if (file.size > 5 * 1024 * 1024) {
    Toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır.');
    return;
  }
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const tebligatData = { name:file.name, type:file.type, size:file.size, data:e.target.result, uploadedAt:new Date().toISOString() };
      const result = await DB.approveFine(id, adminName(), tebligatData);
      Toast.success(`Ceza onaylandı: ${result.plate}`);
      await DB.addAdminLog({ action:'fine_approve', fine_id:id, admin:adminName() });
      await renderPendingFines();
      await renderAdminOverview();
    } catch (err) { Toast.error('Ceza onay hatası: ' + err.message); console.error(err); }
  };
  reader.readAsDataURL(file);
}

async function rejectFineAdmin(id) {
  const reason = prompt('Red sebebi (ör: yetersiz kanıt, hatalı plaka):');
  if (!reason) return;
  try {
    const result = await DB.rejectFine(id, adminName(), reason);
    Toast.info(`Ceza reddedildi: ${result.plate}`);
    await DB.addAdminLog({ action:'fine_reject', fine_id:id, admin:adminName(), reason });
    await renderPendingFines();
    await renderAdminOverview();
  } catch (err) { Toast.error('Ceza red hatası: ' + err.message); console.error(err); }
}

// ==================== E-İMZA BAŞVURULARI ====================
async function renderESignApplications() {
  const el = document.getElementById('admin-esign-apps');
  if (!el) return;
  el.innerHTML = '<div class="card">e-İmza başvuruları yükleniyor...</div>';
  try {
    const apps = await DB.getESignApplications();
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
  } catch (err) { adminError(el, err); }
}

async function approveESign(id) {
  if (!confirm('Onaylamak istediğinize emin misiniz?')) return;
  try {
    const r = await DB.approveESignApplication(id, adminName());
    Toast.success(`${r.name} sertifika: ${r.certificateSerial}`);
    await renderESignApplications();
    await renderAdminOverview();
  } catch (err) { Toast.error('e-İmza onay hatası: ' + err.message); console.error(err); }
}

async function rejectESign(id) {
  const reason = prompt('Red sebebi:');
  if (!reason) return;
  try {
    await DB.rejectESignApplication(id, adminName(), reason);
    Toast.info('Reddedildi.');
    await renderESignApplications();
    await renderAdminOverview();
  } catch (err) { Toast.error('e-İmza red hatası: ' + err.message); console.error(err); }
}

// ==================== SİSTEM ====================
async function renderSystemInfo() {
  const el = document.getElementById('admin-system');
  if (!el) return;
  el.innerHTML = `
    <div class="card" style="border-left:4px solid var(--accent-orange);">
      <div class="card-header"><i class="fas fa-server" style="color:var(--accent-orange);"></i><h3>Sistem</h3></div>
      <div style="font-size:0.88rem;color:var(--text-muted);display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><strong>Versiyon:</strong> ${APP_CONFIG.version}</div>
        <div><strong>Discord:</strong> <span style="color:#10b981;">Aktif</span></div>
        <div><strong>Admin Sunucu:</strong> ${APP_CONFIG.discord.requiredGuildId}</div>
        <div><strong>Admin Rol:</strong> ${APP_CONFIG.discord.adminRoleId}</div>
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="exportData()"><i class="fas fa-download"></i> Yedek İndir</button>
      </div>
    </div>`;
}

async function exportData() {
  try {
    const d = JSON.stringify(await DB.exportAll(), null, 2);
    const b = new Blob([d], { type:'application/json' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = `ams-rp-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(u);
    Toast.success('Yedek indirildi.');
  } catch (err) { Toast.error('Yedek alınamadı: ' + err.message); }
}
