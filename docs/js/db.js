/**
 * AMSTERDAM RP - SUPABASE DATA LAYER v4.3
 * Discord OAuth + Supabase uyum katmanı
 */

(function () {
  function client() {
    if (!window.supabaseClient) {
      if (typeof window.initSupabase === 'function') window.initSupabase();
    }
    if (!window.supabaseClient) throw new Error('Supabase başlatılmadı!');
    return window.supabaseClient;
  }

  function randomTC() {
    return String(Math.floor(Math.random() * 89999999999) + 10000000000);
  }

  function pick(obj, keys) {
    const out = {};
    keys.forEach(k => {
      if (obj && obj[k] !== undefined) out[k] = obj[k];
    });
    return out;
  }

  function userToDb(u = {}) {
    const out = {
      ...pick(u, ['tc', 'discord_id', 'discord_username', 'discord_avatar', 'city', 'phone', 'address', 'status', 'job', 'approved_by', 'approved_at']),
      first_name: u.first_name ?? u.firstName,
      last_name: u.last_name ?? u.lastName,
      birth_date: u.birth_date ?? u.birthDate,
      blood_type: u.blood_type ?? u.bloodType,
      mother_name: u.mother_name ?? u.motherName,
      father_name: u.father_name ?? u.fatherName
    };
    if (u.is_admin !== undefined || u.isAdmin !== undefined) out.is_admin = u.is_admin ?? u.isAdmin;
    return out;
  }

  function normalizeUser(u) {
    if (!u) return u;
    return {
      ...u,
      firstName: u.firstName ?? u.first_name ?? u.discord_username ?? 'Kullanıcı',
      lastName: u.lastName ?? u.last_name ?? '',
      birthDate: u.birthDate ?? u.birth_date ?? null,
      bloodType: u.bloodType ?? u.blood_type ?? null,
      motherName: u.motherName ?? u.mother_name ?? null,
      fatherName: u.fatherName ?? u.father_name ?? null,
      isAdmin: u.isAdmin === true || u.is_admin === true,
      is_admin: u.is_admin === true || u.isAdmin === true
    };
  }

  function normalizeFine(f) {
    if (!f) return f;
    return {
      ...f,
      date: f.date ?? f.fine_date ?? f.created_at,
      dueDate: f.dueDate ?? f.due_date,
      approvedBy: f.approvedBy ?? f.approved_by,
      approvedAt: f.approvedAt ?? f.approved_at,
      tebligatFile: f.tebligatFile ?? f.tebligat_file,
      rejectReason: f.rejectReason ?? f.reject_reason,
      paidAt: f.paidAt ?? f.paid_at,
      receiptNo: f.receiptNo ?? f.receipt_no,
      owner: f.owner ?? f.owner_name ?? f.tc ?? '—'
    };
  }

  function fineToDb(f = {}) {
    return {
      ...pick(f, ['tc', 'plate', 'amount', 'reason', 'location', 'officer', 'status']),
      fine_date: f.fine_date ?? f.date ?? new Date().toISOString().split('T')[0],
      due_date: f.due_date ?? f.dueDate ?? null,
      approved_by: f.approved_by ?? f.approvedBy,
      approved_at: f.approved_at ?? f.approvedAt,
      tebligat_file: f.tebligat_file ?? f.tebligatFile,
      reject_reason: f.reject_reason ?? f.rejectReason
    };
  }

  function normalizeESign(a) {
    if (!a) return a;
    return {
      ...a,
      appliedAt: a.appliedAt ?? a.applied_at ?? a.created_at,
      certificateSerial: a.certificateSerial ?? a.certificate_serial,
      reviewedAt: a.reviewedAt ?? a.reviewed_at,
      reviewedBy: a.reviewedBy ?? a.reviewed_by,
      rejectReason: a.rejectReason ?? a.reject_reason
    };
  }

  function esignToDb(a = {}) {
    return {
      ...pick(a, ['tc', 'name', 'status']),
      applied_at: a.applied_at ?? a.appliedAt ?? new Date().toISOString().split('T')[0],
      reviewed_at: a.reviewed_at ?? a.reviewedAt,
      reviewed_by: a.reviewed_by ?? a.reviewedBy,
      certificate_serial: a.certificate_serial ?? a.certificateSerial,
      reject_reason: a.reject_reason ?? a.rejectReason
    };
  }

  function normalizeVehicle(v) {
    if (!v) return v;
    return { ...v, ownerTc: v.ownerTc ?? v.owner_tc, ownerName: v.ownerName ?? v.owner_name, taxStatus: v.taxStatus ?? v.tax_status, wantedReason: v.wantedReason ?? v.wanted_reason };
  }

  function normalizeRecord(r) {
    if (!r) return r;
    return { ...r, caseNo: r.caseNo ?? r.case_no, date: r.date ?? r.record_date ?? r.created_at };
  }

  function normalizeCourtCase(c) {
    if (!c) return c;
    return {
      ...c,
      caseNo: c.caseNo ?? c.case_no,
      defendantTc: c.defendantTc ?? c.defendant_tc,
      defendantName: c.defendantName ?? c.defendant_name,
      judgeTc: c.judgeTc ?? c.judge_tc,
      prosecutorTc: c.prosecutorTc ?? c.prosecutor_tc,
      defenseAttorneyTc: c.defenseAttorneyTc ?? c.defense_attorney_tc,
      createdAt: c.createdAt ?? c.created_at,
      nextHearing: c.nextHearing ?? c.next_hearing
    };
  }

  function normalizeNotification(n) {
    if (!n) return n;
    return { ...n, date: n.date ?? n.created_at, type: n.type ?? n.notif_type, read: n.read ?? n.is_read };
  }

  async function selectList(table, queryBuilder) {
    let q = client().from(table).select('*');
    if (queryBuilder) q = queryBuilder(q);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  window.DB = {
    // ===== USERS =====
    async getUserByDiscord(discordId) {
      const { data, error } = await client().from('users').select('*').eq('discord_id', String(discordId)).maybeSingle();
      if (error) throw error;
      return normalizeUser(data);
    },

    async getUserByTC(tc) {
      const { data, error } = await client().from('users').select('*').eq('tc', String(tc)).maybeSingle();
      if (error) throw error;
      return normalizeUser(data);
    },

    async getUsers() {
      const rows = await selectList('users', q => q.order('created_at', { ascending: false }));
      return rows.map(normalizeUser);
    },

    async getPendingUsers() {
      const rows = await selectList('users', q => q.eq('status', 'Onay Bekliyor').order('created_at', { ascending: true }));
      return rows.map(normalizeUser);
    },

    async createUser(user) {
      const payload = userToDb(user);
      if (payload.is_admin === undefined) payload.is_admin = false;
      if (!payload.discord_id) throw new Error('Discord ID bulunamadı. Lütfen tekrar giriş yapın.');
      if (!payload.first_name || !payload.last_name || !payload.birth_date || !payload.blood_type) {
        throw new Error('Zorunlu karakter bilgileri eksik.');
      }

      const existing = await this.getUserByDiscord(payload.discord_id);
      if (existing) return existing;

      if (!payload.tc) {
        try {
          const { data, error } = await client().rpc('generate_tc');
          if (!error && data) payload.tc = data;
        } catch (_) {}
        if (!payload.tc) payload.tc = randomTC();
      }

      const { data, error } = await client().from('users').insert(payload).select('*').single();
      if (error) throw new Error(error.message || 'Karakter kaydı oluşturulamadı.');
      return normalizeUser(data);
    },

    async updateUser(discordId, updates) {
      const payload = userToDb({ ...updates, updated_at: new Date().toISOString() });
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      const { data, error } = await client().from('users').update(payload).eq('discord_id', String(discordId)).select('*').maybeSingle();
      if (error) throw error;
      return normalizeUser(data);
    },

    async approveUser(discordId, adminName) {
      const { data, error } = await client().from('users')
        .update({ status: 'Aktif', approved_by: adminName, approved_at: new Date().toISOString() })
        .eq('discord_id', String(discordId)).select('*').single();
      if (error) throw error;
      if (data?.tc) await this.addNotification({ tc: data.tc, title: 'Karakteriniz Onaylandı', body: 'Karakter başvurunuz onaylandı. Artık e-Devlet hizmetlerini kullanabilirsiniz.', notif_type: 'success', icon: 'fas fa-check-circle' });
      return normalizeUser(data);
    },

    async rejectUser(discordId, adminName, reason) {
      const { data, error } = await client().from('users')
        .update({ status: 'Reddedildi', approved_by: adminName, approved_at: new Date().toISOString() })
        .eq('discord_id', String(discordId)).select('*').single();
      if (error) throw error;
      if (data?.tc) await this.addNotification({ tc: data.tc, title: 'Karakter Başvurunuz Reddedildi', body: 'Sebep: ' + (reason || 'Belirtilmedi'), notif_type: 'error', icon: 'fas fa-times-circle' });
      return normalizeUser(data);
    },

    // ===== VEHICLES =====
    async getVehicles(q = {}) {
      const rows = await selectList('vehicles', query => {
        if (q.plate) query = query.ilike('plate', '%' + q.plate + '%');
        if (q.ownerTc) query = query.eq('owner_tc', q.ownerTc);
        if (q.wanted !== undefined) query = query.eq('wanted', q.wanted);
        return query.order('created_at', { ascending: false });
      });
      return rows.map(normalizeVehicle);
    },
    async updateVehicleWanted(plate, wanted, reason) {
      const { data, error } = await client().from('vehicles').update({ wanted, wanted_reason: reason }).eq('plate', plate).select('*').single();
      if (error) throw error;
      return normalizeVehicle(data);
    },

    // ===== FINES =====
    async getFines(q = {}) {
      const rows = await selectList('fines', query => {
        if (q.plate) query = query.ilike('plate', '%' + q.plate + '%');
        if (q.tc) query = query.eq('tc', q.tc);
        if (q.status) query = query.eq('status', q.status);
        return query.order('created_at', { ascending: false });
      });
      return rows.map(normalizeFine);
    },
    async getFineById(id) {
      const { data, error } = await client().from('fines').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return normalizeFine(data);
    },
    async getActiveFines(q = {}) {
      const rows = await selectList('fines', query => {
        query = query.in('status', ['Ödenmedi', 'Ödendi']);
        if (q.tc) query = query.eq('tc', q.tc);
        if (q.plate) query = query.ilike('plate', '%' + q.plate + '%');
        if (q.status) query = query.eq('status', q.status);
        return query.order('fine_date', { ascending: false });
      });
      return rows.map(normalizeFine);
    },
    async getPendingFines() {
      const rows = await selectList('fines', q => q.eq('status', 'Onay Bekliyor').order('created_at', { ascending: true }));
      return rows.map(normalizeFine);
    },
    async addFine(fine) {
      const { data, error } = await client().from('fines').insert(fineToDb(fine)).select('*').single();
      if (error) throw error;
      return normalizeFine(data);
    },
    async approveFine(id, adminName, tebligatFile) {
      const { data, error } = await client().from('fines').update({ status: 'Ödenmedi', approved_by: adminName, approved_at: new Date().toISOString(), tebligat_file: tebligatFile }).eq('id', id).select('*').single();
      if (error) throw error;
      if (data?.tc) await this.addNotification({ tc: data.tc, title: 'Yeni Trafik Cezası Tebligatı', body: `${data.plate} plakalı aracınıza ${data.amount}€ trafik cezası tebliğ edilmiştir.`, notif_type: 'warning', icon: 'fas fa-file-alt' });
      return normalizeFine(data);
    },
    async rejectFine(id, adminName, reason) {
      const { data, error } = await client().from('fines').update({ status: 'Reddedildi', approved_by: adminName, reject_reason: reason }).eq('id', id).select('*').single();
      if (error) throw error;
      return normalizeFine(data);
    },
    async payFine(id) {
      const receiptNo = 'RCP-' + new Date().toISOString().split('T')[0].replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0');
      const { data, error } = await client().from('fines').update({ status: 'Ödendi', paid_at: new Date().toISOString(), receipt_no: receiptNo }).eq('id', id).select('*').single();
      if (error) throw error;
      return normalizeFine(data);
    },

    // ===== CRIMINAL RECORDS =====
    async getCriminalRecords(q = {}) {
      const rows = await selectList('criminal_records', query => {
        if (q.tc) query = query.eq('tc', q.tc);
        if (q.status) query = query.eq('status', q.status);
        return query.order('record_date', { ascending: false });
      });
      return rows.map(normalizeRecord);
    },
    async addCriminalRecord(rec) { const { data, error } = await client().from('criminal_records').insert(rec).select('*').single(); if (error) throw error; return normalizeRecord(data); },

    // ===== COURT CASES =====
    async getCourtCases(q = {}) {
      const rows = await selectList('court_cases', query => {
        if (q.status) query = query.eq('status', q.status);
        if (q.defendantTc) query = query.eq('defendant_tc', q.defendantTc);
        if (q.judgeTc) query = query.eq('judge_tc', q.judgeTc);
        if (q.prosecutorTc) query = query.eq('prosecutor_tc', q.prosecutorTc);
        return query.order('created_at', { ascending: false });
      });
      return rows.map(normalizeCourtCase);
    },
    async getCourtCaseById(id) { const { data, error } = await client().from('court_cases').select('*').eq('id', id).maybeSingle(); if (error) throw error; return normalizeCourtCase(data); },
    async addCourtCase(c) { const { data, error } = await client().from('court_cases').insert(c).select('*').single(); if (error) throw error; return normalizeCourtCase(data); },
    async updateCaseStatus(id, status) { const { data, error } = await client().from('court_cases').update({ status }).eq('id', id).select('*').single(); if (error) throw error; return normalizeCourtCase(data); },
    async setVerdict(id, verdict) { const { data, error } = await client().from('court_cases').update({ verdict, status: 'Karar Verildi' }).eq('id', id).select('*').single(); if (error) throw error; return normalizeCourtCase(data); },
    async changeJudge(id, judgeTc) { const { data, error } = await client().from('court_cases').update({ judge_tc: judgeTc }).eq('id', id).select('*').single(); if (error) throw error; return normalizeCourtCase(data); },
    async changeProsecutor(id, prosecutorTc) { const { data, error } = await client().from('court_cases').update({ prosecutor_tc: prosecutorTc }).eq('id', id).select('*').single(); if (error) throw error; return normalizeCourtCase(data); },
    async setDefenseAttorney(id, tc) { const { data, error } = await client().from('court_cases').update({ defense_attorney_tc: tc }).eq('id', id).select('*').single(); if (error) throw error; return normalizeCourtCase(data); },
    async removeDefenseAttorney(id) { const { data, error } = await client().from('court_cases').update({ defense_attorney_tc: null }).eq('id', id).select('*').single(); if (error) throw error; return normalizeCourtCase(data); },
    async addParty(caseId, party) { const { data, error } = await client().from('court_parties').insert({ ...party, case_id: caseId }).select('*').single(); if (error) throw error; return data; },
    async removeParty(id) { const { error } = await client().from('court_parties').delete().eq('id', id); if (error) throw error; },
    async addWitness(caseId, witness) { const { data, error } = await client().from('court_witnesses').insert({ ...witness, case_id: caseId }).select('*').single(); if (error) throw error; return data; },
    async removeWitness(id) { const { error } = await client().from('court_witnesses').delete().eq('id', id); if (error) throw error; },
    async addHearing(caseId, hearing) { const { data, error } = await client().from('court_hearings').insert({ ...hearing, case_id: caseId }).select('*').single(); if (error) throw error; return data; },

    // ===== E-SIGN =====
    async getESignApplications(q = {}) {
      const rows = await selectList('esign_applications', query => {
        if (q.tc) query = query.eq('tc', q.tc);
        if (q.status) query = query.eq('status', q.status);
        return query.order('created_at', { ascending: false });
      });
      return rows.map(normalizeESign);
    },
    async addESignApplication(app) { const { data, error } = await client().from('esign_applications').insert(esignToDb(app)).select('*').single(); if (error) throw error; return normalizeESign(data); },
    async approveESignApplication(id, adminName) {
      const serial = 'DSC-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0');
      const { data, error } = await client().from('esign_applications').update({ status: 'Onaylandı', certificate_serial: serial, reviewed_at: new Date().toISOString(), reviewed_by: adminName }).eq('id', id).select('*').single();
      if (error) throw error;
      if (data?.tc) await this.addNotification({ tc: data.tc, title: 'e-İmza Onaylandı', body: 'Sertifika: ' + serial, notif_type: 'success', icon: 'fas fa-certificate' });
      return normalizeESign(data);
    },
    async rejectESignApplication(id, adminName, reason) {
      const { data, error } = await client().from('esign_applications').update({ status: 'Reddedildi', reviewed_at: new Date().toISOString(), reviewed_by: adminName, reject_reason: reason }).eq('id', id).select('*').single();
      if (error) throw error;
      return normalizeESign(data);
    },
    async hasApprovedESign(tc) { const { data, error } = await client().from('esign_applications').select('id').eq('tc', tc).eq('status', 'Onaylandı').limit(1); if (error) throw error; return !!(data && data.length); },
    async getESignCertificate(tc) { const { data, error } = await client().from('esign_applications').select('*').eq('tc', tc).eq('status', 'Onaylandı').maybeSingle(); if (error) throw error; return normalizeESign(data); },
    async getESignatures(tc) { const rows = await selectList('esign_documents', q => q.eq('tc', tc).order('created_at', { ascending: false })); return rows; },
    async addESignature(doc) { const { data, error } = await client().from('esign_documents').insert(doc).select('*').single(); if (error) throw error; return data; },
    async signDocument(id) { const { data, error } = await client().from('esign_documents').update({ status: 'İmzalandı', signed_at: new Date().toISOString() }).eq('id', id).select('*').single(); if (error) throw error; return data; },
    async signAsSecondParty(id) { const { data, error } = await client().from('esign_documents').update({ second_party_signed_at: new Date().toISOString() }).eq('id', id).select('*').single(); if (error) throw error; return data; },

    // ===== LAWYER MANDATES =====
    async getClientsByLawyer(lawyerTc) { const rows = await selectList('lawyer_mandates', q => q.eq('lawyer_tc', lawyerTc).eq('status', 'Aktif')); return rows; },
    async hasActiveMandateFor(lawyerTc, clientTc) { const { data, error } = await client().from('lawyer_mandates').select('id').eq('lawyer_tc', lawyerTc).eq('client_tc', clientTc).eq('status', 'Aktif').limit(1); if (error) throw error; return !!(data && data.length); },

    // ===== NOTIFICATIONS =====
    async getNotifications(tc) { const rows = await selectList('notifications', q => q.eq('tc', tc).order('created_at', { ascending: false }).limit(50)); return rows.map(normalizeNotification); },
    async getUnreadCount(tc) { const { count, error } = await client().from('notifications').select('*', { count: 'exact', head: true }).eq('tc', tc).eq('is_read', false); if (error) throw error; return count || 0; },
    async addNotification(n) { const { data, error } = await client().from('notifications').insert(n).select('*').maybeSingle(); if (error) console.warn('Bildirim eklenemedi:', error); return data; },
    async markNotifRead(id) { const { error } = await client().from('notifications').update({ is_read: true }).eq('id', id); if (error) throw error; },
    async markAllRead(tc) { const { error } = await client().from('notifications').update({ is_read: true }).eq('tc', tc).eq('is_read', false); if (error) throw error; },

    // ===== MESSAGES / APPOINTMENTS / POLICE =====
    async getMyMessages(tc) { const rows = await selectList('case_messages', q => q.or('sender_tc.eq.' + tc + ',recipient_tc.eq.' + tc).order('created_at', { ascending: false }).limit(30)); return rows; },
    async getUnreadMessages(tc) { const rows = await selectList('case_messages', q => q.eq('recipient_tc', tc).eq('is_read', false)); return rows; },
    async addCaseMessage(msg) { const { data, error } = await client().from('case_messages').insert(msg).select('*').single(); if (error) throw error; return data; },
    async markMessageRead(id) { const { error } = await client().from('case_messages').update({ is_read: true }).eq('id', id); if (error) throw error; },
    async getAppointments(q = {}) { const rows = await selectList('appointments', query => { if (q.tc) query = query.eq('tc', q.tc); if (q.status) query = query.eq('status', q.status); return query.order('appointment_date', { ascending: true }); }); return rows; },
    async addAppointment(a) { const { data, error } = await client().from('appointments').insert(a).select('*').single(); if (error) throw error; return data; },
    async cancelAppointment(id) { const { data, error } = await client().from('appointments').update({ status: 'İptal Edildi' }).eq('id', id).select('*').single(); if (error) throw error; return data; },
    async getPoliceReports() { return []; },
    async addPoliceReport(r) { return r; },
    async addOfficerNote(n) { return n; },

    // ===== SYSTEM =====
    async addAdminLog(log) {
      const payload = {
        action: log.action || 'admin_action',
        admin_name: log.admin_name || log.admin || 'Admin',
        reason: log.reason || null,
        details: log.details || JSON.stringify(log)
      };
      const { error } = await client().from('admin_logs').insert(payload);
      if (error) console.warn('Admin log yazılamadı:', error);
    },
    async exportAll() {
      const [users, fines, esignApplications, courtCases] = await Promise.all([this.getUsers(), this.getFines(), this.getESignApplications(), this.getCourtCases()]);
      return { users, fines, esignApplications, courtCases, exportedAt: new Date().toISOString() };
    },
    async resetAll() { throw new Error('Supabase sisteminde güvenlik nedeniyle panelden toplu sıfırlama kapalı.'); },
    save() { /* Supabase otomatik kaydeder. */ }
  };

  window.initSupabase = function initSupabase() {
    if (window.supabaseClient) return window.supabaseClient;
    if (!window.supabase || !window.supabase.createClient) {
      console.error('Supabase CDN yüklenemedi.');
      return null;
    }
    window.supabaseClient = window.supabase.createClient(APP_CONFIG.supabase.url, APP_CONFIG.supabase.anonKey);
    console.log('Supabase başarıyla yüklendi.');
    return window.supabaseClient;
  };
})();
