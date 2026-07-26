const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateContentPack } = require('../scripts/validate-content.cjs');

const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'content', 'core-pack.json'), 'utf8'));

test('core content pack contains six sourced, reviewed chapters', () => {
  const result = validateContentPack(pack, root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.chapterCount, 6);
  assert.equal(result.sourceCount >= 3, true);
});

test('content validation rejects unreviewed sources and unsafe content', () => {
  const unsafe = structuredClone(pack);
  unsafe.sources[0].reviewStatus = 'pending';
  unsafe.cases[0].learningObjective = '<script>alert(1)</script>';
  const result = validateContentPack(unsafe, root);
  assert.equal(result.errors.some(error => error.includes('reviewed')), true);
  assert.equal(result.errors.some(error => error.includes('unsafe')), true);
});
