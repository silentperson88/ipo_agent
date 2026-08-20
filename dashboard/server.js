const http = require('http');
const fs = require('fs');
const path = require('path');
const { getLiveIpos } = require('../services/fetcher');
const { analyzeAllIpos } = require('../services/aiAnalyzer');
const { connectDb, syncIposToDb, getLatestIposFromDb, getIpoGmpHistory } = require('../services/dbService');
const config = require('../config');

const PORT = process.env.PORT || 5050;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function executeFreshIngestion() {
  const rawResult = await getLiveIpos();
  const analyzedIpos = analyzeAllIpos(rawResult.ipos);
  await syncIposToDb(analyzedIpos);
  return analyzedIpos;
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // API: Get Latest IPO Data (Queries MongoDB directly)
  if (url === '/api/latest' && req.method === 'GET') {
    try {
      let data = await getLatestIposFromDb();

      // If DB is empty on first boot, auto-trigger initial pipeline run
      if (!data || !data.ipos || data.ipos.length === 0) {
        console.log('[Server] MongoDB is empty. Triggering initial ingestion pipeline...');
        await executeFreshIngestion();
        data = await getLatestIposFromDb();
      }

      if (data) {
        data.communityInviteLink = config.whatsapp?.communityInviteLink || 'https://chat.whatsapp.com/BUbMjwEPEHjBEkJ22LdxBj';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No IPO data found in MongoDB. Trigger a refresh.' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Get Time-Series History for an IPO
  if (url.startsWith('/api/history/') && req.method === 'GET') {
    try {
      const ipoId = url.replace('/api/history/', '');
      const history = await getIpoGmpHistory(Number(ipoId) || ipoId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(history));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Trigger Fresh Ingestion Pipeline
  if (url === '/api/refresh' && req.method === 'POST') {
    try {
      console.log('[Server] Manual refresh triggered from UI...');
      const analyzedIpos = await executeFreshIngestion();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: analyzedIpos.length }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static File Routing
  let filePath = path.join(PUBLIC_DIR, url);

  if (url === '/' || url === '/customer') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else if (url === '/admin') {
    filePath = path.join(PUBLIC_DIR, 'admin.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

function startDashboardServer(port = PORT) {
  return new Promise((resolve, reject) => {
    server.listen(port, async (err) => {
      if (err) return reject(err);
      console.log(`
======================================================
🚀 RUN4DREAM IPO DASHBOARD SERVER LIVE
======================================================
• 🌐 Customer Public Portal: http://localhost:${port}
• 🛡️ Admin Command Desk:    http://localhost:${port}/admin
• 📊 API Endpoint:           http://localhost:${port}/api/latest
======================================================
`);
      await connectDb();
      resolve(server);
    });
  });
}

if (require.main === module) {
  startDashboardServer(PORT).catch(err => {
    console.error('[Dashboard] Server failed to start:', err.message);
  });
}

module.exports = {
  server,
  startDashboardServer
};
