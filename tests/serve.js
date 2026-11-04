// =====================================================================
// tests/serve.js — a tiny web server for the automatic tests.
// It serves the app's files on http://localhost:8080, like GitHub Pages.
// (Plain Node.js, so it works the same on GitHub, Windows and Mac.)
// =====================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
                '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, name === '/' ? 'index.html' : name);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }        // stay inside the app folder
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(8080, () => console.log('Serving the app on http://localhost:8080'));
