/**
 * AMSTERDAM RP - PUBLIC SERVICES v3.1
 * Kullanıcı sadece kendi bilgilerini görebilir (TC girişi yok)
 * Cezalar: sadece onaylanmış (Ödenmedi/Ödendi) gösterilir
 * Polis/Admin/Yargıç gibi yetkili roller herkesi sorgulayabilir
 */

// ===== HELPER: yetkili mi? =====
function isAuthorized() {
  return Auth.isPolice() || Auth.isAdmin() || Auth.isJustice();
}

// ======================== TRAFFIC FINES ========================
function initTrafficPage() {
  const user = Auth.getUser();
  const form = document.getElementById('fine-form');
  const results = document.getElementById('fine-results');
  const statsEl = document.getElementById('fine-stats');
  if (!results) return;

  // Yetkili değilse: giriş kontrolü ve TC input gizle
  if (!user) {
    results.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><h4>Giriş Gerekli</h4><p>Trafik cezalarınızı görmek için giriş yapmalısınız.</p><a href="giris.html" class="btn btn-primary btn-sm" style="margin-top:10px;">Giriş Yap</a></div>`;
    return;
  }

  // Yetkili: plaka ile arama yapabilir (TC yok)
  // Vatandaş: sadece kendi cezaları
  if (!isAuthorized()) {
    // TC input alanını gizle
    const tcInput = document.getElementById('fine-tc');
    if (tcInput) tcInput.parentElement.style.display = 'none';
    const plateInput = document.getElementById('fine-plate');
    if (plateInput) plateInput.parentElement.style.display = 'none';
    // Otomatik kendi cezalarını göster (sadece aktif olanları)
    const myFines = DB.getActiveFines({tc: user.tc});
    updateStats(myFines);
    renderFines(myFines);
    if (form) form.style.display = 'none';
  } else {
    // Yetkili: plaka ile arama yapabilir
    const tcField = document.getElementById('fine-tc');
    if (tcField) tcField.parentElement.style.display = 'none'; // TC input hep gizli
    const allFines = DB.getFines().filter(f=>f.status!=='Onay Bekliyor'||isAuthorized());
    updateStats(allFines); renderFines(allFines);
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const plate = document.getElementById('fine-plate').value.trim().toUpperCase();
      let list = plate ? DB.getFines({plate}) : DB.getFines();
      if (!Auth.isAdmin()) list = list.filter(f=>f.status!=='Onay Bekliyor');
      updateStats(list); renderFines(list);
    });
  }

  function updateStats(list) {
    if(!statsEl) return;
    const activeFines = list.filter(f=>f.status==='Ödenmedi'||f.status==='Ödendi');
    const total=activeFines.reduce((s,f)=>s+f.amount,0);
    const unpaidC=activeFines.filter(f=>f.status==='Ödenmedi').length;
    const unpaidT=activeFines.filter(f=>f.status==='Ödenmedi').reduce((s,f)=>s+f.amount,0);
    statsEl.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">
      <div class="card" style="padding:14px;text-align:center;border-left:3px solid var(--primary-blue);"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Toplam</div><div style="font-size:1.4rem;font-weight:800;margin-top:4px;">${activeFines.length}</div></div>
      <div class="card" style="padding:14px;text-align:center;border-left:3px solid #ef4444;"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Ödenmemiş</div><div style="font-size:1.4rem;font-weight:800;margin-top:4px;">${unpaidC}</div></div>
      <div class="card" style="padding:14px;text-align:center;border-left:3px solid #f59e0b;"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Bekleyen Borç</div><div style="font-size:1.4rem;font-weight:800;margin-top:4px;">${formatTL(unpaidT)}</div></div>
      <div class="card" style="padding:14px;text-align:center;border-left:3px solid #10b981;"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Toplam Tutar</div><div style="font-size:1.4rem;font-weight:800;margin-top:4px;">${formatTL(total)}</div></div>
    </div>`;
  }

  function renderFines(list) {
    // Vatandaş sadece aktif cezalarını görür
    const displayList = isAuthorized() ? list : list.filter(f=>f.status==='Ödenmedi'||f.status==='Ödendi');
    if(displayList.length===0){ results.innerHTML=`<div class="empty-state"><div class="icon">🚗</div><h4>Ceza Bulunamadı</h4><p>Tebliğ edilmiş trafik cezanız bulunmamaktadır.</p></div>`; return; }
    const rows=displayList.map(f=>`<tr><td><strong>${f.plate}</strong></td><td>${f.owner}</td><td>${formatDate(f.date)}</td><td>${formatDate(f.dueDate)}</td><td style="max-width:240px;" title="${f.reason}"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.reason}</div></td><td style="font-weight:700;">${formatTL(f.amount)}</td><td><span class="status-badge ${f.status==='Ödenmedi'?'status-odenmedi':f.status==='Ödendi'?'status-odendi':'status-acik'}">${f.status}</span></td><td>${f.status==='Ödenmedi'?`<button class="btn btn-primary btn-sm" onclick="payFineById(${f.id})"><i class="fas fa-credit-card"></i> Öde</button>`:`<span style="font-size:0.8rem;color:var(--text-muted);"><i class="fas fa-check-circle" style="color:#10b981;"></i> Ödendi</span>`}${f.tebligatFile?` <button class="btn btn-sm" style="border:1px solid var(--border);margin-left:4px;" onclick="viewTebligat(${f.id})" title="Tebligat Belgesi"><i class="fas fa-file-alt"></i></button>`:''}</td></tr>`).join('');
    results.innerHTML=`<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Plaka</th><th>Sahibi</th><th>Tarih</th><th>Son Ödeme</th><th>İhlal</th><th>Tutar</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:0.82rem;color:var(--text-muted);"><span>${displayList.length} kayıt</span></div>`;
  }
}

function viewTebligat(id) {
  const fine = DB.getFineById(id);
  if (!fine || !fine.tebligatFile) { Toast.warning('Tebligat belgesi bulunamadı.'); return; }
  const tf = fine.tebligatFile;
  const isImage = tf.type && tf.type.startsWith('image/');
  Modal.open(`
    <div class="modal-header"><h3><i class="fas fa-file-alt" style="color:var(--primary-blue);margin-right:8px;"></i>Ceza Tebligat Belgesi</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid var(--border);"><i class="fas fa-times"></i></button></div>
    <div class="modal-body">
      <div style="font-size:0.88rem;margin-bottom:14px;color:var(--text-muted);">
        <strong>Plaka:</strong> ${fine.plate} &nbsp;|&nbsp; <strong>Tutar:</strong> ${formatTL(fine.amount)} &nbsp;|&nbsp; <strong>Dosya:</strong> ${tf.name}
      </div>
      ${isImage ? `<img src="${tf.data}" style="max-width:100%;border-radius:8px;border:1px solid var(--border);">` : `<div style="text-align:center;padding:30px;background:#f8fafc;border-radius:8px;"><i class="fas fa-file-pdf" style="font-size:3rem;color:#ef4444;margin-bottom:10px;display:block;"></i><p>PDF dosyası</p><a href="${tf.data}" download="${tf.name}" class="btn btn-primary btn-sm" style="margin-top:10px;"><i class="fas fa-download"></i> İndir</a></div>`}
    </div>
    <div class="modal-footer"><button onclick="Modal.close()" class="btn btn-primary">Kapat</button></div>
  `);
}

function payFineById(id) {
  const fine=DB.getFineById(id); if(!fine) return;
  if(!confirm(`${fine.plate} — ${formatTL(fine.amount)} ödemek istiyor musunuz?`)) return;
  const updated=DB.payFine(id);
  if(updated){
    Toast.success('Ödeme başarılı!');
    Modal.open(`<div class="modal-header"><h3>Ödeme Makbuzu</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid var(--border);"><i class="fas fa-times"></i></button></div><div class="modal-body">${generateReceiptHTML({receiptNo:updated.receiptNo,date:updated.paidAt,plate:updated.plate,amount:updated.amount})}</div><div class="modal-footer"><button onclick="Modal.close()" class="btn btn-primary">Tamam</button></div>`);
    initTrafficPage();
  }
}

// ======================== VEHICLE QUERY ========================
function initVehiclePage() {
  const user = Auth.getUser();
  const form = document.getElementById('vehicle-form');
  const results = document.getElementById('vehicle-results');
  if (!results) return;

  if (!user) {
    results.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><h4>Giriş Gerekli</h4><a href="giris.html" class="btn btn-primary btn-sm" style="margin-top:10px;">Giriş Yap</a></div>`;
    return;
  }

  if (!isAuthorized()) {
    // Vatandaş: sadece kendi araçları, arama formu gizli
    if (form) form.style.display = 'none';
    const myVehicles = DB.getVehicles({ownerTc: user.tc});
    render(myVehicles);
  } else {
    // Yetkili: plaka ile arama
    const params = new URLSearchParams(window.location.search);
    const ip = params.get('plate');
    if (ip) { const p=document.getElementById('vehicle-plate'); if(p)p.value=ip; doSearch(ip); } else { doSearch(''); }
    if (form) form.addEventListener('submit',(e)=>{e.preventDefault();doSearch(document.getElementById('vehicle-plate').value.trim().toUpperCase());});
  }

  function doSearch(plate) { const list=plate?DB.getVehicles({plate}):DB.getVehicles().slice(0,12); render(list); }
  function render(list) {
    if(list.length===0){results.innerHTML=`<div class="empty-state"><div class="icon">🚙</div><h4>Araç Bulunamadı</h4></div>`;return;}
    results.innerHTML=list.map(v=>{
      const fines=DB.getActiveFines({plate:v.plate,status:'Ödenmedi'});
      return `<div class="card" style="border-left:5px solid ${v.wanted?'#ef4444':v.taxStatus==='Gecikmiş'?'#f59e0b':'#10b981'};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
          <div><div style="font-size:1.5rem;font-weight:800;letter-spacing:1px;margin-bottom:6px;">${v.plate}</div><div style="color:var(--text-muted);font-size:0.92rem;">${v.brand} ${v.model} • ${v.year} • ${v.color}</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${v.wanted?'<span class="status-badge status-odenmedi"><i class="fas fa-exclamation-triangle"></i> ARANIYOR</span>':''}
            <span class="status-badge ${v.taxStatus==='Ödenmiş'||v.taxStatus==='Muaf'?'status-odendi':'status-acik'}">Vergi: ${v.taxStatus}</span>
            <span class="status-badge ${v.insurance==='Aktif'||v.insurance==='Devlet'?'status-odendi':'status-odenmedi'}">Sigorta: ${v.insurance}</span>
          </div>
        </div>
        <div style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;font-size:0.86rem;color:var(--text-muted);">
          <div><strong style="color:var(--text-main);">Sahibi:</strong> ${v.ownerName}</div>
          <div><strong style="color:var(--text-main);">Muayene:</strong> ${formatDate(v.inspection)}</div>
          <div><strong style="color:var(--text-main);">Sigorta Bitiş:</strong> ${formatDate(v.insuranceExpiry)}</div>
          <div><strong style="color:var(--text-main);">Ödenmemiş Cezalar:</strong> ${fines.length} adet</div>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
          <a href="trafik.html" class="btn btn-primary btn-sm"><i class="fas fa-file-invoice-dollar"></i> Cezaları Gör</a>
        </div>
      </div>`;
    }).join('');
  }
}

// ======================== CRIMINAL RECORDS ========================
function initCriminalPage() {
  const user = Auth.getUser();
  const form = document.getElementById('sicil-form');
  const results = document.getElementById('sicil-results');
  if (!results) return;

  if (!user) {
    results.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><h4>Giriş Gerekli</h4><a href="giris.html" class="btn btn-primary btn-sm" style="margin-top:10px;">Giriş Yap</a></div>`;
    return;
  }

  if (!isAuthorized()) {
    // Vatandaş: kendi sicili, form gizli
    if (form) form.style.display = 'none';
    const myRecords = DB.getCriminalRecords({tc: user.tc});
    render(myRecords);
  } else {
    // Yetkili: TC veya isim ile arama
    const params = new URLSearchParams(window.location.search);
    if (params.get('tc')) { const t=document.getElementById('sicil-tc'); if(t)t.value=params.get('tc'); doSearch(params.get('tc'),''); }
    if (form) form.addEventListener('submit',(e)=>{e.preventDefault();doSearch(document.getElementById('sicil-tc').value.trim(),document.getElementById('sicil-name')?.value.trim());});
  }

  function doSearch(tc,name) {
    let list=DB.getCriminalRecords({tc:tc||undefined});
    if(name) list=list.filter(r=>r.name.toLowerCase().includes(name.toLowerCase()));
    render(list);
  }
  function render(list) {
    if(list.length===0){results.innerHTML=`<div class="empty-state"><div class="icon">⚖️</div><h4>Adli Sicil Kaydı Bulunamadı</h4><p>Kayıtlı adli sicil kaydınız bulunmamaktadır.</p></div>`;return;}
    results.innerHTML=`<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Dosya No</th><th>İsim</th><th>Suç</th><th>Tarih</th><th>Karar</th><th>Mahkeme</th><th>Tür</th><th>Durum</th></tr></thead><tbody>
    ${list.map(r=>`<tr><td style="font-family:monospace;">${r.caseNo}</td><td style="font-weight:600;">${r.name}</td><td style="max-width:200px;" title="${r.crime}"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.crime}</div></td><td>${formatDate(r.date)}</td><td style="max-width:180px;" title="${r.decision}"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.decision}</div></td><td>${r.court}</td><td><span class="status-badge ${r.type==='Cezai'?'status-odenmedi':'status-guvluk'}">${r.type}</span></td><td><span class="status-badge ${r.status==='Kapalı'?'status-odendi':'status-acik'}">${r.status}</span></td></tr>`).join('')}
    </tbody></table></div><div style="margin-top:12px;font-size:0.82rem;color:var(--text-muted);">${list.length} kayıt</div>`;
  }
}

// ======================== E-SIGNATURE (USB FLOW) ========================
const ESignUSB = {
  isUSBActive() { const l=localStorage.getItem(APP_CONFIG.keys.eSignUSB); if(!l)return false; return(Date.now()-parseInt(l))<APP_CONFIG.eSignProvider.usbTimeout; },
  setUSBActive() { localStorage.setItem(APP_CONFIG.keys.eSignUSB,Date.now().toString()); },
  clearUSB() { localStorage.removeItem(APP_CONFIG.keys.eSignUSB); }
};

function initESignPage() {
  const user=Auth.getUser(); const listEl=document.getElementById('esign-list'); const form=document.getElementById('esign-form'); const applySection=document.getElementById('esign-apply-section');
  if(!listEl)return;
  const hasCert=user?DB.hasApprovedESign(user.tc):false;
  const pendingApp=user?DB.getESignApplications({tc:user.tc}).find(a=>a.status==='Bekliyor'):null;

  if(applySection){
    if(!user){applySection.innerHTML='<div class="card" style="border-left:4px solid #ef4444;"><p style="color:var(--text-muted);">Giriş yapmalısınız.</p><a href="giris.html" class="btn btn-primary btn-sm" style="margin-top:10px;">Giriş Yap</a></div>';}
    else if(hasCert){const cert=DB.getESignCertificate(user.tc);applySection.innerHTML=`<div class="card" style="border-left:4px solid #10b981;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;"><div style="width:44px;height:44px;border-radius:50%;background:#d1fae5;color:#065f46;display:grid;place-items:center;font-size:1.2rem;"><i class="fas fa-check-circle"></i></div><div><div style="font-weight:700;">e-İmza Sertifikanız Aktif</div><div style="font-size:0.8rem;color:var(--text-muted);">${APP_CONFIG.eSignProvider.name}</div></div></div><div style="font-size:0.88rem;color:var(--text-muted);"><strong>Sertifika:</strong> ${cert.certificateSerial}</div><div style="margin-top:12px;padding:10px;background:rgba(16,185,129,0.06);border-radius:6px;font-size:0.82rem;color:#065f46;"><i class="fas fa-usb"></i> USB: ${ESignUSB.isUSBActive()?'<span style="color:#10b981;font-weight:700;">Takılı</span>':'<span style="color:#f59e0b;font-weight:700;">Takılı Değil</span>'}</div></div>`;}
    else if(pendingApp){applySection.innerHTML=`<div class="card" style="border-left:4px solid #f59e0b;"><div style="display:flex;align-items:center;gap:10px;"><i class="fas fa-hourglass-half" style="font-size:1.5rem;color:#f59e0b;"></i><div><div style="font-weight:700;">Başvurunuz İnceleniyor</div><div style="font-size:0.82rem;color:var(--text-muted);">Tarih: ${formatDate(pendingApp.appliedAt)}</div></div></div></div>`;}
    else{applySection.innerHTML=`<div class="card" style="border-left:4px solid #7c3aed;"><h3 style="font-size:1.05rem;margin-bottom:12px;"><i class="fas fa-certificate" style="color:#7c3aed;margin-right:8px;"></i>e-İmza Başvurusu</h3><p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:14px;">${APP_CONFIG.eSignProvider.name} üzerinden başvuru yapın.</p><button class="btn btn-primary" onclick="applyForESign()" style="width:100%;justify-content:center;"><i class="fas fa-paper-plane"></i> Başvuru Yap</button></div>`;}
  }

  const docs=user?DB.getESignatures(user.tc):[];
  renderDocs(docs);

  if(form){form.addEventListener('submit',(e)=>{e.preventDefault();if(!user){Toast.error('Giriş yapın.');return;}if(!hasCert){Toast.error('Önce e-İmza başvurusu yapın.');return;}const title=document.getElementById('esign-title').value.trim();const type=document.getElementById('esign-type')?.value||'Dilekçe';if(!title){Toast.warning('Başlık giriniz.');return;}DB.addESignature({tc:user.tc,title,type,status:'Bekliyor',date:todayISO(),signedAt:null});Toast.success('Belge oluşturuldu.');form.reset();renderDocs(DB.getESignatures(user.tc));});}

  function renderDocs(docs){
    if(docs.length===0){listEl.innerHTML=`<div class="empty-state"><div class="icon">✍️</div><h4>Belge Yok</h4></div>`;return;}
    listEl.innerHTML=docs.map(d=>`<div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;"><div><div style="font-weight:700;">${d.title}</div><div style="font-size:0.82rem;color:var(--text-muted);">${d.id} • ${formatDate(d.date)} • ${d.type}</div></div><div style="display:flex;align-items:center;gap:10px;"><span class="status-badge ${d.status==='İmzalandı'?'status-odendi':'status-acik'}">${d.status}</span>${d.status==='Bekliyor'?`<button class="btn btn-primary btn-sm" onclick="startESignFlow('${d.id}')"><i class="fas fa-signature"></i> e-İmza ile İmzala</button>`:`<button class="btn btn-sm" style="border:1px solid var(--border);" onclick="previewDoc('${d.id}')"><i class="fas fa-eye"></i></button>`}</div></div>`).join('');
  }
}

function applyForESign(){const user=Auth.getUser();if(!user)return;if(DB.hasApprovedESign(user.tc)){Toast.info('Zaten sertifikanız var.');return;}if(DB.getESignApplications({tc:user.tc}).find(a=>a.status==='Bekliyor')){Toast.warning('Bekleyen başvurunuz var.');return;}Modal.open(`<div class="modal-header"><h3><i class="fas fa-certificate" style="color:#7c3aed;margin-right:8px;"></i>${APP_CONFIG.eSignProvider.name}</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid var(--border);"><i class="fas fa-times"></i></button></div><div class="modal-body"><div style="text-align:center;margin-bottom:20px;"><div style="font-size:2.5rem;">🔐</div><h3>${APP_CONFIG.eSignProvider.shortName}</h3></div><div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:16px;font-size:0.9rem;"><p><strong>Başvuru Sahibi:</strong> ${user.firstName} ${user.lastName}</p><p><strong>Doğum Tarihi:</strong> ${formatDate(user.birthDate)}</p></div><p style="font-size:0.82rem;color:var(--text-muted);margin-top:14px;">Admin onayından sonra aktif olacaktır.</p></div><div class="modal-footer"><button onclick="Modal.close()" class="btn btn-outline">İptal</button><button onclick="submitESignApplication()" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Gönder</button></div>`);}
function submitESignApplication(){const user=Auth.getUser();if(!user)return;DB.addESignApplication({tc:user.tc,name:`${user.firstName} ${user.lastName}`,status:'Bekliyor',appliedAt:todayISO(),reviewedAt:null,reviewedBy:null,certificateSerial:null});Modal.close();Toast.success('Başvuru gönderildi!');initESignPage();}

// ===== E-SIGN USB FLOW (with dual-sign + preview) =====
function startESignFlow(docId) {
  const user = Auth.getUser();
  if (!user || !DB.hasApprovedESign(user.tc)) { Toast.error('e-İmza sertifikanız yok.'); return; }
  const doc = DB.data.eSignatures.find(d => d.id === docId);
  if (!doc) return;
  const cert = DB.getESignCertificate(user.tc);
  const isSecondParty = doc.secondPartyTc === user.tc && doc.tc !== user.tc;
  if (isSecondParty && !doc.secondPartySignedAt) { showDocPreviewBeforeSign(doc, user, cert); return; }
  if (ESignUSB.isUSBActive()) { showESignInfoStep(user, cert, doc); return; }
  Modal.open(`<div class="modal-header" style="background:linear-gradient(135deg,#1a1d23,#2d323b);color:#fff;"><h3><i class="fas fa-usb" style="margin-right:8px;"></i>e-İmza USB</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button></div><div class="modal-body" style="text-align:center;padding:40px 24px;"><div id="usb-step-detect"><div style="font-size:3rem;margin-bottom:16px;animation:pulse 1.5s infinite;">🔌</div><h3>E-İmza USB'si Tespit Ediliyor...</h3><div style="margin-top:20px;"><div style="width:48px;height:48px;border:4px solid var(--border);border-top-color:var(--primary-blue);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div></div></div></div>`);
  setTimeout(() => { const d = document.getElementById('usb-step-detect'); if (!d) return; d.innerHTML = `<div style="font-size:3rem;margin-bottom:16px;">❌</div><h3 style="color:#ef4444;">E-İmza USB'si Tespit Edilemedi</h3><p style="color:var(--text-muted);margin-bottom:24px;">Lütfen USB cihazınızı takın.</p><button onclick="simulateUSBPlug('${docId}')" class="btn btn-primary" style="min-width:200px;justify-content:center;"><i class="fas fa-usb"></i> USB'yi Tak</button>`; }, 2500);
}

function simulateUSBPlug(docId) {
  const user = Auth.getUser(); const cert = DB.getESignCertificate(user.tc); const doc = DB.data.eSignatures.find(d => d.id === docId);
  const d = document.getElementById('usb-step-detect');
  if (d) { d.innerHTML = `<div style="font-size:3rem;animation:pulse 1s infinite;">🔌</div><h3>Tespit Ediliyor...</h3><div style="margin-top:20px;"><div style="width:48px;height:48px;border:4px solid var(--border);border-top-color:#10b981;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div></div>`; }
  setTimeout(() => { ESignUSB.setUSBActive(); showESignInfoStep(user, cert, doc); }, 2000);
}

function showESignInfoStep(user, cert, doc) {
  Modal.open(`<div class="modal-header" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;"><h3><i class="fas fa-check-circle" style="margin-right:8px;"></i>USB Tespit Edildi</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button></div><div class="modal-body" style="text-align:center;padding:30px;"><div style="font-size:3rem;margin-bottom:12px;">✅</div><h2 style="margin-bottom:4px;">Hoş Geldiniz!</h2><p style="color:var(--text-muted);margin-bottom:24px;">${APP_CONFIG.eSignProvider.name}</p><div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:20px;text-align:left;"><div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;"><div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--primary-blue),var(--dark-blue));color:#fff;display:grid;place-items:center;font-size:1.5rem;"><i class="fas fa-user-shield"></i></div><div><div style="font-size:1.15rem;font-weight:800;">${user.firstName} ${user.lastName}</div><div style="font-size:0.82rem;color:var(--text-muted);">Sertifika Sahibi</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div style="padding:10px;background:rgba(21,101,192,0.06);border-radius:6px;"><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">T.C. Kimlik No</div><div style="font-weight:700;margin-top:2px;">${user.tc}</div></div><div style="padding:10px;background:rgba(21,101,192,0.06);border-radius:6px;"><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Doğum Tarihi</div><div style="font-weight:700;margin-top:2px;">${formatDate(user.birthDate)}</div></div><div style="padding:10px;background:rgba(21,101,192,0.06);border-radius:6px;grid-column:1/-1;"><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Sertifika No</div><div style="font-weight:700;margin-top:2px;font-family:monospace;">${cert.certificateSerial}</div></div></div></div></div><div class="modal-footer"><button onclick="Modal.close()" class="btn btn-outline">İptal</button><button onclick="showESignDocStep('${doc.id}')" class="btn btn-primary"><i class="fas fa-arrow-right"></i> İlerle</button></div>`);
}

function showDocPreviewBeforeSign(doc, user, cert) {
  const creator = DB.getUserByTC(doc.tc);
  const creatorName = creator ? creator.firstName+' '+creator.lastName : doc.tc;
  const tpl = buildTemplatePreviewHTML(doc);
  Modal.open(`<div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;"><h3><i class="fas fa-eye" style="margin-right:8px;"></i>Belge Önizleme — İmzanız Bekleniyor</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button></div><div class="modal-body" style="max-height:70vh;overflow-y:auto;"><div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin-bottom:16px;font-size:0.88rem;color:#92400e;"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i><strong>${creatorName}</strong> tarafından oluşturulan bu belge sizin e-imzanızı bekliyor. Lütfen dikkatlice inceleyiniz.</div><div style="border:2px solid var(--border);border-radius:10px;overflow:hidden;"><div style="background:#f1f5f9;padding:14px 20px;border-bottom:1px solid var(--border);"><div style="display:flex;justify-content:space-between;"><div style="font-weight:700;">${doc.title}</div><span class="status-badge status-acik">${doc.type}</span></div><div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">${doc.id} • ${formatDate(doc.date)} • Oluşturan: ${creatorName}</div></div><div style="padding:20px;">${tpl}<div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.85rem;"><div style="padding:10px;background:#d1fae5;border-radius:6px;"><strong>1. Taraf:</strong><br>${creatorName}<br><span style="font-size:0.78rem;color:#065f46;">✓ İmzalandı</span></div><div style="padding:10px;background:#fef3c7;border-radius:6px;"><strong>2. Taraf:</strong><br>${user.firstName} ${user.lastName}<br><span style="font-size:0.78rem;color:#92400e;">⏳ Bekliyor</span></div></div></div></div></div><div class="modal-footer"><button onclick="Modal.close()" class="btn btn-outline"><i class="fas fa-times"></i> Kapat</button><button onclick="proceedToSecondPartySign('${doc.id}')" class="btn btn-primary" style="background:#059669;border-color:#059669;"><i class="fas fa-signature"></i> Kabul Et ve İmzala</button></div>`);
}

function proceedToSecondPartySign(docId) {
  const user = Auth.getUser(); const cert = DB.getESignCertificate(user.tc); const doc = DB.data.eSignatures.find(d => d.id === docId);
  if (!doc) return;
  if (ESignUSB.isUSBActive()) { showESignInfoStep(user, cert, doc); } else {
    Modal.open(`<div class="modal-header" style="background:linear-gradient(135deg,#1a1d23,#2d323b);color:#fff;"><h3><i class="fas fa-usb" style="margin-right:8px;"></i>e-İmza USB</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button></div><div class="modal-body" style="text-align:center;padding:40px 24px;"><div id="usb-step-detect"><div style="font-size:3rem;margin-bottom:16px;animation:pulse 1.5s infinite;">🔌</div><h3>E-İmza USB'si Tespit Ediliyor...</h3><div style="margin-top:20px;"><div style="width:48px;height:48px;border:4px solid var(--border);border-top-color:var(--primary-blue);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div></div></div></div>`);
    setTimeout(() => { const d = document.getElementById('usb-step-detect'); if (!d) return; d.innerHTML = `<div style="font-size:3rem;margin-bottom:16px;">❌</div><h3 style="color:#ef4444;">E-İmza USB'si Tespit Edilemedi</h3><p style="color:var(--text-muted);margin-bottom:24px;">Lütfen USB cihazınızı takın.</p><button onclick="simulateUSBPlug('${docId}')" class="btn btn-primary" style="min-width:200px;justify-content:center;"><i class="fas fa-usb"></i> USB'yi Tak</button>`; }, 2500);
  }
}

function buildTemplatePreviewHTML(doc) {
  if (!doc.templateData || !doc.templateKey) return `<p style="color:var(--text-muted);font-size:0.9rem;">${doc.title}</p>`;
  const td = doc.templateData; const key = doc.templateKey;
  let h = '<div style="font-size:0.9rem;line-height:1.7;">';
  if (key==='dilekce') { h+=`<p><strong>Muhatap:</strong> ${td['dilekce-to']||'—'}</p><p><strong>Konu:</strong> ${td['dilekce-subject']||'—'}</p><div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;">${td['dilekce-body']||'—'}</div>`; if(td['dilekce-attachment']) h+=`<p><strong>Ekler:</strong> ${td['dilekce-attachment']}</p>`; }
  else if (key==='sozlesme') { const p2=DB.getUserByTC(td['sozlesme-party2-tc']); h+=`<p><strong>Sözleşme Türü:</strong> ${td['sozlesme-type']||'—'}</p><p><strong>Karşı Taraf:</strong> ${p2?p2.firstName+' '+p2.lastName:td['sozlesme-party2-tc']}</p><p><strong>Konu:</strong> ${td['sozlesme-subject']||'—'}</p>`; if(td['sozlesme-amount']) h+=`<p><strong>Bedel:</strong> ${formatTL(Number(td['sozlesme-amount']))}</p>`; if(td['sozlesme-duration']) h+=`<p><strong>Süre:</strong> ${td['sozlesme-duration']}</p>`; h+=`<div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;"><strong>Maddeler:</strong>\n\n${td['sozlesme-terms']||'—'}</div>`; }
  else if (key==='vekaletname') { const p2=DB.getUserByTC(td['vekalet-party2-tc']); h+=`<p><strong>Tür:</strong> ${td['vekalet-type']||'—'}</p><p><strong>Vekil:</strong> ${p2?p2.firstName+' '+p2.lastName:td['vekalet-party2-tc']}</p><p><strong>Geçerlilik:</strong> ${td['vekalet-duration']||'—'}</p>`; if(td['vekalet-case']) h+=`<p><strong>Dava:</strong> ${td['vekalet-case']}</p>`; h+=`<div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;"><strong>Yetki:</strong>\n\n${td['vekalet-scope']||'—'}</div>`; }
  else if (key==='avukat_yetki') { const law=DB.getUserByTC(td['ayb-lawyer-tc']); h+=`<p><strong>Avukat:</strong> ${law?law.firstName+' '+law.lastName:td['ayb-lawyer-tc']}</p><p><strong>Yetki:</strong> ${td['ayb-scope']||'—'}</p>`; if(td['ayb-case']) h+=`<p><strong>Dava:</strong> ${td['ayb-case']}</p>`; if(td['ayb-notes']) h+=`<div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;">${td['ayb-notes']}</div>`; }
  else if (key==='beyanname') { h+=`<p><strong>Tür:</strong> ${td['beyan-type']||'—'}</p><p><strong>Konu:</strong> ${td['beyan-subject']||'—'}</p><div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;">${td['beyan-body']||'—'}</div>`; }
  else if (key==='itiraz') { h+=`<p><strong>Kurum:</strong> ${td['itiraz-to']||'—'}</p><p><strong>Karar No:</strong> ${td['itiraz-ref']||'—'}</p><div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;"><strong>Gerekçe:</strong>\n\n${td['itiraz-reason']||'—'}</div><div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;"><strong>Talep:</strong>\n\n${td['itiraz-request']||'—'}</div>`; }
  h += '</div>'; return h;
}

function showESignDocStep(docId) {
  const user = Auth.getUser(); const cert = DB.getESignCertificate(user.tc); const doc = DB.data.eSignatures.find(d => d.id === docId); if (!doc) return;
  const creator = DB.getUserByTC(doc.tc); const tpl = buildTemplatePreviewHTML(doc);
  let dualHtml = '';
  if (doc.dualSign || doc.secondPartyTc) { const p2 = DB.getUserByTC(doc.secondPartyTc); dualHtml = `<div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.82rem;"><div style="padding:10px;background:${doc.signedAt?'#d1fae5':'#fef3c7'};border-radius:6px;"><strong>1. Taraf:</strong> ${creator?creator.firstName+' '+creator.lastName:'—'}<br>${doc.signedAt?'✓ İmzalandı':'⏳ Bekliyor'}</div><div style="padding:10px;background:${doc.secondPartySignedAt?'#d1fae5':'#fef3c7'};border-radius:6px;"><strong>2. Taraf:</strong> ${p2?p2.firstName+' '+p2.lastName:'—'}<br>${doc.secondPartySignedAt?'✓ İmzalandı':'⏳ Bekliyor'}</div></div>`; }
  Modal.open(`<div class="modal-header" style="background:linear-gradient(135deg,#1565c0,#0d47a1);color:#fff;"><h3><i class="fas fa-file-signature" style="margin-right:8px;"></i>Belge İmzalama</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button></div><div class="modal-body" style="max-height:65vh;overflow-y:auto;"><div style="border:2px solid var(--border);border-radius:10px;overflow:hidden;"><div style="background:#f1f5f9;padding:14px 20px;border-bottom:1px solid var(--border);"><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">İmzalanacak Belge</div><div style="font-weight:700;margin-top:4px;">${doc.title}</div></div><div style="padding:20px;"><table style="width:100%;font-size:0.88rem;border-collapse:collapse;"><tr><td style="padding:6px 0;border-bottom:1px solid var(--border);color:var(--text-muted);">Belge No</td><td style="padding:6px 0;border-bottom:1px solid var(--border);font-weight:700;text-align:right;font-family:monospace;">${doc.id}</td></tr><tr><td style="padding:6px 0;border-bottom:1px solid var(--border);color:var(--text-muted);">Tür</td><td style="padding:6px 0;border-bottom:1px solid var(--border);font-weight:700;text-align:right;">${doc.type}</td></tr><tr><td style="padding:6px 0;border-bottom:1px solid var(--border);color:var(--text-muted);">Tarih</td><td style="padding:6px 0;border-bottom:1px solid var(--border);font-weight:700;text-align:right;">${formatDate(doc.date)}</td></tr><tr><td style="padding:6px 0;border-bottom:1px solid var(--border);color:var(--text-muted);">İmzalayan</td><td style="padding:6px 0;border-bottom:1px solid var(--border);font-weight:700;text-align:right;">${user.firstName} ${user.lastName}</td></tr><tr><td style="padding:6px 0;color:var(--text-muted);">Sertifika</td><td style="padding:6px 0;font-weight:700;text-align:right;font-family:monospace;">${cert.certificateSerial}</td></tr></table>${tpl?'<hr style="border:none;border-top:1px solid var(--border);margin:14px 0;"><div style="font-size:0.82rem;font-weight:600;margin-bottom:8px;color:var(--text-muted);">BELGE İÇERİĞİ</div>'+tpl:''}${dualHtml}</div></div><div style="margin-top:16px;padding:12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:0.82rem;color:#92400e;"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Bu işlem geri alınamaz.</div></div><div class="modal-footer"><button onclick="Modal.close()" class="btn btn-outline">İptal</button><button onclick="confirmESign('${doc.id}')" class="btn btn-primary" style="background:#059669;border-color:#059669;"><i class="fas fa-signature"></i> e-İmzala</button></div>`);
}

function confirmESign(docId) {
  if (!confirm('e-İmza ile imzalamak istediğinize emin misiniz?')) return;
  const user = Auth.getUser(); const doc = DB.data.eSignatures.find(d => d.id === docId); if (!doc) return;
  const isSecondParty = doc.secondPartyTc === user.tc && doc.tc !== user.tc;
  Modal.open(`<div class="modal-body" style="text-align:center;padding:50px;"><div style="width:60px;height:60px;border:4px solid var(--border);border-top-color:#059669;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div><h3>İmzalanıyor...</h3></div>`);
  setTimeout(() => {
    let result = isSecondParty ? DB.signAsSecondParty(docId) : DB.signDocument(docId);
    if (result) {
      ESignUSB.setUSBActive();
      const msg = result.dualSign ? (result.signedAt && result.secondPartySignedAt ? 'Her iki taraf da imzaladı!' : 'İmzanız kaydedildi. Karşı tarafın imzası bekleniyor.') : 'Belge imzalandı!';
      Modal.open(`<div class="modal-body" style="text-align:center;padding:40px;"><div style="font-size:4rem;margin-bottom:12px;">✅</div><h2 style="color:#059669;">${isSecondParty?'İmzanız Kaydedildi!':'İmzalandı!'}</h2><p style="color:var(--text-muted);margin-bottom:20px;">${msg}</p><div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:14px;font-size:0.88rem;text-align:left;"><div><strong>Belge:</strong> ${result.title}</div><div style="margin-top:4px;"><strong>Zaman:</strong> ${new Date().toLocaleString('tr-TR')}</div></div></div><div class="modal-footer"><button onclick="Modal.close();location.reload();" class="btn btn-primary" style="background:#059669;border-color:#059669;">Tamam</button></div>`);
      Toast.success('e-İmza başarılı!');
    }
  }, 2000);
}

function previewDoc(id) {
  const doc = DB.data.eSignatures.find(d => d.id === id); if (!doc) return;
  const cert = DB.getESignCertificate(doc.tc); const creator = DB.getUserByTC(doc.tc); const tpl = buildTemplatePreviewHTML(doc);
  let sigInfo = '';
  if (doc.dualSign || doc.secondPartyTc) { const p2 = DB.getUserByTC(doc.secondPartyTc); sigInfo = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;font-size:0.82rem;"><div style="padding:10px;background:${doc.signedAt?'#d1fae5':'#fee2e2'};border-radius:6px;"><strong>1. Taraf:</strong> ${creator?creator.firstName+' '+creator.lastName:'—'}<br>${doc.signedAt?'✓ '+new Date(doc.signedAt).toLocaleString('tr-TR'):'✕ Bekleniyor'}</div><div style="padding:10px;background:${doc.secondPartySignedAt?'#d1fae5':'#fee2e2'};border-radius:6px;"><strong>2. Taraf:</strong> ${p2?p2.firstName+' '+p2.lastName:'—'}<br>${doc.secondPartySignedAt?'✓ '+new Date(doc.secondPartySignedAt).toLocaleString('tr-TR'):'✕ Bekleniyor'}</div></div>`; }
  else if (doc.status==='İmzalandı') { sigInfo = `<div style="margin-top:14px;padding:12px;background:#d1fae5;border-radius:6px;color:#065f46;font-size:0.88rem;"><i class="fas fa-check-circle"></i> e-İmza ile ${doc.signedAt?new Date(doc.signedAt).toLocaleString('tr-TR'):''} tarihinde imzalanmıştır.${cert?' Sertifika: '+cert.certificateSerial:''}</div>`; }
  Modal.open(`<div class="modal-header"><h3><i class="fas fa-file-contract" style="color:var(--primary-blue);margin-right:8px;"></i>Belge Önizleme</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid var(--border);"><i class="fas fa-times"></i></button></div><div class="modal-body" style="max-height:70vh;overflow-y:auto;"><div style="background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:20px;"><div style="text-align:center;margin-bottom:20px;"><div style="font-size:1.3rem;font-weight:800;">AMSTERDAM RP</div><div style="font-size:0.9rem;color:var(--text-muted);">e-İmza Merkezi</div></div><hr style="border:none;border-top:1px solid var(--border);margin:14px 0;"><div style="font-size:0.92rem;line-height:1.6;"><p><strong>No:</strong> ${doc.id}</p><p><strong>Başlık:</strong> ${doc.title}</p><p><strong>Tür:</strong> ${doc.type}</p><p><strong>Durum:</strong> <span class="status-badge ${doc.status==='İmzalandı'?'status-odendi':'status-acik'}">${doc.status}</span></p>${tpl?'<hr style="border:none;border-top:1px solid var(--border);margin:14px 0;">'+tpl:''}${sigInfo}</div></div></div><div class="modal-footer"><button onclick="Modal.close()" class="btn btn-primary">Kapat</button></div>`);
}

// ======================== E-APPOINTMENT ========================
function initAppointmentPage(){const user=Auth.getUser();const listEl=document.getElementById('appt-list');const form=document.getElementById('appt-form');const historyEl=document.getElementById('appt-history');if(!listEl)return;if(!user){listEl.innerHTML=`<div class="empty-state"><div class="icon">🔒</div><h4>Giriş Gerekli</h4><a href="giris.html" class="btn btn-primary btn-sm" style="margin-top:10px;">Giriş Yap</a></div>`;return;}renderLists();if(form){form.addEventListener('submit',(e)=>{e.preventDefault();const inst=document.getElementById('appt-inst').value;const svc=document.getElementById('appt-service').value.trim();const date=document.getElementById('appt-date').value;const time=document.getElementById('appt-time').value;const loc=document.getElementById('appt-loc')?.value||inst;if(!inst||!svc||!date||!time){Toast.warning('Tüm alanları doldurunuz.');return;}DB.addAppointment({tc:user.tc,institution:inst,service:svc,date,time,status:'Aktif',location:loc});Toast.success('Randevu alındı!');form.reset();renderLists();});}function renderLists(){const my=DB.getAppointments({tc:user.tc});const active=my.filter(a=>a.status==='Aktif');const past=my.filter(a=>a.status!=='Aktif');if(active.length===0){listEl.innerHTML=`<div class="empty-state"><div class="icon">📅</div><h4>Aktif Randevu Yok</h4></div>`;}else{listEl.innerHTML=active.map(a=>`<div class="card" style="border-left:4px solid var(--primary-blue);"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;"><div><div style="font-weight:700;">${a.service}</div><div style="font-size:0.85rem;color:var(--text-muted);">${a.institution} • ${a.location}</div><div style="font-size:0.9rem;margin-top:6px;">${formatDate(a.date)} ${a.time}</div></div><div style="display:flex;gap:8px;"><span class="status-badge status-guvluk">${a.status}</span><button class="btn btn-red btn-sm" onclick="cancelAppt(${a.id})"><i class="fas fa-times"></i></button></div></div></div>`).join('');}if(historyEl){historyEl.innerHTML=past.length===0?'<p style="color:var(--text-muted);">Geçmiş yok.</p>':`<table class="data-table" style="font-size:0.85rem;"><thead><tr><th>Hizmet</th><th>Kurum</th><th>Tarih</th><th>Durum</th></tr></thead><tbody>${past.map(a=>`<tr><td>${a.service}</td><td>${a.institution}</td><td>${formatDate(a.date)} ${a.time}</td><td><span class="status-badge ${a.status==='Tamamlandı'?'status-odendi':'status-odenmedi'}">${a.status}</span></td></tr>`).join('')}</tbody></table>`;}}}
function cancelAppt(id){if(!confirm('İptal etmek istiyor musunuz?'))return;DB.cancelAppointment(id);Toast.info('İptal edildi.');initAppointmentPage();}

// ======================== PROFILE ========================
function initProfilePage(){
  const user=Auth.getUser();
  if(!user){const c=document.getElementById('profile-content');if(c)c.innerHTML=`<div class="empty-state"><div class="icon">🔒</div><h4>Giriş Gerekli</h4><a href="giris.html" class="btn btn-primary btn-sm" style="margin-top:10px;">Giriş Yap</a></div>`;return;}
  const params=new URLSearchParams(window.location.search);
  let tc = user.tc;
  if (isAuthorized() && params.get('tc')) { tc = params.get('tc'); }
  const targetUser = DB.getUserByTC(tc);
  if(!targetUser){const c=document.getElementById('profile-content');if(c)c.innerHTML=`<div class="empty-state"><div class="icon">👤</div><h4>Vatandaş bulunamadı.</h4></div>`;return;}
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  set('prof-name',`${targetUser.firstName} ${targetUser.lastName}`);set('prof-tc',targetUser.tc);set('prof-birth',formatDate(targetUser.birthDate));set('prof-city',targetUser.city);set('prof-address',targetUser.address||'—');set('prof-job',targetUser.job||'—');set('prof-blood',targetUser.bloodType||'—');set('prof-phone',targetUser.phone||'—');set('prof-email',targetUser.email||'—');
  const vehicles=DB.getVehicles({ownerTc:tc}); const fines=DB.getActiveFines({tc}); const records=DB.getCriminalRecords({tc});
  const vEl=document.getElementById('prof-vehicles');
  if(vEl){vEl.innerHTML=vehicles.length?vehicles.map(v=>`<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:600;">${v.brand} ${v.model} (${v.year})</div><div style="font-size:0.78rem;color:var(--text-muted);">${v.color}</div></div><span style="font-weight:700;">${v.plate}</span></div>`).join(''):'<p style="color:var(--text-muted);">Kayıtlı araç yok.</p>';}
  const fEl=document.getElementById('prof-fines');
  if(fEl){const unpaid=fines.filter(f=>f.status==='Ödenmedi');fEl.innerHTML=fines.length?fines.map(f=>`<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;"><div style="font-size:0.9rem;"><div style="font-weight:600;">${f.reason}</div><div style="font-size:0.78rem;color:var(--text-muted);">${f.plate} • ${formatDate(f.date)}</div></div><span class="status-badge ${f.status==='Ödenmedi'?'status-odenmedi':'status-odendi'}">${formatTL(f.amount)}</span></div>`).join(''):'<p style="color:var(--text-muted);">Ceza yok.</p>';if(unpaid.length>0)fEl.insertAdjacentHTML('beforeend',`<div style="margin-top:10px;font-weight:700;text-align:right;color:#991b1b;">Borç: ${formatTL(unpaid.reduce((a,b)=>a+b.amount,0))}</div>`);}
  const rEl=document.getElementById('prof-records');
  if(rEl){rEl.innerHTML=records.length?records.map(r=>`<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;"><div><div style="font-weight:600;">${r.crime}</div><div style="font-size:0.78rem;color:var(--text-muted);">${r.caseNo}</div></div><span class="status-badge ${r.status==='Kapalı'?'status-odendi':'status-odenmedi'}">${r.status}</span></div>`).join(''):'<p style="color:var(--text-muted);">Sicil temiz.</p>';}
  const aEl=document.getElementById('prof-appts');
  if(aEl){const active=DB.getAppointments({tc}).filter(a=>a.status==='Aktif');aEl.innerHTML=active.length?active.map(a=>`<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;"><div><div style="font-weight:600;">${a.service}</div><div style="font-size:0.78rem;color:var(--text-muted);">${a.institution} • ${formatDate(a.date)}</div></div><span class="status-badge status-guvluk">${a.status}</span></div>`).join(''):'<p style="color:var(--text-muted);">Randevu yok.</p>';}
}
function initDashboardPage(){const user=Auth.requireAuth();if(!user)return;const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};set('dash-name',`${user.firstName} ${user.lastName}`);set('dash-tc',user.tc);const myFines=DB.getActiveFines({tc:user.tc});const myRecords=DB.getCriminalRecords({tc:user.tc});const myVehicles=DB.getVehicles({ownerTc:user.tc});const myAppts=DB.getAppointments({tc:user.tc}).filter(a=>a.status==='Aktif');set('stat-fines',myFines.filter(f=>f.status==='Ödenmedi').length);set('stat-records',myRecords.length);set('stat-vehicles',myVehicles.length);const sBal=document.getElementById('stat-balance');if(sBal)sBal.textContent=formatTL(myFines.filter(f=>f.status==='Ödenmedi').reduce((a,b)=>a+b.amount,0));set('stat-appts',myAppts.length);const recent=document.getElementById('recent-list');if(recent){const logs=[...myFines,...myRecords].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);if(logs.length===0){recent.innerHTML=`<div class="empty-state"><div class="icon">📭</div><p>İşlem yok.</p></div>`;}else{recent.innerHTML=logs.map(l=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);"><div><div style="font-weight:600;font-size:0.9rem;">${l.reason||l.crime}</div><div style="font-size:0.78rem;color:var(--text-muted);">${formatDate(l.date)}</div></div><span class="status-badge ${l.status==='Ödenmedi'?'status-odenmedi':l.status==='Ödendi'?'status-odendi':l.status==='Kapalı'?'status-odendi':'status-acik'}">${l.status}</span></div>`).join('');}}}

// ======================== HOME SEARCH ========================
function handleHomeSearch(e){e.preventDefault();const q=document.getElementById('home-search').value.trim().toUpperCase();if(!q){Toast.warning('Arama terimi giriniz.');return;}if(q.includes('CEZA')||q.includes('TRAF')){window.location.href='trafik.html';}else if(q.includes('RANDEVU')){window.location.href='randevu.html';}else if(q.includes('İMZA')||q.includes('IMZA')){window.location.href='eimza.html';}else if(q.includes('ADALET')||q.includes('DAVA')){window.location.href='eadalet.html';}else if(q.includes('ARAÇ')||q.includes('ARAC')||q.includes('PLAKA')){window.location.href='arac.html';}else if(q.includes('SİCİL')||q.includes('SICIL')){window.location.href='sicil.html';}else{Toast.warning('Sonuç bulunamadı.');}}

// ======================== KURUMLAR ========================
function initKurumlar(){const grid=document.getElementById('kurum-grid');if(!grid)return;const k=[{name:'Amsterdam Politie',icon:'fas fa-shield-alt',color:'#0d47a1',desc:'Asayiş, trafik ve güvenlik.',links:[{label:'Polis Paneli',href:'polis.html'}]},{name:'Amsterdam Adliyesi',icon:'fas fa-gavel',color:'#7c3aed',desc:'Dava takibi ve adli sicil.',links:[{label:'e-Adalet',href:'eadalet.html'},{label:'Sicil',href:'sicil.html'}]},{name:'Hollanda RDW',icon:'fas fa-car',color:'#059669',desc:'Ehliyet, ruhsat ve araç.',links:[{label:'Araçlarım',href:'arac.html'}]},{name:'Vergi Dairesi',icon:'fas fa-receipt',color:'#f59e0b',desc:'Vergi hizmetleri.',links:[{label:'Randevu',href:'randevu.html'}]},{name:'Sağlık Bakanlığı',icon:'fas fa-heartbeat',color:'#ef4444',desc:'Sağlık hizmetleri.',links:[]},{name:`${APP_CONFIG.eSignProvider.shortName}`,icon:'fas fa-certificate',color:'#7c3aed',desc:`${APP_CONFIG.eSignProvider.slogan}`,links:[{label:'e-İmza',href:'eimza.html'}]}];grid.innerHTML=k.map(x=>`<div class="card" style="border-left:4px solid ${x.color};"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;"><div style="width:46px;height:46px;border-radius:50%;background:${x.color}15;color:${x.color};display:grid;place-items:center;font-size:1.2rem;"><i class="${x.icon}"></i></div><h3 style="font-size:1.05rem;">${x.name}</h3></div><p style="font-size:0.86rem;color:var(--text-muted);margin-bottom:14px;">${x.desc}</p><div style="display:flex;gap:8px;flex-wrap:wrap;">${x.links.map(l=>`<a href="${l.href}" class="btn btn-outline btn-sm">${l.label}</a>`).join('')}${x.links.length===0?'<span style="font-size:0.8rem;color:var(--text-muted);font-style:italic;">Yakında.</span>':''}</div></div>`).join('');}
