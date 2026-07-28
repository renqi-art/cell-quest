const test = require('node:test');
const assert = require('node:assert/strict');

const {
  compileMap,
  hashSeed,
  validateCompiledLevel,
  validateMapBlueprint,
  validateMapRequest,
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
