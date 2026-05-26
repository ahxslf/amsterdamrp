/**
 * AMSTERDAM RP - AUTH v4.0
 * Discord OAuth2 Only — No local login
 */

const Auth = {
  currentUser: null,

  // Start Discord OAuth
  login() {
    const { clientId, redirectUri, scope } = APP_CONFIG.discord;
    const state = Math.random().toString(36).substring(2);
    sessionStorage.setItem('discord_oauth_state', state);
    const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&state=${state}&prompt=consent`;
    window.location.href = url;
  },

  // Process callback - HATA YÖNETİMİ GÜNCELLENDİ
  async handleCallback(accessToken) {
    // DİKKAT: Buradaki try-catch kaldırıldı, hatalar doğrudan discord-callback.html'e gider.
    
    if (typeof showLoading === 'function') showLoading('Discord hesabı doğrulanıyor...');

    // 1. Get Discord user
    const userRes = await fetch(APP_CONFIG.discord.apiBase + '/users/@me', { 
      headers: { Authorization: 'Bearer ' + accessToken } 
    });
    if (!userRes.ok) throw new Error('Discord kullanıcı bilgileri alınamadı. Token geçersiz olabilir.');
    const discordUser = await userRes.json();

    // 2. Check guild membership
    const guildsRes = await fetch(APP_CONFIG.discord.apiBase + '/users/@me/guilds', { 
      headers: { Authorization: 'Bearer ' + accessToken } 
    });
    if (!guildsRes.ok) throw new Error('Sunucu bilgileri alınamadı.');
    const guilds = await guildsRes.json();
    const inGuild = guilds.some(g => g.id === APP_CONFIG.discord.requiredGuildId);
    
    if (!inGuild) {
      throw new Error('Amsterdam RP Discord sunucusuna üye değilsiniz!');
    }

    // 3. Check admin role
    let isAdmin = false;
    try {
      const memberRes = await fetch(APP_CONFIG.discord.apiBase + '/users/@me/guilds/' + APP_CONFIG.discord.requiredGuildId + '/member', { 
        headers: { Authorization: 'Bearer ' + accessToken } 
      });
      if (memberRes.ok) {
        const member = await memberRes.json();
        isAdmin = member.roles && member.roles.includes(APP_CONFIG.discord.adminRoleId);
      }
    } catch (e) { console.warn('Role check failed:', e); }

    // 4. Check Supabase for existing character
    if (typeof DB === 'undefined') throw new Error('Veritabanı sistemi (DB) yüklenemedi.');
    let dbUser = await DB.getUserByDiscord(discordUser.id);

    if (!dbUser) {
      const sessionUser = {
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        discord_avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
        isAdmin: isAdmin,
        status: 'no_character'
      };
      localStorage.setItem(APP_CONFIG.keys.auth, JSON.stringify(sessionUser));
      this.currentUser = sessionUser;
      if (typeof hideLoading === 'function') hideLoading();
      window.location.href = 'karakter-olustur.html';
      return;
    }

    // Update Discord info in DB
    await DB.updateUser(discordUser.id, {
      discord_username: discordUser.username,
      discord_avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
      is_admin: isAdmin
    });
    dbUser.discord_username = discordUser.username;
    dbUser.is_admin = isAdmin;

    if (dbUser.status === 'Onay Bekliyor') {
      const sessionUser = { ...dbUser, isAdmin };
      localStorage.setItem(APP_CONFIG.keys.auth, JSON.stringify(sessionUser));
      this.currentUser = sessionUser;
      if (typeof hideLoading === 'function') hideLoading();
      window.location.href = 'bekliyor.html';
      return;
    }

    if (dbUser.status === 'Reddedildi') {
      throw new Error('Karakter başvurunuz reddedilmiştir.');
    }

    const sessionUser = { ...dbUser, isAdmin };
    localStorage.setItem(APP_CONFIG.keys.auth, JSON.stringify(sessionUser));
    this.currentUser = sessionUser;
    if (typeof hideLoading === 'function') hideLoading();
    
    setTimeout(() => window.location.href = isAdmin ? 'admin.html' : 'panel.html', 800);
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem(APP_CONFIG.keys.auth);
    window.location.href = 'index.html';
  },

  getUser() {
    if (!this.currentUser) {
      const raw = localStorage.getItem(APP_CONFIG.keys.auth);
      if (raw) try { this.currentUser = JSON.parse(raw); } catch (e) { }
    }
    return this.currentUser;
  },

  isLoggedIn() {
    const u = this.getUser();
    return !!u && u.status === 'Aktif';
  },

  requireAuth(redirectTo = 'giris.html') {
    const u = this.getUser();
    if (!u || u.status !== 'Aktif') { window.location.href = redirectTo; return null; }
    return u;
  },

  isPolice() { const u = this.getUser(); return !!u && ['Komiser', 'Politie', 'Polis', 'Memur', 'Agt.', 'Kom.'].some(j => (u.job || '').includes(j)); },
  isJudge() { const u = this.getUser(); return !!u && (u.job || '').includes('Yargıç'); },
  isProsecutor() { const u = this.getUser(); return !!u && (u.job || '').includes('Savcı'); },
  isLawyer() { const u = this.getUser(); return !!u && (u.job || '').includes('Avukat'); },
  isJustice() { return this.isJudge() || this.isProsecutor() || this.isLawyer(); },
  isAdmin() { const u = this.getUser(); return !!u && (u.is_admin === true || u.isAdmin === true); },
  isAuthorized() { return this.isPolice() || this.isAdmin() || this.isJustice(); }
};