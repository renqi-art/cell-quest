const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createOfflinePackage, sha256 } = require('../scripts/package-offline.cjs');

test('offline packager copies only the production whitelist and records hashes', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cell-quest-offline-'));
  const dist = path.join(temporary, 'dist');
  const output = path.join(temporary, 'package');
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Cell Quest</title>');
  fs.writeFileSync(path.join(dist, 'assets', 'app.js'), 'console.log("offline")');
  const manifest = createOfflinePackage(dist, output);

  assert.equal(fs.existsSync(path.join(output, 'app', 'index.html')), true);
  assert.equal(fs.existsSync(path.join(output, 'server.cjs')), true);
  assert.equal(fs.existsSync(path.join(output, 'manifest.json')), true);
  assert.equal(manifest.files.some(file => file.path.startsWith('.git') || file.path.includes('audit/')), false);
  for (const file of manifest.files) {
    assert.equal(file.sha256, sha256(path.join(output, file.path)));
  }
});
