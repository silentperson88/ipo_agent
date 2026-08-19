const { getLiveIpos } = require('./services/fetcher');
const { analyzeAllIpos } = require('./services/aiAnalyzer');
const { saveDailySnapshot, getLatestSnapshot } = require('./services/fileManager');
const { syncIposToDb } = require('./services/dbService');
const { formatDailyDigest, formatSingleIpoLetter, formatBreakoutAlert } = require('./templates/ipoNewsletter');

/**
 * Main execution pipeline for IPO Intelligence Agent
 */
async function runIpoIntelligencePipeline(options = {}) {
  console.log('\n======================================================');
  console.log('🚀 RUN4DREAM IPO INTELLIGENCE AGENT — PIPELINE RUN');
  console.log(`⏰ Time: ${new Date().toLocaleString('en-IN')}`);
  console.log('======================================================\n');

  try {
    // 1. Fetch live raw data from API endpoints
    const rawResult = await getLiveIpos();

    // 2. Run AI and Rule-based analysis
    const analyzedIpos = analyzeAllIpos(rawResult.ipos);

    const fullPayload = {
      scrapedAt: rawResult.scrapedAt,
      totalCount: rawResult.totalCount,
      openCount: rawResult.openCount,
      closingTodayCount: analyzedIpos.filter(i => i.status === 'Closing Today').length,
      ipos: analyzedIpos
    };

    // 3. Save JSON Snapshot (Rolling 7-day storage)
    const savedFile = saveDailySnapshot(fullPayload);

    // 4. Sync to MongoDB (Master and Daily GMP records)
    await syncIposToDb(analyzedIpos);

    // 5. Generate formatted WhatsApp preview messages
    const digestMessage = formatDailyDigest(analyzedIpos);

    // Find top pick for single letter preview
    const topPick = analyzedIpos.find(i => i.status === 'Open' || i.status === 'Closing Today') || analyzedIpos[0];
    const singleLetter = topPick ? formatSingleIpoLetter(topPick) : '';

    console.log('\n------------------------------------------------------');
    console.log('📊 EXECUTION SUMMARY');
    console.log('------------------------------------------------------');
    console.log(`• Total IPOs Processed: ${analyzedIpos.length}`);
    console.log(`• Open / Closing Today: ${fullPayload.openCount}`);
    console.log(`• High-GMP (>20%):      ${analyzedIpos.filter(i => (i.gmp?.percent || 0) >= 20).length}`);
    console.log(`• Snapshot saved at:    ${savedFile}`);

    console.log('\n------------------------------------------------------');
    console.log('📱 WHATSAPP DAILY DIGEST PREVIEW:');
    console.log('------------------------------------------------------');
    console.log(digestMessage);

    if (singleLetter) {
      console.log('\n------------------------------------------------------');
      console.log('📱 WHATSAPP SINGLE IPO LETTER PREVIEW (Top Pick):');
      console.log('------------------------------------------------------');
      console.log(singleLetter);
    }

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

// If run directly from terminal
if (require.main === module) {
  runIpoIntelligencePipeline().then(() => {
    process.exit(0);
  });
}

module.exports = {
  runIpoIntelligencePipeline,
  getLatestSnapshot
};
