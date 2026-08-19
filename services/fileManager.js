const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Ensure directories exist
 */
function ensureDirectories() {
  if (!fs.existsSync(config.storage.dumpsDir)) {
    fs.mkdirSync(config.storage.dumpsDir, { recursive: true });
  }
}

/**
 * Save daily IPO snapshot and update latest.json
 */
function saveDailySnapshot(ipoData) {
  ensureDirectories();

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `ipo_${dateStr}.json`;
  const filePath = path.join(config.storage.dumpsDir, filename);
  const latestPath = path.join(config.storage.dumpsDir, 'latest.json');

  const content = JSON.stringify(ipoData, null, 2);

  // Write today's dump
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`[FileManager] Saved snapshot: ${filePath}`);

  // Write latest.json pointer
  fs.writeFileSync(latestPath, content, 'utf-8');
  console.log(`[FileManager] Updated latest.json pointer`);

  // Trigger retention cleanup
  purgeOldSnapshots();

  return filePath;
}

/**
 * Read the latest available snapshot
 */
function getLatestSnapshot() {
  ensureDirectories();
  const latestPath = path.join(config.storage.dumpsDir, 'latest.json');
  if (fs.existsSync(latestPath)) {
    const raw = fs.readFileSync(latestPath, 'utf-8');
    return JSON.parse(raw);
  }
  return null;
}

/**
 * Read a specific date's snapshot
 */
function getSnapshotByDate(dateStr) {
  ensureDirectories();
  const filePath = path.join(config.storage.dumpsDir, `ipo_${dateStr}.json`);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  }
  return null;
}

/**
 * Deletes dump files older than retentionDays (default: 7 days)
 */
function purgeOldSnapshots() {
  try {
    ensureDirectories();
    const files = fs.readdirSync(config.storage.dumpsDir);
    const now = Date.now();
    const maxAgeMs = config.storage.retentionDays * 24 * 60 * 60 * 1000;

    let purgedCount = 0;
    for (const file of files) {
      if (file === 'latest.json') continue;
      if (!file.startsWith('ipo_') || !file.endsWith('.json')) continue;

      const filePath = path.join(config.storage.dumpsDir, file);
      const stats = fs.statSync(filePath);
      const ageMs = now - stats.mtimeMs;

      if (ageMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`[FileManager] Purged old snapshot (> 7 days): ${file}`);
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      console.log(`[FileManager] Total purged old snapshots: ${purgedCount}`);
    }
  } catch (err) {
    console.error('[FileManager] Error during snapshot purge:', err.message);
  }
}

module.exports = {
  saveDailySnapshot,
  getLatestSnapshot,
  getSnapshotByDate,
  purgeOldSnapshots
};
