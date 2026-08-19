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

// 1. Morning Market Kickoff (08:30 AM) — Clean Card Tiles
function formatMorningKickoff(openingTodayIpos, closingTodayIpos) {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  let msg = `🌅 *RUN4DREAM IPO MORNING KICKOFF* 🚀\n📅 *${today}*\n────────────────────────\n`;

  if (closingTodayIpos.length > 0) {
    msg += `⏰ *CLOSING TODAY (Bid before 5 PM):*\n\n`;
    closingTodayIpos.forEach(i => {
      const gmpP = i.gmp?.percent || 0;
      const profit = i.analysis?.expectedProfitPerLot ? ` | 💰 *+${formatInr(i.analysis.expectedProfitPerLot)}/lot*` : '';
      const isStrong = gmpP >= 20;
      const verdict = isStrong ? '🟢 *APPLY FOR GAIN*' : '❌ *AVOID (DISCOUNT RISK)*';
      const icon = isStrong ? '🟢' : '🛑';

      msg += `${icon} *${i.name}* (${i.category})\n`;
      msg += `• GMP: *+${gmpP}%* (${formatInr(i.gmp?.amount)})${profit}\n`;
      msg += `• Sub: *${i.subscription?.raw || 'N/A'}* ➔ ${verdict}\n\n`;
    });
  }

  if (openingTodayIpos.length > 0) {
    msg += `────────────────────────\n🟢 *OPEN FOR BIDDING:*\n\n`;
    openingTodayIpos.forEach(i => {
      const gmpP = i.gmp?.percent || 0;
      const profit = i.analysis?.expectedProfitPerLot ? ` | 💰 *+${formatInr(i.analysis.expectedProfitPerLot)}/lot*` : '';
      const verdict = i.analysis?.verdict || (gmpP >= 35 ? '🔥 *STRONG APPLY*' : gmpP >= 20 ? '🟢 *APPLY*' : '👀 *WATCH*');

      msg += `✨ *${i.name}* (${i.category})\n`;
      msg += `• GMP: *+${gmpP}%* (${formatInr(i.gmp?.amount)})${profit}\n`;
      msg += `• Sub: *${i.subscription?.raw || 'N/A'}* ➔ ${verdict}\n\n`;
    });
  }

  msg += `⚡ _Final 2:00 PM Action Alert will be sent before 5 PM close._`;
  msg += getCommunityFooter();
  return msg.trim();
}

// 2. Final 2-Hour Action Alert (02:00 PM on Closing Day)
function formatFinalActionAlert(closingIpo) {
  const a = closingIpo.analysis || {};
  const gmpP = closingIpo.gmp?.percent || 0;
  const isStrong = gmpP >= 20;

  if (isStrong) {
    return `
🚨 *LAST 2 HOURS — STRONG APPLY ALERT!* 🔥
━━━━━━━━━━━━━━━━━━━━━
🏢 *${closingIpo.name}* (${closingIpo.category})
⏳ *Bidding Closes at 5:00 PM Today*
────────────────────────
💎 *Live GMP:* *+${gmpP}%* (${formatInr(closingIpo.gmp?.amount)}) 🚀
💰 *Est. Profit / Lot:* *+${formatInr(a.expectedProfitPerLot)}*
📈 *Total Subscription:* *${closingIpo.subscription?.raw || 'High Demand'}* 🔥
🏷️ *Price Band:* ${formatInr(closingIpo.priceBand?.price)} (${closingIpo.priceBand?.lotSize || '-'} sh/lot)

🎯 *FINAL ACTION:* *🟢 APPLY AT CUT-OFF*
_Apply across family demat accounts for maximum allotment odds._
${getCommunityFooter()}
    `.trim();
  } else {
    return `
🛑 *LAST 2 HOURS — AVOID / CAUTION ALERT* 🛑
━━━━━━━━━━━━━━━━━━━━━
🏢 *${closingIpo.name}* (${closingIpo.category})
⏳ *Bidding Closes at 5:00 PM Today*
────────────────────────
📉 *Live GMP:* *+${gmpP}%* (${formatInr(closingIpo.gmp?.amount)})
⚠️ *Subscription:* *${closingIpo.subscription?.raw || 'Subdued'}*
🏷️ *Price Band:* ${formatInr(closingIpo.priceBand?.price)}

🎯 *FINAL ACTION:* *❌ AVOID (DISCOUNT RISK)*
_Thin cushion. High chance of negative/flat listing. Save your capital!_
${getCommunityFooter()}
    `.trim();
  }
}

// 3. Evening Scorecard & Post-Close Headlines (07:00 PM) — Clean Card Tiles
function formatEveningScorecard(closedTodayIpos, postCloseMovements = []) {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  let msg = `🌙 *RUN4DREAM EVENING SCORECARD* 📊\n📅 *${today}*\n────────────────────────\n`;

  if (closedTodayIpos.length > 0) {
    msg += `📋 *BIDDING CLOSED TODAY:*\n\n`;
    closedTodayIpos.forEach(i => {
      const a = i.analysis || {};
      msg += `👑 *${i.name}* (${i.category})\n`;
      msg += `• Final Sub: *${i.subscription?.raw || 'N/A'}* 🔥 | GMP: *+${i.gmp?.percent || 0}%*\n`;
      msg += `• Est. Gain: 💰 *+${formatInr(a.expectedProfitPerLot)}/lot* | Allotment: *${i.dates?.allotment || 'TBA'}*\n\n`;
    });
  }

  if (postCloseMovements.length > 0) {
    msg += `────────────────────────\n📈 *POST-CLOSE GMP HEADLINES:*\n\n`;
    postCloseMovements.forEach(i => {
      msg += `⚡ *${i.name}* (${i.category})\n`;
      msg += `• GMP: *+${i.gmp?.percent || 0}%* (${formatInr(i.gmp?.amount)}) | Listing: 🚀 *${i.dates?.listing || 'TBA'}*\n\n`;
    });
  }

  msg += `🎫 _Allotment status direct links will be posted on allotment day._`;
  msg += getCommunityFooter();
  return msg.trim();
}

// 4. Upcoming Pipeline Announcement (09:00 PM) — Clean Card Tiles
function formatUpcomingAnnouncement(newIpos) {
  let msg = `🔭 *NEW IPO PIPELINE RADAR* 🚀\n────────────────────────\n\n`;
  newIpos.forEach(i => {
    msg += `✨ *${i.name}* (${i.category})\n`;
    msg += `• Early GMP: *+${i.gmp?.percent || 0}%* (${formatInr(i.gmp?.amount)}) | Price: *${formatInr(i.priceBand?.price)}*\n`;
    msg += `• Bidding: 🗓️ *${i.dates?.open || 'TBA'} ➔ ${i.dates?.close || 'TBA'}*\n\n`;
  });
  msg += `⚡ _Final metrics & apply/avoid strategy will be dispatched when bidding opens._`;
  msg += getCommunityFooter();
  return msg.trim();
}

// 5. 5% GMP Shift Alert (Instant Alert)
function formatGmpShiftAlert(ipo, oldPercent, newPercent) {
  const diff = parseFloat((newPercent - oldPercent).toFixed(1));
  const isUp = diff > 0;

  if (isUp) {
    return `
🚀 *GMP BREAKOUT SURGE ALERT!* 📈
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
💥 *GMP Jumped:* *+${oldPercent}%* ➔ *+${newPercent}%* (*+${diff}% Surge!*)

💎 *Live GMP:* *+${newPercent}%* (${formatInr(ipo.gmp?.amount)}) 🔥
💰 *Est. Profit / Lot:* *+${formatInr(ipo.analysis?.expectedProfitPerLot)}*
🗓️ *Status:* ${ipo.status} (Closes: *${ipo.dates?.close || 'TBA'}*)

👉 *VERDICT:* *🚀 BLOCKBUSTER BUYER RUSH!*
${getCommunityFooter()}
    `.trim();
  } else {
    return `
⚠️ *GMP COOLING DOWN ALERT* 📉
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
⚡ *GMP Dropped:* *+${oldPercent}%* ➔ *+${newPercent}%* (*-${diff}%*)

📉 *Current GMP:* *+${newPercent}%* (${formatInr(ipo.gmp?.amount)})
👀 *Advice:* *⚠️ CAUTION* — Grey market demand softening.
${getCommunityFooter()}
    `.trim();
  }
}

// 6. Subscription Milestone Alert (30x, 50x, 100x)
function formatSubscriptionMilestone(ipo, milestone) {
  let tag = '🟢 *30x SUBSCRIPTION CROSSED!* 📈';
  if (milestone >= 100) tag = '🚀 *BLOCKBUSTER 100x SUBSCRIPTION HIT!* 👑';
  else if (milestone >= 50) tag = '🔥 *50x SUBSCRIPTION SURGE!* 💥';

  return `
${tag}
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
📊 *Live Bidding:* *${ipo.subscription?.raw || milestone + 'x'}* 🔥

💎 *Live GMP:* *+${ipo.gmp?.percent || 0}%* (${formatInr(ipo.gmp?.amount)})
💰 *Est. Profit / Lot:* *+${formatInr(ipo.analysis?.expectedProfitPerLot)}*
⏳ *Bidding Closes:* *${ipo.dates?.close || 'TBA'}*

💡 _Massive institutional rush detected! Strong listing jump expected._
${getCommunityFooter()}
  `.trim();
}

// 7. Listing Day Bell (10:00 AM)
function formatListingBell(ipo, listingPrice, issuePrice) {
  const profitPerShare = listingPrice - issuePrice;
  const gainPercent = issuePrice > 0 ? ((profitPerShare / issuePrice) * 100).toFixed(1) : 0;
  const profitPerLot = (ipo.priceBand?.lotSize || 1) * profitPerShare;
  const isGain = profitPerShare > 0;

  if (isGain) {
    return `
🎉 *BUMPER LISTING BELL!* 🔔 💰
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}*
📈 *Listed at:* *${formatInr(listingPrice)}* (*+${gainPercent}%* Gain!) 🔥
🏷️ *Issue Price:* ${formatInr(issuePrice)}
💰 *Net Profit / Lot:* *+${formatInr(profitPerLot)}* 🚀

👑 _Congrats to all members who applied on our STRONG APPLY call!_
${getCommunityFooter()}
    `.trim();
  } else {
    return `
🛡️ *CAPITAL PROTECTED!* 🔔
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* Listed at Discount
📉 *Listed at:* ${formatInr(listingPrice)} (*${gainPercent}%* Discount)
🏷️ *Issue Price:* ${formatInr(issuePrice)}

🛡️ _Good thing you followed our **AVOID** call and saved your capital!_
${getCommunityFooter()}
    `.trim();
  }
}

// 8. Allotment Status Out Alert
function formatAllotmentAlert(ipo, registrarObj = null) {
  const regName = registrarObj?.name || ipo.registrar?.name || 'Official Registrar';
  const regUrl = registrarObj?.url || ipo.registrar?.url || 'https://linkintime.co.in/initial_offer/';
  const bseUrl = registrarObj?.bseUrl || 'https://www.bseindia.com/investors/appli_check.aspx';

  return `
🎫 *ALLOTMENT STATUS IS OUT!* 📢
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
💎 *Live GMP:* *+${ipo.gmp?.percent || 0}%* (${formatInr(ipo.gmp?.amount)}) 🔥
🚀 *Listing Date:* *${ipo.dates?.listing || 'TBA'}*
💰 *Expected Profit / Lot:* *\`+${formatInr(ipo.analysis?.expectedProfitPerLot)}\`*

🔗 *Check Allotment Status:*
👉 *${regName}:* ${regUrl}
👉 *BSE Direct Check (PAN):* ${bseUrl}
${getCommunityFooter()}
  `.trim();
}

module.exports = {
  formatMorningKickoff,
  formatFinalActionAlert,
  formatEveningScorecard,
  formatUpcomingAnnouncement,
  formatGmpShiftAlert,
  formatSubscriptionMilestone,
  formatListingBell,
  formatAllotmentAlert
};
