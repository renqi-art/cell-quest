const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 18080;
const BASE_URL = 'http://127.0.0.1:' + TEST_PORT;
const TRAVERSAL_PROBE = path.join(ROOT, '.tmp-server-traversal-probe.js');
let child;

function removeProbe() {
  if (fs.existsSync(TRAVERSAL_PROBE)) fs.rmSync(TRAVERSAL_PROBE);
}

function waitForServer(process) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Server startup timed out:\n${output}`)), 5000);
    const onData = data => {
      output += data.toString();
      if (output.includes('Server:')) {
        clearTimeout(timeout);
        resolve();
      }
    };
    process.stdout.on('data', onData);
    process.stderr.on('data', onData);
    process.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`Server exited before startup (code ${code}):\n${output}`));
    });
  });
}

test.before(async () => {
  removeProbe();
  child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CELL_QUEST_PORT: String(TEST_PORT), CELL_QUEST_AI_API_KEY: '' },
  });
  await waitForServer(child);
});

test.after(() => {
  removeProbe();
  if (child && !child.killed) child.kill();
});

test.afterEach(removeProbe);

test('does not expose Git metadata through static file serving', async () => {
  const response = await fetch(`${BASE_URL}/.git/config`);
  assert.equal(response.status, 404);
});

test('rejects traversal filenames without writing outside the level directory', async () => {
  const response = await fetch(`${BASE_URL}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: '../../.tmp-server-traversal-probe.js',
      code: '// traversal probe',
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(fs.existsSync(TRAVERSAL_PROBE), false);
});

test('requires JSON for write endpoints', async () => {
  const response = await fetch(`${BASE_URL}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      filename: '../../.tmp-server-traversal-probe.js',
      code: '// content-type probe',
    }),
  });

  assert.equal(response.status, 415);
  assert.equal(fs.existsSync(TRAVERSAL_PROBE), false);
});


test('exposes a bounded health check without secret configuration', async () => {
  const response = await fetch(`${BASE_URL}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'cell-quest',
    version: '4.0.0',
    aiConfigured: false,
  });
});

test('reports AI configuration status without exposing a key', async () => {
  const response = await fetch(`${BASE_URL}/api/ai-config`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { configured: false, source: 'none' });
});

test('accepts runtime AI configuration without returning the submitted key', async () => {
  const secret = 'runtime-secret';
  const response = await fetch(`${BASE_URL}/api/ai-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: secret }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload, { ok: true, configured: true, source: 'runtime' });
  assert.equal(JSON.stringify(payload).includes(secret), false);

  const clearResponse = await fetch(`${BASE_URL}/api/ai-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: '' }),
  });
  assert.equal(clearResponse.status, 200);
});

test('serves browser security headers', async () => {
  const response = await fetch(`${BASE_URL}/`);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('permissions-policy') || '', /camera=\(\)/);
  assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
});
