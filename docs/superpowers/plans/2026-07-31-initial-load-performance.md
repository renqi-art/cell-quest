# Initial Load Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the production homepage cold load below 2.5 seconds and below 1 MB transferred without changing gameplay or layout.

**Architecture:** Replace the visible 1.96 MB PNG with a compressed WebP and make the icon font non-blocking. Keep heavy sprite and level-background initialization behind one idempotent function that starts only after the player begins entering the hub.

**Tech Stack:** Legacy JavaScript, CSS, Vitest, Playwright, Python Pillow, Node.js HTTP server, Nginx, PM2.

## Global Constraints

- Preserve the PNG source for editing and rollback.
- Keep the WebP at or below 400 KB.
- Do not bundle or reorder the 30 legacy script tags in this change.
- Preserve desktop, mobile, save-slot, level-start, and gameplay behavior.
- Stage only files listed in this plan; leave `audit/` and `js/entities-player-trimmed.js` untouched.

---

### Task 1: Compress the visible homepage visual path

**Files:**
- Create: `tests/unit/main-menu-performance.spec.ts`
- Create: `images/main-menu-bg-v4.webp`
- Modify: `css/main-menu-v4.css:1-65`
- Modify: `index.html:7-9`

**Interfaces:**
- Consumes: `css/main-menu-v4.css` and the existing `images/main-menu-bg-v4.png` source.
- Produces: `images/main-menu-bg-v4.webp`, referenced as `../images/main-menu-bg-v4.webp?v=1`.

- [ ] **Step 1: Write the failing performance regression test**

```ts
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import menuCss from '../../css/main-menu-v4.css?raw'
import indexHtml from '../../index.html?raw'

const webpPath = fileURLToPath(
  new URL('../../images/main-menu-bg-v4.webp', import.meta.url),
)

describe('main menu loading performance', () => {
  it('uses a bounded WebP for the visible menu background', () => {
    expect(menuCss).toContain("../images/main-menu-bg-v4.webp?v=1")
    expect(existsSync(webpPath)).toBe(true)
    expect(statSync(webpPath).size).toBeLessThanOrEqual(400 * 1024)
    expect(indexHtml).toContain('css/main-menu-v4.css?v=5')
  })

  it('does not block rendering while the icon font downloads', () => {
    expect(menuCss).toMatch(/font-display:\s*swap/)
    expect(menuCss).not.toMatch(/font-display:\s*block/)
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx vitest run tests/unit/main-menu-performance.spec.ts
```

Expected: two failures because the CSS still references PNG, the WebP does not exist, the stylesheet is still `v=4`, and the font uses `font-display: block`.

- [ ] **Step 3: Generate the compressed WebP**

Run from the repository root:

```powershell
@'
from pathlib import Path
from PIL import Image, ImageOps

source = Path("images/main-menu-bg-v4.png")
target = Path("images/main-menu-bg-v4.webp")
image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
image.save(target, "WEBP", quality=78, method=6)
print(f"{target}: {target.stat().st_size} bytes")
'@ | python -
```

If the result exceeds `409600` bytes, lower `quality` to `72` and regenerate once. Do not resize or crop.

- [ ] **Step 4: Update CSS and the stylesheet cache version**

Apply:

```css
@font-face {
  font-family: "Phosphor";
  src: url("../fonts/phosphor-regular.woff2?v=1") format("woff2");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

Change the menu background declaration to:

```css
background: url('../images/main-menu-bg-v4.webp?v=1') center / cover no-repeat;
```

Change the stylesheet reference in `index.html` to:

```html
<link rel="stylesheet" href="css/main-menu-v4.css?v=5">
```

- [ ] **Step 5: Run the focused test and production build**

Run:

```powershell
npx vitest run tests/unit/main-menu-performance.spec.ts
npm run build
```

Expected: 2 tests pass; build exits 0 and copies `images/main-menu-bg-v4.webp`.

- [ ] **Step 6: Commit the visual optimization**

```powershell
git add -- tests/unit/main-menu-performance.spec.ts images/main-menu-bg-v4.webp css/main-menu-v4.css index.html
git commit -m "perf: optimize main menu visual assets"
```

### Task 2: Defer non-homepage image loading

**Files:**
- Create: `tests/unit/asset-preload.spec.ts`
- Modify: `js/game.js:750-770`
- Modify: `js/game.js:817-829`
- Modify: `js/game-ui.js:388-395`

**Interfaces:**
- Produces: global `ensureGameAssetsLoaded(): void`.
- Consumes: existing global `loadSprites(): void` and `preloadBgImages(): void`.

- [ ] **Step 1: Write the failing preload regression test**

```ts
import { describe, expect, it } from 'vitest'
import gameSource from '../../js/game.js?raw'
import gameUiSource from '../../js/game-ui.js?raw'

describe('heavy game asset preloading', () => {
  it('starts once after the player leaves the main menu', () => {
    const initStart = gameSource.indexOf('function init(){')
    const loadBinding = gameSource.indexOf("window.addEventListener('load', init);")
    const initSource = gameSource.slice(initStart, loadBinding)
    const showHubStart = gameUiSource.indexOf('function showHub(){')
    const showHubSource = gameUiSource.slice(showHubStart, showHubStart + 500)

    expect(gameSource).toContain('function ensureGameAssetsLoaded(){')
    expect(gameSource).toContain('if(gameAssetsPreloadStarted) return;')
    expect(initSource).not.toContain('loadSprites();')
    expect(initSource).not.toContain('preloadBgImages();')
    expect(showHubSource).toContain('ensureGameAssetsLoaded();')
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx vitest run tests/unit/asset-preload.spec.ts
```

Expected: failure because `ensureGameAssetsLoaded()` does not exist and `init()` still calls both preload functions.

- [ ] **Step 3: Add the idempotent preload boundary**

Immediately after `preloadBgImages()` in `js/game.js`, add:

```js
let gameAssetsPreloadStarted = false;
function ensureGameAssetsLoaded(){
  if(gameAssetsPreloadStarted) return;
  gameAssetsPreloadStarted = true;
  loadSprites();
  preloadBgImages();
}
```

Remove these calls from `init()`:

```js
loadSprites();
preloadBgImages();
```

At the beginning of the `btn-start` handler, before `Sfx.init()`, add:

```js
ensureGameAssetsLoaded();
```

At the beginning of `showHub()` in `js/game-ui.js`, add:

```js
ensureGameAssetsLoaded();
```

The duplicate entry points are intentional; the idempotent guard guarantees one preload while covering new games and save-slot paths.

- [ ] **Step 4: Run focused and unit tests**

Run:

```powershell
npx vitest run tests/unit/asset-preload.spec.ts
npm run test:unit
```

Expected: the focused test passes and the full Vitest suite reports no failures.

- [ ] **Step 5: Run browser flow checks**

Run:

```powershell
npx playwright test tests/main-menu-redesign.spec.js tests/mobile-flow.spec.js tests/core-flow.spec.js
```

Expected: main-menu, mobile single-player, and core game flow tests pass with no page errors.

- [ ] **Step 6: Commit deferred loading**

```powershell
git add -- tests/unit/asset-preload.spec.ts js/game.js js/game-ui.js
git commit -m "perf: defer heavy game image preloading"
```

### Task 3: Release verification and production deployment

**Files:**
- Deploy: `index.html`
- Deploy: `css/main-menu-v4.css`
- Deploy: `images/main-menu-bg-v4.webp`
- Deploy: `js/game.js`
- Deploy: `js/game-ui.js`

**Interfaces:**
- Production URL: `http://106.54.15.142/cell-quest/`
- Health endpoint: `http://106.54.15.142/healthz`
- PM2 process: `cell-quest`

- [ ] **Step 1: Run the release checks**

```powershell
git diff --check
npm run test:server
npm run test:unit
npm run build
npx playwright test tests/main-menu-redesign.spec.js tests/mobile-flow.spec.js tests/core-flow.spec.js
```

Expected: all listed commands exit 0. Existing unrelated full-project lint failures are reported separately and are not modified in this change.

- [ ] **Step 2: Confirm the release scope**

```powershell
git status --short --branch
git log -3 --oneline
```

Expected: only `audit/` and `js/entities-player-trimmed.js` remain untracked; no planned file is uncommitted.

- [ ] **Step 3: Push master**

```powershell
git push gitee master
```

Expected: Gitee `master` advances to the final performance commit.

- [ ] **Step 4: Back up and deploy exact files**

Create a timestamped backup under `$HOME/cell-quest-backups/`, upload to a fresh `/tmp/cell-quest-perf.*` directory, verify SHA-256, then install only the five files listed above. Restart `cell-quest` because `game.js` and `game-ui.js` are static but the restart provides a consistent release boundary.

- [ ] **Step 5: Verify production resources**

Check that all return HTTP 200 with the correct content type:

```text
/cell-quest/
/cell-quest/css/main-menu-v4.css?v=5
/cell-quest/images/main-menu-bg-v4.webp?v=1
/cell-quest/fonts/phosphor-regular.woff2?v=1
/healthz
```

- [ ] **Step 6: Re-run the cold/warm browser benchmark**

Use the same SSH tunnel plus headless Chrome harness used for the baseline. Record:

```text
cold load wall time
DOMContentLoaded
load event
resource count
transfer bytes
warm load wall time
failed requests
```

Expected:

- WebP is at most 400 KB.
- Cold transfer is below 1 MB.
- Cold load is below 2.5 seconds on the same benchmark.
- Warm load is below 1.2 seconds.
- Failed request list is empty.

- [ ] **Step 7: Clean temporary deployment files**

Validate the resolved `/tmp/cell-quest-perf.*` path, delete only that staging directory, and retain the timestamped backup.
