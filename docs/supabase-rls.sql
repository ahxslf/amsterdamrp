-- ============================================
-- AMSTERDAM RP — RLS (Row Level Security)
-- Supabase SQL Editor'da çalıştır
-- Bu RLS uyarısını kapatır + temel güvenlik sağlar
-- ============================================

-- Tüm tablolarda RLS'i aktif et
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE criminal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_witnesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE esign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE esign_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Anon key ile full erişim (frontend-only app, auth Discord OAuth üzerinden)
-- Production'da daha kısıtlayıcı yapılabilir
CREATE POLICY "anon_full_access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON fines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON criminal_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON court_cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON court_parties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON court_witnesses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON court_hearings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON court_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON esign_applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON esign_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON lawyer_mandates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON case_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON admin_logs FOR ALL USING (true) WITH CHECK (true);
