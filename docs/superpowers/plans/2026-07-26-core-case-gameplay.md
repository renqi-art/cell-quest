# Core Case Gameplay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立红细胞供氧、白细胞清除感染、患者指标稳定通关的通用病例引擎，并通过编辑器配置六个内置病例和双人红白协作。

**Architecture:** `CaseEngine` 作为独立确定性状态机，实体只发送领域事件，HUD只读取快照。病例节点由地图字符生成；单人固定主控并使用脚本友军，双人将友军职责交给第二名玩家。

**Tech Stack:** 原生 JavaScript、HTML5 Canvas、localStorage、Playwright。

## Global Constraints

- 三项指标范围固定为 `0–100`。
- 单人不切换细胞，双人固定一红一白。
- 血小板代码保留但入口隐藏。
- 病例通关与旧经典通关严格分离。
- 所有任务执行 TDD，相关回归通过后独立提交。

---

### Task 1: CaseEngine deterministic state machine

**Files:**
- Create: `js/case-engine.js`
- Modify: `index.html:229`
- Test: `tests/case-engine.spec.js`

**Interfaces:**
- Consumes: `caseConfig` from a level.
- Produces: `new CaseEngine(config)`, `update(dtSeconds)`, `dispatch(event)`, `getSnapshot()`, `isComplete()`, `isFailed()`.

- [ ] **Step 1: Write the failing constructor and clamp test**

```js
test('CaseEngine initializes and clamps patient vitals', async ({ page }) => {
  await page.goto('/');
  const snapshot = await page.evaluate(() => {
    const engine = new CaseEngine({
      vitals: {
        oxygen: { initial: 120, target: 80, decayPerSecond: 0 },
        infection: { initial: -5, target: 20, growthPerSecond: 0 },
        tissue: { initial: 60, target: 75 },
      },
      goals: { oxygenDeliveries: 1, infectionSites: 1 },
      stabilizeSeconds: 5,
    });
    return engine.getSnapshot();
  });
  expect(snapshot.vitals).toEqual({ oxygen: 100, infection: 0, tissue: 60 });
  expect(snapshot.status).toBe('active');
});
```

- [ ] **Step 2: Run the targeted test and confirm failure**

Run: `npx playwright test tests/case-engine.spec.js -g "initializes and clamps"`

Expected: FAIL with `ReferenceError: CaseEngine is not defined`.

- [ ] **Step 3: Implement the minimal state container**

```js
class CaseEngine {
  constructor(config) {
    this.config = CaseEngine.normalizeConfig(config);
    this.vitals = {
      oxygen: CaseEngine.clamp(this.config.vitals.oxygen.initial),
      infection: CaseEngine.clamp(this.config.vitals.infection.initial),
      tissue: CaseEngine.clamp(this.config.vitals.tissue.initial),
    };
    this.progress = { oxygenDeliveries: 0, infectionSites: 0 };
    this.stableFor = 0;
    this.status = 'active';
    this.events = [];
  }

  static clamp(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  static normalizeConfig(config) {
    if (!config || !config.vitals || !config.goals) {
      throw new TypeError('Invalid caseConfig');
    }
    return structuredClone(config);
  }

  getSnapshot() {
    return {
      vitals: { ...this.vitals },
      progress: { ...this.progress },
      stableFor: this.stableFor,
      status: this.status,
    };
  }
}

window.CaseEngine = CaseEngine;
```

Add before `game.js`:

```html
<script src="js/case-engine.js?v=1"></script>
```

- [ ] **Step 4: Run the test**

Run: `npx playwright test tests/case-engine.spec.js -g "initializes and clamps"`

Expected: PASS.

- [ ] **Step 5: Add failing update and event tests**

Cover exact events:

```js
engine.dispatch({ type: 'oxygenDelivered', amount: 20, tissueGain: 5, atpGain: 8 });
engine.dispatch({ type: 'infectionCleared', amount: 25, nodeId: 'infection_0' });
engine.update(1);
```

Assert:

- oxygen increases and remains clamped.
- tissue increases.
- infection decreases.
- progress increments once per unique infection node.
- high infection increases oxygen decay.
- low oxygen or high infection decreases tissue.
- duplicate node completion is ignored.

- [ ] **Step 6: Implement domain events and update**

```js
dispatch(event) {
  if (this.status !== 'active') return false;
  if (event.type === 'oxygenDelivered') {
    this.vitals.oxygen = CaseEngine.clamp(this.vitals.oxygen + event.amount);
    this.vitals.tissue = CaseEngine.clamp(this.vitals.tissue + event.tissueGain);
    this.progress.oxygenDeliveries += 1;
  } else if (event.type === 'infectionCleared') {
    if (this.events.some(item => item.type === event.type && item.nodeId === event.nodeId)) return false;
    this.vitals.infection = CaseEngine.clamp(this.vitals.infection - event.amount);
    this.progress.infectionSites += 1;
  } else if (event.type === 'playerDied') {
    this.vitals.oxygen = CaseEngine.clamp(this.vitals.oxygen - 8);
    this.vitals.infection = CaseEngine.clamp(this.vitals.infection + 6);
    this.vitals.tissue = CaseEngine.clamp(this.vitals.tissue - 5);
  }
  this.events.push({ ...event });
  return true;
}

update(dtSeconds) {
  if (this.status !== 'active') return;
  const infectionFactor = 1 + this.vitals.infection / 100;
  this.vitals.oxygen = CaseEngine.clamp(
    this.vitals.oxygen - this.config.vitals.oxygen.decayPerSecond * infectionFactor * dtSeconds
  );
  this.vitals.infection = CaseEngine.clamp(
    this.vitals.infection + this.config.vitals.infection.growthPerSecond * dtSeconds
  );
  if (this.vitals.oxygen < 35 || this.vitals.infection > 70) {
    this.vitals.tissue = CaseEngine.clamp(this.vitals.tissue - 1.5 * dtSeconds);
  }
  this.evaluateStatus(dtSeconds);
}
```

- [ ] **Step 7: Implement stable completion and failure**

`evaluateStatus(dtSeconds)` must:

- set `failed` when tissue is zero.
- require all goals and thresholds.
- add to `stableFor` only while all conditions hold.
- reset `stableFor` on regression.
- set `complete` at configured duration.

- [ ] **Step 8: Run all case engine tests and core regression**

Run:

```powershell
npx playwright test tests/case-engine.spec.js
npx playwright test tests/core-flow.spec.js
```

Expected: both commands PASS.

- [ ] **Step 9: Commit**

```powershell
git add js/case-engine.js index.html tests/case-engine.spec.js
git commit -m "feat: add deterministic patient case engine"
```

### Task 2: Case node entities and map parsing

**Files:**
- Create: `js/case-entities.js`
- Modify: `index.html:229`
- Modify: `js/game.js:18-124`
- Modify: `js/game.js:736-916`
- Modify: `js/entities.js:2238-2415`
- Test: `tests/case-engine.spec.js`

**Interfaces:**
- Consumes: map markers `L`, `T`, `i`; `Game.caseEngine`.
- Produces: `OxygenSource`, `TissueTarget`, `InfectionSite`, `Game.caseNodes`.

- [ ] **Step 1: Write failing map parsing test**

Create a test level containing one `L`, one `T`, and two `i` markers. Assert:

```js
expect(nodes.map(node => node.id)).toEqual([
  'oxygen_source_0',
  'tissue_0',
  'infection_0',
  'infection_1',
]);
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npx playwright test tests/case-engine.spec.js -g "parses case nodes"`

Expected: FAIL because `Game.caseNodes` is undefined.

- [ ] **Step 3: Add focused node classes**

```js
class OxygenSource {
  constructor(id, x, y) {
    this.id = id;
    this.type = 'oxygenSource';
    this.x = x;
    this.y = y;
    this.w = TILE;
    this.h = TILE;
  }
}

class TissueTarget {
  constructor(id, x, y) {
    this.id = id;
    this.type = 'tissueTarget';
    this.x = x;
    this.y = y;
    this.w = TILE;
    this.h = TILE;
  }
}

class InfectionSite {
  constructor(id, x, y) {
    this.id = id;
    this.type = 'infectionSite';
    this.x = x;
    this.y = y;
    this.w = TILE;
    this.h = TILE;
    this.active = true;
    this.health = 3;
  }
}
```

Expose the classes on `window` and load `case-entities.js` before `game.js`.

- [ ] **Step 4: Parse markers in `Level.load()`**

Initialize `this.caseNodes = []`, assign IDs by per-type counters, replace markers with air, and then assign `Game.caseNodes = Game.level.caseNodes` during `LoadLevel()`.

- [ ] **Step 5: Add red-cell oxygen cargo interaction**

Add to `Player`:

```js
this.oxygenCargo = 0;
this.lastCaseNodeId = null;
```

When an RBC overlaps an oxygen source and has no cargo:

```js
player.oxygenCargo = 1;
player.lastCaseNodeId = source.id;
showToast('已装载氧气，送往缺氧组织');
```

When an RBC with cargo overlaps a tissue target:

```js
player.oxygenCargo = 0;
Game.caseEngine.dispatch({
  type: 'oxygenDelivered',
  amount: 18,
  tissueGain: 6,
  atpGain: 8,
  nodeId: target.id,
  playerIndex: player.playerIndex,
});
Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + 8);
```

- [ ] **Step 6: Add infection site damage**

Route WBC attacks to overlapping active infection sites. At zero health:

```js
site.active = false;
Game.caseEngine.dispatch({
  type: 'infectionCleared',
  amount: 22,
  nodeId: site.id,
  playerIndex: player.playerIndex,
});
```

RBC attacks must not damage infection sites.

- [ ] **Step 7: Add node rendering**

Render:

- oxygen source as blue alveolar membrane and floating O₂ particles.
- tissue target as pulsing tissue cluster whose color follows oxygen state.
- infection site as irregular red-purple lesion, never as a pipe.
- active objective node with an outline and label from `Game.caseEngine.currentObjective`.

- [ ] **Step 8: Run tests**

Run:

```powershell
npx playwright test tests/case-engine.spec.js
npx playwright test tests/core-flow.spec.js
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add js/case-entities.js js/game.js js/entities.js index.html tests/case-engine.spec.js
git commit -m "feat: add oxygen and infection case objectives"
```

### Task 3: Load case mode and replace finish completion

**Files:**
- Modify: `js/config.js:421-524`
- Modify: `js/game.js:834-899`
- Modify: `js/game.js:1994-2117`
- Modify: `js/game.js:2120-2268`
- Test: `tests/case-engine.spec.js`
- Test: `tests/core-flow.spec.js`

**Interfaces:**
- Consumes: `mapData.caseConfig`.
- Produces: `Game.caseMode`, `Game.caseEngine`, `Game.caseReport`.

- [ ] **Step 1: Write failing finish-gate test**

Load a case level, place the player inside the `F` tile, and assert:

```js
expect(await page.locator('#complete-screen').isVisible()).toBe(false);
expect(await page.evaluate(() => Game.caseEngine.getSnapshot().status)).toBe('active');
```

- [ ] **Step 2: Write failing stable completion test**

Dispatch goals and set vitals to target, advance 5 seconds of fixed updates, then assert `complete-screen` is visible.

- [ ] **Step 3: Implement case initialization**

In `LoadLevel()`:

```js
Game.caseMode = Boolean(mapData.caseConfig);
Game.caseEngine = Game.caseMode ? new CaseEngine(mapData.caseConfig) : null;
Game.caseReport = null;
```

Keep existing `winCondition` only for `Game.caseMode === false`.

- [ ] **Step 4: Guard the finish gate**

Change the finish check to:

```js
if (!Game.caseMode && lvl.finish && allPlayersAtFinish(lvl.finish)) {
  levelComplete();
  return;
}
```

- [ ] **Step 5: Update CaseEngine from the fixed loop**

At 60 Hz:

```js
if (Game.caseMode && Game.caseEngine) {
  Game.caseEngine.update(FIXED_STEP / 1000);
  const status = Game.caseEngine.getSnapshot().status;
  if (status === 'complete') completeCase();
  if (status === 'failed') failCase('组织活性归零');
}
```

Use one-shot flags so completion/failure functions cannot fire twice.

- [ ] **Step 6: Separate case completion from legacy completion**

`completeCase()` builds a case report then calls the shared overlay renderer. Do not mutate `cfg.winCondition`. Keep `levelComplete()` as the classic wrapper until old map compatibility tests pass.

- [ ] **Step 7: Run tests**

Run:

```powershell
npx playwright test tests/case-engine.spec.js
npx playwright test tests/core-flow.spec.js
```

Expected: PASS, including the existing classic custom level flow.

- [ ] **Step 8: Commit**

```powershell
git add js/config.js js/game.js tests/case-engine.spec.js tests/core-flow.spec.js
git commit -m "feat: make patient stability determine case outcomes"
```

### Task 4: Fixed single-player roles and hidden platelet entry points

**Files:**
- Modify: `index.html:123-210`
- Modify: `css/style.css:429-483`
- Modify: `js/entities.js:68-89`
- Modify: `js/game.js:1372-1400`
- Modify: `js/game.js:1607-1704`
- Modify: `js/game.js:2517`
- Test: `tests/core-flow.spec.js`

**Interfaces:**
- Consumes: `caseConfig.primaryCell`.
- Produces: direct case load with type `1` for WBC or `3` for RBC; no reachable PLT UI.

- [ ] **Step 1: Write failing role-lock tests**

Assert:

- no platelet button exists in pedia.
- no platelet skill column is visible.
- pressing Q does not change `player.cellType`.
- opening a case level does not show the free cell selector.
- the configured primary cell is loaded.

- [ ] **Step 2: Remove switch input routing**

Delete `q/Q` and `y/Y` mappings from `KEY_MAP` and `KEY_MAP_P2`. Remove the switch block from `Player.update()`, but keep `Player.switchCell()` and platelet classes for save compatibility.

- [ ] **Step 3: Load the configured primary cell**

For single-player case mode:

```js
const defaultCell = mapData.caseConfig.primaryCell === 'wbc' ? 1 : 3;
```

Bypass `selectCellAndLoad()` role selection for all case maps.

- [ ] **Step 4: Hide platelet UI without deleting data**

Remove the pedia button and omit `plt` from the visible skill tree column list. Keep `SKILL_TREES.plt`, save fields, sprites and code unchanged.

- [ ] **Step 5: Update visible control copy**

Remove all “Q切换细胞” and platelet gameplay copy from `index.html`, HUD controls, README and tutorials.

- [ ] **Step 6: Run tests**

Run: `npx playwright test tests/core-flow.spec.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add index.html css/style.css js/entities.js js/game.js tests/core-flow.spec.js README.md
git commit -m "feat: lock single-player case roles"
```

### Task 5: Scripted allies and red-white co-op

**Files:**
- Modify: `js/case-entities.js`
- Modify: `js/game.js:917-1020`
- Modify: `js/game.js:945-959`
- Modify: `js/game.js:1656-1704`
- Modify: `js/game.js:2120-2200`
- Modify: `js/entities.js:898-930`
- Test: `tests/case-engine.spec.js`

**Interfaces:**
- Consumes: `caseConfig.allyMode`, `Game.twoPlayer`.
- Produces: `ScriptedAllySystem.update(dt)`, complementary co-op roles, player contribution stats.

- [ ] **Step 1: Write failing single-player ally test**

For a WBC primary case, clear a transport-blocking infection site and advance scripted time. Assert automatic RBC delivery increases oxygen exactly once.

- [ ] **Step 2: Implement ScriptedAllySystem**

```js
class ScriptedAllySystem {
  constructor(mode, caseEngine, nodes) {
    this.mode = mode;
    this.caseEngine = caseEngine;
    this.nodes = nodes;
    this.cooldown = 0;
    this.enabled = true;
  }

  update(dtSeconds) {
    if (!this.enabled) return;
    this.cooldown = Math.max(0, this.cooldown - dtSeconds);
    if (this.mode === 'rbc_transport' && this.cooldown === 0 && this.routeIsClear()) {
      this.caseEngine.dispatch({ type: 'oxygenDelivered', amount: 8, tissueGain: 2, atpGain: 0, source: 'ally' });
      this.cooldown = 12;
    }
    if (this.mode === 'wbc_support' && this.cooldown === 0 && this.hasActiveInfection()) {
      this.caseEngine.dispatch({ type: 'allyInfectionSuppression', amount: 4, source: 'ally' });
      this.cooldown = 10;
    }
  }
}
```

Use a visible particle convoy or support pulse when events fire.

- [ ] **Step 3: Write failing co-op role test**

Enable two-player mode, select WBC for P1, start a case, and assert P2 is RBC. Repeat with RBC for P1 and assert P2 is WBC.

- [ ] **Step 4: Replace dual free selection with complementary assignment**

Use:

```js
function complementaryCellType(cellType) {
  return cellType === 1 ? 3 : 1;
}
```

Show a single P1 choice plus “P2将使用另一细胞” and “交换角色”.

- [ ] **Step 5: Disable scripted ally in co-op**

Set `Game.allySystem.enabled = !Game.twoPlayer`.

- [ ] **Step 6: Add contribution tracking**

Store:

```js
Game.caseContributions = [
  { oxygenDeliveries: 0, infectionSitesCleared: 0, atpSpent: 0, deaths: 0 },
  { oxygenDeliveries: 0, infectionSitesCleared: 0, atpSpent: 0, deaths: 0 },
];
```

Update from CaseEngine events using `playerIndex`.

- [ ] **Step 7: Add co-op death behavior**

On player death, dispatch `playerDied`, respawn only that player, retain the other player, and fail only when tissue reaches zero.

- [ ] **Step 8: Add separation guard**

Before applying movement beyond the safe boundary, clamp the leading player's x-position when separation exceeds `CW * 0.9 / zoomScale`. Render “等待队友” above that player.

- [ ] **Step 9: Run tests**

Run:

```powershell
npx playwright test tests/case-engine.spec.js
npx playwright test tests/core-flow.spec.js
```

Expected: PASS.

- [ ] **Step 10: Commit**

```powershell
git add js/case-entities.js js/game.js js/entities.js tests/case-engine.spec.js tests/core-flow.spec.js
git commit -m "feat: add red-white case cooperation"
```

### Task 6: Case HUD, stable countdown, failure and report

**Files:**
- Modify: `index.html:15-57`
- Modify: `index.html:180-199`
- Modify: `css/style.css:35-194`
- Modify: `css/style.css:545-580`
- Modify: `js/game.js:1038-1220`
- Modify: `js/game.js:1994-2117`
- Test: `tests/case-engine.spec.js`

**Interfaces:**
- Consumes: `CaseEngine.getSnapshot()`, `Game.caseContributions`.
- Produces: patient HUD, objective panel, `buildCaseReport()`, report overlay.

- [ ] **Step 1: Write failing HUD test**

Assert visible labels and values:

```js
await expect(page.locator('#vital-oxygen')).toContainText('氧供');
await expect(page.locator('#vital-infection')).toContainText('感染');
await expect(page.locator('#vital-tissue')).toContainText('组织');
```

- [ ] **Step 2: Add semantic HUD markup**

Add three progress bars with `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`, and live status text. Add `#case-objective` and `#case-stability-countdown`.

- [ ] **Step 3: Render snapshot without mutating state**

`updateCaseHUD(snapshot)` sets widths, values, state classes and objective copy. It must not call `dispatch()` or write to `CaseEngine`.

- [ ] **Step 4: Add critical visual and audio feedback**

Use `.warning` below threshold and `.critical` for imminent tissue failure. Trigger one warning sound per threshold transition, not every frame.

- [ ] **Step 5: Build report data**

```js
function buildCaseReport() {
  const snapshot = Game.caseEngine.getSnapshot();
  return {
    levelId: Game.levelIndex,
    vitals: snapshot.vitals,
    goals: snapshot.progress,
    contributions: structuredClone(Game.caseContributions),
    atpEfficiency: calculateAtpEfficiency(),
    deaths: Game.deathsThisRun,
    durationMs: Game.levelTime,
  };
}
```

- [ ] **Step 6: Replace coin/kill completion labels**

Report rows become:

- 最终氧供
- 最终感染负荷
- 最终组织活性
- 氧气运输
- 感染控制
- ATP效率
- 协作评分

Classic mode retains old rows.

- [ ] **Step 7: Run tests**

Run: `npx playwright test tests/case-engine.spec.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add index.html css/style.css js/game.js tests/case-engine.spec.js
git commit -m "feat: add patient HUD and case reports"
```

### Task 7: Case editor schema, validation and round trip

**Files:**
- Modify: `editor.html:61-121`
- Modify: `editor.html:133-203`
- Modify: `editor.html:629-755`
- Modify: `editor.html:758-889`
- Modify: `editor.html:889-1175`
- Modify: `js/config.js:598-688`
- Test: `tests/case-editor.spec.js`
- Test: `tests/editor-storage.spec.js`

**Interfaces:**
- Consumes: editor form values and map markers.
- Produces: `caseConfig.version === 1`, share format `CQ2!`, legacy `CQ!` decoding.

- [ ] **Step 1: Write failing editor save test**

Create a 15×80 map with `P`, `L`, `T`, and `i`; fill case settings; save to active slot; assert stored JSON contains the exact normalized `caseConfig`.

- [ ] **Step 2: Add case tiles**

Add palette entries for `L`, `T`, and `i`. When case mode is active, hide `o`, `?`, `p`, `F`, and platelet-related entries.

- [ ] **Step 3: Add case settings form**

Use named inputs:

```html
<select id="casePrimaryCell">
  <option value="rbc">红细胞</option>
  <option value="wbc">白细胞</option>
</select>
<input id="caseOxygenInitial" type="number" min="0" max="100">
<input id="caseOxygenTarget" type="number" min="0" max="100">
```

Repeat for infection, tissue, goals, stability and briefing strings.

- [ ] **Step 4: Implement exact validation**

`validateCaseDraft(draft, mapRows)` returns `{ ok, errors }`. Reject:

- values outside bounds.
- missing source/target for oxygen goals.
- fewer infection nodes than goal count.
- invalid primary cell.
- stability outside `3–10`.
- missing or multiple spawn points.

- [ ] **Step 5: Serialize caseConfig in all save paths**

Update:

- exported level source.
- `/save` body.
- custom localStorage save.
- custom preset update.
- raw import parser.

Use the existing safe literal parser; do not use `eval`.

- [ ] **Step 6: Version share codes**

Encode case maps as:

```js
const pack = { v: 2, n, c, m, s, caseConfig };
return 'CQ2!' + toUrlSafeBase64(JSON.stringify(pack));
```

Keep the current `CQ!` decoder and route it to classic mode.

- [ ] **Step 7: Run editor tests**

Run:

```powershell
npx playwright test tests/case-editor.spec.js
npx playwright test tests/editor-storage.spec.js
npx playwright test tests/security.spec.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add editor.html js/config.js tests/case-editor.spec.js tests/editor-storage.spec.js tests/security.spec.js
git commit -m "feat: add versioned case editing"
```

### Task 8: Migrate all six official levels

**Files:**
- Modify: `js/levels/level0_blood.js`
- Modify: `js/levels/level1_wbc.js`
- Modify: `js/levels/level2_alveoli.js`
- Modify: `js/levels/level3_vessel.js`
- Modify: `js/levels/level4_lymph.js`
- Modify: `js/levels/level5_boss.js`
- Modify: `js/levels.js`
- Create: `tests/official-cases.spec.js`

**Interfaces:**
- Consumes: CaseEngine schema and `L/T/i` markers.
- Produces: six valid, winnable official cases.

- [ ] **Step 1: Write failing configuration audit**

For each built-in map assert:

- `caseConfig.version === 1`.
- primary cell matches the approved table.
- at least one valid objective.
- required marker counts exist.
- no `o`, `?`, `p`, or `F` in the case map.

- [ ] **Step 2: Add the approved primary roles**

Use:

```js
[
  'rbc',
  'wbc',
  'rbc',
  'rbc',
  'wbc',
  'wbc',
]
```

- [ ] **Step 3: Rebuild each map through the editor**

For each official level:

1. load the current preset.
2. remove legacy objective symbols.
3. place `L/T/i` nodes.
4. configure goals and initial vitals.
5. export to the original level file.
6. validate through `tests/official-cases.spec.js`.

- [ ] **Step 4: Add level-specific caseConfig**

Each config must provide unique:

- initial vitals.
- target vitals.
- goal counts.
- ally mode.
- briefing title/summary/outcome.
- allowed AI event IDs.

- [ ] **Step 5: Run the official case audit**

Run: `npx playwright test tests/official-cases.spec.js`

Expected: six cases PASS.

- [ ] **Step 6: Manually complete all six with local director disabled**

Record duration, deaths, final vitals and any unwinnable state in `docs/qa/official-case-baseline.md`.

- [ ] **Step 7: Fix only blocking geometry and objective placement**

Do not balance difficulty in this task; only ensure each case can be completed and no required node is unreachable.

- [ ] **Step 8: Run full browser regression**

Run: `npm test`

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add js/levels.js js/levels/level0_blood.js js/levels/level1_wbc.js js/levels/level2_alveoli.js js/levels/level3_vessel.js js/levels/level4_lymph.js js/levels/level5_boss.js tests/official-cases.spec.js docs/qa/official-case-baseline.md
git commit -m "content: migrate six official patient cases"
```
