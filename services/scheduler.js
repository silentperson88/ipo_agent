const cron = require('node-cron');
const { getLiveIpos } = require('./fetcher');
const { analyzeAllIpos } = require('./aiAnalyzer');
const { syncIposToDb, getLatestIposFromDb, connectDb } = require('./dbService');
const { 
  processEventDrivenAlerts, 
  generateMorningKickoffDigest, 
  generateFinalClosingAlerts, 
  generateEveningScorecardDigest, 
  generateUpcomingPipelineDigest 
} = require('./notificationEngine');
const botService = require('./whatsappBot');

/**
 * Intelligent Master Scheduler
 * Controls all timed pulses and event-driven market polling using node-cron (IST)
 */
class IpoScheduler {
  constructor() {
    this.isRunning = false;
    this.postCloseMovementBuffer = [];
    this.cronJobs = [];
    this.timezone = 'Asia/Kolkata';
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('======================================================');
    console.log('⏰ RUN4DREAM 24/7 AUTONOMOUS IPO AGENT SCHEDULER');
    console.log('======================================================');
    console.log('• 08:30 AM IST ──> 🌅 Morning Market Kickoff (Open & Closing Today)');
    console.log('• 10:00 AM IST ──> 🔔 Listing Bell Check (Gains vs Discount)');
    console.log('• 02:00 PM IST ──> 🚨 Final 2-Hour Action Alert (Closing Today)');
    console.log('• 07:00 PM IST ──> 🌙 Evening Scorecard & Post-Close Headlines');
    console.log('• 09:00 PM IST ──> 🔭 Upcoming Pipeline Pulse (New IPOs Heads-up)');
    console.log('• Market Hours  ──> 📈 15-Min Real-Time 5% Delta & Milestone Radar');
    console.log('• Hourly Sync   ──> 🔄 Continuous MongoDB Background Sync');
    console.log('======================================================\n');

    // 1. Ensure Database Connected
    await connectDb();

    // 2. Initialize WhatsApp Bot (Non-blocking background initialization)
    botService.initialize().catch(err => {
      console.warn('[Scheduler] WhatsApp initialization notice:', err.message);
    });

    // 3. Run initial live ingestion & AI analysis on boot
    await this.triggerPipelineRun();

    // 4. Register all precision Cron Jobs (Timezone: Asia/Kolkata)
    this.registerCronJobs();
  }

  async triggerPipelineRun() {
    try {
      console.log(`[Scheduler] 🔄 [${new Date().toLocaleTimeString('en-IN')}] Ingesting live market telemetry...`);
      const rawResult = await getLiveIpos();
      const analyzedIpos = analyzeAllIpos(rawResult.ipos);

      // Persist directly to MongoDB
      await syncIposToDb(analyzedIpos);

      // Evaluate real-time triggers (5% GMP surge/drop, subscription milestones)
      const eventResults = await processEventDrivenAlerts(analyzedIpos);
      if (eventResults.postCloseMovements?.length > 0) {
        this.postCloseMovementBuffer.push(...eventResults.postCloseMovements);
      }

      if (eventResults.alerts?.length > 0) {
        console.log(`\n[Scheduler] 🚨 ${eventResults.alerts.length} Instant Alert(s) Triggered:`);
        for (const a of eventResults.alerts) {
          console.log(`\n--- [INSTANT ALERT: ${a.type} - ${a.ipo}] ---`);
          console.log(a.message);
          await botService.broadcastToCommunity(a.message);
        }
      }
      return { success: true, count: analyzedIpos.length };
    } catch (err) {
      console.error('[Scheduler] Pipeline run error:', err.message);
      return { success: false, error: err.message };
    }
  }

  registerCronJobs() {
    const tz = this.timezone;

    // 1. 08:30 AM IST (Mon-Fri) — Morning Market Kickoff
    this.cronJobs.push(
      cron.schedule('30 8 * * 1-5', async () => {
        console.log('\n[Scheduler] 🌅 Executing 08:30 AM Morning Market Kickoff...');
        await this.triggerPipelineRun();
        const ipoData = await getLatestIposFromDb();
        if (ipoData?.ipos) {
          const msg = await generateMorningKickoffDigest(ipoData.ipos);
          console.log('\n📱 [DISPATCH] 08:30 AM Morning Kickoff Message:');
          console.log(msg);
          await botService.broadcastToCommunity(msg);
        }
      }, { timezone: tz })
    );

    // 2. 02:00 PM IST (Mon-Fri) — Final 2-Hour Action Alert
    this.cronJobs.push(
      cron.schedule('0 14 * * 1-5', async () => {
        console.log('\n[Scheduler] 🚨 Executing 02:00 PM Final Action Alert for Closing IPOs...');
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
      }, { timezone: tz })
    );

    // 3. 07:00 PM IST (Mon-Fri) — Evening Scorecard & Post-Close Headlines
    this.cronJobs.push(
      cron.schedule('0 19 * * 1-5', async () => {
        console.log('\n[Scheduler] 🌙 Executing 07:00 PM Evening Scorecard...');
        await this.triggerPipelineRun();
        const ipoData = await getLatestIposFromDb();
        if (ipoData?.ipos) {
          const scorecard = await generateEveningScorecardDigest(ipoData.ipos, this.postCloseMovementBuffer);
          console.log('\n📱 [DISPATCH] 07:00 PM Evening Scorecard:');
          console.log(scorecard);
          await botService.broadcastToCommunity(scorecard);
          this.postCloseMovementBuffer = []; // Reset daily buffer
        }
      }, { timezone: tz })
    );

    // 4. 09:00 PM IST (Mon-Fri) — Upcoming Pipeline Pulse
    this.cronJobs.push(
      cron.schedule('0 21 * * 1-5', async () => {
        console.log('\n[Scheduler] 🔭 Executing 09:00 PM Upcoming Pipeline Pulse...');
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
      }, { timezone: tz })
    );

    // 5. Market Hours (09:15 - 15:30 IST, Mon-Fri) — 15-Minute Polling
    this.cronJobs.push(
      cron.schedule('15,30,45 9 * * 1-5', async () => {
        console.log('\n[Scheduler] 📈 Market Hours 15-Min Telemetry Polling (09:xx IST)...');
        await this.triggerPipelineRun();
      }, { timezone: tz })
    );

    this.cronJobs.push(
      cron.schedule('*/15 10-14 * * 1-5', async () => {
        console.log('\n[Scheduler] 📈 Market Hours 15-Min Telemetry Polling...');
        await this.triggerPipelineRun();
      }, { timezone: tz })
    );

    this.cronJobs.push(
      cron.schedule('0,15,30 15 * * 1-5', async () => {
        console.log('\n[Scheduler] 📈 Market Close Telemetry Polling (15:xx IST)...');
        await this.triggerPipelineRun();
      }, { timezone: tz })
    );

    // 6. Hourly Background Sync (Every hour on the hour 24/7)
    this.cronJobs.push(
      cron.schedule('0 * * * *', async () => {
        console.log('\n[Scheduler] 🔄 Hourly Background Data Sync...');
        await this.triggerPipelineRun();
      }, { timezone: tz })
    );

    console.log(`[Scheduler] ✅ Registered ${this.cronJobs.length} active cron triggers (Timezone: ${tz}).`);
  }
}

const scheduler = new IpoScheduler();

if (require.main === module) {
  scheduler.start();
}

module.exports = scheduler;
