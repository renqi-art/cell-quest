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
const VALID_BLUEPRINT_ENRICHED = {
  ...VALID_BLUEPRINT,
  atmosphere: 'default',
  pathStyle: 'zigzag',
  enemyTypes: ['g', 't'],
  itemTypes: ['a', 'o', 'D'],
  mechanicTiles: [],
  checkpointSpacing: 30,
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

  assert.deepEqual(result, VALID_BLUEPRINT_ENRICHED);
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

test('preserves a UTF-8 prompt split across request chunks', async () => {
  const prompt = '血液感染检查';
  const payload = Buffer.from(JSON.stringify({ prompt, width: 135, height: 30 }));
  const splitAt = payload.indexOf(Buffer.from('血')) + 1;
  const req = {
    headers: { 'content-type': 'application/json' },
    async *[Symbol.asyncIterator]() {
      yield payload.subarray(0, splitAt);
      yield payload.subarray(splitAt);
    },
  };
  let response;
  let upstream;
  await handleGenerateMapRequest(req, {}, (_res, status, body) => {
    response = { status, body };
  }, {
    getApiKey: () => 'runtime-secret',
    fetchImpl: async (_url, options) => {
      upstream = JSON.parse(options.body);
      return completion(JSON.stringify(VALID_BLUEPRINT));
    },
  });

  assert.equal(response.status, 200);
  assert.equal(upstream.messages.at(-1).content.includes(prompt), true);
});
test('rejects generate request bodies above 16 KiB', async () => {
  const response = await callHandler(`{"prompt":"${'x'.repeat(16385)}","width":135,"height":30}`, {
    getApiKey: () => 'runtime-secret',
  });
  assert.equal(response.status, 413);
  assert.equal(response.payload.code, 'INVALID_REQUEST');
});

// ── 新增：蓝图字段兼容性 ──
test('fills defaults for missing optional blueprint fields', () => {
  const result = validateMapBlueprint(VALID_BLUEPRINT);
  assert.equal(result.ok, true);
  assert.equal(result.value.atmosphere, 'default');
  assert.equal(result.value.pathStyle, 'zigzag');
  assert.deepEqual(result.value.enemyTypes, ['g', 't']);
  assert.deepEqual(result.value.itemTypes, ['a', 'o', 'D']);
  assert.deepEqual(result.value.mechanicTiles, []);
  assert.equal(result.value.checkpointSpacing, 30);
});

test('accepts all optional blueprint fields', () => {
  const full = {
    ...VALID_BLUEPRINT,
    atmosphere: 'tense',
    pathStyle: 'climb',
    enemyTypes: ['g', 't', 'G'],
    itemTypes: ['a', 'D', 'M'],
    mechanicTiles: ['^', 'B'],
    checkpointSpacing: 20,
  };
  const result = validateMapBlueprint(full);
  assert.equal(result.ok, true);
  assert.equal(result.value.atmosphere, 'tense');
  assert.equal(result.value.pathStyle, 'climb');
  assert.deepEqual(result.value.mechanicTiles, ['^', 'B']);
  assert.equal(result.value.checkpointSpacing, 20);
});

test('rejects invalid optional blueprint values', () => {
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, atmosphere: 'invalid' }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, pathStyle: 'spiral' }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, enemyTypes: ['X'] }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, itemTypes: ['Z'] }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, mechanicTiles: ['K'] }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, checkpointSpacing: -1 }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, checkpointSpacing: 101 }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, enemyTypes: [] }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, enemyTypes: ['g', 't', 'g', 't'] }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, mechanicTiles: ['V', 'J', 'H', 'B', '^'] }).ok, false);
});

test('rejects G enemy in RBC (cellType=3) levels', () => {
  const rbcBlueprint = { ...VALID_BLUEPRINT, cellType: 3 };
  assert.equal(validateMapBlueprint({ ...rbcBlueprint, enemyTypes: ['g', 'G'] }).ok, false);
  assert.equal(validateMapBlueprint({ ...rbcBlueprint, enemyTypes: ['g', 't'] }).ok, true);
});

// ── 新增：编译器结构测试 ──
test('different pathStyles produce structurally different maps', () => {
  const base = { ...VALID_BLUEPRINT_ENRICHED, width: 80, height: 20 };
  const seed = hashSeed('path-test');
  const maps = {};
  for (const style of ['zigzag', 'climb', 'cave_dive', 'open_arena', 'linear']) {
    const level = compileMap({ ...base, pathStyle: style }, 80, 20, seed);
    assert.equal(level.map.length, 20);
    assert.equal(level.map.every(row => row.length === 80), true);
    maps[style] = level.map;
  }
  // 不同 pathStyle 应产生至少 3 行有差异的地图
  const differences = Object.values(maps).filter(m => {
    let diffs = 0;
    for (let r = 0; r < 20; r += 1) {
      if (m[r] !== maps.zigzag[r]) diffs += 1;
    }
    return diffs >= 3;
  }).length;
  assert.ok(differences >= 2, `Only ${differences} pathStyles differ from zigzag`);
});

test('theme keywords bias generated tile selection', () => {
  const seed = hashSeed('theme-test');
  const infectionLevel = compileMap(
    { ...VALID_BLUEPRINT_ENRICHED, theme: '败血感染区', difficulty: 'hard' },
    60, 15, seed,
  );
  const oxygenLevel = compileMap(
    { ...VALID_BLUEPRINT_ENRICHED, theme: '氧气充盈的肺泡', difficulty: 'easy' },
    60, 15, seed,
  );
  const infectionStr = infectionLevel.map.join('');
  const oxygenStr = oxygenLevel.map.join('');
  // 感染主题应更多 B（失血区）
  const infectionB = (infectionStr.match(/B/g) || []).length;
  const oxygenB = (oxygenStr.match(/B/g) || []).length;
  // 氧气主题应更多 O（氧气瓶）
  const infectionO = (infectionStr.match(/O/g) || []).length;
  const oxygenO = (oxygenStr.match(/O/g) || []).length;
  assert.ok(infectionB >= oxygenB, `Expected infection B(${infectionB}) >= oxygen B(${oxygenB})`);
  assert.ok(oxygenO >= infectionO, `Expected oxygen O(${oxygenO}) >= infection O(${infectionO})`);
});

test('checkpointSpacing controls checkpoint count', () => {
  const seed = hashSeed('checkpoint-test');
  const dense = compileMap(
    { ...VALID_BLUEPRINT_ENRICHED, checkpointSpacing: 15 },
    80, 15, seed,
  );
  const none = compileMap(
    { ...VALID_BLUEPRINT_ENRICHED, checkpointSpacing: 0 },
    80, 15, seed,
  );
  const denseC = (dense.map.join('').match(/C/g) || []).length;
  const noneC = (none.map.join('').match(/C/g) || []).length;
  assert.ok(denseC >= 2, `Expected >=2 checkpoints, got ${denseC}`);
  assert.equal(noneC, 0);
});

test('cellType=3 RBC levels include collect-focused items', () => {
  const seed = hashSeed('rbc-collect');
  const rbcBp = {
    ...VALID_BLUEPRINT_ENRICHED,
    cellType: 3,
    enemyDensity: 0.25,
    itemDensity: 0.55,
    itemTypes: ['o', 'O', 'n', 'f'],
    enemyTypes: ['g', 't'],
  };
  const level = compileMap(rbcBp, 100, 15, seed);
  const mapStr = level.map.join('');
  // RBC 关卡应含收集品
  const itemCount = (mapStr.match(/[oOnf]/g) || []).length;
  assert.ok(itemCount >= 4, `Expected >=4 items, got ${itemCount}`);
  // RBC 关卡不应有 G
  assert.equal(mapStr.includes('G'), false);
});

test('new compiler preserves structural guarantees', () => {
  for (const [width, height] of [[30, 12], [100, 20], [150, 40]]) {
    const level = compileMap(VALID_BLUEPRINT_ENRICHED, width, height, hashSeed('structure'));
    const validated = validateCompiledLevel(level);
    assert.equal(validated.ok, true, `Failed at ${width}×${height}: ${validated.error}`);
    assert.equal(level.width, width);
    assert.equal(level.height, height);
    assert.equal(level.map.length, height);
    assert.equal(level.map.every(row => row.length === width), true);
    const joined = level.map.join('');
    assert.equal((joined.match(/P/g) || []).length, 1, 'Must have exactly 1 spawn');
    assert.equal((joined.match(/F/g) || []).length, 1, 'Must have exactly 1 finish');
    // 至少使用 6 种瓦片（旧编译器只用了 ~6 种，新编译器应 >= 8）
    const tileCount = new Set(joined.replace(/ /g, '')).size;
    assert.ok(tileCount >= 6, `Expected >=6 tile types, got ${tileCount}`);
  }
});
