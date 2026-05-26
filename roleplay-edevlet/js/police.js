/**
 * AMSTERDAM RP - POLICE PANEL v3.1
 * Ceza → Onay Bekliyor → Admin onay → Vatandaşa tebligat
 */

const Police = {
  canAccess() { return Auth.isPolice() || Auth.isAdmin(); },
  createCitation(data) { return DB.addFine(data); },
  createRecord(data) { return DB.addCriminalRecord(data); },
  createReport(data) { return DB.addPoliceReport(data); },
  setVehicleWanted(plate,w,r) { return DB.updateVehicleWanted(plate,w,r); },
  addNote(oTc,tTc,note,p='Normal') { return DB.addOfficerNote({officerTc:oTc,targetTc:tTc,note,date:todayISO(),priority:p}); }
};

function initPolicePage() {
  if (!Police.canAccess()) {
    document.body.innerHTML = `<div style="display:grid;place-items:center;min-height:100vh;background:var(--bg-body);"><div style="text-align:center;padding:40px;max-width:420px;"><div style="font-size:4rem;margin-bottom:16px;">🚫</div><h2>Erişim Reddedildi</h2><p style="color:var(--text-muted);">Yetkili kolluk kuvvetleri personeli değilsiniz.</p><a href="index.html" class="btn btn-primary" style="margin-top:20px;">Ana Sayfaya Dön</a></div></div>`;
    return;
  }
  const user = Auth.getUser();
  renderOverview(); renderCitationForm(); renderReports(); renderSearchTools();

  function renderOverview() {
    const el = document.getElementById('police-overview'); if (!el) return;
    const pendingFines = DB.getPendingFines();
    const unpaidFines = DB.getFines({status:'Ödenmedi'});
    const wantedV = DB.getVehicles().filter(v=>v.wanted);
    const openCases = DB.getCriminalRecords({status:'Açık'});
    const openReports = DB.getPoliceReports({status:'Açık'});
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;">
        <div class="card" style="border-left:4px solid #f59e0b;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Onay Bekleyen Cezalar</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;color:#f59e0b;">${pendingFines.length}</div></div>
        <div class="card" style="border-left:4px solid #ef4444;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Aktif Cezalar</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">${unpaidFines.length}</div></div>
        <div class="card" style="border-left:4px solid #dc2626;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Aranan Araçlar</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">${wantedV.length}</div></div>
        <div class="card" style="border-left:4px solid #7c3aed;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Açık Davalar</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">${openCases.length}</div></div>
        <div class="card" style="border-left:4px solid #059669;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Açık Olaylar</div><div style="font-size:1.6rem;font-weight:800;margin-top:6px;">${openReports.length}</div></div>
      </div>
      ${wantedV.length>0?`<div style="margin-top:16px;"><h4 style="font-size:0.95rem;margin-bottom:8px;">Aranan Araçlar</h4>${wantedV.map(v=>`<div class="card" style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-left:3px solid #ef4444;"><div><div style="font-weight:700;">${v.plate}</div><div style="font-size:0.82rem;color:var(--text-muted);">${v.brand} ${v.model} • ${v.ownerName} • ${v.wantedReason||''}</div></div><div><a href="arac.html?plate=${encodeURIComponent(v.plate)}" class="btn btn-sm btn-outline">Detay</a><button class="btn btn-sm btn-red" onclick="clearWanted('${v.plate}')" style="margin-left:6px;">Temizle</button></div></div>`).join('')}</div>`:''}
    `;
  }

  function renderCitationForm() {
    const el = document.getElementById('police-citation'); if (!el) return;
    el.innerHTML = `
      <div class="card">
        <h4 style="font-size:1rem;margin-bottom:6px;"><i class="fas fa-receipt" style="color:var(--primary-red);margin-right:6px;"></i>Yeni Trafik Cezası Yaz</h4>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:14px;">Ceza, yetkili onayından sonra vatandaşa tebliğ edilecektir.</p>
        <form id="form-citation" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;">
          <div class="form-group" style="margin:0;"><label>Plaka</label><input type="text" id="cit-plate" required placeholder="NL-RP-2024" style="text-transform:uppercase;"></div>
          <div class="form-group" style="margin:0;"><label>Araç Sahibi T.C.</label><input type="text" id="cit-tc" required maxlength="11" placeholder="12345678901"></div>
          <div class="form-group" style="margin:0;"><label>Tutar (€)</label><input type="number" id="cit-amount" required placeholder="1850"></div>
          <div class="form-group" style="margin:0;"><label>İhlal Kodu</label><input type="text" id="cit-code" required placeholder="291/1-a"></div>
          <div class="form-group" style="margin:0;grid-column:1/-1;"><label>İhlal Açıklaması</label><input type="text" id="cit-reason" required placeholder="Kırmızı ışıkta geçiş"></div>
          <div class="form-group" style="margin:0;"><label>Konum</label><input type="text" id="cit-loc" required placeholder="Amsterdam - Damrak"></div>
          <div class="form-group" style="margin:0;"><label>Memur</label><input type="text" id="cit-officer" value="${user?.firstName||''} ${user?.lastName||''}" readonly style="background:#f3f4f6;"></div>
          <div style="grid-column:1/-1;"><button type="submit" class="btn btn-red" style="min-width:180px;"><i class="fas fa-save"></i> Cezayı Kaydet (Onaya Gönder)</button></div>
        </form>
      </div>`;
    const form = document.getElementById('form-citation');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const tcVal = document.getElementById('cit-tc').value.trim();
        const ownerUser = DB.getUserByTC(tcVal);
        const data = {
          plate: document.getElementById('cit-plate').value.trim().toUpperCase(),
          tc: tcVal,
          owner: ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName}` : 'Bilinmiyor',
          amount: Number(document.getElementById('cit-amount').value),
          reason: `${document.getElementById('cit-reason').value.trim()} (Kod: ${document.getElementById('cit-code').value.trim()})`,
          date: todayISO(),
          dueDate: new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0],
          status: 'Onay Bekliyor',  // ← Admin onayı gerekiyor
          location: document.getElementById('cit-loc').value.trim(),
          officer: document.getElementById('cit-officer').value,
          paidAt: null, receiptNo: null,
          tebligatFile: null, approvedBy: null, approvedAt: null
        };
        Police.createCitation(data);
        Toast.success('Ceza kaydedildi ve yetkili onayına gönderildi.');
        form.reset();
        document.getElementById('cit-officer').value = `${user?.firstName||''} ${user?.lastName||''}`;
        renderOverview();
      });
    }
  }

  function renderReports() {
    const el = document.getElementById('police-reports'); if (!el) return;
    const reports = DB.getPoliceReports();
    el.innerHTML = `<div class="card"><h4 style="font-size:1rem;margin-bottom:14px;"><i class="fas fa-folder-open" style="color:var(--primary-blue);margin-right:6px;"></i>Olay Raporları</h4><div style="overflow-x:auto;"><table class="data-table" style="font-size:0.88rem;"><thead><tr><th>Dosya No</th><th>Başlık</th><th>Tarih</th><th>Konum</th><th>Memur</th><th>Durum</th></tr></thead><tbody>${reports.map(r=>`<tr><td style="font-family:monospace;">${r.caseNo}</td><td><strong>${r.title}</strong><br><small style="color:var(--text-muted);">${r.description}</small></td><td>${formatDate(r.date)}</td><td>${r.location}</td><td>${r.officer}</td><td><span class="status-badge ${r.status==='Kapalı'?'status-odendi':'status-acik'}">${r.status}</span></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function renderSearchTools() {
    const el = document.getElementById('police-search'); if (!el) return;
    el.innerHTML = `<div class="card"><h4 style="font-size:1rem;margin-bottom:14px;"><i class="fas fa-search" style="color:var(--accent-orange);margin-right:6px;"></i>Hızlı Sorgu</h4><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;"><a href="arac.html" class="btn btn-outline" style="justify-content:center;"><i class="fas fa-car"></i> Araç</a><a href="sicil.html" class="btn btn-outline" style="justify-content:center;"><i class="fas fa-gavel"></i> Sicil</a><a href="trafik.html" class="btn btn-outline" style="justify-content:center;"><i class="fas fa-file-invoice-dollar"></i> Cezalar</a><a href="eadalet.html" class="btn btn-outline" style="justify-content:center;"><i class="fas fa-balance-scale"></i> e-Adalet</a></div></div>`;
  }
}

function clearWanted(plate) { if(!confirm(`${plate} aranma durumunu temizle?`))return; Police.setVehicleWanted(plate,false,''); Toast.success('Temizlendi.'); initPolicePage(); }
