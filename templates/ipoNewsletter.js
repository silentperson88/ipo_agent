const config = require('../config');

function formatInr(val) {
  if (!val && val !== 0) return 'N/A';
  return '₹' + Number(val).toLocaleString('en-IN');
}

function getCommunityFooter() {
  const link = config.whatsapp?.communityInviteLink;
  const linkPart = link && link.trim() ? `\n📲 *Join Free Community:* ${link.trim()}` : '';
  
  return `
────────────────────────${linkPart}
_⚠️ ᴅɪsᴄʟᴀɪᴍᴇʀ: ғᴏʀ ᴇᴅᴜᴄᴀᴛɪᴏɴᴀʟ ᴘᴜʀᴘᴏsᴇs ᴏɴʟʏ. ɴᴏᴛ sᴇʙɪ ʀᴇɢɪsᴛᴇʀᴇᴅ ᴀᴅᴠɪᴄᴇ._`;
}

/**
 * Format a single IPO into an Ultra-Clean, High-Density Intelligence Card
 */
function formatSingleIpoLetter(ipo) {
  const a = ipo.analysis || {};
  const gmpP = ipo.gmp?.percent || 0;
  const statusEmoji = ipo.status === 'Closing Today' ? '⏳ *CLOSING TODAY*' : ipo.status === 'Open' ? '🟢 *OPEN FOR BIDDING*' : ipo.status === 'Upcoming' ? '🟣 *UPCOMING*' : ipo.status === 'Allotted' ? '🔵 *ALLOTTED*' : '⚪ *LISTED*';

  return `
🚀 *RUN4DREAM IPO REPORT* 📊
🏢 *${ipo.name}* (${ipo.category})
${statusEmoji}
────────────────────────
💎 *Live GMP:* *+${gmpP}%* (${formatInr(ipo.gmp?.amount)}) 🔥
💰 *Est. Profit / Lot:* *+${formatInr(a.expectedProfitPerLot)}*
🏷️ *Price Band:* ${formatInr(ipo.priceBand?.price)} (${ipo.priceBand?.lotSize || '-'} sh/lot)
📈 *Subscription:* *${ipo.subscription?.raw || 'N/A'}*
📊 *Issue Size:* ${ipo.issueSize || 'N/A'}

🗓️ *Timeline:*
• 🟢 *Bidding:* *${ipo.dates?.open} ➔ ${ipo.dates?.close}*
• 🔵 *Allotment:* *${ipo.dates?.allotment}* | 🚀 *Listing:* *${ipo.dates?.listing}*

🎯 *Verdict:* *${a.verdict || 'APPLY'}* (${a.stars || '⭐⭐⭐'})
👉 *Strategy:* ${a.strategy || 'Monitor institutional bidding.'}
${getCommunityFooter()}
`.trim();
}

/**
 * Format a Daily Morning Digest with Clean Card Tiles
 */
function formatDailyDigest(analyzedIpos) {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const closingToday = analyzedIpos.filter(i => i.status === 'Closing Today');
  const highGmpIpos = analyzedIpos.filter(i => (i.gmp?.percent || 0) >= 20);

  let message = `🌅 *RUN4DREAM DAILY IPO DIGEST* 🚀\n📅 *${today}*\n────────────────────────\n`;

  // 1. Closing Today Section
  if (closingToday.length > 0) {
    message += `⏰ *CLOSING TODAY (Bid before 5 PM):*\n\n`;
    closingToday.forEach(i => {
      const gmpP = i.gmp?.percent || 0;
      const isStrong = gmpP >= 20;
      message += `${isStrong ? '🟢' : '🛑'} *${i.name}* (${i.category})\n`;
      message += `• GMP: *+${gmpP}%* (${formatInr(i.gmp?.amount)}) | Sub: *${i.subscription?.raw || 'N/A'}*\n`;
      message += `• Verdict: ${isStrong ? '🟢 *APPLY FOR GAIN*' : '❌ *AVOID*'}\n\n`;
    });
  }

  // 2. Top High-GMP Opportunities
  message += `────────────────────────\n🔥 *TOP HIGH-GMP OPPORTUNITIES:*\n\n`;
  const topPicks = highGmpIpos.slice(0, 4);
  if (topPicks.length > 0) {
    topPicks.forEach((i, idx) => {
      message += `${idx + 1}. ✨ *${i.name}* (${i.category})\n`;
      message += `   • 💎 GMP: *+${i.gmp?.percent || 0}%* (${formatInr(i.gmp?.amount)})\n`;
      message += `   • 💰 Profit: *~${formatInr(i.analysis?.expectedProfitPerLot)}/lot* | Closes: *${i.dates?.close}*\n\n`;
    });
  }

  message += `⚡ _2:00 PM Final Action Alerts will be dispatched before market close._`;
  message += getCommunityFooter();
  return message.trim();
}

/**
 * Format an instant Breaking Alert for a High-GMP IPO
 */
function formatBreakoutAlert(ipo) {
  const a = ipo.analysis || {};
  const gmpP = ipo.gmp?.percent || 0;

  return `
🚨 *HIGH GMP BREAKOUT ALERT!* 🚀
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
💎 *Live GMP:* *+${gmpP}%* (${formatInr(ipo.gmp?.amount)}) 🔥
💰 *Est. Profit / Lot:* *+${formatInr(a.expectedProfitPerLot)}*
🏷️ *Issue Price:* ${formatInr(ipo.priceBand?.price)} (${ipo.priceBand?.lotSize} sh)
🗓️ *Status:* ${ipo.status} (Closes: *${ipo.dates?.close}*)

🎯 *Action:* *${a.verdict}*
${getCommunityFooter()}
`.trim();
}

module.exports = {
  formatSingleIpoLetter,
  formatDailyDigest,
  formatBreakoutAlert
};
