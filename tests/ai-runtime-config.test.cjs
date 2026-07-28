const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const config = require('../server/ai-runtime-config');

const originalEnvironmentKey = process.env.CELL_QUEST_AI_API_KEY;

afterEach(() => {
  config.clearRuntimeAiApiKey();
  if (originalEnvironmentKey === undefined) delete process.env.CELL_QUEST_AI_API_KEY;
  else process.env.CELL_QUEST_AI_API_KEY = originalEnvironmentKey;
});

test('runtime key overrides the environment without exposing secret metadata', () => {
  process.env.CELL_QUEST_AI_API_KEY = 'environment-secret';
  config.setRuntimeAiApiKey('runtime-secret');
  assert.equal(config.getAiApiKey(), 'runtime-secret');
  assert.deepEqual(config.getAiConfigStatus(), { configured: true, source: 'runtime' });
  assert.equal(JSON.stringify(config.getAiConfigStatus()).includes('secret'), false);
});

test('clearing runtime key reveals environment configuration', () => {
  process.env.CELL_QUEST_AI_API_KEY = 'environment-secret';
  config.setRuntimeAiApiKey('runtime-secret');
  config.clearRuntimeAiApiKey();
  assert.equal(config.getAiApiKey(), 'environment-secret');
  assert.deepEqual(config.getAiConfigStatus(), { configured: true, source: 'environment' });
});

test('rejects non-string and oversized runtime keys', () => {
  assert.throws(() => config.setRuntimeAiApiKey(null), /string/);
  assert.throws(() => config.setRuntimeAiApiKey('x'.repeat(4097)), /4096/);
});

test('configuration handler never returns the submitted key', async () => {
  const req = Readable.from([JSON.stringify({ apiKey: 'runtime-secret' })]);
  req.headers = { 'content-type': 'application/json' };
  let response;
  await config.handleSetAiConfig(req, {}, (_res, status, payload) => {
    response = { status, payload };
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.payload, { ok: true, configured: true, source: 'runtime' });
  assert.equal(JSON.stringify(response).includes('runtime-secret'), false);
});
