# AI Map Editor Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore secure, real-AI map generation in the classic map editor, with server-memory API key configuration, exact current-map dimensions, preview-before-apply, and no browser-side model credentials.

**Architecture:** The browser talks only to same-origin Cell Quest APIs. The model returns a small validated blueprint; a deterministic server compiler converts that blueprint into an exact-size classic character map. The editor and settings UIs live in focused external scripts so the existing inline editor receives only minimal integration changes.

**Tech Stack:** Node.js CommonJS HTTP server, vanilla HTML/CSS/JavaScript, DeepSeek-compatible chat completions API, Node test runner, Playwright, Vite.

## Global Constraints

- Scope is only the classic `editor.html` map editor; do not restore the game Hub AI panel.
- Width must be an integer from `20` through `200`; height must be an integer from `10` through `80`.
- Prompt length after trimming must be `1–1000` UTF-16 code units.
- Generate request bodies are limited to `16 KiB`; model text responses are limited to `64 KiB`.
- API keys may exist only in `CELL_QUEST_AI_API_KEY` or server process memory.
- Never store or return an API key, key prefix, or key length in browser storage, cookies, URLs, HTML, logs, or API responses.
- There is no local-template fallback: missing configuration and upstream failures must be explicit errors.
- Model output is data only; never pass it to `eval`, `Function`, dynamic script insertion, or executable level source parsing.
- A generated result must remain temporary until the user clicks “应用到编辑器”.
- Treat `dac69ed` as the implementation baseline. Preserve its `cellQuest_customLevels_0` editor synchronization and do not modify or commit unrelated `audit/` or `dist/` content.

## File Structure

- Create `server/ai-runtime-config.js`: owns the environment/runtime API-key state and bounded configuration HTTP handlers.
- Create `server/ai-map-generator.js`: validates requests and blueprints, calls the model, compiles maps, validates final levels, and handles `/api/generate-map`.
- Modify `server.js`: registers AI configuration and map-generation routes, updates health state, and serves the settings page.
- Create `ai-settings.html`: accessible, classic-styled runtime-key configuration page.
- Create `js/ai-settings.js`: settings-page API client and safe status rendering.
- Create `js/editor-ai-map.js`: toolbar injection, prompt dialog, request lifecycle, Canvas preview, and confirmed application.
- Modify `editor.html`: load the editor AI script and retain generated `cellType`/`winCondition` when exporting or saving.
- Modify `vite.config.ts`: include `ai-settings.html` as a build entry.
- Modify `package.json`: add the focused AI-map Node test command to `test:all`.
- Create `tests/ai-runtime-config.test.cjs`: API-key state and handler tests.
- Create `tests/ai-map-generator.test.cjs`: request, blueprint, compiler, upstream, and handler tests.
- Create `tests/ai-settings.spec.js`: settings-page browser tests.
- Create `tests/editor-ai-map.spec.js`: editor redirect, preview, apply, cancel, and error browser tests.
- Modify `tests/server.test.cjs`: live-server route and static-page checks.
- Modify `tests/security.spec.js`: assert the restored editor never calls the model upstream directly.
- Modify `tests/tooling/vite-foundation.test.cjs`: assert the settings build entry exists.

---

### Task 1: Server-memory AI configuration

**Files:**
- Create: `server/ai-runtime-config.js`
- Create: `tests/ai-runtime-config.test.cjs`
- Modify: `server.js`
- Modify: `tests/server.test.cjs`

**Interfaces:**
- Produces: `getAiApiKey(): string`, `getAiConfigStatus(): { configured: boolean, source: 'runtime'|'environment'|'none' }`, `setRuntimeAiApiKey(value): object`, `clearRuntimeAiApiKey(): object`.
- Produces: `handleGetAiConfig(res, sendJson)` and `handleSetAiConfig(req, res, sendJson)`.
- Later tasks consume `getAiApiKey()` and `/api/ai-config`.

- [ ] **Step 1: Write failing configuration-state tests**

```js
// tests/ai-runtime-config.test.cjs
const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
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
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/ai-runtime-config.test.cjs`

Expected: FAIL with `Cannot find module '../server/ai-runtime-config'`.

- [ ] **Step 3: Implement the minimal runtime state**

```js
// server/ai-runtime-config.js
const MAX_API_KEY_LENGTH = 4096;
let runtimeApiKey = '';

function environmentApiKey() {
  return String(process.env.CELL_QUEST_AI_API_KEY || '').trim();
}

function getAiApiKey() {
  return runtimeApiKey || environmentApiKey();
}

function getAiConfigStatus() {
  if (runtimeApiKey) return { configured: true, source: 'runtime' };
  if (environmentApiKey()) return { configured: true, source: 'environment' };
  return { configured: false, source: 'none' };
}

function setRuntimeAiApiKey(value) {
  if (typeof value !== 'string') throw new TypeError('API key must be a string');
  const normalized = value.trim();
  if (normalized.length > MAX_API_KEY_LENGTH) {
    throw new RangeError('API key must not exceed 4096 characters');
  }
  runtimeApiKey = normalized;
  return getAiConfigStatus();
}

function clearRuntimeAiApiKey() {
  runtimeApiKey = '';
  return getAiConfigStatus();
}
```

Add bounded JSON parsing and these handlers to the same file:

```js
async function readConfigBody(req) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') {
    const error = new Error('Content-Type must be application/json');
    error.status = 415;
    throw error;
  }
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body, 'utf8') > 8192) {
      const error = new Error('Request body is too large');
      error.status = 413;
      throw error;
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Invalid JSON body');
    error.status = 400;
    throw error;
  }
}

function handleGetAiConfig(res, sendJson) {
  sendJson(res, 200, getAiConfigStatus());
}

async function handleSetAiConfig(req, res, sendJson) {
  try {
    const body = await readConfigBody(req);
    if (!body || typeof body !== 'object' || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'apiKey')) {
      return sendJson(res, 400, { ok: false, code: 'INVALID_CONFIG', error: '请求只允许 apiKey 字段' });
    }
    const status = body.apiKey === '' ? clearRuntimeAiApiKey() : setRuntimeAiApiKey(body.apiKey);
    return sendJson(res, 200, { ok: true, ...status });
  } catch (error) {
    return sendJson(res, error.status || 400, {
      ok: false,
      code: 'INVALID_CONFIG',
      error: error.message,
    });
  }
}

module.exports = {
  MAX_API_KEY_LENGTH,
  getAiApiKey,
  getAiConfigStatus,
  setRuntimeAiApiKey,
  clearRuntimeAiApiKey,
  handleGetAiConfig,
  handleSetAiConfig,
};
```

- [ ] **Step 4: Add failing handler and live-route tests**

Use `Readable.from()` to call `handleSetAiConfig` directly and assert:

```js
test('configuration handler never returns the submitted key', async () => {
  const { Readable } = require('node:stream');
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
```

Add `GET /api/ai-config` and `POST /api/ai-config` assertions to `tests/server.test.cjs`. The POST test must clear the runtime key before finishing so the existing health expectation remains deterministic.

- [ ] **Step 5: Register routes and update health**

Import the handlers in `server.js`, then add before the generic method rejection:

```js
if (req.method === 'GET' && requestPath === '/api/ai-config') {
  handleGetAiConfig(res, sendJson);
  return;
}

if (req.method === 'POST' && requestPath === '/api/ai-config') {
  await handleSetAiConfig(req, res, sendJson);
  return;
}
```

Replace the health field with:

```js
aiConfigured: getAiConfigStatus().configured,
```

- [ ] **Step 6: Run tests and verify GREEN**

Run: `node --test tests/ai-runtime-config.test.cjs tests/server.test.cjs`

Expected: all tests PASS; no response or test diagnostic contains `runtime-secret`.

- [ ] **Step 7: Commit only Task 1 paths**

```bash
git add server/ai-runtime-config.js server.js tests/ai-runtime-config.test.cjs tests/server.test.cjs
git diff --cached --check
git commit -m "feat: add secure runtime AI configuration"
```

### Task 2: Validated blueprint and deterministic map compiler

**Files:**
- Create: `server/ai-map-generator.js`
- Create: `tests/ai-map-generator.test.cjs`

**Interfaces:**
- Produces: `validateMapRequest(input)`, `validateMapBlueprint(input)`, `compileMap(blueprint, width, height, seed)`, `validateCompiledLevel(level)`, `hashSeed(text)`.
- Task 3 consumes these functions inside the upstream request handler.

- [ ] **Step 1: Write failing contract and compiler tests**

Define this valid fixture:

```js
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
```

Add tests that assert:

```js
test('accepts only the exact bounded blueprint contract', () => {
  assert.equal(validateMapBlueprint(VALID_BLUEPRINT).ok, true);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, script: 'alert(1)' }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, enemyDensity: 1.1 }).ok, false);
  assert.equal(validateMapBlueprint({ ...VALID_BLUEPRINT, regions: ['unknown'] }).ok, false);
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
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test tests/ai-map-generator.test.cjs`

Expected: FAIL because `server/ai-map-generator.js` does not exist.

- [ ] **Step 3: Implement exact validators and seeded helpers**

Use exact key sets and enum sets:

```js
const REQUEST_KEYS = new Set(['prompt', 'width', 'height']);
const BLUEPRINT_KEYS = new Set([
  'name', 'theme', 'cellType', 'difficulty',
  'platformDensity', 'enemyDensity', 'itemDensity', 'regions',
]);
const REGION_STYLES = new Set(['open', 'steps', 'arena', 'hazards']);
const DIFFICULTIES = new Set(['easy', 'normal', 'hard']);
const ALLOWED_TILES = new Set(' #=po?FPCgGtbBS^VJHDOnfda*M'.split(''));
const UNSAFE_TEXT = /<\s*(script|iframe)|javascript:|\beval\s*\(|\bfunction\s*\(/i;

function exactObject(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.size
    && Object.keys(value).every(key => keys.has(key));
}

function validateMapRequest(input) {
  if (!exactObject(input, REQUEST_KEYS)) return { ok: false, error: '请求字段无效' };
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (prompt.length < 1 || prompt.length > 1000) return { ok: false, error: '提示词长度必须为 1–1000' };
  if (!Number.isInteger(input.width) || input.width < 20 || input.width > 200) return { ok: false, error: '宽度必须为 20–200 的整数' };
  if (!Number.isInteger(input.height) || input.height < 10 || input.height > 80) return { ok: false, error: '高度必须为 10–80 的整数' };
  return { ok: true, value: { prompt, width: input.width, height: input.height } };
}
```

Implement blueprint validation exactly as follows:

```js
function boundedText(value, minimum, maximum) {
  return typeof value === 'string'
    && value.length >= minimum
    && value.length <= maximum
    && !UNSAFE_TEXT.test(value);
}

function boundedDensity(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateMapBlueprint(input) {
  if (!exactObject(input, BLUEPRINT_KEYS)) return { ok: false, error: '蓝图字段无效' };
  if (!boundedText(input.name, 1, 40)) return { ok: false, error: '关卡名称无效' };
  if (!boundedText(input.theme, 1, 120)) return { ok: false, error: '关卡主题无效' };
  if (![1, 3].includes(input.cellType)) return { ok: false, error: '细胞类型无效' };
  if (!DIFFICULTIES.has(input.difficulty)) return { ok: false, error: '难度无效' };
  for (const key of ['platformDensity', 'enemyDensity', 'itemDensity']) {
    if (!boundedDensity(input[key])) return { ok: false, error: `${key} 无效` };
  }
  if (!Array.isArray(input.regions) || input.regions.length < 1 || input.regions.length > 8) {
    return { ok: false, error: '区域数量无效' };
  }
  if (new Set(input.regions).size !== input.regions.length) return { ok: false, error: '区域不能重复' };
  if (!input.regions.every(region => typeof region === 'string' && region.length <= 80 && REGION_STYLES.has(region))) {
    return { ok: false, error: '区域风格无效' };
  }
  return { ok: true, value: { ...input, regions: [...input.regions] } };
}
```

Implement FNV-1a and Mulberry32:

```js
function hashSeed(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Implement the deterministic compiler**

The compiler must use this algorithm:

```js
function compileMap(blueprint, width, height, seed) {
  const random = seededRandom(seed);
  const cells = Array.from({ length: height }, () => Array(width).fill(' '));
  const groundRow = height - 2;
  cells[groundRow].fill('#');
  cells[height - 1].fill('#');
  cells[groundRow - 1][2] = 'P';
  cells[groundRow - 1][width - 3] = 'F';

  const platformCount = Math.max(1, Math.round((width / 10) * blueprint.platformDensity));
  for (let index = 0; index < platformCount; index += 1) {
    const span = 3 + Math.floor(random() * 5);
    const left = 4 + Math.floor(random() * Math.max(1, width - span - 8));
    const lift = 3 + (index % Math.max(1, Math.min(4, height - 6)));
    const row = Math.max(2, groundRow - lift);
    for (let col = left; col < Math.min(width - 2, left + span); col += 1) cells[row][col] = '=';
  }

  const surfaces = [];
  for (let row = 1; row < groundRow; row += 1) {
    for (let col = 3; col < width - 3; col += 1) {
      if (cells[row][col] === ' ' && ['#', '='].includes(cells[row + 1][col])) {
        surfaces.push([row, col]);
      }
    }
  }

  function place(symbols, density, scale) {
    const target = Math.min(surfaces.length, Math.round(width * density * scale));
    for (let placed = 0; placed < target && surfaces.length; placed += 1) {
      const candidateIndex = Math.floor(random() * surfaces.length);
      const [row, col] = surfaces.splice(candidateIndex, 1)[0];
      if ((row === groundRow - 1 && col < 6) || (row === groundRow - 1 && col > width - 7)) {
        placed -= 1;
        continue;
      }
      cells[row][col] = symbols[Math.floor(random() * symbols.length)];
    }
  }

  place(blueprint.cellType === 1 ? ['g', 't', 'G'] : ['g', 't'], blueprint.enemyDensity, 0.08);
  place(blueprint.cellType === 1 ? ['a', 'o', 'D'] : ['a', 'o', 'O', 'n'], blueprint.itemDensity, 0.1);
  if (blueprint.regions.includes('hazards')) place(['^'], blueprint.platformDensity, 0.03);

  return {
    name: blueprint.name,
    cellType: blueprint.cellType,
    winCondition: blueprint.cellType === 1 ? 'killAll' : 'collectAll',
    width,
    height,
    map: cells.map(row => row.join('')),
  };
}
```

Implement final validation and exports:

```js
function validateCompiledLevel(level) {
  if (!level || typeof level !== 'object') return { ok: false, error: '地图对象无效' };
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height)) return { ok: false, error: '地图尺寸无效' };
  if (!Array.isArray(level.map) || level.map.length !== level.height) return { ok: false, error: '地图高度无效' };
  if (!level.map.every(row => typeof row === 'string' && row.length === level.width)) {
    return { ok: false, error: '地图宽度无效' };
  }
  const joined = level.map.join('');
  if ([...joined].some(tile => !ALLOWED_TILES.has(tile))) return { ok: false, error: '地图包含非法瓦片' };
  if ((joined.match(/P/g) || []).length !== 1) return { ok: false, error: '地图必须有一个出生点' };
  if ((joined.match(/F/g) || []).length !== 1) return { ok: false, error: '地图必须有一个终点' };
  const ground = '#'.repeat(level.width);
  if (level.map[level.height - 2] !== ground || level.map[level.height - 1] !== ground) {
    return { ok: false, error: '地图基础地面无效' };
  }
  return { ok: true, value: level };
}

module.exports = {
  ALLOWED_TILES,
  hashSeed,
  validateMapRequest,
  validateMapBlueprint,
  compileMap,
  validateCompiledLevel,
};
```

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test tests/ai-map-generator.test.cjs`

Expected: all validator and compiler tests PASS for `20×10`, `135×30`, and `200×80`.

- [ ] **Step 6: Commit Task 2**

```bash
git add server/ai-map-generator.js tests/ai-map-generator.test.cjs
git diff --cached --check
git commit -m "feat: compile validated AI map blueprints"
```

### Task 3: Real AI map endpoint

**Files:**
- Modify: `server/ai-map-generator.js`
- Modify: `tests/ai-map-generator.test.cjs`
- Modify: `server.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `getAiApiKey()` from Task 1 and compiler interfaces from Task 2.
- Produces: `requestMapBlueprint(request, options)` and `handleGenerateMapRequest(req, res, sendJson, options)`.
- Produces: `POST /api/generate-map`.

- [ ] **Step 1: Write failing upstream and handler tests**

Use a fake completion response containing `VALID_BLUEPRINT`. Assert the upstream request has `Authorization: Bearer runtime-secret`, `response_format.type === 'json_object'`, and no complete map in the model messages.

Add handler cases for:

```js
test('returns AI_NOT_CONFIGURED without local fallback', async () => {
  const response = await callHandler(
    { prompt: '血液感染', width: 135, height: 30 },
    { getApiKey: () => '' },
  );
  assert.equal(response.status, 409);
  assert.equal(response.payload.code, 'AI_NOT_CONFIGURED');
  assert.equal(response.payload.level, undefined);
});

test('returns a compiled AI level after a valid completion', async () => {
  const response = await callHandler(
    { prompt: '血液感染', width: 135, height: 30 },
    { getApiKey: () => 'runtime-secret', fetchImpl: successfulFetch },
  );
  assert.equal(response.status, 200);
  assert.equal(response.payload.source, 'ai');
  assert.equal(response.payload.level.map.length, 30);
  assert.equal(response.payload.level.map[0].length, 135);
});
```

Also test `401/403 → AI_AUTH_FAILED`, `429 → AI_RATE_LIMITED`, abort → `AI_TIMEOUT`, non-JSON/oversized content → `AI_INVALID_RESPONSE`, and request bodies above `16 KiB → 413`.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/ai-map-generator.test.cjs`

Expected: FAIL because `handleGenerateMapRequest` and `requestMapBlueprint` are not exported.

- [ ] **Step 3: Implement the bounded upstream request**

Use `CELL_QUEST_AI_BASE_URL`, `CELL_QUEST_AI_MODEL`, a five-second `AbortController`, and this exact system contract:

```js
const SYSTEM_PROMPT = [
  '你是 Cell Quest 经典2D平台关卡设计师。',
  '只输出一个 JSON 对象，不输出 Markdown。',
  '字段必须且只能是 name, theme, cellType, difficulty, platformDensity, enemyDensity, itemDensity, regions。',
  'cellType 只能为 1 或 3；difficulty 只能为 easy, normal, hard。',
  '三个 density 必须为 0 到 1；regions 只能从 open, steps, arena, hazards 选择，最多8项。',
  '不要输出地图、代码、HTML或脚本。',
].join('\n');
```

Reject completion content above `65536` UTF-8 bytes before `JSON.parse`. Validate the parsed object with `validateMapBlueprint`. Implement the upstream call with this exact shape:

```js
class AiMapError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function requestMapBlueprint(request, { apiKey, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetchImpl(
      process.env.CELL_QUEST_AI_BASE_URL || 'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.CELL_QUEST_AI_MODEL || 'deepseek-chat',
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `主题：${request.prompt}\n目标尺寸：${request.width}×${request.height}` },
          ],
        }),
        signal: controller.signal,
      },
    );
    if (response.status === 401 || response.status === 403) throw new AiMapError('AI_AUTH_FAILED', 'API Key 无效或无权限', 401);
    if (response.status === 429) throw new AiMapError('AI_RATE_LIMITED', 'AI 服务请求过于频繁，请稍后重试', 429);
    if (!response.ok) throw new AiMapError('AI_UPSTREAM_ERROR', 'AI 服务暂时不可用', 502);
    let payload;
    try { payload = await response.json(); }
    catch { throw new AiMapError('AI_INVALID_RESPONSE', 'AI 返回格式无效', 502); }
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > 65536) {
      throw new AiMapError('AI_INVALID_RESPONSE', 'AI 返回内容无效或过大', 502);
    }
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { throw new AiMapError('AI_INVALID_RESPONSE', 'AI 返回的蓝图不是有效 JSON', 502); }
    const validated = validateMapBlueprint(parsed);
    if (!validated.ok) throw new AiMapError('AI_INVALID_RESPONSE', validated.error, 502);
    return validated.value;
  } catch (error) {
    if (error instanceof AiMapError) throw error;
    if (controller.signal.aborted) throw new AiMapError('AI_TIMEOUT', 'AI 生成超时，请重试', 504);
    throw new AiMapError('AI_UPSTREAM_ERROR', '无法连接 AI 服务', 502);
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Implement the bounded HTTP handler**

Read only `application/json`, stop at `16384` bytes, validate with `validateMapRequest`, and implement:

```js
async function readGenerateBody(req) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new AiMapError('INVALID_REQUEST', 'Content-Type 必须为 application/json', 415);
  let body = '';
  let bytes = 0;
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 16384) throw new AiMapError('INVALID_REQUEST', '请求体过大', 413);
    body += chunk;
  }
  try { return JSON.parse(body); }
  catch { throw new AiMapError('INVALID_REQUEST', '请求 JSON 无效', 400); }
}

async function handleGenerateMapRequest(req, res, sendJson, options = {}) {
  const getApiKey = options.getApiKey || require('./ai-runtime-config').getAiApiKey;
  try {
    const validated = validateMapRequest(await readGenerateBody(req));
    if (!validated.ok) throw new AiMapError('INVALID_REQUEST', validated.error, 400);
    const apiKey = getApiKey();
    if (!apiKey) throw new AiMapError('AI_NOT_CONFIGURED', '请先配置 AI API Key', 409);
    const blueprint = await requestMapBlueprint(validated.value, { apiKey, fetchImpl: options.fetchImpl || fetch });
    const level = compileMap(
      blueprint,
      validated.value.width,
      validated.value.height,
      hashSeed(validated.value.prompt + JSON.stringify(blueprint)),
    );
    const finalLevel = validateCompiledLevel(level);
    if (!finalLevel.ok) throw new AiMapError('AI_INVALID_RESPONSE', finalLevel.error, 502);
    return sendJson(res, 200, {
      ok: true,
      source: 'ai',
      level: finalLevel.value,
      blueprint: { theme: blueprint.theme, difficulty: blueprint.difficulty },
    });
  } catch (error) {
    const failure = error instanceof AiMapError
      ? error
      : new AiMapError('AI_UPSTREAM_ERROR', 'AI 地图生成失败', 502);
    return sendJson(res, failure.status, { ok: false, code: failure.code, error: failure.message });
  }
}
```

Extend the Task 2 export object with:

```js
requestMapBlueprint,
handleGenerateMapRequest,
```

Return this success object (shown separately for contract review):

```js
{
  ok: true,
  source: 'ai',
  level,
  blueprint: {
    theme: blueprint.theme,
    difficulty: blueprint.difficulty,
  },
}
```

Seed compilation with `hashSeed(request.prompt + JSON.stringify(blueprint))`. Return stable Chinese messages with the error codes asserted in Step 1. Never fall through to a template.

- [ ] **Step 5: Register `/api/generate-map` and focused test script**

In `server.js`:

```js
if (req.method === 'POST' && requestPath === '/api/generate-map') {
  await handleGenerateMapRequest(req, res, sendJson);
  return;
}
```

In `package.json` add:

```json
"test:ai-map": "node --test tests/ai-runtime-config.test.cjs tests/ai-map-generator.test.cjs"
```

Insert `npm run test:ai-map` into `test:all` after `test:server`.

- [ ] **Step 6: Run tests and verify GREEN**

Run: `npm run test:ai-map`

Expected: all AI configuration, validation, compiler, upstream, and handler tests PASS.

Run: `npm run test:server`

Expected: all live-server tests PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add server/ai-map-generator.js tests/ai-map-generator.test.cjs server.js package.json
git diff --cached --check
git commit -m "feat: expose secure AI map generation API"
```

### Task 4: Project AI configuration page

**Files:**
- Create: `ai-settings.html`
- Create: `js/ai-settings.js`
- Create: `tests/ai-settings.spec.js`
- Modify: `server.js`
- Modify: `vite.config.ts`
- Modify: `tests/tooling/vite-foundation.test.cjs`

**Interfaces:**
- Consumes: `GET/POST /api/ai-config`.
- Produces: `/ai-settings.html?return=%2Feditor.html`, with `data-testid` values `ai-config-status`, `ai-api-key`, `save-ai-key`, `clear-ai-key`, and `return-to-editor`.

- [ ] **Step 1: Write failing settings-page tests**

Route `/api/ai-config` in Playwright. Assert:

```js
test('saves a runtime key without browser persistence or URL leakage', async ({ page }) => {
  const requests = [];
  await page.route('**/api/ai-config', async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { configured: false, source: 'none' } });
    }
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true, configured: true, source: 'runtime' } });
  });
  await page.goto('/ai-settings.html?return=%2Feditor.html');
  await page.getByTestId('ai-api-key').fill('runtime-secret');
  await page.getByTestId('save-ai-key').click();
  expect(requests).toEqual([{ apiKey: 'runtime-secret' }]);
  expect(page.url()).not.toContain('runtime-secret');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('runtime-secret');
  await expect(page.getByTestId('ai-api-key')).toHaveValue('');
});
```

Add a second test for clearing with `{ apiKey: '' }` and returning only to a same-origin path beginning with `/`; unsafe `return=https://example.com` must resolve to `/editor.html`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx playwright test tests/ai-settings.spec.js`

Expected: FAIL with 404 for `/ai-settings.html`.

- [ ] **Step 3: Create the settings page and client**

`ai-settings.html` must contain only semantic form markup and a deferred same-origin script:

```html
<main class="settings-card">
  <h1>AI 服务配置</h1>
  <p data-testid="ai-config-status" role="status">正在检查配置…</p>
  <label for="ai-api-key">API Key</label>
  <input id="ai-api-key" data-testid="ai-api-key" type="password" autocomplete="off">
  <div class="actions">
    <button data-testid="save-ai-key" type="button">保存到服务端内存</button>
    <button data-testid="clear-ai-key" type="button">清除运行时 Key</button>
    <a data-testid="return-to-editor" href="/editor.html">返回地图编辑器</a>
  </div>
  <p>Key 只发送到本机服务端内存；服务重启后需重新配置。环境变量配置不会被清除。</p>
</main>
<script src="js/ai-settings.js" defer></script>
```

`js/ai-settings.js` must fetch status on load, POST only `{ apiKey }`, clear the input immediately after `fetch` settles, render source labels with `textContent`, and derive the return link with:

```js
const candidate = new URLSearchParams(location.search).get('return') || '/editor.html';
const returnPath = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/editor.html';
```

Use this complete client flow:

```js
const statusNode = document.querySelector('[data-testid="ai-config-status"]');
const keyInput = document.querySelector('[data-testid="ai-api-key"]');
const saveButton = document.querySelector('[data-testid="save-ai-key"]');
const clearButton = document.querySelector('[data-testid="clear-ai-key"]');
const returnLink = document.querySelector('[data-testid="return-to-editor"]');
const candidate = new URLSearchParams(location.search).get('return') || '/editor.html';
returnLink.href = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/editor.html';

function renderStatus(configured, source) {
  statusNode.textContent = configured
    ? source === 'environment' ? '已通过环境变量配置' : '已配置运行时 API Key'
    : '尚未配置 API Key';
}

async function refreshStatus() {
  const response = await fetch('/api/ai-config', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('无法读取 AI 配置状态');
  const payload = await response.json();
  renderStatus(payload.configured === true, payload.source);
}

async function writeKey(apiKey) {
  saveButton.disabled = true;
  clearButton.disabled = true;
  try {
    const response = await fetch('/api/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '保存失败');
    renderStatus(payload.configured, payload.source);
  } finally {
    keyInput.value = '';
    saveButton.disabled = false;
    clearButton.disabled = false;
  }
}

saveButton.addEventListener('click', async () => {
  const apiKey = keyInput.value.trim();
  if (!apiKey) {
    statusNode.textContent = '请输入 API Key';
    return;
  }
  try { await writeKey(apiKey); }
  catch (error) { statusNode.textContent = error.message; }
});

clearButton.addEventListener('click', async () => {
  try { await writeKey(''); }
  catch (error) { statusNode.textContent = error.message; }
});

refreshStatus().catch(error => { statusNode.textContent = error.message; });
```

- [ ] **Step 4: Serve and build the page**

Add `/ai-settings.html` to `PUBLIC_FILES` in `server.js`. Add this Rollup input in `vite.config.ts`:

```ts
aiSettings: resolve(root, 'ai-settings.html'),
```

Extend the tooling test to assert both the source file and Vite input exist.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npx playwright test tests/ai-settings.spec.js`

Expected: both settings tests PASS.

Run: `node --test tests/tooling/vite-foundation.test.cjs tests/server.test.cjs`

Expected: settings entry and static route tests PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add ai-settings.html js/ai-settings.js tests/ai-settings.spec.js server.js vite.config.ts tests/tooling/vite-foundation.test.cjs
git diff --cached --check
git commit -m "feat: add secure AI key settings page"
```

### Task 5: Editor generation dialog, preview, and confirmed application

**Files:**
- Create: `js/editor-ai-map.js`
- Create: `tests/editor-ai-map.spec.js`
- Modify: `editor.html`

**Interfaces:**
- Consumes: `/api/ai-config`, `/api/generate-map`, existing `grid`, `snapshot`, `mapWidth`, `mapHeight`, `draw()`, and editor metadata.
- Produces: injected `data-testid` values `open-ai-map`, `ai-map-prompt`, `generate-ai-map`, `ai-map-preview`, `apply-ai-map`, `cancel-ai-map`.

- [ ] **Step 1: Write failing redirect and preview tests**

Add Playwright tests that stub existing level fetches and AI APIs. Required assertions:

```js
test('uses current dimensions and does not mutate before confirmation', async ({ page }) => {
  await page.route('**/api/ai-config', route => route.fulfill({ json: { configured: true, source: 'runtime' } }));
  await page.route('**/api/generate-map', async route => {
    expect(route.request().postDataJSON()).toEqual({ prompt: '血液感染', width: 42, height: 18 });
    return route.fulfill({ json: generatedFixture(42, 18) });
  });
  await page.goto('/editor.html');
  await page.locator('#mapWidth').fill('42');
  await page.locator('#mapHeight').fill('18');
  await page.getByTestId('open-ai-map').click();
  await page.getByTestId('ai-map-prompt').fill('血液感染');
  const before = await page.evaluate(() => grid.map(row => row.join('')));
  await page.getByTestId('generate-ai-map').click();
  await expect(page.getByTestId('ai-map-preview')).toBeVisible();
  expect(await page.evaluate(() => grid.map(row => row.join('')))).toEqual(before);
  await page.getByTestId('apply-ai-map').click();
  expect(await page.evaluate(() => [mapWidth, mapHeight])).toEqual([42, 18]);
});
```

Also test:

- unconfigured status navigates to `/ai-settings.html?return=%2Feditor.html`;
- cancel after preview preserves the original grid;
- `AI_AUTH_FAILED` displays an error and preserves the grid;
- applied metadata is used by custom-level save/export;
- browser request URLs never target `api.deepseek.com`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx playwright test tests/editor-ai-map.spec.js`

Expected: FAIL because `open-ai-map` does not exist.

- [ ] **Step 3: Add minimal editor metadata integration**

In `editor.html`, define:

```js
let editorCellType = 3;
let editorWinCondition = 'collectAll';
```

Reset both in `newMap`, load them in `loadCustomPreset`, and parse them in `doImportRaw`. Replace hardcoded export/save values with:

```js
cellType: ${editorCellType},
winCondition: ${editorWinCondition === 'killAll' ? 'WIN_KILL_ALL' : 'WIN_COLLECT_ALL'},
```

Use `{ cellType: editorCellType, winCondition: editorWinCondition }` in `doSaveToGame`. Load `js/editor-ai-map.js` immediately after the existing inline editor script.

- [ ] **Step 4: Implement editor AI UI as an external script**

`js/editor-ai-map.js` must:

1. Insert a purple “🤖 AI生成” button beside “新建”.
2. Check `/api/ai-config`; if unconfigured, show a Chinese prompt and navigate to the settings URL.
3. Create one modal with a prompt textarea, target-size label, loading/error region, preview Canvas, summary, and generate/cancel/apply buttons.
4. Capture `width` and `height` from inputs only when generation starts and reject out-of-range values client-side.
5. Store successful JSON only in a module-local `pendingLevel`.
6. Draw the preview using the same tile color map, scaled to fit a `560×300` Canvas without inserting response text as HTML.
7. Abort an active request when the modal closes.
8. Apply only after final shape validation.

The confirmed apply function must be:

```js
function applyPendingLevel() {
  if (!pendingLevel || !Array.isArray(pendingLevel.map)) return;
  const rows = pendingLevel.map.map(row => String(row));
  if (rows.length !== pendingLevel.height || rows.some(row => row.length !== pendingLevel.width)) {
    showError('生成地图尺寸无效');
    return;
  }
  snapshot = grid.map(row => [...row]);
  mapWidth = pendingLevel.width;
  mapHeight = pendingLevel.height;
  grid = rows.map(row => row.split(''));
  editorCellType = pendingLevel.cellType;
  editorWinCondition = pendingLevel.winCondition;
  editorPipeSpawners = [];
  editorKnowledgeCards = [];
  editorTutorials = [];
  currentCustomIdx = -1;
  document.getElementById('mapWidth').value = String(mapWidth);
  document.getElementById('mapHeight').value = String(mapHeight);
  document.getElementById('levelName').value = pendingLevel.name;
  document.getElementById('customActions').style.display = 'none';
  renderPalette();
  draw();
  closeDialog();
}
```

Use `textContent`, `setAttribute`, and DOM creation for all AI-controlled text. Static dialog markup may use `innerHTML`; API values may not. Implement the surrounding flow with these concrete functions:

```js
(() => {
  let pendingLevel = null;
  let activeController = null;

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.testid = 'open-ai-map';
  button.textContent = '🤖 AI生成';
  button.style.cssText = 'background:#6a2a8a;border-color:#9a4aba';
  document.querySelector('.toolbar button').insertAdjacentElement('afterend', button);

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'aiMapModal';
  modal.innerHTML = [
    '<div class="modal-box" role="dialog" aria-label="AI生成地图">',
    '<h2>🤖 AI生成地图</h2>',
    '<p id="aiMapTarget"></p>',
    '<label for="aiMapPrompt">描述地图主题与玩法</label>',
    '<textarea id="aiMapPrompt" data-testid="ai-map-prompt" maxlength="1000"></textarea>',
    '<p id="aiMapError" role="alert"></p>',
    '<section id="aiMapResult" hidden>',
    '<strong id="aiMapName"></strong><span id="aiMapSummary"></span>',
    '<canvas data-testid="ai-map-preview" width="560" height="300"></canvas>',
    '</section>',
    '<button type="button" data-testid="generate-ai-map">生成</button>',
    '<button type="button" data-testid="apply-ai-map" hidden>应用到编辑器</button>',
    '<button type="button" data-testid="cancel-ai-map">取消</button>',
    '</div>',
  ].join('');
  document.body.appendChild(modal);

  const promptNode = modal.querySelector('#aiMapPrompt');
  const errorNode = modal.querySelector('#aiMapError');
  const resultNode = modal.querySelector('#aiMapResult');
  const applyButton = modal.querySelector('[data-testid="apply-ai-map"]');
  const generateButton = modal.querySelector('[data-testid="generate-ai-map"]');

  function showError(message) {
    errorNode.textContent = message;
  }

  function closeDialog() {
    activeController?.abort();
    activeController = null;
    pendingLevel = null;
    resultNode.hidden = true;
    applyButton.hidden = true;
    modal.classList.remove('show');
  }

  function drawPreview(level) {
    const canvas = modal.querySelector('[data-testid="ai-map-preview"]');
    const context = canvas.getContext('2d');
    const cellWidth = canvas.width / level.width;
    const cellHeight = canvas.height / level.height;
    context.fillStyle = '#0a0a18';
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < level.height; row += 1) {
      for (let col = 0; col < level.width; col += 1) {
        const tile = level.map[row][col];
        if (tile === ' ') continue;
        context.fillStyle = colorMap[tile] || '#555';
        context.fillRect(col * cellWidth, row * cellHeight, Math.ceil(cellWidth), Math.ceil(cellHeight));
      }
    }
  }

  async function openDialog() {
    try {
      const response = await fetch('/api/ai-config');
      const status = await response.json();
      if (!response.ok || !status.configured) {
        alert('请先配置 AI API Key');
        location.href = '/ai-settings.html?return=%2Feditor.html';
        return;
      }
      pendingLevel = null;
      errorNode.textContent = '';
      resultNode.hidden = true;
      applyButton.hidden = true;
      modal.querySelector('#aiMapTarget').textContent = `目标尺寸：${document.getElementById('mapWidth').value}×${document.getElementById('mapHeight').value}`;
      modal.classList.add('show');
      promptNode.focus();
    } catch {
      showError('无法检查 AI 配置状态');
    }
  }

  async function generate() {
    const prompt = promptNode.value.trim();
    const width = Number(document.getElementById('mapWidth').value);
    const height = Number(document.getElementById('mapHeight').value);
    if (!prompt || prompt.length > 1000) return showError('请输入 1–1000 字的地图描述');
    if (!Number.isInteger(width) || width < 20 || width > 200) return showError('宽度必须为 20–200');
    if (!Number.isInteger(height) || height < 10 || height > 80) return showError('高度必须为 10–80');
    activeController?.abort();
    activeController = new AbortController();
    generateButton.disabled = true;
    showError('');
    try {
      const response = await fetch('/api/generate-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width, height }),
        signal: activeController.signal,
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'AI 地图生成失败');
      pendingLevel = payload.level;
      modal.querySelector('#aiMapName').textContent = pendingLevel.name;
      modal.querySelector('#aiMapSummary').textContent = ` ${pendingLevel.width}×${pendingLevel.height} · ${payload.blueprint.theme}`;
      drawPreview(pendingLevel);
      resultNode.hidden = false;
      applyButton.hidden = false;
    } catch (error) {
      if (error.name !== 'AbortError') showError(error.message);
    } finally {
      generateButton.disabled = false;
      activeController = null;
    }
  }

  button.addEventListener('click', openDialog);
  generateButton.addEventListener('click', generate);
  applyButton.addEventListener('click', applyPendingLevel);
  modal.querySelector('[data-testid="cancel-ai-map"]').addEventListener('click', closeDialog);
})();
```

The `applyPendingLevel` definition shown above must be inside this IIFE before listeners are registered.

- [ ] **Step 5: Run browser tests and verify GREEN**

Run: `npx playwright test tests/editor-ai-map.spec.js`

Expected: redirect, current dimensions, preview isolation, confirmed apply, cancel, error, and metadata tests all PASS.

- [ ] **Step 6: Stage only feature paths from the clean editor baseline**

Run `git diff -- editor.html` and verify the feature did not revert the `cellQuest_customLevels_0` storage key introduced by baseline commit `dac69ed`.

Then run:

```bash
git add editor.html js/editor-ai-map.js tests/editor-ai-map.spec.js
git diff --cached -- editor.html
git diff --cached --check
```

Expected: the staged editor diff contains only AI metadata/script integration and retains `cellQuest_customLevels_0` unchanged.

- [ ] **Step 7: Commit Task 5**

```bash
git commit -m "feat: restore AI generation in map editor"
```

### Task 6: Security and release verification

**Files:**
- Modify: `tests/security.spec.js`
- Modify: `README.md`

**Interfaces:**
- Consumes all prior tasks.
- Produces final security regression evidence and concise operator documentation.

- [ ] **Step 1: Strengthen the failing security regression**

Extend the existing browser credential test to visit both `/editor.html` and `/ai-settings.html`, intercept `https://api.deepseek.com/**`, use the restored AI button with same-origin API mocks, and assert:

```js
expect(upstreamRequests).toEqual([]);
expect(await page.evaluate(() => localStorage.getItem('cellQuest_ds_key'))).toBeNull();
expect(await page.evaluate(() => Object.values(localStorage).join(''))).not.toContain('runtime-secret');
```

Run: `npx playwright test tests/security.spec.js -g "browser removes legacy AI secrets"`

Expected before updating the implementation if a leak exists: FAIL on the relevant leak assertion. Otherwise it must PASS and acts as a regression gate.

- [ ] **Step 2: Document configuration and usage**

Add a short README section with these exact operational facts:

- Start the normal `npm run dev` stack.
- Open `/editor.html` and click “🤖 AI生成”.
- Configure the key through `/ai-settings.html`, or set `CELL_QUEST_AI_API_KEY`.
- Runtime-page keys live only until the Node server restarts.
- The browser never contacts the model provider directly.
- There is no template fallback when AI is unavailable.

- [ ] **Step 3: Run focused verification**

Run:

```bash
npm run test:ai-map
node --test tests/server.test.cjs tests/tooling/vite-foundation.test.cjs
npx playwright test tests/ai-settings.spec.js tests/editor-ai-map.spec.js tests/security.spec.js
```

Expected: every command exits `0` with zero failed tests.

- [ ] **Step 4: Run project verification**

Run separately and record each exit code:

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: all three commands exit `0`; `dist/ai-settings.html` exists after build.

Run the full suite:

```bash
npm run test:all
```

Expected: exit `0`. If a pre-existing dirty-worktree failure occurs, capture the exact failing command and evidence; do not rewrite unrelated user files to force the gate green.

- [ ] **Step 5: Audit scope before final commit**

Run:

```bash
git status --short
git diff --check
git diff --cached --check
git diff HEAD -- server/ai-runtime-config.js server/ai-map-generator.js server.js ai-settings.html js/ai-settings.js js/editor-ai-map.js editor.html vite.config.ts package.json tests README.md
```

Confirm the feature diff contains no browser model URL fetch, no `localStorage` API-key write, and no unrelated level/game/audit/dist content.

- [ ] **Step 6: Commit security tests and documentation**

```bash
git add tests/security.spec.js README.md
git diff --cached --check
git commit -m "test: secure AI map editor workflow"
```

- [ ] **Step 7: Final clean verification**

Re-run:

```bash
npm run test:ai-map
npx playwright test tests/ai-settings.spec.js tests/editor-ai-map.spec.js tests/security.spec.js
npm run build
```

Expected: all commands exit `0`. Report any remaining uncommitted files as pre-existing user work, not as feature output.
