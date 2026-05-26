/**
 * AMSTERDAM RP - SUPABASE DATA LAYER v4.0
 * localStorage → Supabase PostgreSQL
 */

// Supabase client init (CDN loaded in HTML)
let supabase;
function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(APP_CONFIG.supabase.url, APP_CONFIG.supabase.anonKey);
  } else if (typeof supabaseJs !== 'undefined') {
    supabase = supabaseJs.createClient(APP_CONFIG.supabase.url, APP_CONFIG.supabase.anonKey);
  }
  return supabase;
}

const DB = {
  // ===== USERS =====
  async getUserByDiscord(discordId) {
    const { data } = await supabase.from('users').select('*').eq('discord_id', discordId).single();
    return data;
  },
  async getUserByTC(tc) {
    const { data } = await supabase.from('users').select('*').eq('tc', tc).single();
    return data;
  },
  async getUsers() {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  async getActiveUsers() {
    const { data } = await supabase.from('users').select('*').eq('status', 'Aktif').order('first_name');
    return data || [];
  },
  async getPendingUsers() {
    const { data } = await supabase.from('users').select('*').eq('status', 'Onay Bekliyor').order('created_at');
    return data || [];
  },
  async createUser(user) {
    // Auto-generate TC
    const { data: tcData } = await supabase.rpc('generate_tc');
    user.tc = tcData || String(Math.floor(Math.random() * 89999999999) + 10000000000);
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) console.error('createUser error:', error);
    return data;
  },
  async updateUser(discordId, updates) {
    updates.updated_at = new Date().toISOString();
    const { data } = await supabase.from('users').update(updates).eq('discord_id', discordId).select().single();
    return data;
  },
  async approveUser(discordId, adminName) {
    const { data } = await supabase.from('users').update({ status: 'Aktif', approved_by: adminName, approved_at: new Date().toISOString() }).eq('discord_id', discordId).select().single();
    if (data) await this.addNotification({ tc: data.tc, title: 'Karakteriniz Onaylandı! ✓', body: 'Karakter başvurunuz onaylanmıştır. Artık e-Devlet hizmetlerini kullanabilirsiniz.', notif_type: 'success', icon: 'fas fa-check-circle' });
    return data;
  },
  async rejectUser(discordId, adminName, reason) {
    const user = await this.getUserByDiscord(discordId);
    const { data } = await supabase.from('users').update({ status: 'Reddedildi', approved_by: adminName }).eq('discord_id', discordId).select().single();
    if (user) await this.addNotification({ tc: user.tc, title: 'Karakter Başvurunuz Reddedildi', body: 'Sebep: ' + (reason || 'Belirtilmedi'), notif_type: 'error', icon: 'fas fa-times-circle' });
    return data;
  },

  // ===== VEHICLES =====
  async getVehicles(q = {}) {
    let query = supabase.from('vehicles').select('*');
    if (q.plate) query = query.ilike('plate', '%' + q.plate + '%');
    if (q.ownerTc) query = query.eq('owner_tc', q.ownerTc);
    if (q.wanted !== undefined) query = query.eq('wanted', q.wanted);
    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  },
  async updateVehicleWanted(plate, wanted, reason) {
    const { data } = await supabase.from('vehicles').update({ wanted, wanted_reason: reason }).eq('plate', plate).select().single();
    return data;
  },

  // ===== FINES =====
  async getFines(q = {}) {
    let query = supabase.from('fines').select('*');
    if (q.plate) query = query.ilike('plate', '%' + q.plate + '%');
    if (q.tc) query = query.eq('tc', q.tc);
    if (q.status) query = query.eq('status', q.status);
    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  },
  async getActiveFines(q = {}) {
    let query = supabase.from('fines').select('*').in('status', ['Ödenmedi', 'Ödendi']);
    if (q.tc) query = query.eq('tc', q.tc);
    if (q.plate) query = query.ilike('plate', '%' + q.plate + '%');
    const { data } = await query.order('fine_date', { ascending: false });
    return data || [];
  },
  async getPendingFines() {
    const { data } = await supabase.from('fines').select('*').eq('status', 'Onay Bekliyor').order('created_at');
    return data || [];
  },
  async addFine(fine) {
    const { data } = await supabase.from('fines').insert(fine).select().single();
    return data;
  },
  async approveFine(id, adminName, tebligatFile) {
    const { data } = await supabase.from('fines').update({ status: 'Ödenmedi', approved_by: adminName, approved_at: new Date().toISOString().split('T')[0], tebligat_file: tebligatFile }).eq('id', id).select().single();
    if (data) await this.addNotification({ tc: data.tc, title: 'Yeni Trafik Cezası Tebligatı', body: data.plate + ' plakalı aracınıza ' + data.amount + '€ trafik cezası tebliğ edilmiştir.', notif_type: 'warning', icon: 'fas fa-file-alt' });
    return data;
  },
  async rejectFine(id, adminName, reason) {
    const { data } = await supabase.from('fines').update({ status: 'Reddedildi', approved_by: adminName, reject_reason: reason }).eq('id', id).select().single();
    return data;
  },
  async payFine(id) {
    const receiptNo = 'RCP-' + new Date().toISOString().split('T')[0].replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    const { data } = await supabase.from('fines').update({ status: 'Ödendi', paid_at: new Date().toISOString().split('T')[0], receipt_no: receiptNo }).eq('id', id).select().single();
    return data;
  },

  // ===== CRIMINAL RECORDS =====
  async getCriminalRecords(q = {}) {
    let query = supabase.from('criminal_records').select('*');
    if (q.tc) query = query.eq('tc', q.tc);
    if (q.status) query = query.eq('status', q.status);
    const { data } = await query.order('record_date', { ascending: false });
    return data || [];
  },
  async addCriminalRecord(rec) {
    const { data } = await supabase.from('criminal_records').insert(rec).select().single();
    return data;
  },

  // ===== COURT CASES =====
  async getCourtCases(q = {}) {
    let query = supabase.from('court_cases').select('*');
    if (q.status) query = query.eq('status', q.status);
    if (q.defendantTc) query = query.eq('defendant_tc', q.defendantTc);
    if (q.judgeTc) query = query.eq('judge_tc', q.judgeTc);
    if (q.prosecutorTc) query = query.eq('prosecutor_tc', q.prosecutorTc);
    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  },
  async getCourtCaseById(id) {
    const { data } = await supabase.from('court_cases').select('*').eq('id', id).single();
    return data;
  },
  async addCourtCase(c) {
    const { data } = await supabase.from('court_cases').insert(c).select().single();
    return data;
  },
  async updateCourtCase(id, updates) {
    const { data } = await supabase.from('court_cases').update(updates).eq('id', id).select().single();
    return data;
  },

  // Court sub-tables
  async getParties(caseId) { const { data } = await supabase.from('court_parties').select('*').eq('case_id', caseId); return data || []; },
  async addParty(party) { const { data } = await supabase.from('court_parties').insert(party).select().single(); return data; },
  async removeParty(id) { await supabase.from('court_parties').delete().eq('id', id); },

  async getWitnesses(caseId) { const { data } = await supabase.from('court_witnesses').select('*').eq('case_id', caseId); return data || []; },
  async addWitness(witness) { const { data } = await supabase.from('court_witnesses').insert(witness).select().single(); return data; },
  async removeWitness(id) { await supabase.from('court_witnesses').delete().eq('id', id); },

  async getHearings(caseId) { const { data } = await supabase.from('court_hearings').select('*').eq('case_id', caseId).order('hearing_date'); return data || []; },
  async addHearing(hearing) { const { data } = await supabase.from('court_hearings').insert(hearing).select().single(); return data; },

  async getCaseHistory(caseId) { const { data } = await supabase.from('court_history').select('*').eq('case_id', caseId).order('created_at', { ascending: false }); return data || []; },
  async addCaseHistory(entry) { const { data } = await supabase.from('court_history').insert(entry).select().single(); return data; },

  // ===== E-SIGN =====
  async getESignApplications(q = {}) {
    let query = supabase.from('esign_applications').select('*');
    if (q.tc) query = query.eq('tc', q.tc);
    if (q.status) query = query.eq('status', q.status);
    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  },
  async addESignApplication(app) { const { data } = await supabase.from('esign_applications').insert(app).select().single(); return data; },
  async approveESignApplication(id, adminName) {
    const serial = 'DSC-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    const { data } = await supabase.from('esign_applications').update({ status: 'Onaylandı', certificate_serial: serial, reviewed_at: new Date().toISOString().split('T')[0], reviewed_by: adminName }).eq('id', id).select().single();
    if (data) await this.addNotification({ tc: data.tc, title: 'e-İmza Onaylandı ✓', body: 'Sertifika: ' + serial, notif_type: 'success', icon: 'fas fa-certificate' });
    return data;
  },
  async rejectESignApplication(id, adminName, reason) {
    const { data } = await supabase.from('esign_applications').update({ status: 'Reddedildi', reviewed_at: new Date().toISOString().split('T')[0], reviewed_by: adminName, reject_reason: reason }).eq('id', id).select().single();
    return data;
  },
  async hasApprovedESign(tc) {
    const { data } = await supabase.from('esign_applications').select('id').eq('tc', tc).eq('status', 'Onaylandı').limit(1);
    return data && data.length > 0;
  },
  async getESignCertificate(tc) {
    const { data } = await supabase.from('esign_applications').select('*').eq('tc', tc).eq('status', 'Onaylandı').single();
    return data;
  },

  async getESignatures(tc) { const { data } = await supabase.from('esign_documents').select('*').eq('tc', tc).order('created_at', { ascending: false }); return data || []; },
  async addESignature(doc) {
    doc.id = 'EDS-' + new Date().toISOString().split('T')[0].replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 999)).padStart(3, '0');
    const { data } = await supabase.from('esign_documents').insert(doc).select().single();
    return data;
  },
  async signDocument(id) {
    const { data } = await supabase.from('esign_documents').update({ status: 'İmzalandı', signed_at: new Date().toISOString() }).eq('id', id).select().single();
    return data;
  },
  async signAsSecondParty(id) {
    const doc = await this.getESignById(id);
    const updates = { second_party_signed_at: new Date().toISOString() };
    if (doc && doc.signed_at) updates.status = 'İmzalandı';
    else updates.status = 'Karşı Taraf İmzaladı';
    const { data } = await supabase.from('esign_documents').update(updates).eq('id', id).select().single();
    return data;
  },
  async getESignById(id) { const { data } = await supabase.from('esign_documents').select('*').eq('id', id).single(); return data; },
  async getDocsNeedingMySign(tc) {
    const { data } = await supabase.from('esign_documents').select('*').eq('second_party_tc', tc).is('second_party_signed_at', null).not('signed_at', 'is', null);
    return data || [];
  },

  // ===== LAWYER MANDATES =====
  async getLawyerMandates(q = {}) {
    let query = supabase.from('lawyer_mandates').select('*');
    if (q.lawyerTc) query = query.eq('lawyer_tc', q.lawyerTc);
    if (q.clientTc) query = query.eq('client_tc', q.clientTc);
    if (q.status) query = query.eq('status', q.status);
    const { data } = await query; return data || [];
  },
  async addLawyerMandate(m) { const { data } = await supabase.from('lawyer_mandates').insert(m).select().single(); return data; },
  async hasActiveMandateFor(lawyerTc, clientTc) {
    const { data } = await supabase.from('lawyer_mandates').select('id').eq('lawyer_tc', lawyerTc).eq('client_tc', clientTc).eq('status', 'Aktif').limit(1);
    return data && data.length > 0;
  },

  // ===== NOTIFICATIONS =====
  async getNotifications(tc) {
    const { data } = await supabase.from('notifications').select('*').eq('tc', tc).order('created_at', { ascending: false }).limit(50);
    return data || [];
  },
  async getUnreadCount(tc) {
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('tc', tc).eq('is_read', false);
    return count || 0;
  },
  async addNotification(n) {
    const { data } = await supabase.from('notifications').insert(n).select().single();
    return data;
  },
  async markNotifRead(id) { await supabase.from('notifications').update({ is_read: true }).eq('id', id); },
  async markAllRead(tc) { await supabase.from('notifications').update({ is_read: true }).eq('tc', tc).eq('is_read', false); },

  // ===== CASE MESSAGES =====
  async getCaseMessages(q = {}) {
    let query = supabase.from('case_messages').select('*');
    if (q.caseId) query = query.eq('case_id', q.caseId);
    const { data } = await query.order('created_at'); return data || [];
  },
  async getMyMessages(tc) {
    const { data } = await supabase.from('case_messages').select('*').or('sender_tc.eq.' + tc + ',recipient_tc.eq.' + tc).order('created_at', { ascending: false }).limit(30);
    return data || [];
  },
  async getUnreadMessages(tc) {
    const { data } = await supabase.from('case_messages').select('*').eq('recipient_tc', tc).eq('is_read', false);
    return data || [];
  },
  async addCaseMessage(msg) {
    const { data } = await supabase.from('case_messages').insert(msg).select().single();
    if (data) await this.addNotification({ tc: msg.recipient_tc, title: 'Yeni Dava Mesajı: ' + msg.subject, body: msg.sender_name + ' — ' + msg.case_no, notif_type: 'info', icon: 'fas fa-envelope' });
    return data;
  },
  async markMessageRead(id) { await supabase.from('case_messages').update({ is_read: true }).eq('id', id); },

  // ===== APPOINTMENTS =====
  async getAppointments(q = {}) {
    let query = supabase.from('appointments').select('*');
    if (q.tc) query = query.eq('tc', q.tc);
    if (q.status) query = query.eq('status', q.status);
    const { data } = await query.order('appointment_date'); return data || [];
  },
  async addAppointment(a) { const { data } = await supabase.from('appointments').insert(a).select().single(); return data; },
  async cancelAppointment(id) { const { data } = await supabase.from('appointments').update({ status: 'İptal Edildi' }).eq('id', id).select().single(); return data; },

  // ===== ADMIN LOGS =====
  async addAdminLog(log) { await supabase.from('admin_logs').insert(log); }
};
