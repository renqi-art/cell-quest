// Local game server + constrained level save/load/list endpoints
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleDirectorRequest } = require('./server/director');
const { handleGenerateCaseRequest } = require('./server/case-generator');
const { getAiConfigStatus, handleGetAiConfig, handleSetAiConfig } = require('./server/ai-runtime-config');

const ROOT = __dirname;
const LEVEL_DIR = path.join(ROOT, 'js', 'levels');
const BACKUP_DIR = path.join(LEVEL_DIR, 'backup');
const HOST = process.env.CELL_QUEST_HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.CELL_QUEST_PORT || '8080', 10);
const MAX_BODY_BYTES = 1024 * 1024;
const VERSION = require('./package.json').version;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const PUBLIC_FILES = new Set(['/index.html', '/editor.html', '/deck.html']);
const PUBLIC_PREFIXES = ['/js/', '/css/', '/images/', '/audio/'];
const LEVEL_FILENAME = /^level\d+_[a-z0-9_-]+\.js$/i;

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
  });
  res.end(JSON.stringify(payload));
}

function getRequestPath(req) {
  const rawPath = String(req.url || '/').split('?')[0];
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const segments = decoded.split('/');
  if (segments.some(segment => segment === '.' || segment === '..' || segment.startsWith('.'))) {
    return null;
  }
  return decoded === '/' ? '/index.html' : decoded;
}

function isPublicPath(requestPath) {
  if (PUBLIC_FILES.has(requestPath)) return true;
  return PUBLIC_PREFIXES.some(prefix => requestPath.startsWith(prefix));
}

function getStaticFilePath(requestPath) {
  if (!requestPath || !isPublicPath(requestPath)) return null;
  const candidate = path.resolve(ROOT, '.' + requestPath);
  if (!candidate.startsWith(ROOT + path.sep)) return null;
  if (!Object.hasOwn(mime, path.extname(candidate).toLowerCase())) return null;
  return candidate;
}

function getLevelFilePath(filename, backup = false) {
  if (typeof filename !== 'string' || !LEVEL_FILENAME.test(filename)) return null;
  const base = backup ? BACKUP_DIR : LEVEL_DIR;
  const candidate = path.resolve(base, filename);
  return candidate.startsWith(base + path.sep) ? candidate : null;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      const error = new Error('Content-Type must be application/json');
      error.status = 415;
      reject(error);
      req.resume();
      return;
    }

    const chunks = [];
    let bytes = 0;
    let settled = false;
    req.on('data', chunk => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        settled = true;
        const error = new Error('Request body is too large');
        error.status = 413;
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      try {
        settled = true;
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        settled = true;
        const error = new Error('Invalid JSON body');
        error.status = 400;
        reject(error);
      }
    });
    req.on('error', error => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });
}

async function handleSave(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, error.status || 400, { ok: false, error: error.message });
    return;
  }

  const filepath = getLevelFilePath(body && body.filename);
  const bakpath = getLevelFilePath(body && body.filename, true);
  if (!filepath || !bakpath || typeof body.code !== 'string') {
    sendJson(res, 400, { ok: false, error: 'Invalid level filename or code' });
    return;
  }

  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    if (fs.existsSync(filepath)) fs.copyFileSync(filepath, bakpath);
    fs.writeFileSync(filepath, body.code, 'utf8');
    console.log('SAVED:', body.filename);
    sendJson(res, 200, { ok: true, file: body.filename });
  } catch (error) {
    console.error('SAVE FAILED:', error);
    sendJson(res, 500, { ok: false, error: 'Unable to save level' });
  }
}

async function handleReset(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, error.status || 400, { ok: false, error: error.message });
    return;
  }

  const filepath = getLevelFilePath(body && body.filename);
  const bakpath = getLevelFilePath(body && body.filename, true);
  if (!filepath || !bakpath) {
    sendJson(res, 400, { ok: false, error: 'Invalid level filename' });
    return;
  }
  if (!fs.existsSync(bakpath)) {
    sendJson(res, 404, { ok: false, error: 'No backup for ' + body.filename });
    return;
  }

  try {
    fs.copyFileSync(bakpath, filepath);
    console.log('RESET:', body.filename);
    sendJson(res, 200, { ok: true, file: body.filename });
  } catch (error) {
    console.error('RESET FAILED:', error);
    sendJson(res, 500, { ok: false, error: 'Unable to reset level' });
  }
}

const server = http.createServer(async (req, res) => {
  const requestPath = getRequestPath(req);

  if (req.method === 'GET' && requestPath === '/healthz') {
    sendJson(res, 200, {
      ok: true,
      service: 'cell-quest',
      version: VERSION,
      aiConfigured: getAiConfigStatus().configured,
    });
    return;
  }

  if (req.method === 'GET' && requestPath === '/levels') {
    try {
      const files = fs.readdirSync(LEVEL_DIR)
        .filter(filename => LEVEL_FILENAME.test(filename))
        .sort();
      sendJson(res, 200, { files });
    } catch (error) {
      console.error('LEVEL LIST FAILED:', error);
      sendJson(res, 500, { error: 'Unable to list levels' });
    }
    return;
  }

  if (req.method === 'POST' && requestPath === '/api/generate-case') {
    await handleGenerateCaseRequest(req, res, sendJson);
    return;
  }

  if (req.method === 'POST' && requestPath === '/api/director') {
    await handleDirectorRequest(req, res, sendJson);
    return;
  }

  if (req.method === 'POST' && requestPath === '/save') {
    await handleSave(req, res);
    return;
  }

  if (req.method === 'POST' && requestPath === '/reset') {
    await handleReset(req, res);
    return;
  }

  if (req.method === 'GET' && requestPath === '/api/ai-config') {
    handleGetAiConfig(res, sendJson);
    return;
  }

  if (req.method === 'POST' && requestPath === '/api/ai-config') {
    await handleSetAiConfig(req, res, sendJson);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST' });
    res.end('Method Not Allowed');
    return;
  }

  const filePath = getStaticFilePath(requestPath);
  if (!filePath) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  try {
    const data = fs.readFileSync(filePath);
    const headers = {
      'Content-Type': mime[path.extname(filePath).toLowerCase()],
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...SECURITY_HEADERS,
    };
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => console.log('Server: http://' + HOST + ':' + PORT));
}

module.exports = {
  server,
  getLevelFilePath,
  getStaticFilePath,
};
