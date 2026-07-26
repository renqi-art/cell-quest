const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REQUIRED = [
  'AI_DEVELOPMENT.md',
  'docs/evidence/README.md',
  'docs/evidence/evidence-index.json',
  'docs/evidence/TEST_REPORT.md',
  'docs/evidence/SCORING_CROSSWALK.md',
  'docs/evidence/case-studies',
  'docs/evidence/screenshots',
  'docs/evidence/RELEASE_EVIDENCE.md',
];

function currentSha(root) {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

function validateEvidence(root, options = {}) {
  const repository = path.resolve(root);
  const errors = [];
  for (const relative of REQUIRED) {
    if (!fs.existsSync(path.join(repository, relative))) errors.push(`required artifact is missing: ${relative}`);
  }
  let index = options.index;
  if (!index) {
    try {
      index = JSON.parse(fs.readFileSync(path.join(repository, 'docs/evidence/evidence-index.json'), 'utf8'));
    } catch {
      return { errors: [...errors, 'evidence index is invalid JSON'], entryCount: 0 };
    }
  }
  const entries = Array.isArray(index.entries) ? index.entries : [];
  const ids = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      errors.push('evidence entry must be an object');
      continue;
    }
    if (typeof entry.id !== 'string' || ids.has(entry.id)) errors.push('evidence IDs must be unique non-empty strings');
    else ids.add(entry.id);
    for (const field of ['claim', 'verification', 'artifact']) {
      if (typeof entry[field] !== 'string' || entry[field].trim().length === 0) errors.push(`${entry.id || 'unknown'} ${field} is required`);
    }
    const artifact = path.resolve(repository, String(entry.artifact || ''));
    if (!artifact.startsWith(repository + path.sep)) errors.push(`${entry.id || 'unknown'} artifact must stay inside repository`);
    else if (!fs.existsSync(artifact)) errors.push(`${entry.id || 'unknown'} artifact does not exist`);
    if (!/^[0-9a-f]{7,40}$/i.test(String(entry.commit || ''))) errors.push(`${entry.id || 'unknown'} commit is invalid`);
    else {
      try {
        execFileSync('git', ['cat-file', '-e', `${entry.commit}^{commit}`], { cwd: repository, stdio: 'ignore' });
      } catch {
        errors.push(`${entry.id || 'unknown'} commit is not Git-traceable`);
      }
    }
    if (!['automated', 'manual', 'pending'].includes(entry.status)) errors.push(`${entry.id || 'unknown'} status is invalid`);
  }
  if (options.requireCandidateReport !== false) {
    const report = fs.readFileSync(path.join(repository, 'docs/evidence/TEST_REPORT.md'), 'utf8');
    const sha = currentSha(repository);
    if (!report.includes(`Candidate SHA: ${sha}`)) errors.push('test report does not match current candidate SHA');
  }
  return { errors, entryCount: entries.length };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const result = validateEvidence(root);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`EVIDENCE ERROR: ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Evidence validation passed: ${result.entryCount} traceable entries.`);
  }
}

module.exports = { validateEvidence, currentSha };
