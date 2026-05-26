/**
 * AMSTERDAM RP - DATABASE v4.0
 * Supabase Integration
 */

// Global DB objesini tanımla (window'a bağlayarak erişilebilirliği garanti ediyoruz)
window.DB = {
  
  // Kullanıcıyı Discord ID ile getir
  async getUserByDiscord(discordId) {
    try {
      if (typeof supabase === 'undefined') throw new Error('Supabase istemcisi yüklenemedi.');
      
      const { data, error } = await supabase
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

  // Kullanıcı bilgilerini güncelle
  async updateUser(discordId, updates) {
    try {
      if (typeof supabase === 'undefined') throw new Error('Supabase istemcisi yüklenemedi.');
      
      const { data, error } = await supabase
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
  },

  // Kullanıcıyı onayla
  async approveUser(discordId, adminName) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          status: 'Aktif', 
          approved_by: adminName, 
          approved_at: new Date().toISOString() 
        })
        .eq('discord_id', discordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('DB.approveUser Error:', err);
      throw err;
    }
  },

  // Kullanıcıyı reddet
  async rejectUser(discordId, adminName, reason) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          status: 'Reddedildi', 
          approved_by: adminName, 
          rejection_reason: reason 
        })
        .eq('discord_id', discordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('DB.rejectUser Error:', err);
      throw err;
    }
  }
};

// Supabase Başlatma Fonksiyonu
window.initSupabase = function() {
  try {
    if (typeof supabase === 'undefined') {
      // Supabase CDN üzerinden yüklendiği için global supabase objesi kullanılır
      const { createClient } = window.supabase;
      window.supabase = createClient(APP_CONFIG.supabase.url, APP_CONFIG.supabase.anonKey);
      console.log('Supabase başarıyla başlatıldı.');
    }
  } catch (err) {
    console.error('Supabase init hatası:', err);
  }
};