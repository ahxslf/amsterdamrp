/**
 * AMSTERDAM RP - DOCUMENTS & TEMPLATES v3.2
 * Şablonlu belge oluşturma, çift e-imza, avukat yetki belgesi, dava mesajlaşma
 */

// ===================== BELGE ŞABLONLARI =====================
const DOC_TEMPLATES = {
  dilekce: {
    name: 'Dilekçe',
    icon: 'fas fa-file-alt',
    color: '#3b82f6',
    dualSign: false,
    fields: [
      { id:'dilekce-to', label:'Muhatap Kurum/Kişi', type:'select', options:['Amsterdam Adliyesi','Amsterdam Politie','Hollanda RDW (DMV)','Vergi Dairesi','Amsterdam Belediyesi','Diğer'], required:true },
      { id:'dilekce-subject', label:'Konu', type:'text', placeholder:'örn: Trafik Cezası İtirazı', required:true },
      { id:'dilekce-body', label:'Dilekçe Metni', type:'textarea', placeholder:'Sayın yetkili,\n\nYukarıda belirtilen konuyla ilgili olarak...', rows:8, required:true },
      { id:'dilekce-attachment', label:'Ek Belge (opsiyonel)', type:'text', placeholder:'Ek-1: Ehliyet fotokopisi, Ek-2: ...' }
    ]
  },
  sozlesme: {
    name: 'Sözleşme',
    icon: 'fas fa-handshake',
    color: '#059669',
    dualSign: true,
    fields: [
      { id:'sozlesme-type', label:'Sözleşme Türü', type:'select', options:['Araç Satış Sözleşmesi','Kira Sözleşmesi','İş Sözleşmesi','Hizmet Sözleşmesi','Ortaklık Sözleşmesi','Diğer'], required:true },
      { id:'sozlesme-party2-tc', label:'Karşı Taraf T.C. Kimlik No', type:'text', placeholder:'Karşı tarafın TC kimliği', maxlength:'11', required:true },
      { id:'sozlesme-subject', label:'Sözleşme Konusu', type:'text', placeholder:'örn: NL-RP-9999 plakalı araç devri', required:true },
      { id:'sozlesme-terms', label:'Sözleşme Maddeleri', type:'textarea', placeholder:'Madde 1: ...\nMadde 2: ...\nMadde 3: ...', rows:10, required:true },
      { id:'sozlesme-amount', label:'Bedel (€)', type:'number', placeholder:'50000' },
      { id:'sozlesme-duration', label:'Süre', type:'text', placeholder:'örn: 1 yıl, Süresiz' }
    ]
  },
  vekaletname: {
    name: 'Vekaletname',
    icon: 'fas fa-user-check',
    color: '#7c3aed',
    dualSign: true,
    fields: [
      { id:'vekalet-type', label:'Vekaletname Türü', type:'select', options:['Genel Vekaletname','Dava Vekaleti','Araç Satış Vekaleti','Gayrimenkul Vekaleti','Banka İşlemleri Vekaleti','Özel Vekaletname'], required:true },
      { id:'vekalet-party2-tc', label:'Vekil Edilen Kişi T.C.', type:'text', placeholder:'Vekil edilecek kişinin TC kimliği', maxlength:'11', required:true },
      { id:'vekalet-scope', label:'Yetki Kapsamı', type:'textarea', placeholder:'Bu vekaletname ile aşağıdaki yetkiler verilmektedir:\n\n1. ...\n2. ...\n3. ...', rows:6, required:true },
      { id:'vekalet-duration', label:'Geçerlilik Süresi', type:'select', options:['1 Ay','3 Ay','6 Ay','1 Yıl','Süresiz'], required:true },
      { id:'vekalet-case', label:'İlgili Dava No (opsiyonel)', type:'text', placeholder:'DAVA-2025-8841' }
    ]
  },
  avukat_yetki: {
    name: 'Avukat Yetki Belgesi',
    icon: 'fas fa-briefcase',
    color: '#ea580c',
    dualSign: false, // Sadece müvekkil imzalar
    isLawyerMandate: true,
    fields: [
      { id:'ayb-lawyer-tc', label:'Avukat T.C. Kimlik No', type:'text', placeholder:'Avukatınızın TC kimliği', maxlength:'11', required:true },
      { id:'ayb-case', label:'İlgili Dava No (opsiyonel)', type:'text', placeholder:'DAVA-2025-8841' },
      { id:'ayb-scope', label:'Yetki Kapsamı', type:'select', options:['Tam Yetki (tüm dosyalar)','Belirli Dava','Sadece Savunma','Sadece İtiraz'], required:true },
      { id:'ayb-notes', label:'Ek Notlar', type:'textarea', placeholder:'Avukata verilecek ek yetkiler veya kısıtlamalar...', rows:4 }
    ]
  },
  beyanname: {
    name: 'Beyanname',
    icon: 'fas fa-scroll',
    color: '#14b8a6',
    dualSign: false,
    fields: [
      { id:'beyan-type', label:'Beyanname Türü', type:'select', options:['Mal Beyannamesi','Gelir Beyannamesi','Tanık Beyanı','Yeminli Beyan','Diğer'], required:true },
      { id:'beyan-subject', label:'Konu', type:'text', placeholder:'örn: 2025 Yılı Mal Beyanı', required:true },
      { id:'beyan-body', label:'Beyan Metni', type:'textarea', placeholder:'Ben, aşağıda imzası bulunan kişi olarak beyan ederim ki...', rows:8, required:true }
    ]
  },
  itiraz: {
    name: 'İtiraz Dilekçesi',
    icon: 'fas fa-exclamation-circle',
    color: '#ef4444',
    dualSign: false,
    fields: [
      { id:'itiraz-to', label:'İtiraz Edilen Kurum', type:'select', options:['Amsterdam Adliyesi','Amsterdam Politie','Hollanda RDW','Vergi Dairesi','Diğer'], required:true },
      { id:'itiraz-ref', label:'İtiraz Edilen Karar/Ceza No', type:'text', placeholder:'örn: RCP-2026-01020 veya DAVA-2025-8841', required:true },
      { id:'itiraz-reason', label:'İtiraz Gerekçesi', type:'textarea', placeholder:'İtirazımın gerekçeleri şunlardır:\n\n1. ...\n2. ...', rows:8, required:true },
      { id:'itiraz-request', label:'Talep', type:'textarea', placeholder:'Yukarıda açıklanan nedenlerle ... talep ederim.', rows:3, required:true }
    ]
  }
};

// ===================== ŞABLON SEÇİM EKRANI =====================
function showTemplateSelector() {
  const user = RPAuth.getUser();
  if (!user) { Toast.error('Giriş yapmalısınız.'); return; }
  if (!DB.hasApprovedESign(user.tc)) { Toast.error('Önce e-İmza başvurusu yapmanız gerekiyor.'); return; }

  const templateCards = Object.entries(DOC_TEMPLATES).map(([key, t]) => `
    <div class="card" style="border-left:4px solid ${t.color};cursor:pointer;transition:all .2s;" onclick="showTemplateForm('${key}')" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:48px;height:48px;border-radius:50%;background:${t.color}15;color:${t.color};display:grid;place-items:center;font-size:1.2rem;flex-shrink:0;"><i class="${t.icon}"></i></div>
        <div>
          <div style="font-weight:700;font-size:1rem;">${t.name}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">
            ${t.dualSign ? '<i class="fas fa-users" style="margin-right:4px;"></i>Çift imza gerekli' : t.isLawyerMandate ? '<i class="fas fa-briefcase" style="margin-right:4px;"></i>Tek taraf imza' : '<i class="fas fa-user" style="margin-right:4px;"></i>Tek imza'}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  Modal.open(`
    <div class="modal-header" style="background:linear-gradient(135deg,#1565c0,#0d47a1);color:#fff;">
      <h3><i class="fas fa-file-circle-plus" style="margin-right:8px;"></i>Belge Şablonu Seçin</h3>
      <button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" style="padding:20px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${templateCards}</div>
    </div>
  `);
}

// ===================== ŞABLON FORM =====================
function showTemplateForm(templateKey) {
  const t = DOC_TEMPLATES[templateKey];
  if (!t) return;
  const user = RPAuth.getUser();

  const fieldsHtml = t.fields.map(f => {
    let input = '';
    if (f.type === 'select') {
      input = `<select id="${f.id}" ${f.required?'required':''}><option value="" disabled selected>Seçiniz</option>${f.options.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea id="${f.id}" rows="${f.rows||4}" placeholder="${f.placeholder||''}" ${f.required?'required':''} style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;font-size:0.9rem;resize:vertical;font-family:inherit;"></textarea>`;
    } else {
      input = `<input type="${f.type||'text'}" id="${f.id}" placeholder="${f.placeholder||''}" ${f.maxlength?`maxlength="${f.maxlength}"`:''} ${f.required?'required':''} style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;font-size:0.9rem;">`;
    }
    return `<div class="form-group" style="margin-bottom:14px;"><label style="font-size:0.85rem;font-weight:600;margin-bottom:6px;display:block;">${f.required?'<span style="color:#ef4444;">*</span> ':''}${f.label}</label>${input}</div>`;
  }).join('');

  Modal.open(`
    <div class="modal-header" style="background:${t.color};color:#fff;">
      <h3><i class="${t.icon}" style="margin-right:8px;"></i>${t.name} Oluştur</h3>
      <button onclick="showTemplateSelector()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-arrow-left"></i></button>
    </div>
    <div class="modal-body" style="padding:20px;max-height:70vh;overflow-y:auto;">
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:16px;font-size:0.88rem;">
        <div style="display:flex;justify-content:space-between;"><span><strong>Düzenleyen:</strong> ${user.firstName} ${user.lastName}</span><span><strong>Tarih:</strong> ${formatDate(todayISO())}</span></div>
        ${t.dualSign ? '<div style="margin-top:6px;color:#7c3aed;font-weight:600;font-size:0.82rem;"><i class="fas fa-info-circle"></i> Bu belge iki tarafın da e-imzasını gerektirir.</div>' : ''}
        ${t.isLawyerMandate ? '<div style="margin-top:6px;color:#ea580c;font-weight:600;font-size:0.82rem;"><i class="fas fa-info-circle"></i> Sadece sizin imzanız yeterlidir. Avukatınız dosyalarınıza erişim kazanacaktır.</div>' : ''}
      </div>
      <form id="template-form">${fieldsHtml}
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
          <button type="button" onclick="Modal.close()" class="btn btn-outline">İptal</button>
          <button type="submit" class="btn btn-primary" style="background:${t.color};border-color:${t.color};"><i class="fas fa-plus-circle"></i> Oluştur ve İmzala</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('template-form').addEventListener('submit', (e) => {
    e.preventDefault();
    createDocumentFromTemplate(templateKey);
  });
}

// ===================== BELGE OLUŞTUR =====================
function createDocumentFromTemplate(templateKey) {
  const t = DOC_TEMPLATES[templateKey];
  const user = RPAuth.getUser();
  if (!user || !t) return;

  // Collect field values
  const data = {};
  let title = '';
  t.fields.forEach(f => {
    const el = document.getElementById(f.id);
    data[f.id] = el ? el.value : '';
  });

  // Build title based on template
  if (templateKey === 'dilekce') {
    title = `Dilekçe: ${data['dilekce-subject']}`;
  } else if (templateKey === 'sozlesme') {
    title = `${data['sozlesme-type']}: ${data['sozlesme-subject']}`;
  } else if (templateKey === 'vekaletname') {
    title = `${data['vekalet-type']}`;
  } else if (templateKey === 'avukat_yetki') {
    title = `Avukat Yetki Belgesi`;
  } else if (templateKey === 'beyanname') {
    title = `${data['beyan-type']}: ${data['beyan-subject']}`;
  } else if (templateKey === 'itiraz') {
    title = `İtiraz: ${data['itiraz-ref']}`;
  }

  // Handle second party for dual-sign docs
  let secondPartyTc = null;
  let secondPartyName = null;
  if (t.dualSign) {
    const tcField = templateKey === 'sozlesme' ? 'sozlesme-party2-tc' : 'vekalet-party2-tc';
    secondPartyTc = data[tcField];
    const party2User = DB.getUserByTC(secondPartyTc);
    if (!party2User) { Toast.error('Karşı taraf TC bulunamadı. Lütfen geçerli bir TC girin.'); return; }
    if (secondPartyTc === user.tc) { Toast.error('Kendi kendinize belge oluşturamazsınız.'); return; }
    secondPartyName = `${party2User.firstName} ${party2User.lastName}`;
  }

  // Handle lawyer mandate
  if (t.isLawyerMandate) {
    const lawyerTc = data['ayb-lawyer-tc'];
    const lawyerUser = DB.getUserByTC(lawyerTc);
    if (!lawyerUser) { Toast.error('Avukat TC bulunamadı.'); return; }
    if (!(lawyerUser.job || '').includes('Avukat')) { Toast.error('Girilen TC bir avukata ait değil.'); return; }
    secondPartyTc = lawyerTc;
    secondPartyName = `${lawyerUser.firstName} ${lawyerUser.lastName}`;
  }

  // Create document
  const doc = DB.addESignature({
    tc: user.tc,
    title: title,
    type: t.name,
    templateKey: templateKey,
    templateData: data,
    status: 'Bekliyor',
    date: todayISO(),
    signedAt: null,
    // Dual sign fields
    secondPartyTc: secondPartyTc,
    secondPartyName: secondPartyName,
    secondPartySignedAt: null,
    dualSign: t.dualSign || false,
    isLawyerMandate: t.isLawyerMandate || false
  });

  Modal.close();

  // Notify second party if dual sign
  if (secondPartyTc) {
    const notifTitle = t.isLawyerMandate
      ? `Avukat Yetki Belgesi — ${user.firstName} ${user.lastName}`
      : `e-İmza Bekliyor: ${title}`;
    const notifBody = t.isLawyerMandate
      ? `${user.firstName} ${user.lastName} size avukat yetki belgesi gönderdi. Belge imzanızı gerektirmez ancak dosya erişim yetkinizi tanımlar.`
      : `${user.firstName} ${user.lastName} tarafından oluşturulan "${title}" belgesi sizin de e-imzanızı gerektirmektedir.`;

    DB.addNotification({
      tc: secondPartyTc,
      title: notifTitle,
      body: notifBody,
      type: 'info',
      icon: t.isLawyerMandate ? 'fas fa-briefcase' : 'fas fa-file-signature'
    });
  }

  Toast.success(`"${title}" belgesi oluşturuldu.`);

  // Start e-sign flow for the creator
  startESignFlow(doc.id);
}

// ===================== BELGE İMZALANDIĞINDA AVUKAT YETKİ KAYDI =====================
// Override signDocument to handle lawyer mandate creation
const _originalSignDoc = DB.signDocument.bind(DB);
DB.signDocument = function(id) {
  const doc = _originalSignDoc(id);
  if (doc && doc.isLawyerMandate && doc.status === 'İmzalandı') {
    // Create lawyer mandate record
    const lawyerTc = doc.secondPartyTc;
    const lawyerUser = this.getUserByTC(lawyerTc);
    const clientUser = this.getUserByTC(doc.tc);
    if (lawyerUser && clientUser) {
      this.addLawyerMandate({
        clientTc: doc.tc,
        clientName: `${clientUser.firstName} ${clientUser.lastName}`,
        lawyerTc: lawyerTc,
        lawyerName: `${lawyerUser.firstName} ${lawyerUser.lastName}`,
        caseNo: doc.templateData?.['ayb-case'] || 'Genel',
        scope: doc.templateData?.['ayb-scope'] || 'Tam Yetki',
        signedAt: doc.signedAt,
        documentId: doc.id
      });
      // Notify lawyer
      this.addNotification({
        tc: lawyerTc,
        title: 'Yeni Müvekkil Yetki Belgesi',
        body: `${clientUser.firstName} ${clientUser.lastName} size avukat yetki belgesi verdi. Artık dosyalarına erişebilirsiniz.`,
        type: 'success',
        icon: 'fas fa-briefcase'
      });
    }
  }
  // For dual-sign docs: notify first signer that they signed
  if (doc && doc.dualSign && !doc.isLawyerMandate && doc.signedAt && doc.secondPartyTc && !doc.secondPartySignedAt) {
    DB.addNotification({
      tc: doc.secondPartyTc,
      title: `İmzanız Bekleniyor: ${doc.title}`,
      body: `${DB.getUserByTC(doc.tc)?.firstName || ''} tarafından oluşturulan belge sizin e-imzanızı bekliyor. e-İmza sayfasından imzalayabilirsiniz.`,
      type: 'warning',
      icon: 'fas fa-signature'
    });
  }
  return doc;
};

// ===================== İMZA BEKLEYENLERİM (İkinci taraf) =====================
function renderPendingSignatures(containerEl) {
  const user = RPAuth.getUser();
  if (!user || !containerEl) return;

  const pendingForMe = DB.data.eSignatures.filter(d =>
    d.secondPartyTc === user.tc && d.secondPartySignedAt === null &&
    d.signedAt !== null && d.status !== 'İptal' && !d.isLawyerMandate
  );

  if (pendingForMe.length === 0) {
    containerEl.innerHTML = '';
    return;
  }

  containerEl.innerHTML = `
    <div class="card" style="border-left:4px solid #f59e0b;margin-bottom:16px;">
      <h3 style="font-size:1.05rem;margin-bottom:12px;"><i class="fas fa-signature" style="color:#f59e0b;margin-right:8px;"></i>İmzanızı Bekleyen Belgeler <span class="status-badge status-acik">${pendingForMe.length}</span></h3>
      ${pendingForMe.map(d => {
        const creator = DB.getUserByTC(d.tc);
        return `<div class="card" style="padding:14px;margin-bottom:8px;border:2px solid #fef3c7;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="font-weight:700;">${d.title}</div>
              <div style="font-size:0.82rem;color:var(--text-muted);">${d.id} • ${d.type} • Oluşturan: ${creator?creator.firstName+' '+creator.lastName:d.tc} • ${formatDate(d.date)}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="startESignFlow('${d.id}')"><i class="fas fa-signature"></i> e-İmza ile İmzala</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ===================== AVUKAT MÜVEKKİL PANELİ =====================
function renderLawyerClientsPanel(containerEl) {
  const user = RPAuth.getUser();
  if (!user || !containerEl || !RPAuth.isLawyer()) return;

  const mandates = DB.getClientsByLawyer(user.tc);
  if (mandates.length === 0) {
    containerEl.innerHTML = `<div class="card" style="border-left:4px solid #ea580c;"><h3 style="font-size:1.05rem;margin-bottom:8px;"><i class="fas fa-briefcase" style="color:#ea580c;margin-right:8px;"></i>Müvekkillerim</h3><p style="color:var(--text-muted);font-size:0.88rem;">Henüz aktif müvekkil yetki belgeniz bulunmuyor.</p></div>`;
    return;
  }

  containerEl.innerHTML = `
    <div class="card" style="border-left:4px solid #ea580c;">
      <h3 style="font-size:1.05rem;margin-bottom:12px;"><i class="fas fa-briefcase" style="color:#ea580c;margin-right:8px;"></i>Müvekkillerim <span class="status-badge status-odendi">${mandates.length}</span></h3>
      ${mandates.map(m => `
        <div class="card" style="padding:14px;margin-bottom:8px;border-left:3px solid #ea580c;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="font-weight:700;">${m.clientName}</div>
              <div style="font-size:0.82rem;color:var(--text-muted);">T.C.: ${m.clientTc} • Yetki: ${m.scope} • Dava: ${m.caseNo || 'Genel'}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);">Yetki Tarihi: ${formatDate(m.createdAt)}</div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" onclick="viewClientFiles('${m.clientTc}')"><i class="fas fa-folder-open"></i> Dosyalar</button>
              <button class="btn btn-outline btn-sm" onclick="openCaseMessaging('${m.clientTc}')"><i class="fas fa-envelope"></i> Mesaj</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ===================== MÜVEKKİL DOSYALARI GÖRÜNTÜLEME =====================
function viewClientFiles(clientTc) {
  const user = RPAuth.getUser();
  if (!DB.hasActiveMandateFor(user.tc, clientTc)) {
    Toast.error('Bu müvekkil için yetkiniz bulunmuyor.');
    return;
  }
  const client = DB.getUserByTC(clientTc);
  if (!client) return;

  const fines = DB.getActiveFines({tc: clientTc});
  const records = DB.getCriminalRecords({tc: clientTc});
  const cases = DB.getCourtCases({defendantTc: clientTc});
  const vehicles = DB.getVehicles({ownerTc: clientTc});

  Modal.open(`
    <div class="modal-header" style="background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;">
      <h3><i class="fas fa-folder-open" style="margin-right:8px;"></i>Müvekkil Dosyası: ${client.firstName} ${client.lastName}</h3>
      <button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:0.88rem;">
        <div style="padding:10px;background:#f8fafc;border-radius:6px;"><strong>T.C.:</strong> ${client.tc}</div>
        <div style="padding:10px;background:#f8fafc;border-radius:6px;"><strong>Meslek:</strong> ${client.job||'—'}</div>
      </div>

      <h4 style="font-size:0.92rem;margin-bottom:8px;">⚖️ Davalar (${cases.length})</h4>
      ${cases.length?cases.map(c=>`<div style="padding:8px;margin-bottom:6px;border-left:3px solid #7c3aed;background:#f8fafc;border-radius:4px;font-size:0.85rem;"><strong>${c.caseNo}</strong> — ${c.title} <span class="status-badge status-acik" style="font-size:0.7rem;">${c.status}</span></div>`).join(''):'<p style="color:var(--text-muted);font-size:0.85rem;">Dava yok.</p>'}

      <h4 style="font-size:0.92rem;margin:14px 0 8px;">📋 Adli Sicil (${records.length})</h4>
      ${records.length?records.map(r=>`<div style="padding:8px;margin-bottom:6px;border-left:3px solid #ef4444;background:#f8fafc;border-radius:4px;font-size:0.85rem;"><strong>${r.caseNo}</strong> — ${r.crime} <span class="status-badge ${r.status==='Kapalı'?'status-odendi':'status-odenmedi'}" style="font-size:0.7rem;">${r.status}</span></div>`).join(''):'<p style="color:var(--text-muted);font-size:0.85rem;">Sicil temiz.</p>'}

      <h4 style="font-size:0.92rem;margin:14px 0 8px;">🚗 Araçlar (${vehicles.length})</h4>
      ${vehicles.length?vehicles.map(v=>`<div style="padding:8px;margin-bottom:6px;border-left:3px solid #059669;background:#f8fafc;border-radius:4px;font-size:0.85rem;"><strong>${v.plate}</strong> — ${v.brand} ${v.model} ${v.wanted?'<span class="status-badge status-odenmedi" style="font-size:0.7rem;">ARANIYOR</span>':''}</div>`).join(''):'<p style="color:var(--text-muted);font-size:0.85rem;">Araç yok.</p>'}

      <h4 style="font-size:0.92rem;margin:14px 0 8px;">💰 Cezalar (${fines.length})</h4>
      ${fines.length?fines.map(f=>`<div style="padding:8px;margin-bottom:6px;border-left:3px solid #f59e0b;background:#f8fafc;border-radius:4px;font-size:0.85rem;"><strong>${f.plate}</strong> — ${f.reason} — ${formatTL(f.amount)} <span class="status-badge ${f.status==='Ödenmedi'?'status-odenmedi':'status-odendi'}" style="font-size:0.7rem;">${f.status}</span></div>`).join(''):'<p style="color:var(--text-muted);font-size:0.85rem;">Ceza yok.</p>'}
    </div>
    <div class="modal-footer">
      <button onclick="openCaseMessaging('${clientTc}')" class="btn btn-outline"><i class="fas fa-envelope"></i> Dava Mesajı Gönder</button>
      <button onclick="Modal.close()" class="btn btn-primary">Kapat</button>
    </div>
  `);
}

// ===================== DAVA MESAJLAŞMA =====================
function openCaseMessaging(relatedTc) {
  const user = RPAuth.getUser();
  if (!user) return;

  // Find relevant cases
  let cases = [];
  if (RPAuth.isLawyer()) {
    cases = DB.getCourtCases().filter(c =>
      c.defenseAttorney && c.defenseAttorney.includes(user.lastName) ||
      DB.hasActiveMandateFor(user.tc, c.defendantTc)
    );
  } else if (RPAuth.isJudge() || RPAuth.isProsecutor()) {
    cases = DB.getCourtCases();
  }

  // Get available recipients based on role
  const recipients = [];
  if (RPAuth.isLawyer()) {
    // Lawyers can message judges and prosecutors
    DB.getUsers().filter(u => (u.job||'').includes('Yargıç') || (u.job||'').includes('Savcı')).forEach(u => {
      recipients.push({tc:u.tc, name:`${u.firstName} ${u.lastName}`, role:u.job});
    });
  } else {
    // Judges/Prosecutors can message lawyers
    DB.getUsers().filter(u => (u.job||'').includes('Avukat')).forEach(u => {
      recipients.push({tc:u.tc, name:`${u.firstName} ${u.lastName}`, role:u.job});
    });
  }

  // Get existing messages
  const myMessages = DB.getMyMessages(user.tc).slice(0, 20);

  Modal.open(`
    <div class="modal-header" style="background:linear-gradient(135deg,#1565c0,#0d47a1);color:#fff;">
      <h3><i class="fas fa-envelope" style="margin-right:8px;"></i>Dava Mesajları</h3>
      <button onclick="Modal.close()" class="btn btn-sm" style="border:1px solid rgba(255,255,255,0.3);color:#fff;"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" style="padding:0;max-height:70vh;overflow-y:auto;">
      <!-- New Message Form -->
      <div style="padding:16px;border-bottom:1px solid var(--border);background:rgba(0,0,0,0.02);">
        <h4 style="font-size:0.92rem;margin-bottom:10px;">✉️ Yeni Mesaj</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div class="form-group" style="margin:0;">
            <label style="font-size:0.8rem;">Dava</label>
            <select id="msg-case" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;">
              <option value="">Dava seçin</option>
              ${cases.map(c=>`<option value="${c.id}" data-caseno="${c.caseNo}">${c.caseNo} — ${c.title}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:0.8rem;">Alıcı</label>
            <select id="msg-recipient" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;">
              <option value="">Alıcı seçin</option>
              ${recipients.map(r=>`<option value="${r.tc}">${r.name} (${r.role})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group" style="margin:0 0 10px;">
          <label style="font-size:0.8rem;">Konu</label>
          <input type="text" id="msg-subject" placeholder="Mesaj konusu" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;">
        </div>
        <div class="form-group" style="margin:0 0 10px;">
          <label style="font-size:0.8rem;">Mesaj</label>
          <textarea id="msg-body" rows="3" placeholder="Mesajınızı yazın..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;resize:vertical;"></textarea>
        </div>
        <button onclick="sendCaseMessage()" class="btn btn-primary btn-sm"><i class="fas fa-paper-plane"></i> Gönder</button>
      </div>

      <!-- Message History -->
      <div style="padding:16px;">
        <h4 style="font-size:0.92rem;margin-bottom:10px;">📨 Mesaj Geçmişi</h4>
        ${myMessages.length===0?'<p style="color:var(--text-muted);font-size:0.85rem;">Henüz mesaj yok.</p>':
        myMessages.map(m => {
          const isMine = m.senderTc === user.tc;
          return `<div style="padding:12px;margin-bottom:8px;border-radius:8px;${isMine?'background:#e3f2fd;border-left:3px solid var(--primary-blue);':'background:#f8fafc;border-left:3px solid #7c3aed;'}">
            <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);margin-bottom:4px;">
              <span><strong>${isMine?'Siz':'📨 '+m.senderName}</strong> → ${isMine?m.recipientName:'Siz'}</span>
              <span>${new Date(m.date).toLocaleString('tr-TR')}</span>
            </div>
            <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:2px;">📁 ${m.caseNo} • <strong>${m.subject}</strong></div>
            <div style="font-size:0.88rem;line-height:1.5;">${m.body}</div>
            ${!isMine&&!m.read?'<span class="status-badge status-acik" style="font-size:0.65rem;margin-top:4px;">YENİ</span>':''}
          </div>`;
        }).join('')}
      </div>
    </div>
  `);

  // Mark unread messages as read
  myMessages.filter(m=>m.recipientTc===user.tc&&!m.read).forEach(m=>DB.markMessageRead(m.id));
}

function sendCaseMessage() {
  const user = RPAuth.getUser();
  const caseSelect = document.getElementById('msg-case');
  const recipientTc = document.getElementById('msg-recipient')?.value;
  const subject = document.getElementById('msg-subject')?.value?.trim();
  const body = document.getElementById('msg-body')?.value?.trim();

  if (!caseSelect?.value || !recipientTc || !subject || !body) {
    Toast.warning('Tüm alanları doldurunuz.');
    return;
  }

  const caseId = parseInt(caseSelect.value);
  const caseNo = caseSelect.selectedOptions[0]?.dataset?.caseno || '';
  const recipient = DB.getUserByTC(recipientTc);
  const senderRole = RPAuth.isJudge()?'Yargıç':RPAuth.isProsecutor()?'Savcı':RPAuth.isLawyer()?'Avukat':'Vatandaş';
  const recipientRole = (recipient?.job||'').includes('Yargıç')?'Yargıç':(recipient?.job||'').includes('Savcı')?'Savcı':(recipient?.job||'').includes('Avukat')?'Avukat':'Vatandaş';

  DB.addCaseMessage({
    caseId,
    caseNo,
    senderTc: user.tc,
    senderName: `${senderRole === 'Avukat' ? 'Av. ' : ''}${user.firstName} ${user.lastName}`,
    senderRole,
    recipientTc,
    recipientName: `${recipientRole} ${recipient.firstName} ${recipient.lastName}`,
    recipientRole,
    subject,
    body
  });

  Toast.success('Mesaj gönderildi.');
  openCaseMessaging(); // Refresh
}
