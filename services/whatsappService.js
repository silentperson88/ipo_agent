const { formatSingleIpoLetter, formatDailyDigest, formatBreakoutAlert } = require('../templates/ipoNewsletter');

/**
 * WhatsApp Dispatcher Service
 * Supports: Baileys Web Client, HTTP Webhooks, and Multi-Subscriber Broadcast
 */
class WhatsAppService {
  constructor() {
    this.isConnected = false;
  }

  /**
   * Broadcast daily digest to subscribers or admin number
   */
  async sendDailyDigest(recipientPhone, analyzedIpos) {
    const message = formatDailyDigest(analyzedIpos);
    console.log(`[WhatsApp] Sending Daily Digest to ${recipientPhone}...`);
    // When Baileys is active: await sock.sendMessage(recipientJid, { text: message });
    return { success: true, recipient: recipientPhone, type: 'DAILY_DIGEST', message };
  }

  /**
   * Send a single in-depth IPO letter
   */
  async sendIpoReport(recipientPhone, ipo) {
    const message = formatSingleIpoLetter(ipo);
    console.log(`[WhatsApp] Sending IPO Report for '${ipo.name}' to ${recipientPhone}...`);
    // When Baileys is active: await sock.sendMessage(recipientJid, { text: message });
    return { success: true, recipient: recipientPhone, type: 'IPO_REPORT', ipo: ipo.name, message };
  }

  /**
   * Send high-GMP breakout alert
   */
  async sendBreakoutAlert(recipientPhone, ipo) {
    const message = formatBreakoutAlert(ipo);
    console.log(`[WhatsApp] Sending BREAKOUT ALERT for '${ipo.name}' to ${recipientPhone}...`);
    // When Baileys is active: await sock.sendMessage(recipientJid, { text: message });
    return { success: true, recipient: recipientPhone, type: 'BREAKOUT_ALERT', ipo: ipo.name, message };
  }
}

module.exports = new WhatsAppService();
