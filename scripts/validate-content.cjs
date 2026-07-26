const fs = require('node:fs');
const path = require('node:path');

const SAFE_ID = /^[a-z][a-z0-9-]{0,63}$/;
const SAFE_SOURCE_HOSTS = new Set(['medlineplus.gov', 'www.niaid.nih.gov', 'www.niehs.nih.gov']);
const UNSAFE_TEXT = /<\s*(script|iframe)|javascript:|onerror\s*=/i;

function plainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateContentPack(pack, root = path.resolve(__dirname, '..')) {
  const errors = [];
  if (!plainObject(pack)) return { errors: ['pack must be an object'], chapterCount: 0, sourceCount: 0 };
  if (pack.version !== 1) errors.push('version must be 1');
  if (!SAFE_ID.test(String(pack.id || ''))) errors.push('pack id is invalid');
  if (pack.gameVersion !== '>=4.0.0') errors.push('gameVersion must target >=4.0.0');
  if (!String(pack.disclaimer || '').includes('不构成医疗建议')) errors.push('medical disclaimer is required');
  const cases = Array.isArray(pack.cases) ? pack.cases : [];
  const sources = Array.isArray(pack.sources) ? pack.sources : [];
  if (cases.length !== 6) errors.push('core pack must contain exactly six chapters');
  const sourceIds = new Set();
  for (const source of sources) {
    if (!plainObject(source) || !SAFE_ID.test(String(source.id || ''))) {
      errors.push('source id is invalid');
      continue;
    }
    sourceIds.add(source.id);
    if (source.reviewStatus !== 'reviewed') errors.push(`source ${source.id} must be reviewed`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(source.accessed || ''))) errors.push(`source ${source.id} accessed date is invalid`);
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || !SAFE_SOURCE_HOSTS.has(url.hostname)) errors.push(`source ${source.id} URL is not allowlisted`);
    } catch {
      errors.push(`source ${source.id} URL is invalid`);
    }
  }
  const chapters = new Set();
  const caseIds = new Set();
  const runtimeSource = fs.readFileSync(path.join(root, 'src', 'shared', 'content', 'official-cases.ts'), 'utf8');
  for (const item of cases) {
    if (!plainObject(item) || !SAFE_ID.test(String(item.id || ''))) {
      errors.push('case id is invalid');
      continue;
    }
    caseIds.add(item.id);
    chapters.add(item.chapter);
    if (!runtimeSource.includes(`'${item.id}'`)) errors.push(`case ${item.id} is missing from runtime content`);
    if (UNSAFE_TEXT.test(String(item.learningObjective || ''))) errors.push(`case ${item.id} contains unsafe learning content`);
    if (!Array.isArray(item.sourceIds) || item.sourceIds.length === 0) errors.push(`case ${item.id} requires sources`);
    else for (const sourceId of item.sourceIds) if (!sourceIds.has(sourceId)) errors.push(`case ${item.id} references unknown source ${sourceId}`);
  }
  if (caseIds.size !== cases.length) errors.push('case ids must be unique');
  if (sourceIds.size !== sources.length) errors.push('source ids must be unique');
  if (JSON.stringify([...chapters].sort()).replace(/\s/g, '') !== '[1,2,3,4,5,6]') errors.push('chapters must be 1 through 6');
  return { errors, chapterCount: cases.length, sourceCount: sources.length };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const pack = JSON.parse(fs.readFileSync(path.join(root, 'content', 'core-pack.json'), 'utf8'));
  const result = validateContentPack(pack, root);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`CONTENT ERROR: ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Content validation passed: ${result.chapterCount} chapters, ${result.sourceCount} reviewed sources.`);
  }
}

module.exports = { validateContentPack };
