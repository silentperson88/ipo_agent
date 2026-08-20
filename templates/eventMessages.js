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

// 1. Morning Market Kickoff (08:30 AM)
function formatMorningKickoff(openingTodayIpos, closingTodayIpos) {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  let msg = `🌅 *RUN4DREAM IPO MORNING KICKOFF* 🚀\n📅 *${today}*\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (closingTodayIpos.length > 0) {
    msg += `⏳ *CLOSING TODAY (Bid before 5:00 PM):*\n────────────────────────\n`;
    closingTodayIpos.forEach(i => {
      const gmpP = i.gmp?.percent || 0;
      const profit = i.analysis?.expectedProfitPerLot ? ` | 💰 *\`+${formatInr(i.analysis.expectedProfitPerLot)}/lot\`*` : '';
      const verdictBadge = getVerdictBadge(i.analysis?.verdict, gmpP);
      const trendStr = getGmpTrendString(gmpP, i.gmp?.amount);

      msg += `🏢 *${i.name}* (${i.category})\n`;
      msg += `• GMP: ${trendStr}${profit}\n`;
      msg += `• Sub: *\`${i.subscription?.raw || 'N/A'}\`* ➔ ${verdictBadge}\n\n`;
    });
  }

  if (openingTodayIpos.length > 0) {
    msg += `🟢 *OPEN FOR BIDDING (Day 1 / Day 2):*\n────────────────────────\n`;
    openingTodayIpos.forEach(i => {
      const gmpP = i.gmp?.percent || 0;
      const profit = i.analysis?.expectedProfitPerLot ? ` | 💰 *\`+${formatInr(i.analysis.expectedProfitPerLot)}/lot\`*` : '';
      const verdictBadge = getVerdictBadge(i.analysis?.verdict, gmpP);
      const trendStr = getGmpTrendString(gmpP, i.gmp?.amount);

      msg += `🏢 *${i.name}* (${i.category})\n`;
      msg += `• GMP: ${trendStr}${profit}\n`;
      msg += `• Sub: *\`${i.subscription?.raw || 'N/A'}\`* ➔ ${verdictBadge}\n\n`;
    });
  }

  msg += `⚡ _Final 02:00 PM Action Alert will be dispatched before market close._`;
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
🚨 *LAST 2 HOURS — ACTION ALERT* ⏳
━━━━━━━━━━━━━━━━━━━━━
🏢 *${closingIpo.name}* (${closingIpo.category})
⏰ *Bidding Closes at 5:00 PM Today*
────────────────────────
💎 *Live GMP:* 🟢 ⬆️ *+${gmpP}%* (\`${formatInr(closingIpo.gmp?.amount)}\`) 🚀
💰 *Est. Net Gain:* *\`+${formatInr(a.expectedProfitPerLot)} / lot\`* 🔥
📈 *Total Bidding:* *\`${closingIpo.subscription?.raw || 'High Demand'}\`*
🏷️ *Price Band:* \`${formatInr(closingIpo.priceBand?.price)}\` (${closingIpo.priceBand?.lotSize || '-'} sh/lot)

🎯 *FINAL ACTION:* 🟢 *[ 🔥 STRONG APPLY AT CUT-OFF ]*
👉 _Apply across family demats for maximum allotment odds._
${getCommunityFooter()}
    `.trim();
  } else {
    return `
🛑 *LAST 2 HOURS — ACTION ALERT* ⏳
━━━━━━━━━━━━━━━━━━━━━
🏢 *${closingIpo.name}* (${closingIpo.category})
⏰ *Bidding Closes at 5:00 PM Today*
────────────────────────
📉 *Live GMP:* 🔴 ⬇️ *+${gmpP}%* (\`${formatInr(closingIpo.gmp?.amount)}\`)
⚠️ *Total Bidding:* *\`${closingIpo.subscription?.raw || 'Subdued'}\`*
🏷️ *Price Band:* \`${formatInr(closingIpo.priceBand?.price)}\`

🎯 *FINAL ACTION:* 🛑 *[ ❌ AVOID / CAPITAL RISK ]*
👉 _Thin cushion. High probability of flat/discount listing. Protect your capital!_
${getCommunityFooter()}
    `.trim();
  }
}

// 3. Evening Scorecard & Post-Close Headlines (07:00 PM)
function formatEveningScorecard(closedTodayIpos, postCloseMovements = []) {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  let msg = `🌙 *RUN4DREAM EVENING SCORECARD* 📊\n📅 *${today}*\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (closedTodayIpos.length > 0) {
    msg += `📋 *BIDDING CLOSED TODAY:*\n────────────────────────\n`;
    closedTodayIpos.forEach(i => {
      const a = i.analysis || {};
      const gmpP = i.gmp?.percent || 0;
      const trendStr = getGmpTrendString(gmpP, i.gmp?.amount);

      msg += `🏢 *${i.name}* (${i.category})\n`;
      msg += `• Final Sub: *\`${i.subscription?.raw || 'N/A'}\`* | GMP: ${trendStr}\n`;
      msg += `• Est. Gain: 💰 *\`+${formatInr(a.expectedProfitPerLot)}/lot\`* | BoA: *${i.dates?.allotment || 'TBA'}*\n\n`;
    });
  }

  if (postCloseMovements.length > 0) {
    msg += `📈 *POST-CLOSE GMP SHIFTS:*\n────────────────────────\n`;
    postCloseMovements.forEach(i => {
      const gmpP = i.gmp?.percent || 0;
      const trendStr = getGmpTrendString(gmpP, i.gmp?.amount);

      msg += `⚡ *${i.name}* (${i.category})\n`;
      msg += `• Latest GMP: ${trendStr} | Listing: 🚀 *${i.dates?.listing || 'TBA'}*\n\n`;
    });
  }

  msg += `🎫 _Direct allotment status check links will be dispatched on BoA date._`;
  msg += getCommunityFooter();
  return msg.trim();
}

// 4. Upcoming Pipeline Announcement (09:00 PM) — T-3 & T-1 Countdown Only
function formatUpcomingAnnouncement(upcomingIpos) {
  let msg = `🔭 *UPCOMING IPO PIPELINE RADAR* 🚀\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
  upcomingIpos.forEach(i => {
    const badge = i.countdownBadge || (i.daysUntilOpen === 1 ? '🚨 *[ ⏰ OPENS TOMORROW ]*' : i.daysUntilOpen === 3 ? '⏳ *[ 📅 OPENS IN 3 DAYS ]*' : '🗓️ *[ 📋 UPCOMING ]*');
    const trendStr = getGmpTrendString(i.gmp?.percent, i.gmp?.amount);

    msg += `${badge}\n`;
    msg += `🏢 *${i.name}* (${i.category})\n`;
    msg += `• Early GMP: ${trendStr} | Price: *\`${formatInr(i.priceBand?.price)}\`*\n`;
    msg += `• Bidding Window: 🗓️ *${i.dates?.open || 'TBA'} ➔ ${i.dates?.close || 'TBA'}*\n\n`;
  });
  msg += `⚡ _Full subscription telemetry & apply/avoid strategy will be dispatched on opening morning._`;
  msg += getCommunityFooter();
  return msg.trim();
}

// 5. 5% GMP Shift Alert (Instant Alert)
function formatGmpShiftAlert(ipo, oldPercent, newPercent) {
  const diff = parseFloat((newPercent - oldPercent).toFixed(1));
  const isUp = diff > 0;

  if (isUp) {
    return `
🚀 *GMP BREAKOUT JUMP ALERT!* 📈 ⬆️
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
💥 *GMP Jumped:* \`+${oldPercent}%\` ➔ \`+${newPercent}%\` (🟢 ⬆️ *+${diff}% Surge!*)

💎 *Live GMP:* 🟢 ⬆️ *+${newPercent}%* (\`${formatInr(ipo.gmp?.amount)}\`) 🚀
💰 *Est. Profit / Lot:* *\`+${formatInr(ipo.analysis?.expectedProfitPerLot)}\`*
🗓️ *Status:* ${ipo.status} (Closes: *${ipo.dates?.close || 'TBA'}*)

👉 *VERDICT:* 🚀 *[ 🔥 BLOCKBUSTER BUYER RUSH ]*
${getCommunityFooter()}
    `.trim();
  } else {
    return `
⚠️ *GMP FALL / COOL-OFF ALERT* 📉 ⬇️
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
⚡ *GMP Dropped:* \`+${oldPercent}%\` ➔ \`+${newPercent}%\` (🔴 ⬇️ *-${Math.abs(diff)}% Drop*)

📉 *Current GMP:* 🔴 ⬇️ *+${newPercent}%* (\`${formatInr(ipo.gmp?.amount)}\`)
👀 *Advice:* 🛑 *[ ⚠️ CAUTION — DEMAND SOFTENING ]*
${getCommunityFooter()}
    `.trim();
  }
}

// 6. Subscription Milestone Alert (30x, 50x, 100x)
function formatSubscriptionMilestone(ipo, milestone) {
  let tag = '🟢 *[ 📈 30x DEMAND CROSSED! ]* 🟢 ⬆️';
  if (milestone >= 100) tag = '👑 *[ 🚀 BLOCKBUSTER 100x HIT! ]* 💥 ⬆️';
  else if (milestone >= 50) tag = '🔥 *[ ⚡ 50x INSTITUTIONAL SURGE! ]* 📈 ⬆️';

  return `
${tag}
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
📊 *Live Bidding:* *\`${ipo.subscription?.raw || milestone + 'x'}\`* 🔥

💎 *Live GMP:* ${getGmpTrendString(ipo.gmp?.percent, ipo.gmp?.amount)}
💰 *Est. Profit / Lot:* *\`+${formatInr(ipo.analysis?.expectedProfitPerLot)}\`*
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
🎉 *[ 🚀 BUMPER LISTING BELL! ]* 🔔 💰
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}*
📈 *Listed at:* *\`${formatInr(listingPrice)}\`* (🟢 ⬆️ *+${gainPercent}%* Gain!) 🔥
🏷️ *Issue Price:* \`${formatInr(issuePrice)}\`
💰 *Net Profit / Lot:* *\`+${formatInr(profitPerLot)}\`* 🚀

👑 _Congrats to all members who applied on our STRONG APPLY call!_
${getCommunityFooter()}
    `.trim();
  } else {
    return `
🛡️ *[ 🛡️ CAPITAL PROTECTED ON AVOID ]* 🔔
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* Listed at Discount
📉 *Listed at:* \`${formatInr(listingPrice)}\` (🔴 ⬇️ *${gainPercent}%* Discount)
🏷️ *Issue Price:* \`${formatInr(issuePrice)}\`

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
🎫 *[ 📢 ALLOTMENT STATUS IS OUT! ]* 🎫
━━━━━━━━━━━━━━━━━━━━━
🏢 *${ipo.name}* (${ipo.category})
💎 *Live GMP:* ${getGmpTrendString(ipo.gmp?.percent, ipo.gmp?.amount)}
🚀 *Listing Date:* *${ipo.dates?.listing || 'TBA'}*
💰 *Expected Profit / Lot:* *\`+${formatInr(ipo.analysis?.expectedProfitPerLot)}\`*

🔗 *Direct Verification Portals:*
👉 *${regName}:* ${regUrl}
👉 *BSE Universal Check (PAN):* ${bseUrl}
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
