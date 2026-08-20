const botService = require('../services/whatsappBot');

const isReset = process.argv.includes('--reset') || process.argv.includes('-r');

console.log('======================================================');
console.log('🤖 RUN4DREAM — WHATSAPP DEVICE LINKING TERMINAL');
console.log('======================================================');

if (isReset) {
  console.log('🔄 Reset requested. Purging previous session keys...');
}

console.log('Initializing connection to WhatsApp...\n');

botService.initialize(isReset);
