/**
 * AMSTERDAM RP - DATABASE v4.1
 * Supabase Integration - Ultra Stable Version
 */

// 1. DB Objesini Hemen Tanımla (Hata olsa bile DB tanımlı kalsın)
window.DB = {
  async getUserByDiscord(discordId) {
    try {
      if (!window.supabaseClient) throw new Error('Supabase başlatılmadı. Lütfen sayfayı yenileyin.');
      const { data, error } = await window.supabaseClient
        .from('users')
        .select('*')
        .eq('discord_id', discordId)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('DB.getUserByDiscord Error:', err);
      throw err;
    }
  },

  async updateUser(discordId, updates) {
    try {
      if (!window.supabaseClient) throw new Error('Supabase başlatılmadı.');
      const { data, error } = await window.supabaseClient
        .from('users')
        .update(updates)
        .eq('discord_id', discordId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('DB.updateUser Error:', err);
      throw err;
    }
  }
};

// 2. Supabase Başlatma Fonksiyonu (Ayrı bir fonksiyon olarak)
window.initSupabase = function() {
  try {
    console.log('Supabase başlatılıyor...');
    if (typeof supabase === 'undefined') {
      throw new Error('Supabase CDN kütüphanesi yüklenemedi.');
    }
    
    // Doğru başlatma yöntemi
    window.supabaseClient = supabase.createClient(APP_CONFIG.supabase.url, APP_CONFIG.supabase.anonKey);
    console.log('Supabase başarıyla başlatıldı.');
  } catch (err) {
    console.error('Supabase Init Kritik Hata:', err);
    alert('Kritik Hata: ' + err.message);
  }
};