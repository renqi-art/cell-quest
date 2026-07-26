const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateEvidence } = require('../scripts/validate-evidence.cjs');

const root = path.resolve(__dirname, '..');

test('evidence index has unique, existing and Git-traceable entries', () => {
  const result = validateEvidence(root, { requireCandidateReport: false });
  assert.deepEqual(result.errors, []);
  assert.equal(result.entryCount >= 6, true);
});

test('evidence validation rejects traversal and duplicate IDs', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'evidence', 'evidence-index.json'), 'utf8'));
  index.entries[1].id = index.entries[0].id;
  index.entries[1].artifact = '../outside.txt';
  const result = validateEvidence(root, { index, requireCandidateReport: false });
  assert.equal(result.errors.some(error => error.includes('unique')), true);
  assert.equal(result.errors.some(error => error.includes('inside repository')), true);
});
