const path = require('path');
const fs = require('fs');

// Simple native .env loader without throwing errors
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.substring(0, idx).trim();
          const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    } catch (e) {}
  }
}

loadEnvFile();

module.exports = {
  // API Configurations
  api: {
    baseUrl: 'https://webnodejs.investorgain.com',
    reportId: 331,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  },

  // Storage Configurations
  storage: {
    dumpsDir: path.join(__dirname, '..', 'data', 'ipo_dumps'),
    retentionDays: 7
  },

  // Percentage-Based Investment Thresholds
  thresholds: {
    blockbusterPercent: 50,  // >= 50% Blockbuster
    strongApplyPercent: 35,  // >= 35% Strong Apply
    applyGainPercent: 20,    // >= 20% Apply for Listing Gain
    cautionPercent: 10,      // 10% - 20% Caution / QIB dependent
    thinBufferPercent: 3,    // 3% - 10% Thin Buffer / High Risk
    deltaAlertPercent: 5,    // 5% GMP shift triggers momentum alert
    maxInstantAlertsPerDay: 2
  },

  // WhatsApp & Community Configuration
  whatsapp: {
    communityInviteLink: process.env.COMMUNITY_INVITE_LINK || process.env.WHATSAPP_COMMUNITY_LINK || '',
    targetGroupJid: process.env.WHATSAPP_TARGET_GROUP_JID || '',
    sessionDir: path.join(__dirname, '..', 'data', 'whatsapp_session')
  },

  // Database Configuration (MongoDB)
  mongo: {
    uri: process.env.MONGO_URI || process.env.DEV_DB_URL || 'mongodb://127.0.0.1:27017/finvibes_ipo',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  }
};
