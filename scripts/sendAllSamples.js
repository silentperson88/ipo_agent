const botService = require('../services/whatsappBot');
const { getLatestIposFromDb } = require('../services/dbService');
const {
  formatMorningKickoff,
  formatFinalActionAlert,
  formatEveningScorecard,
  formatUpcomingAnnouncement
} = require('../templates/eventMessages');
const { formatDailyDigest } = require('../templates/ipoNewsletter');

async function sendUpdatedTableSamples() {
  console.log('======================================================');
  console.log('🚀 SENDING NEW TABLE-FORMATTED SAMPLES TO COMMUNITY');
  console.log('======================================================');

  await botService.initialize();

  let attempts = 0;
  while (!botService.isConnected && attempts < 12) {
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }

  if (!botService.isConnected) {
    console.error('❌ Bot not connected.');
    process.exit(1);
  }

  const targetJid = '120363409446063630@g.us'; // ALPHA IPO AI Announcements
  const dbData = await getLatestIposFromDb();
  const ipos = dbData?.ipos || [];

  const openIpos = ipos.filter(i => i.status === 'Open');
  const closingIpos = ipos.filter(i => i.status === 'Closing Today');
  const upcomingIpos = ipos.filter(i => i.status === 'Upcoming');

  const sampleMessages = [
    {
      title: 'TABLE 1: 🌅 Morning Kickoff Table Matrix (08:30 AM)',
      msg: formatMorningKickoff(openIpos.slice(0, 3), closingIpos)
    },
    {
      title: 'TABLE 2: 🌅 Daily Digest Top Picks Table',
      msg: formatDailyDigest(ipos)
    },
    {
      title: 'TABLE 3: 🌙 Evening Scorecard Table Matrix (07:00 PM)',
      msg: formatEveningScorecard(closingIpos, [
        { name: 'Shiprocket', category: 'Mainboard', gmp: { amount: 35, percent: 36.1 }, dates: { listing: '19-Aug' } },
        { name: 'Behari Lal Eng.', category: 'Mainboard', gmp: { amount: 133, percent: 46.7 }, dates: { listing: '19-Aug' } }
      ])
    },
    {
      title: 'TABLE 4: 🔭 Upcoming Pipeline Radar Table (09:00 PM)',
      msg: formatUpcomingAnnouncement(upcomingIpos.slice(0, 4))
    }
  ];

  for (let i = 0; i < sampleMessages.length; i++) {
    const item = sampleMessages[i];
    console.log(`\n[${i + 1}/${sampleMessages.length}] Sending ${item.title}...`);
    try {
      await botService.sock.sendMessage(targetJid, { text: item.msg });
      console.log(`✓ Sent ${item.title}`);
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`✗ Error sending ${item.title}:`, err.message);
    }
  }

  console.log('\n======================================================');
  console.log('✨ ALL TABLE SAMPLES DELIVERED TO YOUR WHATSAPP COMMUNITY!');
  console.log('======================================================');

  setTimeout(() => process.exit(0), 1000);
}

sendUpdatedTableSamples();
