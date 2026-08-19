const botService = require('../services/whatsappBot');
const { getLatestIposFromDb } = require('../services/dbService');
const { formatDailyDigest } = require('../templates/ipoNewsletter');

async function runTestBroadcast() {
  console.log('======================================================');
  console.log('🚀 RUN4DREAM — TESTING WHATSAPP COMMUNITY BROADCAST');
  console.log('======================================================');

  await botService.initialize();

  console.log('Waiting for WhatsApp connection...');
  let attempts = 0;
  while (!botService.isConnected && attempts < 15) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  if (!botService.isConnected) {
    console.error('❌ Bot not connected yet. If not paired, run "npm run whatsapp:login" first.');
    process.exit(1);
  }

  // Ensure groups are loaded
  if (!botService.availableGroups || botService.availableGroups.length === 0) {
    await botService.loadCommunityGroups();
  }

  console.log(`\n📋 Your Joined Groups (${botService.availableGroups.length} found):`);
  botService.availableGroups.forEach((g, idx) => {
    console.log(`  [${idx + 1}] "${g.subject}" ➔ JID: ${g.id}`);
  });

  const targetJid = botService.targetGroupJid || (botService.availableGroups.length > 0 ? botService.availableGroups[0].id : null);

  if (!targetJid) {
    console.error('\n❌ No group found. Please create a group or specify WHATSAPP_TARGET_GROUP_JID in .env');
    process.exit(1);
  }

  console.log(`\n🎯 Selected Target Group JID: ${targetJid}`);

  const data = await getLatestIposFromDb();
  if (!data || !data.ipos) {
    console.error('❌ No IPO data in database. Run "node index.js" first.');
    process.exit(1);
  }

  console.log(`Formatting Run4Dream Daily Digest for ${data.ipos.length} IPOs...`);
  const digest = formatDailyDigest(data.ipos);

  try {
    await botService.sock.sendMessage(targetJid, { text: digest });
    console.log('\n======================================================');
    console.log('✅ TEST MESSAGE SENT SUCCESSFULLY TO YOUR WHATSAPP GROUP!');
    console.log('📱 Check your WhatsApp group now to view the live report.');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Failed to send message:', err.message);
  }

  setTimeout(() => process.exit(0), 1500);
}

runTestBroadcast();
