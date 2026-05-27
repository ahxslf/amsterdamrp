/**
 * AMSTERDAM RP - DATABASE v4.2
 * Conflict-Free Version
 */

window.DB = {
  async getUserByDiscord(discordId) {
    try {
      if (!window.supabaseClient) throw new Error('Supabase başlatılmadı!');
      const { data, error } = await window.supabaseClient
        .from('users')
        .select('*')
        .eq('discord_id', discordId)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (err) { throw err; }
  },

  async updateUser(discordId, updates) {
    try {
      if (!window.supabaseClient) throw new Error('Supabase başlatılmadı!');
      const { data, error } = await window.supabaseClient
        .from('users')
        .update(updates)
        .eq('discord_id', discordId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) { throw err; }
  }
};

window.initSupabase = function() {
  try {
    window.supabaseClient = supabase.createClient(
      APP_CONFIG.supabase.url,
      APP_CONFIG.supabase.anonKey
    );
    console.log('Supabase başarıyla yüklendi.');
  } catch (err) {
    console.error('Supabase Init Hatası:', err);
  }
};