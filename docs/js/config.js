/**
 * AMSTERDAM RP - E-DEVLET & E-ADALET
 * Production Configuration v4.0
 */

const APP_CONFIG = {
  name: 'Amsterdam RP e-Devlet Kapısı',
  shortName: 'Amsterdam RP',
  version: '4.0.0',
  year: 2026,

  // Supabase
  supabase: {
    url: 'https://tnyxlhbdahqnggdnlzck.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRueXhsaGJkYWhxbmdnZG5semNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTMyNDEsImV4cCI6MjA5NTM4OTI0MX0.IfFLdGiEdVQAPnJaMUAjoBO1vS6BGAbggtfbhFesJJ8'
  },

  // Discord OAuth2
  discord: {
    clientId: '1385618368043946024',
    redirectUri: 'https://ahxslf.github.io/amsterdamrp/discord-callback.html',
    scope: 'identify guilds guilds.members.read',
    requiredGuildId: '1340958005935603743',
    adminRoleId: '1341034194335305770',
    apiBase: 'https://discord.com/api/v10'
  },

  eSignProvider: {
    name: 'DigiSign Elektronik Sertifika',
    shortName: 'DigiSign',
    slogan: 'BTK Onaylı Elektronik Sertifika Hizmet Sağlayıcısı',
    usbTimeout: 20 * 60 * 1000
  },

  features: {
    darkMode: true,
    eSignature: true,
    eAppointment: true,
    policePanel: true,
    justicePanel: true,
    notifications: true,
    adminPanel: true
  },

  keys: {
    auth: 'ams_edevlet_auth_v4',
    theme: 'ams_edevlet_theme',
    eSignUSB: 'ams_esign_usb_last'
  }
};