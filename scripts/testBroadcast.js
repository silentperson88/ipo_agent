const botService = require('../services/whatsappBot');
const { getLatestIposFromDb, syncIposToDb } = require('../services/dbService');
const { getLiveIpos } = require('../services/fetcher');
const { analyzeAllIpos } = require('../services/aiAnalyzer');
const { formatDailyDigest, formatSingleIpoLetter } = require('../templates/ipoNewsletter');
const config = require('../config');

async function runTestBroadcast() {
  console.log('======================================================');
  console.log('🚀 RUN4DREAM — SEND TEST IPO INTELLIGENCE BULLETIN');
  console.log('======================================================');

  // 1. Initialize WhatsApp connection
  await botService.initialize();

  console.log('⏳ Connecting to WhatsApp...');
  let attempts = 0;
  while (!botService.isConnected && attempts < 15) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  if (!botService.isConnected) {
    console.error('❌ Bot not connected yet. If you haven\'t paired yet, run "npm run whatsapp:login" first.');
    process.exit(1);
  }

  // 2. Ensure groups are loaded
  if (!botService.availableGroups || botService.availableGroups.length === 0) {
    await botService.loadCommunityGroups();
  }

  console.log(`\n📋 Joined Groups / Communities (${botService.availableGroups.length} found):`);
  botService.availableGroups.forEach((g, idx) => {
    console.log(`  [${idx + 1}] "${g.subject}" (JID: ${g.id})`);
  });

  const targetJid = process.env.WHATSAPP_TARGET_GROUP_JID || config.whatsapp?.targetGroupJid || botService.targetGroupJid || (botService.availableGroups.length > 0 ? botService.availableGroups[0].id : null);

  if (!targetJid) {
    console.error('\n❌ No target group found. Please specify WHATSAPP_TARGET_GROUP_JID in .env or join a group.');
    process.exit(1);
  }

  console.log(`\n🎯 Target Broadcast Channel: ${targetJid}`);

  // 3. Fetch data from MongoDB (or scrape if fresh)
  let data = await getLatestIposFromDb();
  if (!data || !data.ipos || data.ipos.length === 0) {
    console.log('[Test] MongoDB empty. Fetching live IPO quotes...');
    const raw = await getLiveIpos();
    const analyzed = analyzeAllIpos(raw.ipos);
    await syncIposToDb(analyzed);
    data = await getLatestIposFromDb();
  }

  const ipos = data?.ipos || [];
  console.log(`📊 Loaded ${ipos.length} IPOs from MongoDB.`);

  // 4. Format Daily Digest
  const digest = formatDailyDigest(ipos);

  console.log('\n------------------------------------------------------');
  console.log('📱 DISPATCHING TEST INTELLIGENCE DIGEST TO WHATSAPP...');
  console.log('------------------------------------------------------');

  try {
    await botService.sock.sendMessage(targetJid, { text: digest });
    console.log('\n======================================================');
    console.log('✅ TEST MESSAGE SENT SUCCESSFULLY TO YOUR WHATSAPP CHANNEL!');
    console.log(`📱 Delivered to: ${targetJid}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Failed to send message:', err.message);
  }

  setTimeout(() => process.exit(0), 1500);
}

runTestBroadcast();
