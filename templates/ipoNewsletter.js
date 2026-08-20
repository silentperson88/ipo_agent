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

function getVerdictBadge(verdictText, gmpPercent = 0) {
  const v = (verdictText || '').toUpperCase();
  if (gmpPercent >= 50 || v.includes('BLOCKBUSTER')) {
    return '🚀 *[ 🔥 BLOCKBUSTER APPLY ]*';
  } else if (gmpPercent >= 35 || v.includes('STRONG APPLY')) {
    return '🟢 *[ 🔥 STRONG APPLY ]*';
  } else if (gmpPercent >= 20 || (v.includes('APPLY') && !v.includes('AVOID'))) {
    return '🟢 *[ 🟢 APPLY FOR GAIN ]*';
  } else if (gmpPercent >= 10 || v.includes('CAUTION') || v.includes('WATCH')) {
    return '🟡 *[ ⚠️ CAUTION / WATCH ]*';
  } else {
    return '🛑 *[ ❌ AVOID / CAPITAL RISK ]*';
  }
}

function getGmpTrendString(gmpPercent, gmpAmount) {
  const p = Number(gmpPercent || 0);
  const amt = formatInr(gmpAmount);
  if (p >= 20) {
    return `🟢 ⬆️ *+${p}%* (\`${amt}\`) 🚀`;
  } else if (p >= 10) {
    return `🟡 ➡️ *+${p}%* (\`${amt}\`)`;
  } else if (p > 0) {
    return `🟠 ↘️ *+${p}%* (\`${amt}\`)`;
  } else {
    return `🔴 ⬇️ *${p}%* (\`${amt}\`)`;
  }
}

/**
 * Format a single IPO into an Ultra-Clean, High-Density Intelligence Card
 */
function formatSingleIpoLetter(ipo) {
  const a = ipo.analysis || {};
  const gmpP = ipo.gmp?.percent || 0;
  const statusBadge = ipo.status === 'Closing Today' ? '⏳ *[ CLOSING TODAY ]*' : ipo.status === 'Open' ? '🟢 *[ OPEN FOR BIDDING ]*' : ipo.status === 'Upcoming' ? '🟣 *[ UPCOMING ]*' : ipo.status === 'Allotted' ? '🔵 *[ ALLOTTED ]*' : '⚪ *[ LISTED ]*';
  const verdictBadge = getVerdictBadge(a.verdict, gmpP);
  const trendStr = getGmpTrendString(gmpP, ipo.gmp?.amount);

  return `
🚀 *RUN4DREAM IPO INTELLIGENCE REPORT* 📊
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
${statusBadge}
────────────────────────
💎 *Live GMP:* ${trendStr}
💰 *Est. Net Gain:* *\`+${formatInr(a.expectedProfitPerLot)} / lot\`* 🔥
🏷️ *Price Band:* *\`${formatInr(ipo.priceBand?.price)}\`* (${ipo.priceBand?.lotSize || '-'} sh/lot)
📈 *Subscription:* *\`${ipo.subscription?.raw || 'N/A'}\`*
📊 *Issue Size:* ${ipo.issueSize || 'N/A'}

🗓️ *Key Milestones:*
• 🟢 *Bidding:* *${ipo.dates?.open || 'TBA'} ➔ ${ipo.dates?.close || 'TBA'}*
• 🔵 *Allotment:* *${ipo.dates?.allotment || 'TBA'}* | 🚀 *Listing:* *${ipo.dates?.listing || 'TBA'}*

🎯 *VERDICT:* ${verdictBadge} (${a.stars || '⭐⭐⭐'})
👉 *Strategy:* ${a.strategy || 'Track bidding demand.'}
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

  let message = `🌅 *RUN4DREAM DAILY IPO DIGEST* 🚀\n📅 *${today}*\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // 1. Closing Today Section
  if (closingToday.length > 0) {
    message += `⏳ *CLOSING TODAY (Bid before 5:00 PM):*\n────────────────────────\n`;
    closingToday.forEach(i => {
      const gmpP = i.gmp?.percent || 0;
      const verdictBadge = getVerdictBadge(i.analysis?.verdict, gmpP);
      const trendStr = getGmpTrendString(gmpP, i.gmp?.amount);
      const profit = i.analysis?.expectedProfitPerLot ? ` | 💰 *\`+${formatInr(i.analysis.expectedProfitPerLot)}/lot\`*` : '';

      message += `🏢 *${i.name}* (${i.category})\n`;
      message += `• GMP: ${trendStr}${profit}\n`;
      message += `• Sub: *\`${i.subscription?.raw || 'N/A'}\`* ➔ ${verdictBadge}\n\n`;
    });
  }

  // 2. Top High-GMP Opportunities
  message += `🔥 *TOP HIGH-GMP OPPORTUNITIES:*\n────────────────────────\n`;
  const topPicks = highGmpIpos.slice(0, 4);
  if (topPicks.length > 0) {
    topPicks.forEach((i, idx) => {
      const trendStr = getGmpTrendString(i.gmp?.percent, i.gmp?.amount);
      message += `${idx + 1}. ✨ *${i.name}* (${i.category})\n`;
      message += `   • 💎 GMP: ${trendStr}\n`;
      message += `   • 💰 Est. Profit: *\`~+${formatInr(i.analysis?.expectedProfitPerLot)}/lot\`* | Closes: *${i.dates?.close}*\n\n`;
    });
  }

  message += `⚡ _Final 02:00 PM Action Alerts will be dispatched before market close._`;
  message += getCommunityFooter();
  return message.trim();
}

/**
 * Format an instant Breaking Alert for a High-GMP IPO
 */
function formatBreakoutAlert(ipo) {
  const a = ipo.analysis || {};
  const gmpP = ipo.gmp?.percent || 0;
  const verdictBadge = getVerdictBadge(a.verdict, gmpP);
  const trendStr = getGmpTrendString(gmpP, ipo.gmp?.amount);

  return `
🚨 *HIGH GMP BREAKOUT JUMP!* 🚀 📈
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
💎 *Live GMP:* ${trendStr}
💰 *Est. Net Gain:* *\`+${formatInr(a.expectedProfitPerLot)} / lot\`* 🔥
🏷️ *Issue Price:* \`${formatInr(ipo.priceBand?.price)}\` (${ipo.priceBand?.lotSize} sh)
🗓️ *Status:* ${ipo.status} (Closes: *${ipo.dates?.close || 'TBA'}*)

🎯 *VERDICT:* ${verdictBadge}
${getCommunityFooter()}
`.trim();
}

module.exports = {
  formatSingleIpoLetter,
  formatDailyDigest,
  formatBreakoutAlert
};
