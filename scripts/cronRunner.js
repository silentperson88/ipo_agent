const { runIpoIntelligencePipeline } = require('../index');

console.log('------------------------------------------------------');
console.log('🚀 RUN4DREAM IPO AGENT — CONTINUOUS SCHEDULER STARTED');
console.log('------------------------------------------------------');
console.log('• Schedule: Runs on startup and then every 4 hours.');
console.log('• Press Ctrl+C to stop.\n');

// 1. Run immediately on start
runIpoIntelligencePipeline();

// 2. Schedule to run every 4 hours (during market days)
const INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

setInterval(() => {
  console.log(`\n[Scheduler] Triggering scheduled run at ${new Date().toLocaleString('en-IN')}...`);
  runIpoIntelligencePipeline();
}, INTERVAL_MS);
