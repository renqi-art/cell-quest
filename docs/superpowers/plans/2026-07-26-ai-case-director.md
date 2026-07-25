# AI Case Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让服务端 AI 根据玩家表现从四种白名单病例危机中选择下一阶段事件，并以安全、可解释、可离线回退的方式真实改变核心玩法。

**Architecture:** Node 服务端验证输入、调用兼容 Chat Completions 的模型并再次验证输出；浏览器客户端只提交最小病例上下文。`CaseDirectorClient` 在网络失败时调用确定性 `LocalCaseDirector`，`CaseEngine` 是唯一能执行事件和修改患者状态的组件。

**Tech Stack:** Node.js built-in `http`/`fetch`/`AbortController`、原生 JavaScript、Playwright、Node `node:test`。

## Global Constraints

- 模型每关最多调用两次。
- 服务端超时 `2500ms`，客户端总等待上限 `3000ms`。
- 事件只允许 `ACUTE_HYPOXIA`、`INFECTION_REBOUND`、`TRANSPORT_BLOCKAGE`、`ATP_CRISIS`。
- 目标节点必须存在于请求提供的节点集合。
- 严重度只允许 `1–3`，时限只允许 `30–60` 秒，目标计数只允许 `1–3`。
- AI Key 只读取 `CELL_QUEST_AI_API_KEY`。
- 默认模型接口可通过 `CELL_QUEST_AI_BASE_URL` 和 `CELL_QUEST_AI_MODEL` 配置。
- 任何非法响应整体丢弃，使用本地导演。
- 浏览器不保存、显示或记录任何 API Key。

---

### Task 1: Director contract and deterministic local fallback

**Files:**
- Create: `server/director.js`
- Create: `tests/director.test.cjs`

**Interfaces:**
- Consumes: `DirectorRequest`.
- Produces: `validateDirectorRequest(value)`, `validateDirectorPlan(value, request)`, `createLocalPlan(request)`.

- [ ] **Step 1: Write failing request validation tests**

```js
test('accepts a bounded director request', () => {
  const result = validateDirectorRequest(validRequest);
  assert.equal(result.ok, true);
  assert.equal(result.value.allowedEvents.length, 2);
});

test('rejects unknown events and target nodes', () => {
  const result = validateDirectorRequest({
    ...validRequest,
    allowedEvents: ['RUN_JAVASCRIPT'],
  });
  assert.equal(result.ok, false);
});
```

Use a complete fixture with schema version, level, mode, primary cell, phase, vitals, performance, allowed events, and valid target nodes.

- [ ] **Step 2: Run test and confirm failure**

Run: `node --test tests/director.test.cjs`

Expected: FAIL because `server/director.js` does not exist.

- [ ] **Step 3: Implement constants and request validation**

```js
const EVENT_IDS = new Set([
  'ACUTE_HYPOXIA',
  'INFECTION_REBOUND',
  'TRANSPORT_BLOCKAGE',
  'ATP_CRISIS',
]);

function isBoundedNumber(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function validateDirectorRequest(input) {
  if (!input || input.schemaVersion !== 1) return { ok: false, error: 'Unsupported schemaVersion' };
  if (!['single', 'coop'].includes(input.mode)) return { ok: false, error: 'Invalid mode' };
  if (!['rbc', 'wbc'].includes(input.primaryCell)) return { ok: false, error: 'Invalid primaryCell' };
  if (![1, 2].includes(input.phase)) return { ok: false, error: 'Invalid phase' };
  if (!Array.isArray(input.allowedEvents) || input.allowedEvents.length === 0) {
    return { ok: false, error: 'allowedEvents is required' };
  }
  if (input.allowedEvents.some(id => !EVENT_IDS.has(id))) return { ok: false, error: 'Unknown event' };
  if (!Array.isArray(input.validTargetNodes) || input.validTargetNodes.length === 0) {
    return { ok: false, error: 'validTargetNodes is required' };
  }
  if (input.validTargetNodes.some(id => typeof id !== 'string' || !/^[a-z]+_\d+$/.test(id))) {
    return { ok: false, error: 'Invalid target node' };
  }
  for (const value of Object.values(input.vitals || {})) {
    if (!isBoundedNumber(value, 0, 100)) return { ok: false, error: 'Invalid vital' };
  }
  return { ok: true, value: structuredClone(input) };
}
```

- [ ] **Step 4: Write failing response validation tests**

Test exact rejection cases:

- event not in the request allow-list.
- target not in valid nodes.
- severity 0 or 4.
- deadline 29 or 61.
- HTML in doctor line.
- extra top-level field.
- goal count 0 or 4.

- [ ] **Step 5: Implement strict response validation**

Allow only:

```js
const PLAN_KEYS = ['eventId', 'targetNode', 'severity', 'goal', 'doctorLine', 'reason'];
const GOAL_KEYS = ['oxygenDeliveries', 'infectionSites', 'timeLimitSeconds'];
```

Reject keys outside these lists. Strip no fields and do not partially accept the plan.

- [ ] **Step 6: Implement deterministic local selection**

```js
function hashSeed(text) {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createLocalPlan(request) {
  const seed = hashSeed(`${request.levelId}:${request.phase}:${request.runId || 'offline'}`);
  const eventId = request.allowedEvents[seed % request.allowedEvents.length];
  const targetNode = request.validTargetNodes[(seed >>> 4) % request.validTargetNodes.length];
  const severity = 1 + ((seed >>> 8) % 3);
  return buildPresetPlan(eventId, targetNode, severity, request);
}
```

`buildPresetPlan()` must return the same schema as AI and pass `validateDirectorPlan()`.

- [ ] **Step 7: Run tests**

Run: `node --test tests/director.test.cjs`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add server/director.js tests/director.test.cjs
git commit -m "test: define AI case director contract"
```

### Task 2: Secure `/api/director` server endpoint

**Files:**
- Modify: `server/director.js`
- Modify: `server.js:1-240`
- Modify: `tests/server.test.cjs`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: POST JSON at `/api/director`.
- Produces: `{ ok, source: 'ai'|'local', plan }`.

- [ ] **Step 1: Write failing endpoint tests**

Cover:

```js
test('director returns local plan without an API key', async () => {
  const response = await fetch(`${BASE_URL}/api/director`, requestOptions(validRequest));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, 'local');
  assert.equal(body.plan.eventId, validRequest.allowedEvents[0]);
});
```

Also test invalid content type, invalid body, unknown event, oversized body, and method not allowed.

- [ ] **Step 2: Run server tests and confirm failure**

Run: `npm run test:server`

Expected: FAIL with 404 for `/api/director`.

- [ ] **Step 3: Add model prompt construction**

`buildDirectorMessages(request)` returns:

```js
[
  {
    role: 'system',
    content: [
      'You are the Cell Quest patient crisis director.',
      'Return exactly one JSON object and no markdown.',
      `Allowed events: ${request.allowedEvents.join(', ')}`,
      `Allowed target nodes: ${request.validTargetNodes.join(', ')}`,
      'severity must be 1, 2, or 3.',
      'timeLimitSeconds must be 30 through 60.',
      'Do not return HTML, code, or extra keys.',
    ].join('\n'),
  },
  {
    role: 'user',
    content: JSON.stringify({
      phase: request.phase,
      mode: request.mode,
      primaryCell: request.primaryCell,
      vitals: request.vitals,
      performance: request.performance,
    }),
  },
];
```

- [ ] **Step 4: Implement model call with timeout**

```js
async function requestAiPlan(request, fetchImpl = fetch) {
  const apiKey = process.env.CELL_QUEST_AI_API_KEY;
  if (!apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetchImpl(
      process.env.CELL_QUEST_AI_BASE_URL || 'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.CELL_QUEST_AI_MODEL || 'deepseek-chat',
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: buildDirectorMessages(request),
        }),
        signal: controller.signal,
      }
    );
    if (!response.ok) return null;
    const payload = await response.json();
    return JSON.parse(payload.choices[0].message.content);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 5: Implement handler**

Sequence:

1. parse using existing `readJsonBody`.
2. validate request.
3. try AI.
4. validate AI response.
5. if any step after request validation fails, create local plan.
6. return source and plan.
7. never include upstream error text or key fragments.

- [ ] **Step 6: Route endpoint in `server.js`**

Handle `/api/director` before generic method rejection. Export the handler dependencies for test injection.

- [ ] **Step 7: Add environment documentation**

Document:

```powershell
$env:CELL_QUEST_AI_API_KEY='...'
$env:CELL_QUEST_AI_MODEL='deepseek-chat'
npm run dev
```

State explicitly that the browser never receives the key.

- [ ] **Step 8: Add all-test script**

```json
{
  "scripts": {
    "test:director": "node --test tests/director.test.cjs",
    "test:all": "npm run test:director && npm run test:server && npm test"
  }
}
```

- [ ] **Step 9: Run tests**

Run:

```powershell
npm run test:director
npm run test:server
```

Expected: PASS.

- [ ] **Step 10: Commit**

```powershell
git add server/director.js server.js tests/server.test.cjs package.json README.md
git commit -m "feat: add secure patient crisis director proxy"
```

### Task 3: Browser CaseDirectorClient and fallback

**Files:**
- Create: `js/case-director.js`
- Modify: `index.html:229`
- Modify: `js/config.js:421-524`
- Create: `tests/case-director.spec.js`

**Interfaces:**
- Consumes: `CaseEngine.getDirectorContext(phase)`.
- Produces: `CaseDirectorClient.nextPlan(context)`, `LocalCaseDirector.nextPlan(context)`.

- [ ] **Step 1: Write failing client fallback test**

Stub `/api/director` to abort. Assert:

```js
expect(result.source).toBe('local');
expect(result.plan.eventId).toBe('ACUTE_HYPOXIA');
expect(result.plan.targetNode).toBe('tissue_0');
```

Use a fixed `runId` so fallback output is repeatable.

- [ ] **Step 2: Implement browser validators matching server contract**

Do not import server code into the browser. Implement the same allow-list, target check and numeric bounds in `js/case-director.js`.

- [ ] **Step 3: Implement local browser director**

Use the same hash and preset data as the server. Add a contract test fixture shared as literal test data to catch drift.

- [ ] **Step 4: Implement client request**

```js
class CaseDirectorClient {
  constructor({ fetchImpl = fetch, timeoutMs = 3000 } = {}) {
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async nextPlan(context) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl('/api/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok || !validateDirectorPlan(payload.plan, context).ok) throw new Error('Invalid plan');
      return { source: payload.source === 'ai' ? 'ai' : 'local', plan: payload.plan };
    } catch {
      return { source: 'local', plan: LocalCaseDirector.nextPlan(context) };
    } finally {
      clearTimeout(timer);
    }
  }
}
```

- [ ] **Step 5: Add run state**

Add:

```js
Game.caseDirector = null;
Game.caseDirectorPhase = 0;
Game.caseDirectorHistory = [];
Game.caseDirectorPending = false;
```

- [ ] **Step 6: Run tests**

Run: `npx playwright test tests/case-director.spec.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add js/case-director.js js/config.js index.html tests/case-director.spec.js
git commit -m "feat: add resilient browser case director"
```

### Task 4: Whitelisted crisis execution

**Files:**
- Modify: `js/case-engine.js`
- Modify: `js/case-entities.js`
- Modify: `js/game.js:736-916`
- Modify: `tests/case-director.spec.js`

**Interfaces:**
- Consumes: validated `DirectorPlan`.
- Produces: `CaseEngine.startCrisis(plan, source)`, `CaseEngine.completeCurrentCrisis()`.

- [ ] **Step 1: Write failing event effect tests**

For each event assert a gameplay state change:

- `ACUTE_HYPOXIA`: oxygen decay multiplier increases and target tissue activates.
- `INFECTION_REBOUND`: target infection node activates and infection growth increases.
- `TRANSPORT_BLOCKAGE`: route status becomes blocked until the target clears.
- `ATP_CRISIS`: skill cost multiplier increases until goal completion.

- [ ] **Step 2: Implement crisis state**

```js
startCrisis(plan, source) {
  if (this.currentCrisis) return false;
  this.currentCrisis = {
    ...structuredClone(plan),
    source,
    elapsed: 0,
    complete: false,
  };
  this.applyCrisisModifiers();
  return true;
}
```

Never execute arbitrary property names from `plan`.

- [ ] **Step 3: Implement explicit switch**

```js
applyCrisisModifiers() {
  switch (this.currentCrisis.eventId) {
    case 'ACUTE_HYPOXIA':
      this.modifiers.oxygenDecay = [1, 1.15, 1.3, 1.45][this.currentCrisis.severity];
      break;
    case 'INFECTION_REBOUND':
      this.activateInfectionNode(this.currentCrisis.targetNode);
      this.modifiers.infectionGrowth = [1, 1.1, 1.2, 1.3][this.currentCrisis.severity];
      break;
    case 'TRANSPORT_BLOCKAGE':
      this.blockedNodeId = this.currentCrisis.targetNode;
      break;
    case 'ATP_CRISIS':
      this.modifiers.atpCost = [1, 1.1, 1.2, 1.3][this.currentCrisis.severity];
      break;
    default:
      throw new Error('Unreachable crisis event');
  }
}
```

- [ ] **Step 4: Complete crisis from explicit goals**

Completion rules read only goal fields allowed by the schema. Clear all temporary modifiers on completion.

- [ ] **Step 5: Request phase one and phase two**

- request phase one after the case card closes.
- request phase two after phase one completes.
- do not request more than twice.
- pause the stage timer while the “AI分析” card is visible.
- never pause the entire renderer.

- [ ] **Step 6: Run tests**

Run:

```powershell
npx playwright test tests/case-director.spec.js
npx playwright test tests/case-engine.spec.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add js/case-engine.js js/case-entities.js js/game.js tests/case-director.spec.js
git commit -m "feat: let AI crises change case objectives"
```

### Task 5: Remove browser-held AI secrets and direct upstream calls

**Files:**
- Modify: `js/ai-levels.js:350-430`
- Modify: `js/entities.js:2718-2865`
- Modify: `editor.html:1185-1220`
- Modify: `js/game.js:1707-1810`
- Modify: `tests/security.spec.js`

**Interfaces:**
- Consumes: local proxy endpoints only.
- Produces: zero `cellQuest_ds_key` storage and zero browser calls to `api.deepseek.com`.

- [ ] **Step 1: Write failing security tests**

Scan loaded scripts and runtime requests. Assert:

```js
expect(await page.evaluate(() => localStorage.getItem('cellQuest_ds_key'))).toBeNull();
expect(upstreamRequests).toEqual([]);
```

Also assert no UI asks the user for a raw model key.

- [ ] **Step 2: Remove key storage helpers and UI**

Delete `getDeepSeekKey()`, `setDeepSeekKey()`, key prompts and key fragments from visible copy.

- [ ] **Step 3: Route optional map generation through a server endpoint or disable it**

Preferred sequence:

1. add `/api/generate-level` with a separate strict schema.
2. until that endpoint is complete, hide the AI map generation button.
3. do not retain browser direct calls as a temporary fallback.

- [ ] **Step 4: Replace DC “AI深度分析”**

Use the already validated current crisis plan and patient snapshot to render a deterministic explanation. Do not perform a second model call from the NPC.

- [ ] **Step 5: Run security tests**

Run:

```powershell
npx playwright test tests/security.spec.js
npm run test:server
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add js/ai-levels.js js/entities.js editor.html js/game.js tests/security.spec.js
git commit -m "security: remove browser AI credentials"
```

### Task 6: Visible AI decision trace and report

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/game.js:1038-1220`
- Modify: `js/game.js:1994-2117`
- Modify: `tests/case-director.spec.js`

**Interfaces:**
- Consumes: `Game.caseDirectorHistory`.
- Produces: AI source badge, crisis card, objective highlight, report decision timeline.

- [ ] **Step 1: Write failing visible evidence test**

Mock an AI response and assert:

- “AI病情导演” is visible.
- source badge is “AI在线”.
- event name, target and reason are visible.
- the target node is highlighted.
- completion report contains both phase records.

- [ ] **Step 2: Add crisis card**

Use text nodes for:

- `#director-source`
- `#director-event`
- `#director-target`
- `#director-reason`
- `#director-phase`

Show “本地导演” when fallback is used; never pretend a fallback result came from AI.

- [ ] **Step 3: Add decision history records**

Record:

```js
{
  phase,
  source,
  plan,
  requestedAt,
  startedAt,
  completedAt,
  outcome: {
    durationSeconds,
    deaths,
    vitalsBefore,
    vitalsAfter,
  },
}
```

- [ ] **Step 4: Render report timeline**

For each phase show:

- AI or local source.
- selected crisis.
- reason.
- player response time.
- patient state before and after.

- [ ] **Step 5: Run director and full tests**

Run:

```powershell
npx playwright test tests/case-director.spec.js
npm run test:all
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add index.html css/style.css js/game.js tests/case-director.spec.js
git commit -m "feat: expose AI crisis decisions to players"
```

### Task 7: Strict AI case blueprint endpoint

**Files:**
- Create: `server/case-generator.js`
- Create: `tests/case-generator.test.cjs`
- Modify: `server.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `CaseGenerationRequest`.
- Produces: validated `CaseBlueprint` with `source: 'ai' | 'local'`.

- [ ] **Step 1: Write contract tests before the handler**

Test a valid request, missing fields, unknown fields, oversized text, upstream timeout, malformed AI JSON and offline fallback. The endpoint must never return JavaScript, HTML or raw map rows.

- [ ] **Step 2: Define the exact request**

```js
{
  schemaVersion: 1,
  theme: '肺泡缺氧',
  primaryCell: 'auto',
  difficulty: 'standard',
  durationMinutes: 4,
  focus: 'mixed',
  visualTheme: 'alveoli',
  learningTopic: 'oxygen-transport',
}
```

Reject unknown keys. Use enums for every field except the bounded display name.

- [ ] **Step 3: Define the strict blueprint schema**

Allow only these top-level keys: `version`, `name`, `themeId`, `primaryCell`, `difficulty`, `durationMinutes`, `vitals`, `goals`, `layout`, `allowedEvents`, `briefing`, `education`. `layout` may reference registered template and segment IDs, but may not contain final map rows.

- [ ] **Step 4: Implement AI parsing and local fallback**

Call the model only on the server, extract one JSON object, validate exact keys and enum values, then return it. On missing key, timeout, rate limit, invalid JSON or schema failure, return a deterministic local blueprint and set `source: 'local'`.

- [ ] **Step 5: Register the server route safely**

Add `POST /api/generate-case` with the same origin policy, body limit, timeout, request ID and rate limiting as `/api/director`. Never log prompts containing player identifiers or return upstream error bodies.

- [ ] **Step 6: Run server tests**

Run:

```powershell
node --test tests/case-generator.test.cjs
npm run test:server
```

Expected: PASS, including offline fallback.

- [ ] **Step 7: Commit**

```powershell
git add server/case-generator.js tests/case-generator.test.cjs server.js package.json
git commit -m "feat: generate validated patient case blueprints"
```

### Task 8: Deterministic template compiler and playability gate

**Files:**
- Create: `js/case-templates.js`
- Create: `js/case-compiler.js`
- Create: `tests/case-generator.spec.js`
- Modify: `index.html`
- Modify: `editor.html`

**Interfaces:**
- Consumes: validated `CaseBlueprint` and integer seed.
- Produces: `CaseCompiler.compile(blueprint, { seed })` returning `{ map, caseConfig, metadata }`.
- Produces: `CaseCompiler.validateReachability(map, caseConfig)`.

- [ ] **Step 1: Write compiler invariants first**

Assert deterministic output for the same blueprint and seed, one player spawn, required node counts, no forbidden legacy symbols, valid dimensions and stable IDs. Generate at least 50 seeds per registered template.

- [ ] **Step 2: Register safe templates and segments**

Each segment has exactly 15 rows, declared entrance/exit anchors, compatible vessel height and bounded traversal gaps. Register transport, infection, recovery and mixed segments. The registry must not contain `F`, `?`, `o`, `p` or other retired Mario-like objects.

- [ ] **Step 3: Compile the blueprint**

Resolve only registered IDs, order segments with the seeded PRNG, place exactly one `P`, place `L`, `T` and `i` markers from goals, derive stable case/node IDs, and normalize the result through `CaseSchema`.

- [ ] **Step 4: Implement a conservative reachability check**

Model the actual movement envelope: walkable surfaces, maximum horizontal gap, maximum upward step and fall recovery. Verify the spawn can reach every required objective and completion zone. This is a safety gate, not an AI judgment.

- [ ] **Step 5: Fall back to a known-safe template**

If compilation or reachability fails, preserve the requested theme and learning topic but substitute the official safe layout. Record `metadata.fallbackReason` for editor diagnostics and evidence.

- [ ] **Step 6: Run browser and stress tests**

Run:

```powershell
npx playwright test tests/case-generator.spec.js
npm run test:all
```

Expected: every generated seed validates and can enter the playable case flow.

- [ ] **Step 7: Commit**

```powershell
git add js/case-templates.js js/case-compiler.js tests/case-generator.spec.js index.html editor.html
git commit -m "feat: compile AI case blueprints into safe maps"
```

### Task 9: AI generation and constrained assistance in the editor

**Files:**
- Modify: `editor.html`
- Modify: `js/ai-levels.js`
- Modify: `server/case-generator.js`
- Modify: `tests/case-generator.spec.js`
- Modify: `tests/security.spec.js`

**Interfaces:**
- Produces: generation form, draft preview, validation report and explicit edit/test/save actions.
- Optional endpoint: `POST /api/case-assistant` returning a validated `CasePatch`.

- [ ] **Step 1: Replace raw-map generation tests**

Delete expectations that AI emits a 15×80 character matrix. Test the full flow: request blueprint, compile draft, validate, open in editor, test-play, save, export `CQ2!`, import and replay.

- [ ] **Step 2: Add generation controls**

Expose theme, primary cell (`auto`, `rbc`, `wbc`), difficulty, duration, gameplay focus, visual theme and learning topic. Defaults must create a valid case with one click.

- [ ] **Step 3: Show a trustworthy preview**

Before opening the draft, show AI/local source, selected primary cell, goals, initial vitals, learning objective, template summary, validation result and any fallback reason. Provide `打开编辑器`, `试玩`, `重新生成` and `保存` actions.

- [ ] **Step 4: Restrict assistant changes to semantic operations**

Allow only `addNode`, `removeNode`, `setDifficulty`, `setPrimaryCell` and `replaceBriefing`. Validate operation-specific fields and values; do not accept arbitrary JSON Pointer paths, map rows, script, HTML or unknown operations.

- [ ] **Step 5: Require preview and confirmation**

Compile the proposed patch on a copy, show a human-readable before/after diff and validation result, and apply it only after explicit confirmation. A failed or cancelled patch leaves the current draft byte-for-byte unchanged.

- [ ] **Step 6: Remove browser key storage and legacy object vocabulary**

Remove any API Key field and `localStorage` key handling from `js/ai-levels.js`. Ensure prompts, examples and previews no longer create coins, question blocks, finish flags, pipes or stomp-only enemies.

- [ ] **Step 7: Add offline behavior**

When the endpoint is unavailable, generate a local blueprint from the same form, compile it through the same pipeline and label the result `本地规则生成`. All editor and sharing actions remain available.

- [ ] **Step 8: Run security and integration tests**

Run:

```powershell
npx playwright test tests/case-generator.spec.js tests/security.spec.js
node --test tests/case-generator.test.cjs
npm run test:all
```

Expected: PASS with AI configured and unconfigured.

- [ ] **Step 9: Commit**

```powershell
git add editor.html js/ai-levels.js server/case-generator.js tests/case-generator.spec.js tests/security.spec.js
git commit -m "feat: add safe AI-assisted case creation"
```
