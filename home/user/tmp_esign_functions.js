
// ===== E-SIGN USB FLOW (with dual-sign + preview) =====
function startESignFlow(docId) {
  const user = RPAuth.getUser();
  if (!user || !DB.hasApprovedESign(user.tc)) { Toast.error('e-İmza sertifikanız yok.'); return; }
  const doc = DB.data.eSignatures.find(d => d.id === docId);
  if (!doc) return;
  const cert = DB.getESignCertificate(user.tc);

  // Determine if user is first party or second party
  const isSecondParty = doc.secondPartyTc === user.tc && doc.tc !== user.tc;

  // If second party, show preview first before signing
  if (isSecondParty && !doc.secondPartySignedAt) {
    showDocPreviewBeforeSign(doc, user, cert);
    return;
  }

  // Normal flow: USB check
  if (ESignUSB.isUSBActive()) { showESignInfoStep(user, cert, doc); return; }
  Modal.open(`<div class="modal-header" style="background:linear-gradient(135deg,#1a1d23,#2d323b);color:#fff;"><h3><i class="fas fa-usb" style="margin-right:8px;"></i>e-İmza USB</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button></div><div class="modal-body" style="text-align:center;padding:40px 24px;"><div id="usb-step-detect"><div style="font-size:3rem;margin-bottom:16px;animation:pulse 1.5s infinite;">🔌</div><h3>E-İmza USB'si Tespit Ediliyor...</h3><div style="margin-top:20px;"><div style="width:48px;height:48px;border:4px solid var(--border);border-top-color:var(--primary-blue);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div></div></div></div>`);
  setTimeout(() => {
    const d = document.getElementById('usb-step-detect');
    if (!d) return;
    d.innerHTML = `<div style="font-size:3rem;margin-bottom:16px;">❌</div><h3 style="color:#ef4444;">E-İmza USB'si Tespit Edilemedi</h3><p style="color:var(--text-muted);margin-bottom:24px;">Lütfen USB cihazınızı takın.</p><button onclick="simulateUSBPlug('${docId}')" class="btn btn-primary" style="min-width:200px;justify-content:center;"><i class="fas fa-usb"></i> USB'yi Tak</button>`;
  }, 2500);
}

function simulateUSBPlug(docId) {
  const user = RPAuth.getUser();
  const cert = DB.getESignCertificate(user.tc);
  const doc = DB.data.eSignatures.find(d => d.id === docId);
  const d = document.getElementById('usb-step-detect');
  if (d) { d.innerHTML = `<div style="font-size:3rem;animation:pulse 1s infinite;">🔌</div><h3>Tespit Ediliyor...</h3><div style="margin-top:20px;"><div style="width:48px;height:48px;border:4px solid var(--border);border-top-color:#10b981;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div></div>`; }
  setTimeout(() => { ESignUSB.setUSBActive(); showESignInfoStep(user, cert, doc); }, 2000);
}

function showESignInfoStep(user, cert, doc) {
  Modal.open(`<div class="modal-header" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;"><h3><i class="fas fa-check-circle" style="margin-right:8px;"></i>USB Tespit Edildi</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button></div><div class="modal-body" style="text-align:center;padding:30px;"><div style="font-size:3rem;margin-bottom:12px;">✅</div><h2 style="margin-bottom:4px;">Hoş Geldiniz!</h2><p style="color:var(--text-muted);margin-bottom:24px;">${APP_CONFIG.eSignProvider.name}</p><div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:20px;text-align:left;"><div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;"><div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--primary-blue),var(--dark-blue));color:#fff;display:grid;place-items:center;font-size:1.5rem;"><i class="fas fa-user-shield"></i></div><div><div style="font-size:1.15rem;font-weight:800;">${user.firstName} ${user.lastName}</div><div style="font-size:0.82rem;color:var(--text-muted);">Sertifika Sahibi</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div style="padding:10px;background:rgba(21,101,192,0.06);border-radius:6px;"><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">T.C. Kimlik No</div><div style="font-weight:700;margin-top:2px;">${user.tc}</div></div><div style="padding:10px;background:rgba(21,101,192,0.06);border-radius:6px;"><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Doğum Tarihi</div><div style="font-weight:700;margin-top:2px;">${formatDate(user.birthDate)}</div></div><div style="padding:10px;background:rgba(21,101,192,0.06);border-radius:6px;grid-column:1/-1;"><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Sertifika No</div><div style="font-weight:700;margin-top:2px;font-family:monospace;">${cert.certificateSerial}</div></div></div></div></div><div class="modal-footer"><button onclick="Modal.close()" class="btn btn-outline">İptal</button><button onclick="showESignDocStep('${doc.id}')" class="btn btn-primary"><i class="fas fa-arrow-right"></i> İlerle</button></div>`);
}

// ===== BELGE ÖNİZLEME (imzalamadan önce — karşı taraf için) =====
function showDocPreviewBeforeSign(doc, user, cert) {
  const creator = DB.getUserByTC(doc.tc);
  const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : doc.tc;
  const templateContent = buildTemplatePreviewHTML(doc);

  Modal.open(`
    <div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;">
      <h3><i class="fas fa-eye" style="margin-right:8px;"></i>Belge Önizleme — İmzanız Bekleniyor</h3>
      <button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin-bottom:16px;font-size:0.88rem;color:#92400e;">
        <i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>
        <strong>${creatorName}</strong> tarafından oluşturulan bu belge sizin e-imzanızı bekliyor. Lütfen belge içeriğini dikkatlice inceleyiniz.
      </div>

      <div style="border:2px solid var(--border);border-radius:10px;overflow:hidden;">
        <div style="background:#f1f5f9;padding:14px 20px;border-bottom:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:700;">${doc.title}</div>
            <span class="status-badge status-acik">${doc.type}</span>
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">${doc.id} • ${formatDate(doc.date)} • Oluşturan: ${creatorName}</div>
        </div>
        <div style="padding:20px;">
          ${templateContent}
          <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.85rem;">
            <div style="padding:10px;background:#d1fae5;border-radius:6px;"><strong>1. Taraf İmzası:</strong><br>${creatorName}<br><span style="font-size:0.78rem;color:#065f46;">✓ İmzalandı — ${doc.signedAt ? new Date(doc.signedAt).toLocaleString('tr-TR') : '—'}</span></div>
            <div style="padding:10px;background:#fef3c7;border-radius:6px;"><strong>2. Taraf İmzası:</strong><br>${user.firstName} ${user.lastName}<br><span style="font-size:0.78rem;color:#92400e;">⏳ Bekliyor</span></div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button onclick="Modal.close()" class="btn btn-outline"><i class="fas fa-times"></i> Reddet / Kapat</button>
      <button onclick="proceedToSecondPartySign('${doc.id}')" class="btn btn-primary" style="background:#059669;border-color:#059669;"><i class="fas fa-signature"></i> Kabul Et ve İmzala</button>
    </div>
  `);
}

function proceedToSecondPartySign(docId) {
  const user = RPAuth.getUser();
  const cert = DB.getESignCertificate(user.tc);
  const doc = DB.data.eSignatures.find(d => d.id === docId);
  if (!doc) return;
  // USB check
  if (ESignUSB.isUSBActive()) {
    showESignInfoStep(user, cert, doc);
  } else {
    Modal.close();
    // Re-trigger the USB flow but now for second party signing
    Modal.open(`<div class="modal-header" style="background:linear-gradient(135deg,#1a1d23,#2d323b);color:#fff;"><h3><i class="fas fa-usb" style="margin-right:8px;"></i>e-İmza USB</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button></div><div class="modal-body" style="text-align:center;padding:40px 24px;"><div id="usb-step-detect"><div style="font-size:3rem;margin-bottom:16px;animation:pulse 1.5s infinite;">🔌</div><h3>E-İmza USB'si Tespit Ediliyor...</h3><div style="margin-top:20px;"><div style="width:48px;height:48px;border:4px solid var(--border);border-top-color:var(--primary-blue);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div></div></div></div>`);
    setTimeout(() => {
      const d = document.getElementById('usb-step-detect');
      if (!d) return;
      d.innerHTML = `<div style="font-size:3rem;margin-bottom:16px;">❌</div><h3 style="color:#ef4444;">E-İmza USB'si Tespit Edilemedi</h3><p style="color:var(--text-muted);margin-bottom:24px;">Lütfen USB cihazınızı takın.</p><button onclick="simulateUSBPlug('${docId}')" class="btn btn-primary" style="min-width:200px;justify-content:center;"><i class="fas fa-usb"></i> USB'yi Tak</button>`;
    }, 2500);
  }
}

// ===== Build template preview HTML from templateData =====
function buildTemplatePreviewHTML(doc) {
  if (!doc.templateData || !doc.templateKey) {
    return `<p style="color:var(--text-muted);font-size:0.9rem;">${doc.title}</p>`;
  }
  const td = doc.templateData;
  const key = doc.templateKey;
  let html = '<div style="font-size:0.9rem;line-height:1.7;">';

  if (key === 'dilekce') {
    html += `<p><strong>Muhatap:</strong> ${td['dilekce-to']||'—'}</p>`;
    html += `<p><strong>Konu:</strong> ${td['dilekce-subject']||'—'}</p>`;
    html += `<div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;">${td['dilekce-body']||'—'}</div>`;
    if (td['dilekce-attachment']) html += `<p><strong>Ekler:</strong> ${td['dilekce-attachment']}</p>`;
  } else if (key === 'sozlesme') {
    const p2 = DB.getUserByTC(td['sozlesme-party2-tc']);
    html += `<p><strong>Sözleşme Türü:</strong> ${td['sozlesme-type']||'—'}</p>`;
    html += `<p><strong>Karşı Taraf:</strong> ${p2 ? p2.firstName+' '+p2.lastName+' ('+p2.tc+')' : td['sozlesme-party2-tc']}</p>`;
    html += `<p><strong>Konu:</strong> ${td['sozlesme-subject']||'—'}</p>`;
    if (td['sozlesme-amount']) html += `<p><strong>Bedel:</strong> ${formatTL(Number(td['sozlesme-amount']))}</p>`;
    if (td['sozlesme-duration']) html += `<p><strong>Süre:</strong> ${td['sozlesme-duration']}</p>`;
    html += `<div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;"><strong>Sözleşme Maddeleri:</strong>\n\n${td['sozlesme-terms']||'—'}</div>`;
  } else if (key === 'vekaletname') {
    const p2 = DB.getUserByTC(td['vekalet-party2-tc']);
    html += `<p><strong>Vekaletname Türü:</strong> ${td['vekalet-type']||'—'}</p>`;
    html += `<p><strong>Vekil Edilen:</strong> ${p2 ? p2.firstName+' '+p2.lastName+' ('+p2.tc+')' : td['vekalet-party2-tc']}</p>`;
    html += `<p><strong>Geçerlilik:</strong> ${td['vekalet-duration']||'—'}</p>`;
    if (td['vekalet-case']) html += `<p><strong>İlgili Dava:</strong> ${td['vekalet-case']}</p>`;
    html += `<div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;"><strong>Yetki Kapsamı:</strong>\n\n${td['vekalet-scope']||'—'}</div>`;
  } else if (key === 'avukat_yetki') {
    const law = DB.getUserByTC(td['ayb-lawyer-tc']);
    html += `<p><strong>Avukat:</strong> ${law ? law.firstName+' '+law.lastName+' ('+law.tc+')' : td['ayb-lawyer-tc']}</p>`;
    html += `<p><strong>Yetki Kapsamı:</strong> ${td['ayb-scope']||'—'}</p>`;
    if (td['ayb-case']) html += `<p><strong>İlgili Dava:</strong> ${td['ayb-case']}</p>`;
    if (td['ayb-notes']) html += `<div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;">${td['ayb-notes']}</div>`;
  } else if (key === 'beyanname') {
    html += `<p><strong>Beyanname Türü:</strong> ${td['beyan-type']||'—'}</p>`;
    html += `<p><strong>Konu:</strong> ${td['beyan-subject']||'—'}</p>`;
    html += `<div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;">${td['beyan-body']||'—'}</div>`;
  } else if (key === 'itiraz') {
    html += `<p><strong>İtiraz Edilen Kurum:</strong> ${td['itiraz-to']||'—'}</p>`;
    html += `<p><strong>Karar/Ceza No:</strong> ${td['itiraz-ref']||'—'}</p>`;
    html += `<div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;"><strong>Gerekçe:</strong>\n\n${td['itiraz-reason']||'—'}</div>`;
    html += `<div style="margin:12px 0;padding:14px;background:#fff;border:1px solid var(--border);border-radius:6px;white-space:pre-wrap;"><strong>Talep:</strong>\n\n${td['itiraz-request']||'—'}</div>`;
  }
  html += '</div>';
  return html;
}

// ===== BELGE İMZALAMA ADIMI (detaylı içerik gösterimi) =====
function showESignDocStep(docId) {
  const user = RPAuth.getUser();
  const cert = DB.getESignCertificate(user.tc);
  const doc = DB.data.eSignatures.find(d => d.id === docId);
  if (!doc) return;

  const isSecondParty = doc.secondPartyTc === user.tc && doc.tc !== user.tc;
  const creator = DB.getUserByTC(doc.tc);
  const templateContent = buildTemplatePreviewHTML(doc);

  // Dual sign info
  let dualSignHtml = '';
  if (doc.dualSign || doc.secondPartyTc) {
    const party2 = DB.getUserByTC(doc.secondPartyTc);
    dualSignHtml = `<div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.82rem;">
      <div style="padding:10px;background:${doc.signedAt?'#d1fae5':'#fef3c7'};border-radius:6px;"><strong>1. Taraf:</strong> ${creator?creator.firstName+' '+creator.lastName:'—'}<br>${doc.signedAt?'✓ İmzalandı':'⏳ Bekliyor'}</div>
      <div style="padding:10px;background:${doc.secondPartySignedAt?'#d1fae5':'#fef3c7'};border-radius:6px;"><strong>2. Taraf:</strong> ${party2?party2.firstName+' '+party2.lastName:'—'}<br>${doc.secondPartySignedAt?'✓ İmzalandı':'⏳ Bekliyor'}</div>
    </div>`;
  }

  Modal.open(`
    <div class="modal-header" style="background:linear-gradient(135deg,#1565c0,#0d47a1);color:#fff;">
      <h3><i class="fas fa-file-signature" style="margin-right:8px;"></i>Belge İmzalama</h3>
      <button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" style="max-height:65vh;overflow-y:auto;">
      <div style="border:2px solid var(--border);border-radius:10px;overflow:hidden;">
        <div style="background:#f1f5f9;padding:14px 20px;border-bottom:1px solid var(--border);">
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">İmzalanacak Belge</div>
          <div style="font-weight:700;margin-top:4px;">${doc.title}</div>
        </div>
        <div style="padding:20px;">
          <table style="width:100%;font-size:0.88rem;border-collapse:collapse;">
            <tr><td style="padding:6px 0;border-bottom:1px solid var(--border);color:var(--text-muted);">Belge No</td><td style="padding:6px 0;border-bottom:1px solid var(--border);font-weight:700;text-align:right;font-family:monospace;">${doc.id}</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid var(--border);color:var(--text-muted);">Tür</td><td style="padding:6px 0;border-bottom:1px solid var(--border);font-weight:700;text-align:right;">${doc.type}</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid var(--border);color:var(--text-muted);">Tarih</td><td style="padding:6px 0;border-bottom:1px solid var(--border);font-weight:700;text-align:right;">${formatDate(doc.date)}</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid var(--border);color:var(--text-muted);">İmzalayan</td><td style="padding:6px 0;border-bottom:1px solid var(--border);font-weight:700;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
            <tr><td style="padding:6px 0;color:var(--text-muted);">Sertifika</td><td style="padding:6px 0;font-weight:700;text-align:right;font-family:monospace;">${cert.certificateSerial}</td></tr>
          </table>
          ${templateContent ? '<hr style="border:none;border-top:1px solid var(--border);margin:14px 0;"><div style="font-size:0.82rem;font-weight:600;margin-bottom:8px;color:var(--text-muted);">BELGE İÇERİĞİ</div>' + templateContent : ''}
          ${dualSignHtml}
        </div>
      </div>
      <div style="margin-top:16px;padding:12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:0.82rem;color:#92400e;">
        <i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Bu işlem geri alınamaz.
      </div>
    </div>
    <div class="modal-footer">
      <button onclick="Modal.close()" class="btn btn-outline">İptal</button>
      <button onclick="confirmESign('${doc.id}')" class="btn btn-primary" style="background:#059669;border-color:#059669;"><i class="fas fa-signature"></i> e-İmzala</button>
    </div>
  `);
}

// ===== CONFIRM E-SIGN (handles both first and second party) =====
function confirmESign(docId) {
  if (!confirm('e-İmza ile imzalamak istediğinize emin misiniz?')) return;
  const user = RPAuth.getUser();
  const doc = DB.data.eSignatures.find(d => d.id === docId);
  if (!doc) return;

  const isSecondParty = doc.secondPartyTc === user.tc && doc.tc !== user.tc;

  Modal.open(`<div class="modal-body" style="text-align:center;padding:50px;"><div style="width:60px;height:60px;border:4px solid var(--border);border-top-color:#059669;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div><h3>İmzalanıyor...</h3></div>`);

  setTimeout(() => {
    let result;
    if (isSecondParty) {
      result = DB.signAsSecondParty(docId);
    } else {
      result = DB.signDocument(docId);
    }

    if (result) {
      ESignUSB.setUSBActive();
      const finalStatus = result.dualSign
        ? (result.signedAt && result.secondPartySignedAt ? 'Her iki taraf da imzaladı!' : 'İmzanız kaydedildi. Karşı tarafın imzası bekleniyor.')
        : 'Belge imzalandı!';
      Modal.open(`<div class="modal-body" style="text-align:center;padding:40px;"><div style="font-size:4rem;margin-bottom:12px;">✅</div><h2 style="color:#059669;">${isSecondParty ? 'İmzanız Kaydedildi!' : 'İmzalandı!'}</h2><p style="color:var(--text-muted);margin-bottom:20px;">${finalStatus}</p><div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:14px;font-size:0.88rem;text-align:left;"><div><strong>Belge:</strong> ${result.title}</div><div style="margin-top:4px;"><strong>Zaman:</strong> ${new Date().toLocaleString('tr-TR')}</div></div></div><div class="modal-footer"><button onclick="Modal.close();location.reload();" class="btn btn-primary" style="background:#059669;border-color:#059669;">Tamam</button></div>`);
      Toast.success('e-İmza başarılı!');
    }
  }, 2000);
}

// ===== BELGE ÖNİZLEME (zaten imzalanmış belgeler için) =====
function previewDoc(id) {
  const doc = DB.data.eSignatures.find(d => d.id === id);
  if (!doc) return;
  const cert = DB.getESignCertificate(doc.tc);
  const creator = DB.getUserByTC(doc.tc);
  const templateContent = buildTemplatePreviewHTML(doc);

  let signatureInfo = '';
  if (doc.dualSign || doc.secondPartyTc) {
    const p2 = DB.getUserByTC(doc.secondPartyTc);
    signatureInfo = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;font-size:0.82rem;">
      <div style="padding:10px;background:${doc.signedAt?'#d1fae5':'#fee2e2'};border-radius:6px;"><strong>1. Taraf:</strong> ${creator?creator.firstName+' '+creator.lastName:'—'}<br>${doc.signedAt?'✓ '+new Date(doc.signedAt).toLocaleString('tr-TR'):'✕ İmzalanmadı'}</div>
      <div style="padding:10px;background:${doc.secondPartySignedAt?'#d1fae5':'#fee2e2'};border-radius:6px;"><strong>2. Taraf:</strong> ${p2?p2.firstName+' '+p2.lastName:'—'}<br>${doc.secondPartySignedAt?'✓ '+new Date(doc.secondPartySignedAt).toLocaleString('tr-TR'):'✕ İmzalanmadı'}</div>
    </div>`;
  } else if (doc.status === 'İmzalandı') {
    signatureInfo = `<div style="margin-top:14px;padding:12px;background:#d1fae5;border-radius:6px;color:#065f46;font-size:0.88rem;"><i class="fas fa-check-circle"></i> e-İmza ile ${doc.signedAt ? new Date(doc.signedAt).toLocaleString('tr-TR') : ''} tarihinde imzalanmıştır.${cert ? ' Sertifika: '+cert.certificateSerial : ''}</div>`;
  }

  Modal.open(`
    <div class="modal-header"><h3><i class="fas fa-file-contract" style="color:var(--primary-blue);margin-right:8px;"></i>Belge Önizleme</h3><button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid var(--border);"><i class="fas fa-times"></i></button></div>
    <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:20px;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:1.3rem;font-weight:800;">AMSTERDAM RP</div>
          <div style="font-size:0.9rem;color:var(--text-muted);">e-İmza Merkezi</div>
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin:14px 0;">
        <div style="font-size:0.92rem;line-height:1.6;">
          <p><strong>Belge No:</strong> ${doc.id}</p>
          <p><strong>Başlık:</strong> ${doc.title}</p>
          <p><strong>Tür:</strong> ${doc.type}</p>
          <p><strong>Durum:</strong> <span class="status-badge ${doc.status==='İmzalandı'?'status-odendi':'status-acik'}">${doc.status}</span></p>
          ${templateContent ? '<hr style="border:none;border-top:1px solid var(--border);margin:14px 0;">'+templateContent : ''}
          ${signatureInfo}
        </div>
      </div>
    </div>
    <div class="modal-footer"><button onclick="Modal.close()" class="btn btn-primary">Kapat</button></div>
  `);
}
