const config = require('../config');
const { NotificationState, connectDb } = require('./dbService');
const { 
  formatGmpShiftAlert, 
  formatSubscriptionMilestone, 
  formatFinalActionAlert, 
  formatMorningKickoff, 
  formatEveningScorecard, 
  formatUpcomingAnnouncement 
} = require('../templates/eventMessages');

function checkDateReset(state, todayStr) {
  if (state.lastAlertDate !== todayStr) {
    state.instantAlertsSentToday = 0;
    state.lastAlertDate = todayStr;
  }
}

/**
 * Evaluates live IPO list against Percentage-Based Notification Rules
 */
async function processEventDrivenAlerts(analyzedIpos, whatsappService = null) {
  await connectDb();
  if (!NotificationState) return { instantAlertsCount: 0, alerts: [], postCloseMovements: [] };

  const todayStr = new Date().toISOString().split('T')[0];
  const generatedAlerts = [];
  const postCloseMovements = [];
  const maxAlerts = config.thresholds.maxInstantAlertsPerDay || 2;
  const deltaTrigger = config.thresholds.deltaAlertPercent || 5;

  for (const ipo of analyzedIpos) {
    const ipoId = ipo.id || ipo.name;
    const currentGmpP = Math.round(ipo.gmp?.percent || 0);
    const subTotal = ipo.subscription?.total || 0;
    const status = ipo.status; // 'Upcoming', 'Open', 'Closing Today', 'Closed'

    let state = await NotificationState.findOne({ ipoId });
    if (!state) {
      state = new NotificationState({
        ipoId,
        name: ipo.name,
        lastNotifiedGmpPercent: currentGmpP,
        lastAlertDate: todayStr
      });
    }

    checkDateReset(state, todayStr);

    // =======================================================================
    // RULE 1: CLOSED IPOS (NEVER SEND INSTANT ALERT — BATCH TO 7 PM HEADLINES)
    // =======================================================================
    if (status === 'Closed') {
      const gmpDiff = Math.abs(currentGmpP - (state.lastNotifiedGmpPercent || currentGmpP));
      if (gmpDiff >= deltaTrigger) {
        postCloseMovements.push(ipo);
        state.lastNotifiedGmpPercent = currentGmpP;
        await state.save();
      }
      continue;
    }

    // =======================================================================
    // RULE 2: RATE LIMIT CHECK (MAX 2 INSTANT ALERTS PER IPO PER DAY)
    // =======================================================================
    const canSendInstantAlert = state.instantAlertsSentToday < maxAlerts;

    if (canSendInstantAlert && (status === 'Open' || status === 'Closing Today' || status === 'Upcoming')) {
      const oldGmpP = state.lastNotifiedGmpPercent || currentGmpP;
      const delta = currentGmpP - oldGmpP;

      // 2A: 5% Percentage Delta Movement Trigger
      if (Math.abs(delta) >= deltaTrigger && oldGmpP > 0) {
        const msg = formatGmpShiftAlert(ipo, oldGmpP, currentGmpP);
        generatedAlerts.push({
          type: delta > 0 ? 'GMP_SURGE_ALERT' : 'GMP_DROP_ALERT',
          ipo: ipo.name,
          message: msg
        });

        state.lastNotifiedGmpPercent = currentGmpP;
        state.instantAlertsSentToday += 1;
        state.updatedAt = new Date();
        await state.save();
        continue;
      }

      // 2B: Subscription Milestones (30x, 50x, 100x)
      if (subTotal >= 30) {
        const milestones = [100, 50, 30];
        for (const m of milestones) {
          if (subTotal >= m && !state.subMilestonesSent.includes(m)) {
            const msg = formatSubscriptionMilestone(ipo, m);
            generatedAlerts.push({
              type: `SUBSCRIPTION_${m}X_ALERT`,
              ipo: ipo.name,
              message: msg
            });

            state.subMilestonesSent.push(m);
            state.instantAlertsSentToday += 1;
            state.updatedAt = new Date();
            await state.save();
            break;
          }
        }
      }
    }
  }

  return {
    instantAlertsCount: generatedAlerts.length,
    alerts: generatedAlerts,
    postCloseMovements
  };
}

/**
 * 08:30 AM Morning Kickoff Digest
 */
async function generateMorningKickoffDigest(analyzedIpos) {
  const openingToday = analyzedIpos.filter(i => i.status === 'Open');
  const closingToday = analyzedIpos.filter(i => i.status === 'Closing Today');
  return formatMorningKickoff(openingToday, closingToday);
}

/**
 * 02:00 PM Final Action Alert (Closing Day)
 */
async function generateFinalClosingAlerts(analyzedIpos) {
  await connectDb();
  if (!NotificationState) return [];

  const closingToday = analyzedIpos.filter(i => i.status === 'Closing Today');
  const todayStr = new Date().toISOString().split('T')[0];
  const alerts = [];

  for (const ipo of closingToday) {
    const ipoId = ipo.id || ipo.name;
    const state = await NotificationState.findOne({ ipoId });
    if (!state || state.finalAlertSentDate !== todayStr) {
      const msg = formatFinalActionAlert(ipo);
      alerts.push({ ipo: ipo.name, message: msg });
      if (state) {
        state.finalAlertSentDate = todayStr;
        await state.save();
      }
    }
  }
  return alerts;
}

/**
 * 07:00 PM Evening Scorecard & Post-Close Headlines
 */
async function generateEveningScorecardDigest(analyzedIpos, postCloseMovements = []) {
  const closedToday = analyzedIpos.filter(i => i.status === 'Closing Today' || i.status === 'Closed');
  return formatEveningScorecard(closedToday, postCloseMovements);
}

/**
 * Helper to calculate calendar days remaining until bidding opens
 */
function getDaysUntilBidding(ipo) {
  const rawDate = ipo.dates?.rawOpen || ipo.dates?.open;
  if (!rawDate) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let targetDate = null;
  if (rawDate.includes('-') && rawDate.length === 10) {
    targetDate = new Date(rawDate);
  } else {
    // Parse e.g. '20-Aug'
    const parts = rawDate.split('-');
    const day = parseInt(parts[0]);
    const monthStr = parts[1];
    const months = { 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11 };
    const month = monthStr ? months[monthStr.toLowerCase().slice(0, 3)] : undefined;
    if (!isNaN(day) && month !== undefined) {
      targetDate = new Date(now.getFullYear(), month, day);
      if (targetDate < today && today.getMonth() === 11 && month === 0) {
        targetDate.setFullYear(now.getFullYear() + 1);
      }
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) return null;
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffMs = targetMidnight.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 09:00 PM Upcoming Pipeline Pulse
 * RULE: Informs ONLY 3 days before (T-3) and 1 day before (T-1) bidding starts!
 */
async function generateUpcomingPipelineDigest(analyzedIpos) {
  await connectDb();
  if (!NotificationState) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = analyzedIpos.filter(i => i.status === 'Upcoming');
  const eligibleUpcoming = [];

  for (const ipo of upcoming) {
    const daysUntil = getDaysUntilBidding(ipo);
    if (daysUntil === null) continue;

    const ipoId = ipo.id || ipo.name;
    let state = await NotificationState.findOne({ ipoId });
    if (!state) {
      state = new NotificationState({ ipoId, name: ipo.name });
    }

    // 1. T-3 Alert (3 Days Before Opening: e.g. 17-Aug for 20-Aug Open)
    if (daysUntil === 3 && state.upcomingNotifiedT3Date !== todayStr) {
      ipo.countdownBadge = '⏳ *OPENS IN 3 DAYS (Prepare Funds)*';
      ipo.daysUntilOpen = 3;
      eligibleUpcoming.push(ipo);
      state.upcomingNotifiedT3Date = todayStr;
      state.updatedAt = new Date();
      await state.save();
    } 
    // 2. T-1 Alert (1 Day Before Opening: e.g. 19-Aug for 20-Aug Open)
    else if (daysUntil === 1 && state.upcomingNotifiedT1Date !== todayStr) {
      ipo.countdownBadge = '🚨 *OPENS TOMORROW (Final Checklist)*';
      ipo.daysUntilOpen = 1;
      eligibleUpcoming.push(ipo);
      state.upcomingNotifiedT1Date = todayStr;
      state.updatedAt = new Date();
      await state.save();
    }
  }

  if (eligibleUpcoming.length > 0) {
    return formatUpcomingAnnouncement(eligibleUpcoming);
  }
  return null;
}

module.exports = {
  NotificationState,
  getDaysUntilBidding,
  processEventDrivenAlerts,
  generateMorningKickoffDigest,
  generateFinalClosingAlerts,
  generateEveningScorecardDigest,
  generateUpcomingPipelineDigest
};
