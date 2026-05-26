const Auth = {
  currentUser: null,
  login() {
    const { clientId, redirectUri, scope } = APP_CONFIG.discord;
    const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&state=${Math.random().toString(36).substring(2)}&prompt=consent`;
    window.location.href = url;
  },
  async handleCallback(accessToken) {
    if (typeof showLoading === 'function') showLoading('Doğrulanıyor...');
    
    const userRes = await fetch(APP_CONFIG.discord.apiBase + '/users/@me', { headers: { Authorization: 'Bearer ' + accessToken } });
    if (!userRes.ok) throw new Error('Discord token geçersiz!');
    const discordUser = await userRes.json();

    const guildsRes = await fetch(APP_CONFIG.discord.apiBase + '/users/@me/guilds', { headers: { Authorization: 'Bearer ' + accessToken } });
    const guilds = await guildsRes.json();
    if (!guilds.some(g => g.id === APP_CONFIG.discord.requiredGuildId)) throw new Error('Sunucuya üye değilsiniz!');

    if (!window.DB) throw new Error('Veritabanı sistemi (DB) yüklenemedi!');
    let dbUser = await window.DB.getUserByDiscord(discordUser.id);

    if (!dbUser) {
      const sessionUser = { discord_id: discordUser.id, discord_username: discordUser.username, status: 'no_character' };
      localStorage.setItem(APP_CONFIG.keys.auth, JSON.stringify(sessionUser));
      window.location.href = 'karakter-olustur.html';
      return;
    }

    await window.DB.updateUser(discordUser.id, { discord_username: discordUser.username });
    localStorage.setItem(APP_CONFIG.keys.auth, JSON.stringify({ ...dbUser }));
    window.location.href = 'panel.html';
  }
};