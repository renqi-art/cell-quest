# Quality, Balance, Accessibility, and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Architecture amendment — 2026-07-26:** Quality gates now cover the Vite production build, strict TypeScript, ESLint, Vitest domain/component suites, Playwright and server tests. CSS/DOM work belongs in Vue components and scoped styles; legacy script performance remains measured only while the adapter is active.

**Goal:** 将六关病例打磨为稳定、平衡、可读、可访问、可线上发布的比赛版本，并建立可重复的自动化与人工质量门。

**Architecture:** 以自动化测试覆盖关键状态机和流程，以配置化平衡预设控制数值，以统一视觉令牌和设置系统处理可读性与可访问性。发布候选必须同时通过功能、性能、内容、安全和人工通关检查。

**Tech Stack:** Vite、Vue 3、TypeScript strict、Pinia、Vitest、Vue Test Utils、Playwright、Node `node:test`、Canvas/Phaser Performance API、PowerShell/NPM脚本。

## Global Constraints

- 桌面目标分辨率为 `800×480` 逻辑画布，CSS保持 `5:3` 比例。
- 目标为正常场景60 FPS，压力场景1%低帧不低于45 FPS。
- 首屏交互前不自动播放音频。
- 所有核心状态不能只依赖颜色传达。
- 所有菜单必须可用键盘完成。
- `prefers-reduced-motion: reduce` 时取消屏幕震动、闪烁和非必要过渡。
- 每个发布候选必须依次通过 `npm run typecheck`、`npm run lint`、`npm run test:unit`、`npm run test:component`、`npm test`、`npm run build` 和 `npm run test:server`。
- Playwright必须同时验证Vite开发服务器和至少一轮生产 `preview` 冒烟，不能只验证遗留 `node server.js` 静态页面。
- 性能报告必须注明当前运行时适配器是legacy还是Phaser，两个结果不得混合比较。
- 六个内置病例必须分别完成单人通关；至少一个病例完成双人通关。
- 发布候选不得有未处理的控制台错误、资源404或不可达目标。

---

### Task 1: Unified test commands and deterministic test hooks

**Files:**
- Modify: `package.json`
- Modify: `playwright.config.cjs`
- Create: `js/test-hooks.js`
- Modify: `index.html`
- Create: `tests/test-hooks.spec.js`

**Interfaces:**
- Produces: deterministic clock/seed injection available only under `?test=1`.

- [ ] **Step 1: Write failing test-hook test**

Open `/?test=1` and assert `window.__CELL_QUEST_TEST__` exposes:

- `loadCase(levelId, options)`.
- `advanceFrames(count)`.
- `setVitals(vitals)`.
- `dispatchCaseEvent(event)`.
- `getSnapshot()`.

Open `/` without query and assert the hook is absent.

- [ ] **Step 2: Implement guarded hook loading**

Only load:

```js
if (new URLSearchParams(location.search).get('test') === '1') {
  const script = document.createElement('script');
  script.src = 'js/test-hooks.js';
  document.head.appendChild(script);
}
```

- [ ] **Step 3: Add scripts**

```json
{
  "scripts": {
    "test:browser": "playwright test",
    "test:node": "node --test tests/*.test.cjs",
    "test:all": "npm run test:node && npm run test:server && npm run test:browser && npm run validate:content"
  }
}
```

- [ ] **Step 4: Run full suite**

Run: `npm run test:all`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json playwright.config.cjs js/test-hooks.js index.html tests/test-hooks.spec.js
git commit -m "test: add deterministic case test hooks"
```

### Task 2: Balance profiles and case simulation

**Files:**
- Create: `js/case-balance.js`
- Create: `scripts/simulate-cases.cjs`
- Create: `tests/case-balance.test.cjs`
- Modify: `js/case-engine.js`
- Modify: `js/levels.js`
- Create: `docs/qa/case-balance-matrix.md`

**Interfaces:**
- Produces: `CASE_BALANCE_PROFILES`, `getCaseBalance(profileId)`, simulation summary.

- [ ] **Step 1: Write failing profile tests**

Require profiles:

```js
{
  assist: { vitalDamage: 0.75, allyEfficiency: 1.25, atpCost: 0.8 },
  standard: { vitalDamage: 1, allyEfficiency: 1, atpCost: 1 },
  challenge: { vitalDamage: 1.2, allyEfficiency: 0.9, atpCost: 1.1 }
}
```

Assert all multipliers remain within `0.5–1.5`.

- [ ] **Step 2: Implement profile selection**

Default new saves to `standard`. AI crises apply on top of profiles but clamp final multipliers to `0.6–1.6`.

- [ ] **Step 3: Build deterministic case simulation**

Simulate three player strategies:

- efficient: responds within20 seconds and misses no objective.
- average: responds within40 seconds with one death.
- struggling: responds within60 seconds with two deaths.

For every official case/profile output:

- completion/failure.
- final vitals.
- estimated duration.
- minimum ATP.

- [ ] **Step 4: Define numeric acceptance bands**

In standard profile:

- efficient strategy completes with tissue `>=70`.
- average strategy completes with tissue `>=35`.
- struggling strategy may fail but must remain recoverable for at least90 seconds.
- no strategy starts with an impossible goal.

- [ ] **Step 5: Tune configs, not engine constants**

Adjust each level's `caseConfig` while keeping shared physiology relations unchanged.

- [ ] **Step 6: Generate balance matrix**

Run: `node scripts/simulate-cases.cjs`

Expected: all acceptance bands PASS and markdown written to `docs/qa/case-balance-matrix.md`.

- [ ] **Step 7: Commit**

```powershell
git add js/case-balance.js js/case-engine.js js/levels.js scripts/simulate-cases.cjs tests/case-balance.test.cjs docs/qa/case-balance-matrix.md
git commit -m "balance: define recoverable patient cases"
```

### Task 3: Responsive canvas and layout

**Files:**
- Modify: `css/style.css:1-194`
- Modify: `index.html`
- Modify: `js/game.js`
- Create: `tests/responsive-layout.spec.js`

**Interfaces:**
- Produces: stable 5:3 container and readable HUD at desktop/tablet/mobile widths.

- [ ] **Step 1: Write visual dimension tests**

At `1440×900`, `1024×768`, `768×1024`, and `390×844`, assert:

- canvas display ratio is within0.5% of5:3.
- no HUD item extends outside the container.
- case objective text is visible.
- buttons are at least44 CSS pixels high on touch layout.

- [ ] **Step 2: Replace independent width/height scaling**

Use:

```css
#game-container {
  width: min(100vw, calc(100vh * 5 / 3), 1200px);
  aspect-ratio: 5 / 3;
  height: auto;
}
#canvas {
  width: 100%;
  height: 100%;
}
```

- [ ] **Step 3: Add compact HUD breakpoint**

Below600px:

- stack vital bars.
- collapse objective details behind a persistent one-line summary.
- use larger touch targets.
- hide decorative labels before functional values.

- [ ] **Step 4: Add fullscreen action**

Use the Fullscreen API only after user click. If unsupported, hide the action.

- [ ] **Step 5: Run tests**

Run: `npx playwright test tests/responsive-layout.spec.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add css/style.css index.html js/game.js tests/responsive-layout.spec.js
git commit -m "fix: preserve readable game aspect ratio"
```

### Task 4: Accessibility and input settings

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/config.js`
- Modify: `js/game.js:520-635`
- Create: `tests/accessibility.spec.js`

**Interfaces:**
- Produces: settings model, reduced motion, high contrast, color-safe indicators, remappable controls.

- [ ] **Step 1: Write failing keyboard and settings tests**

Verify:

- all menu actions reachable by Tab.
- Escape closes topmost modal.
- Enter activates focused action.
- reduced motion disables shake.
- each vital bar has icon, label and numeric value.
- custom key mapping persists and rejects duplicates.

- [ ] **Step 2: Define settings**

```js
const DEFAULT_SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  colorVision: 'default',
  textScale: 1,
  musicVolume: 0.6,
  effectsVolume: 0.8,
  controlsP1: { left:'a', right:'d', jump:' ', skill:'e', dash:'Shift' },
  controlsP2: { left:'j', right:'l', jump:'i', skill:'u', dash:'o' },
};
```

Validate all loaded values before use.

- [ ] **Step 3: Remove color-only meaning**

Add stable icons:

- oxygen: `O₂`.
- infection: pathogen icon plus downward target arrow.
- tissue: heartbeat icon.

Warning states include text and pattern changes.

- [ ] **Step 4: Implement reduced motion**

When enabled:

- `Game.camera.shake = 0`.
- disable flashing opacity loops.
- replace crisis slide/zoom with instant fade.
- reduce particles by75%.

- [ ] **Step 5: Add remapping UI**

Capture one key at a time, reject reserved browser shortcuts and duplicates within each player map, and provide reset defaults.

- [ ] **Step 6: Run tests**

Run:

```powershell
npx playwright test tests/accessibility.spec.js
npx playwright test tests/core-flow.spec.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add index.html css/style.css js/config.js js/game.js tests/accessibility.spec.js tests/core-flow.spec.js
git commit -m "feat: add accessible case controls and feedback"
```

### Task 5: Rendering performance and asset reliability

**Files:**
- Modify: `js/game.js:917-1037`
- Modify: `js/entities.js`
- Modify: `js/case-entities.js`
- Create: `tests/performance.spec.js`
- Create: `docs/qa/performance-budget.md`

**Interfaces:**
- Produces: frame telemetry in test mode and documented budgets.

- [ ] **Step 1: Write performance scenario**

Load a stress case with:

- two players.
- maximum supported infection sites.
- active AI crisis.
- automatic particles.
- 20 enemies.

Run30 seconds and collect frame durations.

- [ ] **Step 2: Add test-only frame telemetry**

Record a ring buffer of the last1800 `requestAnimationFrame` intervals only when test mode is enabled.

- [ ] **Step 3: Remove avoidable hot-path work**

Audit and change:

- no DOM queries inside every fixed update.
- cache HUD elements.
- no array allocation for unchanged UI snapshots.
- cap particles, projectiles and mini enemies.
- pre-render repeated tissue/infection textures to offscreen canvases.

- [ ] **Step 4: Define budgets**

- median frame <=16.7ms on reference machine.
- p99 frame <=22.2ms in normal case.
- p99 frame <=33.3ms in stress case.
- no unbounded entity collection growth.

- [ ] **Step 5: Run test and document machine**

Run: `npx playwright test tests/performance.spec.js`

Expected: PASS. Record CPU, browser version and measured percentiles.

- [ ] **Step 6: Commit**

```powershell
git add js/game.js js/entities.js js/case-entities.js tests/performance.spec.js docs/qa/performance-budget.md
git commit -m "perf: keep patient cases within frame budget"
```

### Task 6: Visual and audio consistency pass

**Files:**
- Modify: `css/style.css`
- Modify: `js/config.js`
- Modify: `js/game.js`
- Modify: `js/entities.js`
- Create: `docs/qa/visual-language.md`

**Interfaces:**
- Produces: shared visual tokens and feedback conventions.

- [ ] **Step 1: Inventory every screen**

Capture:

- main menu.
- case hub.
- briefing.
- gameplay normal/warning/critical.
- AI crisis.
- pause.
- failure.
- report.
- editor.
- settings.

List inconsistent fonts, spacing, colors, borders, button states and icon styles.

- [ ] **Step 2: Define tokens**

```css
:root {
  --font-ui: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  --color-oxygen: #5cc8ff;
  --color-infection: #ff5f6d;
  --color-tissue: #7ee787;
  --color-atp: #ffd866;
  --surface-1: rgba(10, 14, 28, .88);
  --surface-2: rgba(24, 30, 52, .94);
  --focus-ring: #ffffff;
  --radius-panel: 12px;
}
```

- [ ] **Step 3: Normalize component states**

Every button and panel must define default, hover, active, disabled, focus-visible and critical variants.

- [ ] **Step 4: Normalize feedback timing**

- pickup: 120–180ms.
- objective completion: 300–500ms.
- crisis announcement: max2.5s or user dismiss.
- report transitions: max400ms.

- [ ] **Step 5: Verify Chinese text encoding**

Load every HTML/JS text surface through the browser, scan rendered body for replacement characters `�` and known mojibake patterns, and add a browser assertion.

- [ ] **Step 6: Commit**

```powershell
git add css/style.css js/config.js js/game.js js/entities.js docs/qa/visual-language.md
git commit -m "style: unify Cell Quest visual feedback"
```

### Task 7: Six-case manual QA and release candidate

**Files:**
- Create: `docs/qa/release-checklist.md`
- Create: `docs/qa/manual-case-results.md`
- Create: `CHANGELOG-v4.md`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Produces: release candidate version and signed-off QA matrix.

- [ ] **Step 1: Create manual matrix**

For each official case record:

- single primary cell.
- AI online phase one/two.
- local fallback phase one/two.
- goals reachable.
- failure recoverable.
- final score.
- duration.
- deaths.
- console errors.
- visual defects.

Add one full co-op run with role swap.

- [ ] **Step 2: Run automated release checks**

Run:

```powershell
npm ci
npm run test:all
npm run validate:content
```

Expected: all exit0.

- [ ] **Step 3: Run asset and route smoke**

Assert no404 for all referenced scripts, styles, images and audio. Check `/healthz`, editor, daily leaderboard and AI local fallback.

- [ ] **Step 4: Complete manual runs**

Do not mark a case passed until it reaches the report screen without developer tools or state injection.

- [ ] **Step 5: Fix blocking and high-severity issues**

Classify:

- P0: crash, impossible case, secret exposure, data loss.
- P1: wrong objective, misleading patient state, broken controls.
- P2: visual/audio defect without progression impact.

Release requires zero P0/P1.

- [ ] **Step 6: Set version and changelog**

Update package version to `4.0.0`. Changelog lists the case engine, AI director, story, editor, product loop, compatibility and known limitations.

- [ ] **Step 7: Tag candidate after commit**

```powershell
git add docs/qa/release-checklist.md docs/qa/manual-case-results.md CHANGELOG-v4.md README.md package.json package-lock.json
git commit -m "chore: prepare Cell Quest v4 release candidate"
git tag v4.0.0-rc.1
```
