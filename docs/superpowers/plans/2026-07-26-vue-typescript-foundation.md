# Vue 3 and TypeScript Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a production-capable Vite, Vue 3, TypeScript, Pinia, and Vitest foundation around the existing Cell Quest pages while preserving the current game, editor, deck, URLs, storage, and Playwright behavior.

**Architecture:** This phase is a compatibility foundation, not the Phaser cutover. Vite becomes the development and production bundler, each existing page receives an independent Vue root, and Vue communicates with the current runtime only through a typed `GameEngine` contract and a temporary `LegacyGameEngineAdapter`. The existing classic scripts remain loaded during this phase and are removed only by the final cutover plan.

**Tech Stack:** Vite, Vue 3, TypeScript, Pinia, Vitest, Vue Test Utils, Playwright, Node.js

## Global Constraints

- Preserve `/`, `/editor.html`, and `/deck.html`.
- Preserve current visual layout, Chinese copy, keyboard mappings, gameplay behavior, save slots, custom levels, and share codes.
- Do not migrate gameplay physics or rendering to Phaser in this plan.
- Do not remove `js/game.js`, `js/entities.js`, or other classic scripts in this plan.
- Do not let Vue components read or mutate the global `Game` object.
- Do not place per-frame entity state in Pinia.
- Do not add inline event handlers or `v-html`.
- Use exact dependency versions in both `package.json` and `package-lock.json`.
- Enable strict TypeScript with `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables`, and `noFallthroughCasesInSwitch`.
- Keep existing unrelated working-tree changes untouched.
- Follow red-green-refactor for each production change.

---

## File Structure Produced by This Plan

```text
src/
├─ vite-env.d.ts
├─ shared/
│  ├─ types/
│  │  ├─ game.ts
│  │  ├─ level.ts
│  │  ├─ progress.ts
│  │  └─ events.ts
│  └─ utils/
│     └─ TypedEventBus.ts
├─ game/
│  ├─ main.ts
│  ├─ GameApp.vue
│  ├─ bridge/
│  │  ├─ GameEngine.ts
│  │  ├─ GameEngineEvents.ts
│  │  └─ LegacyGameEngineAdapter.ts
│  └─ stores/
│     └─ game-ui.ts
├─ editor/
│  ├─ main.ts
│  └─ EditorApp.vue
└─ deck/
   ├─ main.ts
   └─ DeckApp.vue

tests/
├─ migration-baseline.spec.js
├─ tooling/
│  └─ vite-foundation.test.cjs
└─ unit/
   ├─ TypedEventBus.spec.ts
   ├─ LegacyGameEngineAdapter.spec.ts
   └─ game-ui-store.spec.ts

vite.config.ts
vitest.config.ts
tsconfig.json
tsconfig.node.json
```

## Stable Interfaces

This plan establishes the names that all later migration plans must consume:

```ts
export interface GameEngine {
  mount(host: HTMLElement): Promise<void>
  destroy(): void
  loadLevel(levelId: string, options: LoadLevelOptions): Promise<void>
  pause(): void
  resume(): void
  retry(): void
  quitLevel(): void
  setTwoPlayer(enabled: boolean): void
  dispatch(command: GameCommand): void
  subscribe<K extends keyof GameEngineEventMap>(
    event: K,
    listener: GameEngineEventMap[K]
  ): () => void
}
```

`LegacyGameEngineAdapter` and the later `PhaserGameEngineAdapter` must implement this exact interface. Vue and Pinia consume only the interface and immutable event payloads.

---

### Task 1: Record the Legacy Browser Baseline

**Files:**
- Create: `tests/migration-baseline.spec.js`
- Modify: none
- Test: `tests/migration-baseline.spec.js`

**Interfaces:**
- Consumes: current DOM IDs and current classic-script application behavior.
- Produces: a browser characterization suite that later tasks run unchanged.

- [ ] **Step 1: Add the browser characterization test**

Create `tests/migration-baseline.spec.js`:

```js
const { test, expect } = require('playwright/test');

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('legacy game, editor, and deck entry points remain available', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('/');
  await expect(page.locator('#main-menu')).toBeVisible();
  await page.locator('#btn-start').click();
  await expect(page.locator('#hub-screen')).not.toHaveClass(/hidden/);

  await page.goto('/editor.html');
  await expect(page.locator('#gridWrap')).toBeVisible();

  await page.goto('/deck.html');
  await expect(page.locator('body')).not.toBeEmpty();
  const levelsResponse = await page.request.get('/levels');
  expect(levelsResponse.ok()).toBe(true);


  expect(errors).toEqual([]);
});

test('legacy level selection, pause, and return flow remains stable', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('/');
  await page.locator('#btn-start').click();
  await page.locator('.level-card:not(.locked)').first().click();
  await expect(page.locator('#hud')).toHaveClass(/active/);

  await page.keyboard.press('p');
  await expect(page.locator('#pause-menu')).not.toHaveClass(/hidden/);
  await page.locator('#btn-quit').click();
  await expect(page.locator('#hub-screen')).not.toHaveClass(/hidden/);

  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run the characterization suite**

Run:

```bash
npm test -- tests/migration-baseline.spec.js
```

Expected: both tests pass on the current implementation. If a selector differs, correct the test to the actual stable selector before proceeding; do not modify production code in this task.

- [ ] **Step 3: Run the existing browser regression suite**

Run:

```bash
npm test
```

Expected: all existing and new Playwright tests pass with zero page errors.

- [ ] **Step 4: Commit the baseline**

```bash
git add tests/migration-baseline.spec.js
git commit -m "test: capture frontend migration baseline"
```

---

### Task 2: Add the Vite and TypeScript Toolchain

**Files:**
- Create: `tests/tooling/vite-foundation.test.cjs`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `eslint.config.mjs`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/vite-env.d.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `playwright.config.cjs`
- Test: `tests/tooling/vite-foundation.test.cjs`

**Interfaces:**
- Consumes: existing root `index.html`, `editor.html`, `deck.html`, public port `8080`, and legacy API port `8081`.
- Produces: `npm run dev`, `npm run build`, `npm run preview`, `npm run typecheck`, `npm run test:unit`, and `npm run lint`.

- [ ] **Step 1: Write a failing tooling contract test**

Create `tests/tooling/vite-foundation.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('frontend toolchain exposes the required commands and config files', () => {
  assert.equal(pkg.scripts.dev, 'concurrently -k -s first "cross-env CELL_QUEST_PORT=8081 node server.js" "vite --host 127.0.0.1 --port 8080"');
  assert.equal(pkg.scripts.build, 'vite build');
  assert.equal(pkg.scripts.preview, 'concurrently -k -s first "cross-env CELL_QUEST_PORT=8081 node server.js" "vite preview --host 127.0.0.1 --port 8080"');
  assert.equal(pkg.scripts.typecheck, 'vue-tsc --noEmit');
  assert.equal(pkg.scripts['test:unit'], 'vitest run');
  assert.ok(fs.existsSync(path.join(root, 'vite.config.ts')));
  assert.ok(fs.existsSync(path.join(root, 'vitest.config.ts')));
  assert.ok(fs.existsSync(path.join(root, 'eslint.config.mjs')));
  assert.ok(fs.existsSync(path.join(root, 'tsconfig.json')));
});
```

- [ ] **Step 2: Run the tooling test and verify RED**

Run:

```bash
node --test tests/tooling/vite-foundation.test.cjs
```

Expected: FAIL because the Vite scripts and configuration files do not exist.

- [ ] **Step 3: Install exact frontend dependencies**

Install exact versions selected from mutually compatible stable releases:

```bash
npm install --save-exact vue pinia
npm install --save-dev --save-exact vite typescript vue-tsc @vitejs/plugin-vue vitest @vue/test-utils jsdom eslint typescript-eslint eslint-plugin-vue globals concurrently cross-env
```

After installation, confirm that `package.json` contains exact version strings without `^` or `~`.

- [ ] **Step 4: Add the npm scripts**

Set the `scripts` object in `package.json` to contain:

```json
{
  "dev": "concurrently -k -s first \"cross-env CELL_QUEST_PORT=8081 node server.js\" \"vite --host 127.0.0.1 --port 8080\"",
  "build": "vite build",
  "preview": "concurrently -k -s first \"cross-env CELL_QUEST_PORT=8081 node server.js\" \"vite preview --host 127.0.0.1 --port 8080\"",
  "typecheck": "vue-tsc --noEmit",
  "lint": "eslint \"src/**/*.{ts,vue}\"",
  "test": "playwright test",
  "test:unit": "vitest run",
  "test:server": "node --test tests/server.test.cjs"
}
```

- [ ] **Step 5: Add the Vite multi-page configuration**

Create `vite.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = fileURLToPath(new URL('.', import.meta.url))

const legacyApiProxy = {
  '/levels': 'http://127.0.0.1:8081',
  '/save': 'http://127.0.0.1:8081',
  '/reset': 'http://127.0.0.1:8081',
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        game: resolve(root, 'index.html'),
        editor: resolve(root, 'editor.html'),
        deck: resolve(root, 'deck.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 8080,
    proxy: legacyApiProxy,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 8080,
    proxy: legacyApiProxy,
    strictPort: true,
  },
})
```

- [ ] **Step 6: Add strict TypeScript configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "checkJs": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue", "tests/unit/**/*.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

Create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 7: Add the ESLint flat configuration**

Create `eslint.config.mjs`:

```js
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
)
```

- [ ] **Step 8: Add Vitest configuration**

Create `vitest.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.ts'],
    restoreMocks: true,
    clearMocks: true,
  },
})
```

- [ ] **Step 9: Point Playwright at the Vite development server**

Change only the `webServer.command` field in `playwright.config.cjs`:

```js
webServer: {
  command: 'npm run dev',
  url: 'http://127.0.0.1:8080',
  reuseExistingServer: false,
  timeout: 20_000,
},
```

- [ ] **Step 10: Run the tooling test and verify GREEN**

Run:

```bash
node --test tests/tooling/vite-foundation.test.cjs
npm run typecheck
npm run lint
npm run build
```

Expected: tooling test passes, typecheck exits 0, and Vite creates all three HTML entry points in `dist/`.

- [ ] **Step 11: Run the legacy browser baseline through Vite**

Run:

```bash
npm test -- tests/migration-baseline.spec.js
```

Expected: the existing classic-script application still passes through the Vite server.

- [ ] **Step 12: Commit the toolchain**

```bash
git add package.json package-lock.json vite.config.ts vitest.config.ts eslint.config.mjs tsconfig.json tsconfig.node.json src/vite-env.d.ts playwright.config.cjs tests/tooling/vite-foundation.test.cjs
git commit -m "build: add Vite Vue and TypeScript foundation"
```

---

### Task 3: Define the Typed Engine Contract and Event Bus

**Files:**
- Create: `tests/unit/TypedEventBus.spec.ts`
- Create: `src/shared/types/game.ts`
- Create: `src/shared/types/events.ts`
- Create: `src/shared/utils/TypedEventBus.ts`
- Create: `src/game/bridge/GameEngine.ts`
- Create: `src/game/bridge/GameEngineEvents.ts`
- Test: `tests/unit/TypedEventBus.spec.ts`

**Interfaces:**
- Consumes: no runtime globals.
- Produces: `GameCommand`, `GameEngine`, `GameEngineEventMap`, and `TypedEventBus<TEvents>`.

- [ ] **Step 1: Write the failing event-bus test**

Create `tests/unit/TypedEventBus.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { TypedEventBus } from '@/shared/utils/TypedEventBus'

interface TestEvents {
  ready: () => void
  score: (value: number) => void
}

describe('TypedEventBus', () => {
  it('publishes typed payloads and supports unsubscribe', () => {
    const bus = new TypedEventBus<TestEvents>()
    const listener = vi.fn()
    const unsubscribe = bus.subscribe('score', listener)

    bus.emit('score', 7)
    unsubscribe()
    bus.emit('score', 9)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(7)
  })

  it('clears all listeners', () => {
    const bus = new TypedEventBus<TestEvents>()
    const listener = vi.fn()
    bus.subscribe('ready', listener)

    bus.clear()
    bus.emit('ready')

    expect(listener).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the unit test and verify RED**

Run:

```bash
npm run test:unit -- tests/unit/TypedEventBus.spec.ts
```

Expected: FAIL because `TypedEventBus` does not exist.

- [ ] **Step 3: Add the stable domain types**

Create `src/shared/types/game.ts`:

```ts
export type CellType = 1 | 2 | 3
export type PlayerIndex = 1 | 2
export type PlayerAction =
  | 'left'
  | 'right'
  | 'jump'
  | 'down'
  | 'skill'
  | 'dash'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'skill4'

export type GameScreenState =
  | 'menu'
  | 'hub'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'dead'
  | 'complete'
  | 'error'

export interface LoadLevelOptions {
  readonly playerOneCell?: CellType
  readonly playerTwoCell?: CellType
  readonly twoPlayer: boolean
}

export type GameCommand =
  | { readonly type: 'input'; readonly player: PlayerIndex; readonly action: PlayerAction; readonly pressed: boolean }
  | { readonly type: 'select-cell'; readonly player: PlayerIndex; readonly cell: CellType }
  | { readonly type: 'close-tutorial' }
  | { readonly type: 'close-knowledge-card' }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }

export interface PlayerHudSnapshot {
  readonly player: PlayerIndex
  readonly health: number
  readonly maxHealth: number
  readonly cellType: CellType
  readonly cellName: string
}

export interface HudSnapshot {
  readonly players: readonly PlayerHudSnapshot[]
  readonly energy: number
  readonly maxEnergy: number
  readonly elapsedMs: number
  readonly kills: number
  readonly items: number
}
```

Create `src/shared/types/events.ts`:

```ts
import type { GameScreenState, HudSnapshot } from './game'

export interface TutorialViewModel {
  readonly speaker: string
  readonly color: string
  readonly body: string
}

export interface KnowledgeCardViewModel {
  readonly title: string
  readonly body: string
}

export interface LevelResult {
  readonly levelId: string
  readonly stars: 1 | 2 | 3
  readonly elapsedMs: number
  readonly completionPercent: number
}

export interface DeathResult {
  readonly remainingCells: number
  readonly cellName: string
}

export interface ToastViewModel {
  readonly message: string
  readonly durationMs: number
}

export interface EngineFailure {
  readonly code: string
  readonly message: string
  readonly cause?: unknown
}

export interface GameEngineEventMap {
  'state-changed': (state: GameScreenState) => void
  'hud-updated': (snapshot: HudSnapshot) => void
  'tutorial-opened': (tutorial: TutorialViewModel) => void
  'knowledge-opened': (card: KnowledgeCardViewModel) => void
  'level-completed': (result: LevelResult) => void
  'player-died': (result: DeathResult) => void
  'toast-requested': (toast: ToastViewModel) => void
  'fatal-error': (error: EngineFailure) => void
}
```

- [ ] **Step 4: Implement the typed event bus**

Create `src/shared/utils/TypedEventBus.ts`:

```ts
type EventMapShape<TEvents> = {
  [K in keyof TEvents]: (...args: never[]) => void
}

type ErasedListener = (...args: never[]) => void

export class TypedEventBus<TEvents extends EventMapShape<TEvents>> {
  private readonly listeners = new Map<keyof TEvents, Set<ErasedListener>>()

  subscribe<K extends keyof TEvents>(event: K, listener: TEvents[K]): () => void {
    const listeners = this.listeners.get(event) ?? new Set<ErasedListener>()
    const erasedListener = listener as ErasedListener
    listeners.add(erasedListener)
    this.listeners.set(event, listeners)
    return () => listeners.delete(erasedListener)
  }

  emit<K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): void {
    const listeners = this.listeners.get(event)
    if (!listeners) return
    for (const listener of listeners) {
      const typedListener = listener as (...listenerArgs: Parameters<TEvents[K]>) => void
      typedListener(...args)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
```

- [ ] **Step 5: Define the engine interface**

Create `src/game/bridge/GameEngine.ts`:

```ts
import type { GameCommand, LoadLevelOptions } from '@/shared/types/game'
import type { GameEngineEventMap } from '@/shared/types/events'

export interface GameEngine {
  mount(host: HTMLElement): Promise<void>
  destroy(): void
  loadLevel(levelId: string, options: LoadLevelOptions): Promise<void>
  pause(): void
  resume(): void
  retry(): void
  quitLevel(): void
  setTwoPlayer(enabled: boolean): void
  dispatch(command: GameCommand): void
  subscribe<K extends keyof GameEngineEventMap>(
    event: K,
    listener: GameEngineEventMap[K]
  ): () => void
}
```

Create `src/game/bridge/GameEngineEvents.ts`:

```ts
import type { GameEngineEventMap } from '@/shared/types/events'
import { TypedEventBus } from '@/shared/utils/TypedEventBus'

export class GameEngineEvents extends TypedEventBus<GameEngineEventMap> {}
```

- [ ] **Step 6: Run unit tests and typecheck**

Run:

```bash
npm run test:unit -- tests/unit/TypedEventBus.spec.ts
npm run typecheck
```

Expected: both commands pass with no TypeScript errors.

- [ ] **Step 7: Commit the engine contract**

```bash
git add src/shared/types src/shared/utils/TypedEventBus.ts src/game/bridge/GameEngine.ts src/game/bridge/GameEngineEvents.ts tests/unit/TypedEventBus.spec.ts
git commit -m "feat: define typed game engine contract"
```

---

### Task 4: Add the Temporary Legacy Engine Adapter

**Files:**
- Create: `tests/unit/LegacyGameEngineAdapter.spec.ts`
- Create: `src/game/bridge/LegacyGameEngineAdapter.ts`
- Modify: `js/game.js`
- Test: `tests/unit/LegacyGameEngineAdapter.spec.ts`

**Interfaces:**
- Consumes: `GameEngine`, existing `LoadLevel`, `togglePause`, `retryFromDeath`, `backToHub`, and `Game.twoPlayer`.
- Produces: a temporary `LegacyGameEngineAdapter` that is the only Vue-facing access to classic-script globals.

- [ ] **Step 1: Write the failing adapter test**

Create `tests/unit/LegacyGameEngineAdapter.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { LegacyGameEngineAdapter } from '@/game/bridge/LegacyGameEngineAdapter'

describe('LegacyGameEngineAdapter', () => {
  it('routes lifecycle commands through the legacy bridge', async () => {
    const legacy = {
      loadLevel: vi.fn(() => true),
      pause: vi.fn(),
      resume: vi.fn(),
      retry: vi.fn(),
      quitLevel: vi.fn(),
      setTwoPlayer: vi.fn(),
      dispatch: vi.fn(),
    }
    const adapter = new LegacyGameEngineAdapter(legacy)

    await adapter.loadLevel('1', { twoPlayer: false, playerOneCell: 1 })
    adapter.pause()
    adapter.resume()
    adapter.retry()
    adapter.quitLevel()

    expect(legacy.loadLevel).toHaveBeenCalledWith('1', {
      twoPlayer: false,
      playerOneCell: 1,
    })
    expect(legacy.pause).toHaveBeenCalledOnce()
    expect(legacy.resume).toHaveBeenCalledOnce()
    expect(legacy.retry).toHaveBeenCalledOnce()
    expect(legacy.quitLevel).toHaveBeenCalledOnce()
  })

  it('removes all event subscriptions on destroy', () => {
    const adapter = new LegacyGameEngineAdapter({
      loadLevel: () => true,
      pause() {},
      resume() {},
      retry() {},
      quitLevel() {},
      setTwoPlayer() {},
      dispatch() {},
    })
    const listener = vi.fn()
    adapter.subscribe('state-changed', listener)

    adapter.destroy()
    adapter.publish('state-changed', 'playing')

    expect(listener).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the adapter test and verify RED**

Run:

```bash
npm run test:unit -- tests/unit/LegacyGameEngineAdapter.spec.ts
```

Expected: FAIL because `LegacyGameEngineAdapter` does not exist.

- [ ] **Step 3: Add one explicit legacy bridge**

At the end of `js/game.js`, immediately before the load listener, add:

```js
window.CellQuestLegacy = {
  loadLevel(levelId, options) {
    Game.twoPlayer = Boolean(options.twoPlayer);
    if (options.playerTwoCell) Game._p2CellType = options.playerTwoCell;
    return LoadLevel(Number(levelId), options.playerOneCell);
  },
  pause() {
    if (Game.state === 'playing') togglePause();
  },
  resume() {
    if (Game.state === 'paused') togglePause();
  },
  retry() {
    retryFromDeath();
  },
  quitLevel() {
    backToHub();
  },
  setTwoPlayer(enabled) {
    Game.twoPlayer = Boolean(enabled);
  },
  dispatch(command) {
    if (command.type !== 'input') return;
    const target = command.player === 2 ? Game.keysP2 : Game.keys;
    target[command.action] = command.pressed;
  },
};
```

This is the only new global allowed in the migration foundation. Do not expose `Game`, entities, or Scene-like objects.

- [ ] **Step 4: Implement the adapter**

Create `src/game/bridge/LegacyGameEngineAdapter.ts`:

```ts
import type { GameCommand, LoadLevelOptions } from '@/shared/types/game'
import type { GameEngineEventMap } from '@/shared/types/events'
import { GameEngineEvents } from './GameEngineEvents'
import type { GameEngine } from './GameEngine'

export interface LegacyGameBridge {
  loadLevel(levelId: string, options: LoadLevelOptions): boolean
  pause(): void
  resume(): void
  retry(): void
  quitLevel(): void
  setTwoPlayer(enabled: boolean): void
  dispatch(command: GameCommand): void
}

export class LegacyGameEngineAdapter implements GameEngine {
  private readonly events = new GameEngineEvents()

  constructor(private readonly legacy: LegacyGameBridge) {}

  async mount(_host: HTMLElement): Promise<void> {}

  destroy(): void {
    this.events.clear()
  }

  async loadLevel(levelId: string, options: LoadLevelOptions): Promise<void> {
    if (!this.legacy.loadLevel(levelId, options)) {
      throw new Error(`Legacy level ${levelId} could not be loaded`)
    }
  }

  pause(): void {
    this.legacy.pause()
  }

  resume(): void {
    this.legacy.resume()
  }

  retry(): void {
    this.legacy.retry()
  }

  quitLevel(): void {
    this.legacy.quitLevel()
  }

  setTwoPlayer(enabled: boolean): void {
    this.legacy.setTwoPlayer(enabled)
  }

  dispatch(command: GameCommand): void {
    this.legacy.dispatch(command)
  }

  subscribe<K extends keyof GameEngineEventMap>(
    event: K,
    listener: GameEngineEventMap[K]
  ): () => void {
    return this.events.subscribe(event, listener)
  }

  publish<K extends keyof GameEngineEventMap>(
    event: K,
    ...args: Parameters<GameEngineEventMap[K]>
  ): void {
    this.events.emit(event, ...args)
  }
}
```

- [ ] **Step 5: Add the bridge type declaration**

Append to `src/vite-env.d.ts`:

```ts
import type { LegacyGameBridge } from '@/game/bridge/LegacyGameEngineAdapter'

declare global {
  interface Window {
    CellQuestLegacy: LegacyGameBridge
  }
}

export {}
```

- [ ] **Step 6: Run adapter, type, and browser tests**

Run:

```bash
npm run test:unit -- tests/unit/LegacyGameEngineAdapter.spec.ts
npm run typecheck
npm test -- tests/migration-baseline.spec.js
```

Expected: all commands pass and the classic game behavior is unchanged.

- [ ] **Step 7: Commit the adapter**

```bash
git add js/game.js src/game/bridge/LegacyGameEngineAdapter.ts src/vite-env.d.ts tests/unit/LegacyGameEngineAdapter.spec.ts
git commit -m "refactor: isolate legacy game behind typed adapter"
```

---

### Task 5: Mount Vue and Pinia on All Three Pages

**Files:**
- Create: `tests/unit/game-ui-store.spec.ts`
- Create: `src/game/stores/game-ui.ts`
- Create: `src/game/GameApp.vue`
- Create: `src/game/main.ts`
- Create: `src/editor/EditorApp.vue`
- Create: `src/editor/main.ts`
- Create: `src/deck/DeckApp.vue`
- Create: `src/deck/main.ts`
- Modify: `index.html`
- Modify: `editor.html`
- Modify: `deck.html`
- Modify: `tests/migration-baseline.spec.js`
- Test: `tests/unit/game-ui-store.spec.ts`
- Test: `tests/migration-baseline.spec.js`

**Interfaces:**
- Consumes: `GameEngine`, `LegacyGameEngineAdapter`, and the existing page DOM.
- Produces: three independent Vue roots marked with `data-vue-mounted="true"` and a typed UI store.

- [ ] **Step 1: Write the failing UI-store test**

Create `tests/unit/game-ui-store.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameUiStore } from '@/game/stores/game-ui'

describe('game UI store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('moves through menu, hub, playing, paused, and error states', () => {
    const store = useGameUiStore()

    expect(store.screen).toBe('menu')
    store.setScreen('hub')
    store.setScreen('playing')
    store.setScreen('paused')
    store.fail({ code: 'TEST', message: 'failure' })

    expect(store.screen).toBe('error')
    expect(store.failure).toEqual({ code: 'TEST', message: 'failure' })
  })
})
```

- [ ] **Step 2: Extend the browser test before adding Vue roots**

Add to the first test in `tests/migration-baseline.spec.js`:

```js
await page.goto('/');
await expect(page.locator('#vue-game-root')).toHaveAttribute('data-vue-mounted', 'true');

await page.goto('/editor.html');
await expect(page.locator('#vue-editor-root')).toHaveAttribute('data-vue-mounted', 'true');

await page.goto('/deck.html');
await expect(page.locator('#vue-deck-root')).toHaveAttribute('data-vue-mounted', 'true');
```

- [ ] **Step 3: Run unit and browser tests and verify RED**

Run:

```bash
npm run test:unit -- tests/unit/game-ui-store.spec.ts
npm test -- tests/migration-baseline.spec.js
```

Expected: unit test fails because the store is missing; browser test fails because Vue roots are missing.

- [ ] **Step 4: Implement the UI store**

Create `src/game/stores/game-ui.ts`:

```ts
import { readonly, ref } from 'vue'
import { defineStore } from 'pinia'
import type { GameScreenState, HudSnapshot } from '@/shared/types/game'
import type { EngineFailure } from '@/shared/types/events'

export const useGameUiStore = defineStore('game-ui', () => {
  const screen = ref<GameScreenState>('menu')
  const hud = ref<HudSnapshot | null>(null)
  const failure = ref<EngineFailure | null>(null)

  function setScreen(next: GameScreenState): void {
    screen.value = next
    if (next !== 'error') failure.value = null
  }

  function updateHud(snapshot: HudSnapshot): void {
    hud.value = snapshot
  }

  function fail(error: EngineFailure): void {
    failure.value = error
    screen.value = 'error'
  }

  return {
    screen: readonly(screen),
    hud: readonly(hud),
    failure: readonly(failure),
    setScreen,
    updateHud,
    fail,
  }
})
```

- [ ] **Step 5: Add minimal Vue compatibility roots**

Create `src/game/GameApp.vue`:

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { LegacyGameEngineAdapter } from './bridge/LegacyGameEngineAdapter'
import { useGameUiStore } from './stores/game-ui'

const store = useGameUiStore()
const engine = new LegacyGameEngineAdapter(window.CellQuestLegacy)
const unsubscribers: Array<() => void> = []

onMounted(async () => {
  const host = document.querySelector<HTMLElement>('#game-container')
  await engine.mount(host ?? document.body)
  unsubscribers.push(
    engine.subscribe('state-changed', store.setScreen),
    engine.subscribe('hud-updated', store.updateHud),
    engine.subscribe('fatal-error', store.fail),
  )
})

onBeforeUnmount(() => {
  unsubscribers.splice(0).forEach(unsubscribe => unsubscribe())
  engine.destroy()
})
</script>

<template>
  <div class="vue-migration-root" aria-hidden="true" />
</template>
```

Create `src/editor/EditorApp.vue`:

```vue
<template>
  <div class="vue-migration-root" aria-hidden="true" />
</template>
```

Create `src/deck/DeckApp.vue`:

```vue
<template>
  <div class="vue-migration-root" aria-hidden="true" />
</template>
```

- [ ] **Step 6: Add the three entry modules**

Create `src/game/main.ts`:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import GameApp from './GameApp.vue'

const root = document.querySelector<HTMLElement>('#vue-game-root')
if (!root) throw new Error('Missing #vue-game-root')
root.dataset.vueMounted = 'true'
createApp(GameApp).use(createPinia()).mount(root)
```

Create `src/editor/main.ts`:

```ts
import { createApp } from 'vue'
import EditorApp from './EditorApp.vue'

const root = document.querySelector<HTMLElement>('#vue-editor-root')
if (!root) throw new Error('Missing #vue-editor-root')
root.dataset.vueMounted = 'true'
createApp(EditorApp).mount(root)
```

Create `src/deck/main.ts`:

```ts
import { createApp } from 'vue'
import DeckApp from './DeckApp.vue'

const root = document.querySelector<HTMLElement>('#vue-deck-root')
if (!root) throw new Error('Missing #vue-deck-root')
root.dataset.vueMounted = 'true'
createApp(DeckApp).mount(root)
```

- [ ] **Step 7: Add non-invasive roots to the HTML pages**

In `index.html`, immediately before `</body>`, add:

```html
<div id="vue-game-root"></div>
<script type="module" src="/src/game/main.ts"></script>
```

In `editor.html`, immediately before `</body>`, add:

```html
<div id="vue-editor-root"></div>
<script type="module" src="/src/editor/main.ts"></script>
```

In `deck.html`, immediately before `</body>`, add:

```html
<div id="vue-deck-root"></div>
<script type="module" src="/src/deck/main.ts"></script>
```

Do not remove existing classic scripts or markup in this task.

- [ ] **Step 8: Run unit, type, build, and browser tests**

Run:

```bash
npm run test:unit -- tests/unit/game-ui-store.spec.ts
npm run typecheck
npm run build
npm test -- tests/migration-baseline.spec.js
```

Expected: all commands pass; each page has a mounted Vue root and the legacy UI still works.

- [ ] **Step 9: Commit the Vue roots**

```bash
git add src/game src/editor src/deck index.html editor.html deck.html tests/unit/game-ui-store.spec.ts tests/migration-baseline.spec.js
git commit -m "feat: mount Vue roots around legacy frontend"
```

---

### Task 6: Add Continuous Foundation Verification and Migration Records

**Files:**
- Create: `docs/migration/behavior-baseline.md`
- Create: `docs/migration/engine-contract.md`
- Create: `docs/migration/rollout-checklist.md`
- Modify: `README.md`
- Modify: `README.en.md`
- Test: all foundation checks

**Interfaces:**
- Consumes: commands and contracts created by Tasks 1–5.
- Produces: reproducible setup, baseline evidence, and the gate for the next Vue UI migration plan.

- [ ] **Step 1: Write the behavior baseline record**

Create `docs/migration/behavior-baseline.md` with:

```markdown
# Frontend Behavior Baseline

## Entry Points

- `/`: main menu is visible and can enter the hub.
- `/editor.html`: editor canvas and templates load.
- `/deck.html`: presentation content renders.

## Game Flow

- A new save enters the first unlocked level.
- `P` pauses and the pause menu can return to the hub.
- P1 and P2 key mappings remain unchanged.
- No page errors occur in the covered flow.

## Compatibility Fixtures

- Existing `localStorage` save keys remain unchanged in the foundation phase.
- Existing custom-level and share-code formats remain unchanged.
- Classic scripts remain loaded until the final cutover plan.
```

- [ ] **Step 2: Write the stable engine-contract record**

Create `docs/migration/engine-contract.md`:

```markdown
# Game Engine Contract

Vue depends only on `src/game/bridge/GameEngine.ts`.

## Commands

- `mount`
- `destroy`
- `loadLevel`
- `pause`
- `resume`
- `retry`
- `quitLevel`
- `setTwoPlayer`
- `dispatch`

## Events

- `state-changed`
- `hud-updated`
- `tutorial-opened`
- `knowledge-opened`
- `level-completed`
- `player-died`
- `toast-requested`
- `fatal-error`

Event payloads are immutable domain data. Phaser objects, legacy `Game`
objects, DOM nodes, and mutable entity collections may not cross the bridge.
```

- [ ] **Step 3: Write the rollout gate**

Create `docs/migration/rollout-checklist.md`:

```markdown
# Frontend Migration Rollout Checklist

## Foundation Gate

- [ ] Vite serves all three legacy URLs.
- [ ] Production build contains all three HTML entry points.
- [ ] TypeScript strict checking passes.
- [ ] Vitest unit suite passes.
- [ ] Existing Playwright suite passes through Vite.
- [ ] Vue roots mount without changing legacy visuals.
- [ ] Vue accesses the legacy runtime only through `GameEngine`.
- [ ] Unrelated working-tree changes remain untouched.

## Next Plan

After this gate passes, write the Vue UI and shared-domain migration plan
against the actual `GameEngine` contract. Do not begin Phaser migration until
the UI and domain boundary is covered by tests.
```

- [ ] **Step 4: Update the README commands**

Update the development and test sections in `README.md` and `README.en.md` to list:

```bash
npm install
npm run dev
npm run typecheck
npm run test:unit
npm test
npm run build
npm run preview
```

State explicitly that this phase still loads the legacy engine behind a typed adapter.

- [ ] **Step 5: Run the complete foundation verification**

Run:

```bash
node --test tests/tooling/vite-foundation.test.cjs
npm run typecheck
npm run lint
npm run test:unit
npm test
npm run build
npm run test:server
```

Expected:

- Every command exits 0.
- Vitest reports zero failed tests.
- Playwright reports zero failed tests.
- Vite build emits `dist/index.html`, `dist/editor.html`, and `dist/deck.html`.
- Server tests remain green.

- [ ] **Step 6: Inspect scope before committing**

Run:

```bash
git status --short
git diff --check
git diff --name-only
```

Expected: only files named in this plan are part of the phase. Existing changes under `js/levels/backup/` and `audit/` remain unstaged.

- [ ] **Step 7: Commit the foundation documentation**

```bash
git add docs/migration README.md README.en.md
git commit -m "docs: record frontend migration foundation"
```

---

## Plan Completion Gate

This plan is complete only when all of the following are true:

1. Vite is the Playwright development server.
2. All three page entry points build.
3. Vue and Pinia are mounted without replacing the legacy interface yet.
4. The only Vue-to-legacy access is `LegacyGameEngineAdapter`.
5. TypeScript strict checking passes.
6. Unit, browser, build, lint, and server tests pass.
7. The migration records reflect the actual implemented interface.

After this gate, create the next implementation plan for shared domain extraction and Vue UI replacement. That plan must use the real files and interfaces produced here rather than assuming their final implementation.
