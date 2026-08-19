const mongoose = require('mongoose');
const config = require('../config');
const { 
  formatGmpShiftAlert, 
  formatSubscriptionMilestone, 
  formatFinalActionAlert, 
  formatMorningKickoff, 
  formatEveningScorecard, 
  formatUpcomingAnnouncement 
} = require('../templates/eventMessages');

// Schema to track sent notifications per IPO
const NotificationStateSchema = new mongoose.Schema({
  ipoId: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
  lastNotifiedGmpPercent: { type: Number, default: 0 },
  subMilestonesSent: { type: [Number], default: [] }, // [30, 50, 100]
  upcomingNotified: { type: Boolean, default: false },
  openNotifiedDate: { type: String, default: '' },
  finalAlertSentDate: { type: String, default: '' },
  closedRecapSentDate: { type: String, default: '' },
  listingNotifiedDate: { type: String, default: '' },
  instantAlertsSentToday: { type: Number, default: 0 },
  lastAlertDate: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

const NotificationState = mongoose.models.NotificationState || mongoose.model('NotificationState', NotificationStateSchema);

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
 * 09:00 PM Upcoming Pipeline Pulse (Sent Once)
 */
async function generateUpcomingPipelineDigest(analyzedIpos) {
  const upcoming = analyzedIpos.filter(i => i.status === 'Upcoming');
  const newUpcoming = [];

  for (const ipo of upcoming) {
    const ipoId = ipo.id || ipo.name;
    let state = await NotificationState.findOne({ ipoId });
    if (!state || !state.upcomingNotified) {
      newUpcoming.push(ipo);
      if (!state) {
        state = new NotificationState({ ipoId, name: ipo.name, upcomingNotified: true });
      } else {
        state.upcomingNotified = true;
      }
      await state.save();
    }
  }

  if (newUpcoming.length > 0) {
    return formatUpcomingAnnouncement(newUpcoming);
  }
  return null;
}

module.exports = {
  NotificationState,
  processEventDrivenAlerts,
  generateMorningKickoffDigest,
  generateFinalClosingAlerts,
  generateEveningScorecardDigest,
  generateUpcomingPipelineDigest
};
