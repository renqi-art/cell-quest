# Core Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Restore the playable core flow, make the editor and custom-level storage coherent, secure the local server and imported content, and add regression coverage.

**Architecture:** Keep the existing browser-first JavaScript architecture for this stabilization pass. Add a small Playwright smoke suite for user-visible flows and Node integration tests for the server; extract only narrowly scoped helpers where direct testing is otherwise impossible.

**Tech Stack:** HTML5 Canvas, browser JavaScript, Node.js HTTP server, Playwright Test, Node test runner.

## Global Constraints

- Preserve the user's existing `js/levels/backup/level2_alveoli.js` change in the original workspace.
- Do not add gameplay features during stabilization.
- Every production change must be preceded by a failing regression test.
- The local server must not expose `.git` or write outside `js/levels`.
- Imported and user-authored text must never be executed as JavaScript or inserted as trusted HTML.

---

### Task 1: Test harness and core browser smoke tests

**Files:**
- Create: `package.json`
- Create: `playwright.config.cjs`
- Create: `tests/core-flow.spec.js`

**Interfaces:**
- Consumes: `node server.js`, the existing `index.html` and `editor.html` routes.
- Produces: `npm test`, which starts the server and runs Chromium smoke tests.

- [x] **Step 1: Write failing tests**

```js
test('first unlocked level enters gameplay without page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '🆕 新的游戏' }).click();
  await page.locator('.level-card:not(.locked)').click();
  await expect(page.locator('#hud')).toHaveClass(/active/);
  expect(errors).toEqual([]);
});

test('hub tools respond', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '🆕 新的游戏' }).click();
  await page.getByRole('button', { name: '📖 角色图鉴' }).click();
  await expect(page.locator('#pedia-screen')).not.toHaveClass(/hidden/);
});

test('editor templates load without reference errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor.html');
  await page.locator('#templateSelect').selectOption('basicPlatform');
  expect(errors).toEqual([]);
});
```

- [x] **Step 2: Run `npm test` and confirm the tests fail with the reproduced `configs`, missing DOM ID, and `EDITOR_TEMPLATES` errors.**
- [x] **Step 3: Keep the harness unchanged while Tasks 2-4 make the tests pass.**

### Task 2: Restore game initialization and level entry

**Files:**
- Modify: `js/game.js:1597-1604`
- Modify: `js/game.js:2424-2496`
- Modify: `index.html:134-150`

**Interfaces:**
- Consumes: `buildLevelConfigs()`, `$()`, `LoadLevel()`.
- Produces: `bindOptional(id, handler)` and a playable first-level path.

- [x] **Step 1: Run the core-flow test alone and verify RED.**
- [x] **Step 2: Resolve configs inside `selectCellAndLoad`.**

```js
function selectCellAndLoad(n) {
  const idx = n - 1;
  const configs = buildLevelConfigs();
  const cfg = configs[idx];
  if (!cfg) {
    showToast('关卡不存在或尚未加载');
    return;
  }
  // existing flow continues
}
```

- [x] **Step 3: Replace brittle optional event binding with a helper.**

```js
function bindOptional(id, handler) {
  const element = $(id);
  if (element) element.addEventListener('click', handler);
  return element;
}
```

- [x] **Step 4: Remove obsolete button bindings and ensure `requestAnimationFrame(loop)` runs even when optional UI is absent.**
- [x] **Step 5: Run the core-flow test and verify GREEN.**

### Task 3: Repair editor templates and slot-aware custom levels

**Files:**
- Modify: `editor.html:128`
- Modify: `editor.html:694-799`
- Modify: `js/ai-levels.js:1-20`
- Test: `tests/core-flow.spec.js`

**Interfaces:**
- Consumes: `cellQuest_currentSlot`.
- Produces: `editorCustomLevelKey()` returning `cellQuest_customLevels_{slot}`.

- [x] **Step 1: Add a failing test that saves a custom level in the editor and sees it in the current game slot.**
- [x] **Step 2: Load shared config constants before editor templates and remove stale references to deleted editor controls.**
- [x] **Step 3: Add the shared storage-key helper.**

```js
function editorCustomLevelKey() {
  const rawSlot = Number.parseInt(localStorage.getItem('cellQuest_currentSlot') || '0', 10);
  const slot = Number.isInteger(rawSlot) && rawSlot >= 0 && rawSlot < 5 ? rawSlot : 0;
  return `cellQuest_customLevels_${slot}`;
}
```

- [x] **Step 4: Replace all editor reads and writes of `cellQuest_customLevels` with `editorCustomLevelKey()`.**
- [x] **Step 5: Run the editor tests and verify GREEN.**

### Task 4: Harden the local server

**Files:**
- Modify: `server.js`
- Create: `tests/server.test.cjs`

**Interfaces:**
- Produces: `resolveStaticPath(urlPath)` and `resolveLevelFile(filename, backup)` that return a safe path or `null`.

- [x] **Step 1: Write failing integration tests.**

```js
test('does not serve git metadata', async () => {
  const response = await fetch(`${baseUrl}/.git/config`);
  assert.equal(response.status, 404);
});

test('rejects level filename traversal', async () => {
  const response = await fetch(`${baseUrl}/save`, {
    method: 'POST',
    body: JSON.stringify({ filename: '../../escape.js', code: 'bad' })
  });
  assert.equal(response.status, 400);
});
```

- [x] **Step 2: Verify RED against the current server.**
- [x] **Step 3: Add strict filename validation, resolved-path containment checks, a 1 MiB request limit, correct JSON content type checks, and `127.0.0.1` binding.**
- [x] **Step 4: Restrict static serving to explicit public file types and reject dot-path segments.**
- [x] **Step 5: Run server tests and verify GREEN.**

### Task 5: Remove executable and injectable imported content

**Files:**
- Modify: `editor.html:881-925`
- Modify: `js/config.js:611-628`
- Modify: `js/game.js:1410-1494`
- Modify: `js/game.js:1825-1907`
- Test: `tests/core-flow.spec.js`

**Interfaces:**
- Produces: `escapeHtml(value)` for legacy HTML templates and JSON-only extra configuration parsing.

- [x] **Step 1: Add failing tests with an imported level name containing `<img onerror=...>` and an editor import containing executable JavaScript.**
- [x] **Step 2: Replace `eval` parsing with a non-executing data-literal parser and field allowlists for legacy compatibility.**
- [x] **Step 3: Render custom names and leaderboard names with escaped text or DOM `textContent`.**
- [x] **Step 4: Validate imported map row count, width, tile alphabet, cell type, win condition, sky colors, and payload length.**
- [x] **Step 5: Run injection tests and verify GREEN.**

### Task 6: Full verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: final behavior and actual key mappings.
- Produces: synchronized run and control documentation.

- [x] **Step 1: Update README controls to E, Shift, Q, 1-4, P/Escape.**
- [x] **Step 2: Run `npm test`. Expected: all tests pass with zero page errors.**
- [x] **Step 3: Run `node --check` over every JavaScript file. Expected: zero failures.**
- [x] **Step 4: Run `git diff --check`. Expected: no whitespace errors.**
- [x] **Step 5: Manually verify menu → hub → first level → pause → hub and editor template creation.**

