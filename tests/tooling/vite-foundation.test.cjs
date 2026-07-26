const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('frontend toolchain exposes the required commands and config files', () => {
  assert.equal(pkg.scripts.dev, 'concurrently -k -s first "cross-env CELL_QUEST_PORT=8081 node server.js" "vite --host 127.0.0.1 --port 8080"');
  assert.equal(pkg.scripts.build, 'vite build');
  assert.equal(pkg.scripts.preview, 'concurrently -k -s first "cross-env CELL_QUEST_PORT=8081 node server.js" "vite preview --host 127.0.0.1 --port 8080"');
  assert.equal(pkg.scripts.typecheck, 'vue-tsc --noEmit');
  assert.equal(pkg.scripts['test:unit'], 'vitest run');
  assert.ok(fs.existsSync(path.join(root, 'vite.config.ts')));
  assert.ok(fs.existsSync(path.join(root, 'vitest.config.ts')));
  assert.ok(fs.existsSync(path.join(root, 'eslint.config.mjs')));
  assert.ok(fs.existsSync(path.join(root, 'tsconfig.json')));
});

test('Vite proxies all server-side AI routes in dev and preview', () => {
  const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
  assert.match(viteConfig, /['"]\/api['"]\s*:/);
  assert.match(viteConfig, /legacyApiProxy/);
});
