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

  // Process callback
  async handleCallback(accessToken) {
    try {
      showLoading('Discord hesabı doğrulanıyor...');

      // 1. Get Discord user
      const userRes = await fetch(APP_CONFIG.discord.apiBase + '/users/@me', { headers: { Authorization: 'Bearer ' + accessToken } });
      if (!userRes.ok) throw new Error('Discord kullanıcı bilgileri alınamadı.');
      const discordUser = await userRes.json();

      // 2. Check guild membership
      const guildsRes = await fetch(APP_CONFIG.discord.apiBase + '/users/@me/guilds', { headers: { Authorization: 'Bearer ' + accessToken } });
      if (!guildsRes.ok) throw new Error('Sunucu bilgileri alınamadı.');
      const guilds = await guildsRes.json();
      const inGuild = guilds.some(g => g.id === APP_CONFIG.discord.requiredGuildId);
      if (!inGuild) {
        hideLoading();
        Toast.error('Amsterdam RP Discord sunucusuna üye değilsiniz!');
        setTimeout(() => window.location.href = 'giris.html', 2500);
        return;
      }

      // 3. Check admin role
      let isAdmin = false;
      try {
        const memberRes = await fetch(APP_CONFIG.discord.apiBase + '/users/@me/guilds/' + APP_CONFIG.discord.requiredGuildId + '/member', { headers: { Authorization: 'Bearer ' + accessToken } });
        if (memberRes.ok) {
          const member = await memberRes.json();
          isAdmin = member.roles && member.roles.includes(APP_CONFIG.discord.adminRoleId);
        }
      } catch (e) { console.warn('Role check failed:', e); }

      // 4. Check Supabase for existing character
      let dbUser = await DB.getUserByDiscord(discordUser.id);

      if (!dbUser) {
        // No character — save Discord info and redirect to character creation
        const sessionUser = {
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          discord_avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
          isAdmin: isAdmin,
          status: 'no_character'
        };
        localStorage.setItem(APP_CONFIG.keys.auth, JSON.stringify(sessionUser));
        this.currentUser = sessionUser;
        hideLoading();
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

      // Check character status
      if (dbUser.status === 'Onay Bekliyor') {
        const sessionUser = { ...dbUser, isAdmin };
        localStorage.setItem(APP_CONFIG.keys.auth, JSON.stringify(sessionUser));
        this.currentUser = sessionUser;
        hideLoading();
        Toast.info('Karakter başvurunuz henüz onaylanmadı.');
        window.location.href = 'bekliyor.html';
        return;
      }

      if (dbUser.status === 'Reddedildi') {
        hideLoading();
        Toast.error('Karakter başvurunuz reddedilmiştir.');
        setTimeout(() => window.location.href = 'giris.html', 2000);
        return;
      }

      // Active character — login
      const sessionUser = { ...dbUser, isAdmin };
      localStorage.setItem(APP_CONFIG.keys.auth, JSON.stringify(sessionUser));
      this.currentUser = sessionUser;
      hideLoading();
      Toast.success('Hoş geldiniz, ' + dbUser.first_name + '!');
      setTimeout(() => window.location.href = isAdmin ? 'admin.html' : 'panel.html', 800);

    } catch (err) {
      hideLoading();
      Toast.error('Giriş hatası: ' + err.message);
      setTimeout(() => window.location.href = 'giris.html', 2500);
    }
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem(APP_CONFIG.keys.auth);
    Toast.success('Çıkış yapıldı.');
    setTimeout(() => window.location.href = 'index.html', 700);
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

  // Role checks (job field from Supabase)
  isPolice() { const u = this.getUser(); return !!u && ['Komiser', 'Politie', 'Polis', 'Memur', 'Agt.', 'Kom.'].some(j => (u.job || '').includes(j)); },
  isJudge() { const u = this.getUser(); return !!u && (u.job || '').includes('Yargıç'); },
  isProsecutor() { const u = this.getUser(); return !!u && (u.job || '').includes('Savcı'); },
  isLawyer() { const u = this.getUser(); return !!u && (u.job || '').includes('Avukat'); },
  isJustice() { return this.isJudge() || this.isProsecutor() || this.isLawyer(); },
  isAdmin() { const u = this.getUser(); return !!u && (u.is_admin === true || u.isAdmin === true); },
  isAuthorized() { return this.isPolice() || this.isAdmin() || this.isJustice(); }
};

// Header auth injection
function updateHeaderAuth() {
  const el = document.getElementById('header-auth');
  if (!el) return;
  const user = Auth.getUser();
  if (user && user.status === 'Aktif') {
    const avatar = user.discord_avatar
      ? '<img src="' + user.discord_avatar + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">'
      : '<div style="width:32px;height:32px;border-radius:50%;background:var(--primary-blue);color:#fff;display:grid;place-items:center;font-size:0.8rem;font-weight:700;">' + (user.first_name || '?')[0] + '</div>';
    el.innerHTML = '<div style="display:flex;align-items:center;gap:12px;">' + avatar +
      '<span style="font-size:0.9rem;font-weight:600;">' + (user.first_name || '') + ' ' + (user.last_name || '') + '</span>' +
      '<a href="panel.html" class="btn btn-outline btn-sm"><i class="fas fa-th-large"></i> Panel</a>' +
      (Auth.isAdmin() ? '<a href="admin.html" class="btn btn-sm" style="background:#7c3aed;color:#fff;border:none;"><i class="fas fa-crown"></i></a>' : '') +
      '<button onclick="Auth.logout()" class="btn btn-red btn-sm"><i class="fas fa-sign-out-alt"></i></button></div>';
    if (typeof NotifBell !== 'undefined') NotifBell.inject();
  } else {
    el.innerHTML = '<a href="giris.html" class="btn btn-primary"><i class="fas fa-sign-in-alt"></i> Giriş Yap</a>';
  }
}
