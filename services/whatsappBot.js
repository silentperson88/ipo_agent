const path = require('path');
const fs = require('fs');
const config = require('../config');
const { getLatestIposFromDb } = require('./dbService');
const { formatSingleIpoLetter, formatDailyDigest } = require('../templates/ipoNewsletter');

let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion;
try {
  const baileys = require('@whiskeysockets/baileys');
  makeWASocket = baileys.default || baileys.makeWASocket;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  DisconnectReason = baileys.DisconnectReason;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
} catch (e) {
  // Packages installing
}

let qrcode = null;
try {
  qrcode = require('qrcode-terminal');
} catch (e) {}

let pino = null;
try {
  pino = require('pino');
} catch (e) {}

const SESSION_DIR = path.join(__dirname, '..', 'data', 'whatsapp_session');

class WhatsAppBotService {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.targetGroupJid = process.env.WHATSAPP_TARGET_GROUP_JID || config.whatsapp?.targetGroupJid || '120363409446063630@g.us';
    this.availableGroups = [];
  }

  clearSession() {
    try {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        console.log('[WhatsApp Bot] 🗑️ Cleared previous WhatsApp session directory.');
      }
    } catch (e) {
      console.warn('[WhatsApp Bot] Notice while clearing session:', e.message);
    }
  }

  async initialize(forceReset = false) {
    if (!makeWASocket) {
      console.warn('[WhatsApp Bot] Baileys package not yet ready.');
      return;
    }

    if (forceReset) {
      this.clearSession();
    }

    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const logger = pino ? pino({ level: 'silent' }) : undefined;

    console.log('[WhatsApp Bot] Initializing WhatsApp Connection Socket...');

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ['Run4Dream IPO Agent', 'Chrome', '1.0.0']
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && qrcode) {
        console.log('\n======================================================');
        console.log('📱 SCAN THIS QR CODE WITH WHATSAPP TO LINK DEVICE:');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Tap Settings ➔ Linked Devices ➔ Link a Device');
        console.log('3. Point your camera at this QR code:');
        console.log('======================================================\n');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        this.isConnected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;

        if (isLoggedOut) {
          console.log('\n[WhatsApp Bot] ⚠️ Device was logged out or session expired (Status: ' + statusCode + ').');
          console.log('[WhatsApp Bot] 🔄 Clearing expired session and generating fresh QR code in 2s...\n');
          this.clearSession();
          setTimeout(() => this.initialize(), 2000);
        } else {
          console.log(`[WhatsApp Bot] Connection closed (Status: ${statusCode || 'socket drop'}). Reconnecting in 5s...`);
          setTimeout(() => this.initialize(), 5000);
        }
      } else if (connection === 'open') {
        this.isConnected = true;
        console.log('\n======================================================');
        console.log('✨ WHATSAPP BOT CONNECTED & READY TO BROADCAST!');
        console.log('======================================================\n');
        await this.loadCommunityGroups();
      }
    });

    // Interactive Bot Listener (Users can text "GMP" or IPO name)
    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (text.trim()) {
          await this.handleIncomingMessage(sender, text.trim());
        }
      }
    });
  }

  async loadCommunityGroups() {
    try {
      if (!this.sock) return;
      const groups = await this.sock.groupFetchAllParticipating();
      this.availableGroups = Object.values(groups);
      console.log(`[WhatsApp Bot] Found ${this.availableGroups.length} joined group(s)/community(ies):`);
      
      this.availableGroups.forEach((g, idx) => {
        console.log(`  ${idx + 1}. "${g.subject}" (JID: ${g.id})`);
        // Auto-match Community Announcement group if not explicitly set
        if (!this.targetGroupJid && (g.subject.toLowerCase().includes('ipo') || g.subject.toLowerCase().includes('announcement'))) {
          this.targetGroupJid = g.id;
          console.log(`  ➔ Auto-selected "${g.subject}" as default Broadcast Target!`);
        }
      });
    } catch (err) {
      console.warn('[WhatsApp Bot] Error fetching group list:', err.message);
    }
  }

  /**
   * Broadcast message to the Community Announcement Group
   */
  async broadcastToCommunity(messageText) {
    if (!this.isConnected || !this.sock) {
      console.log('[WhatsApp Bot] Bot not connected. Message queued in memory.');
      return false;
    }

    const targetJid = this.targetGroupJid;
    if (!targetJid) {
      console.warn('[WhatsApp Bot] No target community/group JID set. Call loadCommunityGroups() or specify in .env.');
      return false;
    }

    try {
      await this.sock.sendMessage(targetJid, { text: messageText });
      console.log(`[WhatsApp Bot] Successfully broadcast message to ${targetJid}`);
      return true;
    } catch (err) {
      console.error('[WhatsApp Bot] Broadcast error:', err.message);
      return false;
    }
  }

  /**
   * Send 1-on-1 Direct Message to a specific phone number
   */
  async sendDirectMessage(phoneNumber, messageText) {
    if (!this.isConnected || !this.sock) return false;

    // Clean phone number (e.g. "919876543210")
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const jid = `${cleanPhone}@s.whatsapp.net`;

    try {
      await this.sock.sendMessage(jid, { text: messageText });
      return true;
    } catch (err) {
      console.error(`[WhatsApp Bot] Error sending DM to ${jid}:`, err.message);
      return false;
    }
  }

  /**
   * Interactive Bot Responder
   */
  async handleIncomingMessage(senderJid, text) {
    const q = text.toLowerCase();

    // 1. If user asks for "gmp" or "today" or "digest"
    if (q === 'gmp' || q === 'today' || q === 'digest' || q === 'hi' || q === 'hello') {
      const data = await getLatestIposFromDb();
      if (data?.ipos) {
        const digest = formatDailyDigest(data.ipos);
        await this.sock.sendMessage(senderJid, { text: digest });
      }
      return;
    }

    // 2. If user mentions a specific IPO name
    const data = await getLatestIposFromDb();
    if (data?.ipos) {
      const matched = data.ipos.find(i => i.name.toLowerCase().includes(q) || q.includes(i.name.toLowerCase()));
      if (matched) {
        const letter = formatSingleIpoLetter(matched);
        await this.sock.sendMessage(senderJid, { text: letter });
      }
    }
  }
}

const botService = new WhatsAppBotService();

module.exports = botService;
