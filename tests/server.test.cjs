const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://127.0.0.1:8080';
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
