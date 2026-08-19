const http = require('http');
const fs = require('fs');
const path = require('path');
const { getLatestSnapshot } = require('../services/fileManager');
const { runIpoIntelligencePipeline } = require('../index');
const { getLatestIposFromDb, getIpoGmpHistory } = require('../services/dbService');
const config = require('../config');

const PORT = process.env.PORT || 5050;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DATA_DIR = path.join(__dirname, '..', 'data', 'ipo_dumps');

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

  // API: Get Latest IPO Data (Queries MongoDB first, falls back to JSON dump)
  if (url === '/api/latest' && req.method === 'GET') {
    try {
      let data = await getLatestIposFromDb();
      if (!data) {
        data = getLatestSnapshot();
      }

      if (data) {
        data.communityInviteLink = config.whatsapp?.communityInviteLink || 'https://chat.whatsapp.com/BUbMjwEPEHjBEkJ22LdxBj';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No IPO data found. Trigger a refresh.' }));
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
      const result = await runIpoIntelligencePipeline();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
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
  } else if (url.startsWith('/data/ipo_dumps/')) {
    filePath = path.join(DATA_DIR, url.replace('/data/ipo_dumps/', ''));
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

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`
======================================================
🚀 RUN4DREAM IPO DASHBOARD SERVER LIVE
======================================================
• 🌐 Customer Public Portal: http://localhost:${PORT}
• 🛡️ Admin Command Desk:    http://localhost:${PORT}/admin
• 📊 API Endpoint:           http://localhost:${PORT}/api/latest
======================================================
`);
  });
}

module.exports = server;
