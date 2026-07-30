# Cell Quest Mobile Adaptation V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** Harden the current legacy-JavaScript mobile implementation so the complete single-player flow is usable on recent iPhone Safari and Android Chrome, with landscape-only combat and unchanged desktop/two-player behavior.

**Architecture:** Extend the existing `js/mobile/*` capability, input, overlay, and viewport modules. Keep `js/game.js` as the only level-loading authority, but move the mobile orientation gate ahead of all level mutations and resume a deferred request after rotation. CSS owns safe-area insets and responsive presentation; JavaScript only consumes visual viewport dimensions and coordinates state.

**Tech Stack:** Legacy browser JavaScript, HTML/CSS, Vite, Vitest, Playwright.

**Global Constraints:**

- Work from latest `master` in `codex/mobile-adaptation-v2`; do not reuse the divergent historical mobile-plan branch.
- Do not replace or duplicate the current game runtime with Vue/TypeScript/Phaser adapters.
- Preserve desktop keyboard controls and desktop two-player behavior.
- Mobile scope is single-player gameplay; hide two-player and map-editor entry points on touch devices.
- Combat requires landscape, but menu, intro video, hub, pedia, achievements, and other non-combat overlays remain usable in portrait.
- All touch targets are at least 44 × 44 CSS pixels, including the smallest landscape layout.
- Use test-first RED → GREEN cycles for every behavior change.

---

### Task 1: Characterize the current mobile entry and viewport contract

**Files:**

- Create: `tests/unit/mobile-capability.spec.ts`
- Create: `tests/unit/mobile-viewport.spec.ts`
- Modify: `js/mobile/capability.js`
- Modify: `js/mobile/viewport-coordinator.js`
- Modify: `index.html`

**Step 1: Write failing capability tests**

Cover:

- `visualViewport.width/height` wins over `window.innerWidth/innerHeight`.
- `window.innerWidth/innerHeight` remains the fallback.
- portrait/landscape flags follow the effective viewport.
- the document viewport metadata contains `viewport-fit=cover`.

**Step 2: Run tests and verify RED**

Run:

`npm run test:unit -- tests/unit/mobile-capability.spec.ts`

Expected failures: current implementation ignores `visualViewport` dimensions and the HTML metadata lacks `viewport-fit=cover`.

**Step 3: Implement the smallest capability fix**

- Read effective width and height from `window.visualViewport` when available.
- Remove the invalid attempt to read `env(safe-area-inset-*)` through `getComputedStyle`.
- Keep safe-area layout in CSS through `env(...)`.
- Add `viewport-fit=cover` to `index.html`.

**Step 4: Verify GREEN**

Run the focused tests, then `npm run test:unit`.

**Step 5: Commit**

Commit message: `fix(mobile): use the effective visual viewport`

---

### Task 2: Defer portrait battle entry without mutating game state

**Files:**

- Modify: `tests/unit/mobile-viewport.spec.ts`
- Create: `tests/mobile-flow.spec.js`
- Modify: `js/mobile/viewport-coordinator.js`
- Modify: `js/game.js`

**Step 1: Write failing unit and browser tests**

Cover:

- `requestBattleStart(callback)` stores one pending start in portrait and returns `false`.
- a later landscape viewport change releases input, clears the gate, and invokes the pending callback exactly once.
- clearing the battle gate cancels a pending callback.
- selecting a level in portrait leaves `Game.state` and the hub unchanged until rotation.
- rotating to landscape continues the originally selected level without another tap.

**Step 2: Run tests and verify RED**

Run:

- `npm run test:unit -- tests/unit/mobile-viewport.spec.ts`
- `npx playwright test tests/mobile-flow.spec.js --grep "defers portrait battle"`

Expected failures: there is no pending callback, and `LoadLevel` mutates level/player state before its current late gate.

**Step 3: Implement the smallest gate fix**

- Change the coordinator contract to `requestBattleStart(onReady)`.
- Store only the latest pending callback while portrait.
- At the beginning of `LoadLevel`, call the gate before preview or normal-level mutations.
- Resume by calling `LoadLevel` with the original arguments after the viewport becomes landscape.
- Clear/cancel the pending callback on explicit gate clear.
- Force-release mobile controls whenever orientation or effective viewport mode changes.

**Step 4: Verify GREEN**

Run both focused tests, then `npm run test:unit`.

**Step 5: Commit**

Commit message: `fix(mobile): resume deferred battles after rotation`

---

### Task 3: Make touch controls recoverable and complete

**Files:**

- Create: `tests/unit/mobile-controls.spec.ts`
- Modify: `js/mobile/controls-overlay.js`
- Modify: `js/mobile/viewport-coordinator.js`
- Modify: `css/mobile-controls.css`

**Step 1: Write failing control tests**

Cover:

- disabling controls releases pointer captures, removes every `.pressed` class, centers the joystick, and clears actions.
- a mobile pause button is present only with landscape battle controls and calls the existing `togglePause`.
- every `.mobile-btn` resolves to at least 44 × 44 CSS pixels at 667 × 375 and 844 × 390.

**Step 2: Run tests and verify RED**

Run:

- `npm run test:unit -- tests/unit/mobile-controls.spec.ts`
- `npx playwright test tests/mobile-flow.spec.js --grep "touch controls"`

Expected failures: `setDisabled()` bypasses full capture cleanup, no pause control exists, and small buttons are 34–42 px.

**Step 3: Implement the smallest control fix**

- Make `setDisabled(true)` call `forceReleaseAll()`.
- Add an accessible pause control to the landscape overlay and route it to the existing pause state transition.
- Ensure button bindings reject duplicate active pointers.
- Raise small-screen medium and small buttons to at least 44 px.
- Keep desktop controls and HUD unchanged.

**Step 4: Verify GREEN**

Run focused tests and the full unit suite.

**Step 5: Commit**

Commit message: `fix(mobile): harden touch controls and add pause`

---

### Task 4: Provide fullscreen access and mobile-safe full-flow layout

**Files:**

- Modify: `tests/mobile-flow.spec.js`
- Modify: `js/mobile/controls-overlay.js`
- Modify: `js/mobile/viewport-coordinator.js`
- Modify: `css/mobile-controls.css`
- Modify: `index.html`

**Step 1: Write failing browser tests**

Cover:

- fullscreen can be requested from landscape battle, not only from the portrait rotation overlay.
- fullscreen rejection displays a non-blocking status and leaves gameplay usable.
- mobile hub hides both `#btn-hub-2p` and `#btn-hub-editor`.
- intro video, skip button, hub header/footer, music controls, pause menu, death panel, and completion panel stay within the viewport and have usable touch targets.
- the HUD skill strip does not overlap the touch controls at 667 × 375 and 844 × 390.

**Step 2: Run tests and verify RED**

Run:

`npx playwright test tests/mobile-flow.spec.js`

Expected failures: landscape has no fullscreen trigger/status, the editor remains visible, and the newest HUD/flow additions lack mobile-specific layout rules.

**Step 3: Implement the smallest full-flow adaptation**

- Add a compact landscape utility rail containing pause and fullscreen controls.
- Keep the portrait fullscreen button and synchronize both buttons.
- Show fullscreen failure as an `aria-live` status that auto-clears; never block gameplay.
- Hide desktop-only two-player and editor entry points on touch devices.
- Use CSS safe-area `env(...)` values directly for HUD, utility rail, controls, overlays, and video skip placement.
- Compact or reposition the HUD music slider and skill strip to avoid the joystick/action zones.
- Change the intro video to `preload="metadata"` because its source is assigned only after a user gesture.

**Step 4: Verify GREEN**

Run the complete mobile Playwright file, then the full unit suite.

**Step 5: Commit**

Commit message: `feat(mobile): adapt the complete single-player flow`

---

### Task 5: Regression and release verification

**Files:**

- Modify if needed: `tests/mobile-flow.spec.js`
- Modify: `docs/superpowers/plans/2026-07-31-mobile-adaptation-v2.md`

**Step 1: Run static and automated verification**

Run:

- `node --check js/mobile/capability.js`
- `node --check js/mobile/input-controller.js`
- `node --check js/mobile/controls-overlay.js`
- `node --check js/mobile/viewport-coordinator.js`
- `node --check js/mobile/index.js`
- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npx playwright test tests/mobile-flow.spec.js`
- `npm run build`

**Step 2: Run desktop regression samples**

Run:

- `npx playwright test tests/core-flow.spec.js`
- `npx playwright test tests/two-player.spec.js`

Verify desktop two-player remains available and keyboard pause/flow still works.

**Step 3: Review the diff**

Confirm:

- no Vue/TypeScript runtime duplication was introduced;
- no unrelated master/worktree files were changed;
- every production change is covered by a test that was observed failing first;
- mobile single-player constraints are satisfied.

**Step 4: Record verification results and commit**

Append the executed command results to this plan under a `Verification Results` section.

Commit message: `test(mobile): verify responsive single-player flow`
