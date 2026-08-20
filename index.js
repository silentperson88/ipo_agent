const { getLiveIpos } = require('./services/fetcher');
const { analyzeAllIpos } = require('./services/aiAnalyzer');
const { syncIposToDb, getLatestIposFromDb, connectDb } = require('./services/dbService');
const { formatDailyDigest, formatSingleIpoLetter } = require('./templates/ipoNewsletter');
const { startDashboardServer } = require('./dashboard/server');
const scheduler = require('./services/scheduler');

/**
 * Pipeline execution function (Fetch -> AI Analyze -> MongoDB Upsert)
 */
async function runIpoIntelligencePipeline(options = {}) {
  try {
    const rawResult = await getLiveIpos();
    const analyzedIpos = analyzeAllIpos(rawResult.ipos);

    const fullPayload = {
      scrapedAt: rawResult.scrapedAt,
      source: 'MongoDB',
      totalCount: rawResult.totalCount,
      openCount: rawResult.openCount,
      closingTodayCount: analyzedIpos.filter(i => i.status === 'Closing Today').length,
      ipos: analyzedIpos
    };

    // Persist directly to MongoDB
    await syncIposToDb(analyzedIpos);

    const digestMessage = formatDailyDigest(analyzedIpos);
    const topPick = analyzedIpos.find(i => i.status === 'Open' || i.status === 'Closing Today') || analyzedIpos[0];
    const singleLetter = topPick ? formatSingleIpoLetter(topPick) : '';

    return {
      success: true,
      data: fullPayload,
      digestMessage,
      singleLetter
    };
  } catch (err) {
    console.error('[Pipeline] Error running IPO Intelligence Agent:', err);
    return { success: false, error: err.message };
  }
}

/**
 * All-In-One Unified Service Launcher (Dashboard + 24/7 Scheduler + WhatsApp + Live Ingestion)
 */
async function startUnifiedService() {
  console.log('\n======================================================');
  console.log('🚀 RUN4DREAM IPO INTELLIGENCE AGENT — UNIFIED ENGINE');
  console.log(`⏰ Time: ${new Date().toLocaleString('en-IN')}`);
  console.log('======================================================\n');

  try {
    // 1. Connect to MongoDB
    await connectDb();

    // 2. Start Web Dashboard HTTP Server (Port 5050)
    await startDashboardServer(process.env.PORT || 5050);

    // 3. Start 24/7 Autonomous Cron Scheduler & WhatsApp Bot
    await scheduler.start();

    console.log(`
======================================================
✨ UNIFIED IPO INTELLIGENCE SERVICE IS LIVE & RUNNING
======================================================
• 🌐 Web Dashboard:       http://localhost:${process.env.PORT || 5050}
• 📊 API Endpoint:        http://localhost:${process.env.PORT || 5050}/api/latest
• 📱 WhatsApp Hub:        Autonomous Baileys Socket Active
• ⏰ Cron Dispatcher:     Asia/Kolkata (08:30 AM, 02:00 PM, 07:00 PM, 09:00 PM + 15m polling)
• 📦 Database:            MongoDB (Single Source of Truth)
======================================================
    `);
  } catch (err) {
    console.error('[Unified Service] Startup error:', err.message);
  }
}

// If run directly from terminal: start unified engine
if (require.main === module) {
  startUnifiedService();
}

module.exports = {
  startUnifiedService,
  runIpoIntelligencePipeline,
  getLatestIposFromDb
};
