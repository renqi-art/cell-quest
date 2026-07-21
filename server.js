// Game server + level save/load/list endpoints
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 8080;

const mime = {
  '.html':'text/html','.js':'application/javascript','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml',
  '.json':'application/json','.ico':'image/x-icon'
};

const server = http.createServer((req, res) => {
  // GET /levels — list all level files
  if (req.method === 'GET' && req.url === '/levels') {
    const dir = path.join(ROOT, 'js', 'levels');
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f.startsWith('level'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files }));
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // POST /save — write level file
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { filename, code } = JSON.parse(body);
        const filepath = path.join(ROOT, 'js', 'levels', filename);
        const bakpath = path.join(ROOT, 'js', 'levels', 'backup', filename);
        if(fs.existsSync(filepath)) fs.copyFileSync(filepath, bakpath);
        fs.writeFileSync(filepath, code, 'utf8');
        console.log('SAVED:', filename);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: filename }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // POST /reset — restore from backup
  if (req.method === 'POST' && req.url === '/reset') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { filename } = JSON.parse(body);
        const bakpath = path.join(ROOT, 'js', 'levels', 'backup', filename);
        if(!fs.existsSync(bakpath)){
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'No backup for ' + filename }));
          return;
        }
        fs.copyFileSync(bakpath, path.join(ROOT, 'js', 'levels', filename));
        console.log('RESET:', filename);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: filename }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // Static file serving
  let urlPath = req.url.split('?')[0];
  if(urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(filePath).toLowerCase();

  try {
    const data = fs.readFileSync(filePath);
    const headers = {
      'Content-Type': mime[ext] || 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
