# Product, UGC, and Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立“学习玩法—完成病例—生成报告—AI生成病例草案—编辑试玩—分享挑战—每日回访”的产品闭环，并提供可公开访问、可监控、可持续扩展的演示版本。

**Architecture:** 用户进度继续以版本化 localStorage 为主；AI只生成受限病例蓝图，由确定性编译器生成可玩草案；病例通过编辑器验证后再用 `CQ2!` 分享码跨设备传播；每日病例使用日期种子保证公平；排行榜通过受限服务端接口保存最小成绩数据；内容包、AI草案与病例编辑器共享同一配置结构。

**Tech Stack:** 原生 JavaScript、Canvas、Node.js HTTP server、JSON、Playwright、Node `node:test`。

## Global Constraints

- 不引入账号系统作为首个产品化依赖。
- 分享码不得包含 API Key、任意代码、HTML或玩家隐私数据。
- 每日标准病例必须对同一天的所有玩家生成相同危机计划。
- 排行榜只保存昵称、日期、病例ID、时间、评分和校验摘要。
- 昵称最长12个可见字符，移除控制字符和HTML。
- 报告分享图不得包含本地存档标识或AI密钥。
- 所有公开写接口必须限流、限制正文大小并验证内容类型。

---

### Task 1: 60-second onboarding and case hub

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/game.js:1400-1606`
- Modify: `js/config.js:864-1035`
- Create: `tests/onboarding.spec.js`

**Interfaces:**
- Produces: `showOnboarding()`, `completeOnboarding()`, case hub progress model.

- [ ] **Step 1: Write failing first-run test**

Clear storage, open the game, and assert onboarding appears before the hub. Verify it teaches:

1. patient vitals.
2. current cell responsibility.
3. AI crisis card.
4. stable completion.

- [ ] **Step 2: Add four short onboarding panels**

Each panel uses one sentence, one visual focus, and one action. The last panel launches the first RBC case.

- [ ] **Step 3: Persist onboarding version**

```js
const ONBOARDING_VERSION = 1;
localStorage.setItem('cellQuest_onboardingVersion', String(ONBOARDING_VERSION));
```

If the version changes, show only newly introduced panels.

- [ ] **Step 4: Replace level grid with case journey**

Each card displays:

- chapter number and patient state.
- primary cell.
- completed/locked state.
- best patient score.
- AI events encountered.
- learning card collected.

- [ ] **Step 5: Add replay and continue actions**

Primary action opens the next incomplete chapter. Secondary actions open completed reports and editor.

- [ ] **Step 6: Run tests**

Run:

```powershell
npx playwright test tests/onboarding.spec.js
npx playwright test tests/core-flow.spec.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add index.html css/style.css js/game.js js/config.js tests/onboarding.spec.js
git commit -m "feat: add guided patient case onboarding"
```

### Task 2: Deterministic daily standard case

**Files:**
- Create: `js/daily-case.js`
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/game.js`
- Modify: `js/config.js`
- Create: `tests/daily-case.spec.js`

**Interfaces:**
- Consumes: local date in `YYYY-MM-DD`, official case templates.
- Produces: `createDailyCase(dateString)`, `getDailyDirectorPlans(dateString)`.

- [ ] **Step 1: Write failing deterministic generation test**

```js
const first = createDailyCase('2026-07-26');
const second = createDailyCase('2026-07-26');
expect(first).toEqual(second);
expect(createDailyCase('2026-07-27')).not.toEqual(first);
```

- [ ] **Step 2: Implement seeded PRNG**

Use a small deterministic generator:

```js
function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 3: Generate bounded daily variation**

Vary only:

- official template ID.
- initial vitals within ±10.
- goal count within 1–3.
- two local director events.
- ATP pickup count within a bounded range.

Do not use external AI for ranked daily plans; otherwise different players would receive different challenges.

- [ ] **Step 4: Add daily hub banner**

Display date, primary cell, two event icons, completion state and local best score.

- [ ] **Step 5: Add daily result record**

Store:

```js
{
  date,
  seed,
  templateId,
  durationMs,
  patientScore,
  deaths,
  completedAt,
}
```

- [ ] **Step 6: Run tests**

Run: `npx playwright test tests/daily-case.spec.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add js/daily-case.js index.html css/style.css js/game.js js/config.js tests/daily-case.spec.js
git commit -m "feat: add deterministic daily patient cases"
```

### Task 3: Safe versioned UGC sharing and metadata

**Files:**
- Modify: `js/config.js:598-688`
- Modify: `editor.html`
- Modify: `index.html`
- Create: `tests/case-sharing.spec.js`
- Modify: `tests/security.spec.js`

**Interfaces:**
- Consumes: validated hand-authored or AI-compiled case draft.
- Produces: `exportCaseCode(index)`, `importCaseCode(code)`, `CQ2!` payload.

- [ ] **Step 1: Write failing round-trip test**

Export a case with title, difficulty, primary cell, caseConfig, map and cover palette; import it into a clean slot; assert deep equality of allowed fields.

Repeat the same round trip for an AI-generated draft after it has passed `CaseSchema` and editor validation. Generation provenance may be displayed locally, but prompts, API metadata and model responses must not enter the share code.

- [ ] **Step 2: Define exact payload**

```js
{
  v: 2,
  id: 'user-case-slug',
  name: '缺氧警报',
  author: '免疫战士',
  difficulty: 'normal',
  tags: ['供氧', '感染'],
  icon: '🫁',
  primaryCell: 'rbc',
  caseConfig,
  map,
  sky,
}
```

Limits:

- name 1–20 characters.
- author 1–12 characters.
- at most three tags, each 1–8 characters.
- map at most 15×160.
- decoded payload at most 128 KiB.

- [ ] **Step 3: Validate before encode and after decode**

Reuse case editor validation. Reject unknown object keys, unsafe strings, invalid nodes, executable expressions and unsupported versions.

- [ ] **Step 4: Add case cover metadata UI**

Editor fields:

- title.
- author.
- difficulty.
- up to three tags.
- one of eight built-in cover icons.

- [ ] **Step 5: Add import preview**

Before saving show title, author, difficulty, tags, dimensions, objectives and “经典/病例模式”. Require explicit confirmation.

- [ ] **Step 6: Run tests**

Run:

```powershell
npx playwright test tests/case-sharing.spec.js
npx playwright test tests/security.spec.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add js/config.js editor.html index.html tests/case-sharing.spec.js tests/security.spec.js
git commit -m "feat: add safe versioned case sharing"
```

### Task 4: Shareable patient report image

**Files:**
- Create: `js/report-card.js`
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/game.js`
- Create: `tests/report-card.spec.js`

**Interfaces:**
- Consumes: bounded case report.
- Produces: `renderReportCard(report, options)`, PNG download/share.

- [ ] **Step 1: Write failing rendering test**

Pass a fixed report and assert the returned canvas is `1200×630` and includes no raw storage keys or HTML.

- [ ] **Step 2: Implement report canvas**

Draw:

- game logo and chapter.
- three final vital values.
- primary cell or co-op badges.
- AI crisis event names.
- patient score.
- one knowledge takeaway.
- share code or public URL only when explicitly requested.

- [ ] **Step 3: Add browser sharing**

Use `navigator.share({ files })` when supported; otherwise download `cell-quest-report.png`. Provide copy fallback for text summary.

- [ ] **Step 4: Add privacy guard**

Construct the render model explicitly. Never spread the whole save object into the renderer.

- [ ] **Step 5: Run tests**

Run: `npx playwright test tests/report-card.spec.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add js/report-card.js index.html css/style.css js/game.js tests/report-card.spec.js
git commit -m "feat: generate shareable patient reports"
```

### Task 5: Bounded daily leaderboard service

**Files:**
- Create: `server/leaderboard.js`
- Modify: `server.js`
- Modify: `js/daily-case.js`
- Modify: `tests/server.test.cjs`
- Modify: `tests/daily-case.spec.js`

**Interfaces:**
- Consumes: signed daily result summary.
- Produces: `POST /api/daily-score`, `GET /api/daily-score?date=YYYY-MM-DD`.

- [ ] **Step 1: Write failing server tests**

Test:

- accepts valid score.
- rejects non-current daily seed.
- rejects negative time and score over100.
- strips no invalid nicknames; rejects them.
- returns at most50 entries.
- rate-limits repeated writes from one address.

- [ ] **Step 2: Define score record**

```js
{
  date: '2026-07-26',
  seed: 123456789,
  nickname: '免疫战士',
  durationMs: 92341,
  patientScore: 87,
  deaths: 1,
  proof: 'sha256-summary',
}
```

The proof detects accidental tampering; document that it is not anti-cheat security.

- [ ] **Step 3: Implement storage adapter**

```js
class JsonLeaderboardStore {
  constructor(filePath) { this.filePath = filePath; }
  list(date) { /* read, validate, sort, slice */ }
  add(record) { /* atomic temporary-file replace */ }
}
```

Store outside public paths at `data/daily-scores.json`. Add `data/*.json` to `.gitignore`.

- [ ] **Step 4: Implement input limits**

- JSON only.
- body max16KiB for this endpoint.
- nickname regex excludes control characters and angle brackets.
- one write per IP per10 seconds.
- keep best score per nickname/date.

- [ ] **Step 5: Add client submit and display**

Submitting is optional and requires user confirmation. Local leaderboard always remains available.

- [ ] **Step 6: Run tests**

Run:

```powershell
npm run test:server
npx playwright test tests/daily-case.spec.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add server/leaderboard.js server.js js/daily-case.js tests/server.test.cjs tests/daily-case.spec.js .gitignore
git commit -m "feat: add bounded daily case leaderboard"
```

### Task 6: Content packs and operational roadmap

**Files:**
- Create: `content/case-pack.schema.json`
- Create: `content/core-pack.json`
- Create: `docs/operations/content-roadmap.md`
- Create: `scripts/validate-case-pack.cjs`
- Modify: `editor.html`
- Modify: `package.json`
- Create: `tests/case-pack.test.cjs`

**Interfaces:**
- Consumes: versioned case pack JSON.
- Produces: validated content pack import and documented release cadence.

- [ ] **Step 1: Write failing pack validation test**

Validate a pack containing metadata, chapter content, one or more case templates, sources and compatibility version.

- [ ] **Step 2: Define pack schema**

Required:

```json
{
  "version": 1,
  "id": "core-pack",
  "name": "基础免疫病例",
  "gameVersion": ">=4.0.0",
  "cases": [],
  "sources": []
}
```

Forbid scripts, remote asset execution and arbitrary HTML.

- [ ] **Step 3: Implement pack validator and editor import**

Import only JSON. Display a preview of case count, sources, supported version and storage impact.

- [ ] **Step 4: Write the operational roadmap**

Define quarterly themes:

1. respiratory pack: alveoli, asthma education, oxygen transport.
2. infection pack: bacterial/viral distinctions without treatment advice.
3. circulation pack: anemia and blood flow education.
4. classroom pack: teacher-selected cases and printable reports.

For every pack require content review, six-player playtest, accessibility pass and source validation.

- [ ] **Step 5: Run tests**

Run:

```powershell
node --test tests/case-pack.test.cjs
npm run validate:content
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add content/case-pack.schema.json content/core-pack.json docs/operations/content-roadmap.md scripts/validate-case-pack.cjs editor.html package.json tests/case-pack.test.cjs
git commit -m "feat: add validated case content packs"
```

### Task 7: Public deployment readiness and health checks

**Files:**
- Modify: `server.js`
- Create: `.env.example`
- Create: `docs/operations/deployment.md`
- Create: `tests/deployment-smoke.spec.js`
- Modify: `README.md`

**Interfaces:**
- Produces: `/healthz`, documented environment, production smoke test.

- [ ] **Step 1: Write failing health test**

Assert:

```json
{
  "ok": true,
  "service": "cell-quest",
  "version": "4.0.0",
  "aiConfigured": false
}
```

Do not expose model URL, key, file paths or environment values.

- [ ] **Step 2: Add production security headers**

Add:

- Content-Security-Policy limited to self for scripts/styles/assets and configured API proxy.
- `X-Frame-Options: DENY`.
- `Permissions-Policy` disabling camera, microphone and geolocation.
- existing no-sniff and referrer policy.

- [ ] **Step 3: Add environment example**

List names only:

```dotenv
CELL_QUEST_HOST=127.0.0.1
CELL_QUEST_PORT=8080
CELL_QUEST_AI_API_KEY=
CELL_QUEST_AI_BASE_URL=https://api.deepseek.com/v1/chat/completions
CELL_QUEST_AI_MODEL=deepseek-chat
CELL_QUEST_DATA_DIR=./data
```

- [ ] **Step 4: Document deployment steps**

Include:

- Node version.
- install/start commands.
- persistent data directory.
- health check.
- secret configuration.
- offline demo packaging.
- rollback to prior release tag.

- [ ] **Step 5: Add smoke test**

Against `CELL_QUEST_BASE_URL` verify main page, editor, health, one local-director case and static asset status.

- [ ] **Step 6: Run local smoke**

Run:

```powershell
npm run dev
npx playwright test tests/deployment-smoke.spec.js
```

Expected: PASS with local base URL.

- [ ] **Step 7: Commit**

```powershell
git add server.js .env.example docs/operations/deployment.md tests/deployment-smoke.spec.js README.md
git commit -m "chore: prepare public Cell Quest deployment"
```
