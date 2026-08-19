const { runIpoIntelligencePipeline } = require('../index');
const { 
  processEventDrivenAlerts, 
  generateMorningKickoffDigest, 
  generateFinalClosingAlerts, 
  generateEveningScorecardDigest, 
  generateUpcomingPipelineDigest 
} = require('./notificationEngine');
const botService = require('./whatsappBot');
const { getLatestIposFromDb } = require('./dbService');

/**
 * Intelligent Master Scheduler
 * Controls all timed pulses and event-driven market polling
 */
class IpoScheduler {
  constructor() {
    this.isRunning = false;
    this.postCloseMovementBuffer = [];
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('======================================================');
    console.log('⏰ RUN4DREAM INTELLIGENT IPO SCHEDULER ACTIVE');
    console.log('======================================================');
    console.log('• 08:30 AM ──> Morning Market Kickoff (Open & Closing Today)');
    console.log('• 10:00 AM ──> Listing Bell Check (Gains vs Discount)');
    console.log('• 02:00 PM ──> Final 2-Hour Action Alert (Closing Today)');
    console.log('• 07:00 PM ──> Evening Scorecard & Post-Close Headlines');
    console.log('• 09:00 PM ──> Upcoming Pipeline Pulse (New IPOs Sent Once)');
    console.log('• Market Hours (09:15 - 15:30) ──> Real-Time 5% Delta & Milestones');
    console.log('======================================================\n');

    // Initialize WhatsApp Bot
    await botService.initialize();

    // Run first ingestion immediately on start
    await this.triggerPipelineRun();

    // Check time ticks every minute
    setInterval(() => this.handleTimeTick(), 60 * 1000);
  }

  async triggerPipelineRun() {
    try {
      const result = await runIpoIntelligencePipeline();
      if (result.success && result.data?.ipos) {
        // Evaluate real-time triggers
        const eventResults = await processEventDrivenAlerts(result.data.ipos);
        if (eventResults.postCloseMovements?.length > 0) {
          this.postCloseMovementBuffer.push(...eventResults.postCloseMovements);
        }

        if (eventResults.alerts?.length > 0) {
          console.log(`\n[Scheduler] 🚨 ${eventResults.alerts.length} Instant Alert(s) Generated:`);
          for (const a of eventResults.alerts) {
            console.log(`\n--- [INSTANT ALERT: ${a.type} - ${a.ipo}] ---`);
            console.log(a.message);
            await botService.broadcastToCommunity(a.message);
          }
        }
      }
    } catch (err) {
      console.error('[Scheduler] Pipeline run error:', err.message);
    }
  }

  async handleTimeTick() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;

    // 1. 08:30 AM — Morning Kickoff
    if (hours === 8 && minutes === 30 && isWeekday) {
      console.log('\n[Scheduler] Triggering 08:30 AM Morning Market Kickoff...');
      await this.triggerPipelineRun();
      const ipoData = await getLatestIposFromDb();
      if (ipoData?.ipos) {
        const msg = await generateMorningKickoffDigest(ipoData.ipos);
        console.log('\n📱 [DISPATCH] 08:30 AM Morning Kickoff Message:');
        console.log(msg);
        await botService.broadcastToCommunity(msg);
      }
    }

    // 2. 02:00 PM — Final 2-Hour Action Alert
    if (hours === 14 && minutes === 0 && isWeekday) {
      console.log('\n[Scheduler] Triggering 02:00 PM Final Action Alert for Closing IPOs...');
      await this.triggerPipelineRun();
      const ipoData = await getLatestIposFromDb();
      if (ipoData?.ipos) {
        const finalAlerts = await generateFinalClosingAlerts(ipoData.ipos);
        for (const a of finalAlerts) {
          console.log(`\n📱 [DISPATCH] 02:00 PM Final Action Alert for ${a.ipo}:`);
          console.log(a.message);
          await botService.broadcastToCommunity(a.message);
        }
      }
    }

    // 3. 07:00 PM — Evening Scorecard & Post-Close Headlines
    if (hours === 19 && minutes === 0 && isWeekday) {
      console.log('\n[Scheduler] Triggering 07:00 PM Evening Scorecard...');
      await this.triggerPipelineRun();
      const ipoData = await getLatestIposFromDb();
      if (ipoData?.ipos) {
        const scorecard = await generateEveningScorecardDigest(ipoData.ipos, this.postCloseMovementBuffer);
        console.log('\n📱 [DISPATCH] 07:00 PM Evening Scorecard:');
        console.log(scorecard);
        await botService.broadcastToCommunity(scorecard);
        this.postCloseMovementBuffer = []; // Reset daily buffer
      }
    }

    // 4. 09:00 PM — Upcoming Pipeline Pulse
    if (hours === 21 && minutes === 0 && isWeekday) {
      console.log('\n[Scheduler] Triggering 09:00 PM Upcoming Pipeline Pulse...');
      await this.triggerPipelineRun();
      const ipoData = await getLatestIposFromDb();
      if (ipoData?.ipos) {
        const upcomingDigest = await generateUpcomingPipelineDigest(ipoData.ipos);
        if (upcomingDigest) {
          console.log('\n📱 [DISPATCH] 09:00 PM Upcoming Pipeline Pulse:');
          console.log(upcomingDigest);
          await botService.broadcastToCommunity(upcomingDigest);
        }
      }
    }

    // 5. Market Hours (09:15 - 15:30) 15-Minute Real-Time Polling
    const currentMinTotal = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 15;
    const marketClose = 15 * 60 + 30;

    if (isWeekday && currentMinTotal >= marketOpen && currentMinTotal <= marketClose) {
      if (minutes % 15 === 0) {
        console.log(`\n[Scheduler] Polling live market telemetry (${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')})...`);
        await this.triggerPipelineRun();
      }
    }
  }
}

const scheduler = new IpoScheduler();

if (require.main === module) {
  scheduler.start();
}

module.exports = scheduler;
