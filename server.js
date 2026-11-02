// Zero-dependency local web server for Shree Sawariya Traders Billing Software
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8080;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // Decode and sanitize URL
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(BASE_DIR, safePath);

  // Security check: ensure file is within BASE_DIR
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>404 Not Found</h2><p>File not found: ${reqPath}</p>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// Handle Port Conflict explicitly
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n==============================================================');
    console.error(' [ERROR] PORT 8080 IS ALREADY IN USE!');
    console.error('==============================================================');
    console.error(' Port 8080 par pehle se koi program ya purani window chal rahi hai.');
    console.error(' Kripya purani window band karein ya stop.bat chalayein.');
    console.error(' Address: http://localhost:8080');
    console.error('==============================================================\n');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, 'localhost', () => {
  console.log('\n==============================================================');
  console.log('   SHREE SAWARIYA TRADERS - BILLING SOFTWARE IS RUNNING');
  console.log('==============================================================');
  console.log(`   Address: http://localhost:${PORT}`);
  console.log('   Status : Connected & Ready (Localhost)');
  console.log('');
  console.log('   [!] DO NOT CLOSE THIS BLACK WINDOW WHILE USING THE APP.');
  console.log('   [!] Is window ko band na karein jab tak bill bana rahe hain.');
  console.log('   [!] App band karne ke liye stop.bat chalayein ya Ctrl+C dabayein.');
  console.log('==============================================================\n');

  // Automatically open browser on Windows
  const openCmd = process.platform === 'win32' ? `start http://localhost:${PORT}` : `open http://localhost:${PORT}`;
  exec(openCmd, (error) => {
    if (error) {
      console.log(`Open in browser: http://localhost:${PORT}`);
    }
  });
});
