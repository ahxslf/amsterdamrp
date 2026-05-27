/**
 * AMSTERDAM RP - AUTH v4.3
 * Discord OAuth2 + sunucu/rol kontrolü
 */

(function () {
  const AUTH_KEY = () => APP_CONFIG.keys.auth;

  function discordAvatarUrl(user) {
    if (!user || !user.avatar) return null;
    const ext = String(user.avatar).startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}`;
  }

  function normalizeUser(u) {
    if (!u) return u;
    const out = { ...u };
    out.firstName = out.firstName ?? out.first_name ?? out.discord_username ?? 'Admin';
    out.lastName = out.lastName ?? out.last_name ?? '';
    out.birthDate = out.birthDate ?? out.birth_date ?? null;
    out.bloodType = out.bloodType ?? out.blood_type ?? null;
    out.motherName = out.motherName ?? out.mother_name ?? null;
    out.fatherName = out.fatherName ?? out.father_name ?? null;
    out.isAdmin = out.isAdmin === true || out.is_admin === true;
    out.is_admin = out.is_admin === true || out.isAdmin === true;
    return out;
  }

  async function fetchDiscordJson(url, accessToken, errorMessage) {
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
    if (!res.ok) {
      let detail = '';
      try { const body = await res.json(); detail = body.message ? ' (' + body.message + ')' : ''; } catch (_) {}
      throw new Error(errorMessage + detail);
    }
    return res.json();
  }

  window.RPAuth = window.Auth = {
    currentUser: null,

    login() {
      const { clientId, redirectUri, scope } = APP_CONFIG.discord;
      const state = Math.random().toString(36).substring(2);
      try { sessionStorage.setItem('discord_oauth_state', state); } catch (_) {}
      const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&state=${state}&prompt=consent`;
      window.location.href = url;
    },

    async handleCallback(accessToken) {
      if (typeof showLoading === 'function') showLoading('Discord hesabı doğrulanıyor...');

      const discordUser = await fetchDiscordJson(
        APP_CONFIG.discord.apiBase + '/users/@me',
        accessToken,
        'Discord kullanıcı bilgileri alınamadı.'
      );

      if (typeof showLoading === 'function') showLoading('Sunucu üyeliği kontrol ediliyor...');
      const guilds = await fetchDiscordJson(
        APP_CONFIG.discord.apiBase + '/users/@me/guilds',
        accessToken,
        'Discord sunucu listesi alınamadı.'
      );

      const inGuild = Array.isArray(guilds) && guilds.some(g => String(g.id) === String(APP_CONFIG.discord.requiredGuildId));
      if (!inGuild) throw new Error('Amsterdam RP Discord sunucusuna üye değilsiniz!');

      if (typeof showLoading === 'function') showLoading('Admin rolü kontrol ediliyor...');
      let isAdmin = false;
      try {
        const memberRes = await fetch(
          `${APP_CONFIG.discord.apiBase}/users/@me/guilds/${APP_CONFIG.discord.requiredGuildId}/member`,
          { headers: { Authorization: 'Bearer ' + accessToken } }
        );
        if (memberRes.ok) {
          const member = await memberRes.json();
          isAdmin = Array.isArray(member.roles) && member.roles.map(String).includes(String(APP_CONFIG.discord.adminRoleId));
        } else {
          console.warn('Discord rol kontrolü başarısız:', memberRes.status, await memberRes.text().catch(() => ''));
        }
      } catch (e) {
        console.warn('Discord rol kontrolü yapılamadı:', e);
      }

      if (typeof showLoading === 'function') showLoading('Kullanıcı kaydı kontrol ediliyor...');
      if (!window.DB) throw new Error('Veritabanı sistemi (DB) yüklenemedi!');

      let dbUser = await window.DB.getUserByDiscord(discordUser.id);
      const avatar = discordAvatarUrl(discordUser);

      // Karakter yoksa normal kullanıcı karakter oluşturmaya gider; admin rolü olan kişi admin paneline girebilir.
      if (!dbUser) {
        const sessionUser = normalizeUser({
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          discord_avatar: avatar,
          firstName: discordUser.username,
          lastName: '',
          status: isAdmin ? 'Aktif' : 'no_character',
          job: isAdmin ? 'Admin' : null,
          isAdmin,
          is_admin: isAdmin
        });
        localStorage.setItem(AUTH_KEY(), JSON.stringify(sessionUser));
        this.currentUser = sessionUser;
        if (typeof hideLoading === 'function') hideLoading();
        window.location.href = isAdmin ? 'admin.html' : 'karakter-olustur.html';
        return;
      }

      // Discord bilgileri ve admin rolünü veritabanına yaz.
      dbUser = await window.DB.updateUser(discordUser.id, {
        discord_username: discordUser.username,
        discord_avatar: avatar,
        is_admin: isAdmin
      }) || dbUser;

      let sessionUser = normalizeUser({
        ...dbUser,
        discord_username: discordUser.username,
        discord_avatar: avatar,
        isAdmin,
        is_admin: isAdmin
      });

      // Admin rolü, karakter onay durumundan bağımsız olarak admin paneline erişebilir.
      if (isAdmin) {
        sessionUser.status = sessionUser.status || 'Aktif';
        localStorage.setItem(AUTH_KEY(), JSON.stringify(sessionUser));
        this.currentUser = sessionUser;
        if (typeof hideLoading === 'function') hideLoading();
        window.location.href = 'admin.html';
        return;
      }

      if (sessionUser.status === 'Onay Bekliyor') {
        localStorage.setItem(AUTH_KEY(), JSON.stringify(sessionUser));
        this.currentUser = sessionUser;
        if (typeof hideLoading === 'function') hideLoading();
        window.location.href = 'bekliyor.html';
        return;
      }

      if (sessionUser.status === 'Reddedildi') {
        throw new Error('Karakter başvurunuz reddedilmiştir.');
      }

      localStorage.setItem(AUTH_KEY(), JSON.stringify(sessionUser));
      this.currentUser = sessionUser;
      if (typeof hideLoading === 'function') hideLoading();
      window.location.href = 'panel.html';
    },

    logout() {
      this.currentUser = null;
      localStorage.removeItem(AUTH_KEY());
      window.location.href = 'index.html';
    },

    getUser() {
      if (!this.currentUser) {
        const raw = localStorage.getItem(AUTH_KEY());
        if (raw) {
          try { this.currentUser = normalizeUser(JSON.parse(raw)); }
          catch (_) { localStorage.removeItem(AUTH_KEY()); }
        }
      }
      return this.currentUser;
    },

    isLoggedIn() {
      const u = this.getUser();
      return !!u && (u.status === 'Aktif' || this.isAdmin());
    },

    requireAuth(redirectTo = 'giris.html') {
      const u = this.getUser();
      if (!u || (u.status !== 'Aktif' && !this.isAdmin())) {
        window.location.href = redirectTo;
        return null;
      }
      return u;
    },

    requireAdmin(redirectTo = 'admin-giris.html') {
      const u = this.getUser();
      if (!u || !this.isAdmin()) {
        window.location.href = redirectTo;
        return null;
      }
      return u;
    },

    isPolice() {
      const u = this.getUser();
      const job = String(u?.job || '');
      return !!u && ['Komiser', 'Politie', 'Polis', 'Memur', 'Agt.', 'Kom.'].some(j => job.includes(j));
    },
    isJudge() { const u = this.getUser(); return !!u && String(u.job || '').includes('Yargıç'); },
    isProsecutor() { const u = this.getUser(); return !!u && String(u.job || '').includes('Savcı'); },
    isLawyer() { const u = this.getUser(); return !!u && String(u.job || '').includes('Avukat'); },
    isJustice() { return this.isJudge() || this.isProsecutor() || this.isLawyer(); },
    isAdmin() { const u = this.getUser(); return !!u && (u.is_admin === true || u.isAdmin === true); },
    isAuthorized() { return this.isPolice() || this.isAdmin() || this.isJustice(); },
    normalizeUser
  };

  window.updateHeaderAuth = function updateHeaderAuth() {
    const el = document.getElementById('header-auth');
    if (!el) return;
    const user = RPAuth.getUser();
    if (user) {
      const name = `${user.firstName || user.first_name || user.discord_username || 'Kullanıcı'} ${user.lastName || user.last_name || ''}`.trim();
      const avatar = user.discord_avatar
        ? `<img src="${user.discord_avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
        : `<div style="width:32px;height:32px;border-radius:50%;background:var(--primary-blue);color:#fff;display:grid;place-items:center;font-size:0.8rem;font-weight:700;">${(name || '?')[0]}</div>`;
      el.innerHTML = `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">${avatar}
        <span style="font-size:0.9rem;font-weight:600;">${name}</span>
        ${user.status === 'Aktif' ? '<a href="panel.html" class="btn btn-outline btn-sm"><i class="fas fa-th-large"></i> Panel</a>' : ''}
        ${RPAuth.isAdmin() ? '<a href="admin.html" class="btn btn-sm" style="background:#7c3aed;color:#fff;border:none;"><i class="fas fa-crown"></i> Admin</a>' : ''}
        <button onclick="RPAuth.logout()" class="btn btn-red btn-sm"><i class="fas fa-sign-out-alt"></i></button></div>`;
      if (typeof NotifBell !== 'undefined' && user.tc) {
        try { NotifBell.inject(); } catch (e) { console.warn('Bildirim zili yüklenemedi:', e); }
      }
    } else {
      el.innerHTML = '<a href="giris.html" class="btn btn-primary"><i class="fas fa-sign-in-alt"></i> Giriş Yap</a>';
    }
  };
})();
