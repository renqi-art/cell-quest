const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');

const {
  compileMap,
  hashSeed,
  validateCompiledLevel,
  validateMapBlueprint,
  validateMapRequest,
  requestMapBlueprint,
  handleGenerateMapRequest,
} = require('../server/ai-map-generator');

const VALID_BLUEPRINT = {
  name: '感染防线',
  theme: '血液感染',
  cellType: 1,
  difficulty: 'normal',
  platformDensity: 0.55,
  enemyDensity: 0.45,
  itemDensity: 0.35,
  regions: ['open', 'steps', 'arena', 'hazards'],
};
function completion(content) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

async function callHandler(body, options = {}, headers = { 'content-type': 'application/json' }) {
  const req = Readable.from([typeof body === 'string' ? body : JSON.stringify(body)]);
  req.headers = headers;
  let response;
  await handleGenerateMapRequest(req, {}, (_res, status, payload) => {
    response = { status, payload };
  }, options);
  return response;
}
test('accepts only the exact bounded map request contract', () => {
  assert.deepEqual(validateMapRequest({ prompt: '  生成一张地图  ', width: 20, height: 10 }), {
    ok: true,
    value: { prompt: '生成一张地图', width: 20, height: 10 },
  });
  assert.equal(validateMapRequest({ prompt: 'valid', width: 20, height: 10, extra: true }).ok, false);
  assert.equal(validateMapRequest({ prompt: '', width: 20, height: 10 }).ok, false);
  assert.equal(validateMapRequest({ prompt: 'valid', width: 19, height: 10 }).ok, false);
  assert.equal(validateMapRequest({ prompt: 'valid', width: 20, height: 81 }).ok, false);
});

test('accepts only the exact bounded blueprint contract', () => {
  assert.equal(validateMapBlueprint(VALID_BLUEPRINT).ok, true);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, script: 'alert(1)' }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, enemyDensity: 1.1 }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, regions: ['unknown'] }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, name: '<script>' }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, regions: ['open', 'open'] }).ok, false);
});

test('compiles exact deterministic maps at minimum, default, and maximum sizes', () => {
  for (const [width, height] of [[20, 10], [135, 30], [200, 80]]) {
    const first = compileMap(VALID_BLUEPRINT, width, height, hashSeed('fixture'));
    const second = compileMap(VALID_BLUEPRINT, width, height, hashSeed('fixture'));
    assert.deepEqual(first, second);
    assert.equal(first.map.length, height);
    assert.equal(first.map.every(row => row.length === width), true);
    assert.equal(first.map.join('').split('P').length - 1, 1);
    assert.equal(first.map.join('').split('F').length - 1, 1);
    assert.equal(validateCompiledLevel(first).ok, true);
  }
});

test('rejects malformed compiled levels', () => {
  const level = compileMap(VALID_BLUEPRINT, 20, 10, hashSeed('fixture'));
  assert.equal(validateCompiledLevel({ ...level, map: level.map.slice(1) }).ok, false);
  assert.equal(validateCompiledLevel({ ...level, map: [...level.map.slice(0, -1), 'x'.repeat(level.width)] }).ok, false);
  assert.equal(validateCompiledLevel({ ...level, map: [...level.map.slice(0, -2), ' '.repeat(level.width), level.map.at(-1)] }).ok, false);
});

test('rejects compiled levels outside the supported dimensions', () => {
  for (const [width, height] of [[19, 10], [201, 10], [20, 9], [20, 81]]) {
    const map = Array.from({ length: height }, () => ' '.repeat(width));
    map[height - 3] = `${' '.repeat(2)}P${' '.repeat(width - 6)}F${' '.repeat(2)}`;
    map[height - 2] = '#'.repeat(width);
    map[height - 1] = '#'.repeat(width);
    assert.equal(validateCompiledLevel({ width, height, map }).ok, false);
  }
});

test('rejects invalid compiler dimensions before allocating a map', () => {
  assert.throws(() => compileMap(VALID_BLUEPRINT, 19, 10, hashSeed('fixture')), /dimensions/);
  assert.throws(() => compileMap(VALID_BLUEPRINT, 201, 10, hashSeed('fixture')), /dimensions/);
  assert.throws(() => compileMap(VALID_BLUEPRINT, 20, 9, hashSeed('fixture')), /dimensions/);
  assert.throws(() => compileMap(VALID_BLUEPRINT, 20, 81, hashSeed('fixture')), /dimensions/);
});

test('sends a bounded blueprint-only completion request', async () => {
  let upstream;
  const result = await requestMapBlueprint(
    { prompt: '感染检查', width: 135, height: 30 },
    {
      apiKey: 'runtime-secret',
      fetchImpl: async (url, options) => {
        upstream = { url, options };
        return completion(JSON.stringify(VALID_BLUEPRINT));
      },
    },
  );

  assert.deepEqual(result, VALID_BLUEPRINT);
  assert.equal(upstream.options.headers.Authorization, 'Bearer runtime-secret');
  assert.equal(JSON.parse(upstream.options.body).response_format.type, 'json_object');
  assert.equal(JSON.parse(upstream.options.body).messages.every(message => !message.content.includes('#'.repeat(20))), true);
});

test('returns AI_NOT_CONFIGURED without local fallback', async () => {
  const response = await callHandler(
    { prompt: '感染检查', width: 135, height: 30 },
    { getApiKey: () => '' },
  );
  assert.equal(response.status, 409);
  assert.equal(response.payload.code, 'AI_NOT_CONFIGURED');
  assert.equal(response.payload.level, undefined);
});

test('returns a compiled AI level after a valid completion', async () => {
  const response = await callHandler(
    { prompt: '感染检查', width: 135, height: 30 },
    { getApiKey: () => 'runtime-secret', fetchImpl: async () => completion(JSON.stringify(VALID_BLUEPRINT)) },
  );
  assert.equal(response.status, 200);
  assert.equal(response.payload.source, 'ai');
  assert.equal(response.payload.level.map.length, 30);
  assert.equal(response.payload.level.map[0].length, 135);
});

test('maps upstream authentication and rate-limit failures', async () => {
  for (const [status, code] of [[401, 'AI_AUTH_FAILED'], [403, 'AI_AUTH_FAILED'], [429, 'AI_RATE_LIMITED']]) {
    const response = await callHandler(
      { prompt: '感染检查', width: 135, height: 30 },
      { getApiKey: () => 'runtime-secret', fetchImpl: async () => ({ ok: false, status }) },
    );
    assert.equal(response.status, status === 429 ? 429 : 401);
    assert.equal(response.payload.code, code);
  }
});

test('maps an aborted upstream request to AI_TIMEOUT', async () => {
  const response = await callHandler(
    { prompt: '感染检查', width: 135, height: 30 },
    {
      getApiKey: () => 'runtime-secret',
      fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')));
      }),
    },
  );
  assert.equal(response.status, 504);
  assert.equal(response.payload.code, 'AI_TIMEOUT');
});

test('rejects non-JSON and oversized AI completion content', async () => {
  for (const content of ['not json', JSON.stringify(VALID_BLUEPRINT) + ' '.repeat(65537)]) {
    const response = await callHandler(
      { prompt: '感染检查', width: 135, height: 30 },
      { getApiKey: () => 'runtime-secret', fetchImpl: async () => completion(content) },
    );
    assert.equal(response.status, 502);
    assert.equal(response.payload.code, 'AI_INVALID_RESPONSE');
  }
});

test('rejects generate request bodies above 16 KiB', async () => {
  const response = await callHandler(`{"prompt":"${'x'.repeat(16385)}","width":135,"height":30}`, {
    getApiKey: () => 'runtime-secret',
  });
  assert.equal(response.status, 413);
  assert.equal(response.payload.code, 'INVALID_REQUEST');
});
