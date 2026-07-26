const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, 'app');
const host = process.env.CELL_QUEST_HOST || '127.0.0.1';
const port = Number.parseInt(process.env.CELL_QUEST_PORT || '4173', 10);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://offline.local');
  if (requestUrl.pathname === '/healthz') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ ok: true, service: 'cell-quest', version: '4.0.0', mode: 'offline', aiConfigured: false }));
    return;
  }
  if (requestUrl.pathname.startsWith('/api/')) {
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ ok: false, error: 'Offline package uses the deterministic local director.' }));
    return;
  }
  let relative;
  try {
    relative = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
  } catch {
    response.writeHead(400).end('Bad Request');
    return;
  }
  if (relative.includes('\0') || relative.includes('\\') || relative.split('/').some(part => part === '..' || part.startsWith('.'))) {
    response.writeHead(404).end('Not Found');
    return;
  }
  const file = path.resolve(root, `.${relative}`);
  if (!file.startsWith(root + path.sep) || !Object.hasOwn(mime, path.extname(file).toLowerCase())) {
    response.writeHead(404).end('Not Found');
    return;
  }
  try {
    const data = fs.readFileSync(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404).end('Not Found');
  }
}).listen(port, host, () => console.log(`Cell Quest offline: http://${host}:${port}`));
