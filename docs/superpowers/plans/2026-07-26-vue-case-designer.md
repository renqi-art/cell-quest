# Vue TypeScript Patient Case Designer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy character-map editor with a Vue 3 and TypeScript patient case designer in which manual, template, AI and imported cases share one safe draft, validation, playtest and publishing workflow.

**Architecture:** This plan starts only after `2026-07-26-vue-typescript-foundation.md` is complete. Pure case types, schema, codec and validators live under `src/shared/` without Vue or engine imports; Pinia coordinates editor state; Vue components render the workspace; Canvas renders the grid; playtesting depends on a typed `EditorPreviewGateway`, so the legacy engine and future Phaser engine remain interchangeable.

**Tech Stack:** Vite, Vue 3, TypeScript strict mode, Pinia, Canvas 2D, Vitest, Vue Test Utils, Playwright, Node.js

**Design Spec:** `docs/superpowers/specs/2026-07-26-case-designer-manual-editor-design.md`

**Architecture Prerequisite:** `docs/superpowers/plans/2026-07-26-vue-typescript-foundation.md` (`09e301c`)

## Global Constraints

- Complete every gate in `docs/superpowers/plans/2026-07-26-vue-typescript-foundation.md` before Task 1.
- Preserve `/editor.html`, existing save slots, `CQ!` import and `CQ2!` sharing compatibility.
- Do not add business logic, inline handlers or dynamic HTML to `editor.html`.
- Do not add new editor behavior to `js/ai-levels.js` or other classic scripts.
- Vue components may not read or mutate `window.Game`, Phaser scenes or legacy editor globals.
- Domain modules may not import Vue, Pinia, Phaser or browser storage globals.
- New cases default to case mode; coins, question blocks, pipes, finish gates and platelet tools are absent from its default library.
- Classic mode remains import-compatible but is visibly separated from scored patient cases.
- Manual, template, AI and imported entries must produce the same `CaseDraft` type.
- Invalid work may be saved as a local draft; publishing and sharing require zero blocking errors.
- AI may return only a `CaseBlueprint` or whitelisted `CasePatch`, never JavaScript, HTML or final map rows.
- All user text renders with normal Vue text interpolation; do not use `v-html`.
- Follow red-green-refactor and finish every task with the exact focused commit shown.
- Keep unrelated changes under `js/levels/backup/` and `audit/` untouched.

## Prerequisite Gate

Run before Task 1:

```powershell
node --test tests/tooling/vite-foundation.test.cjs
npm run typecheck
npm run lint
npm run test:unit
npm test -- tests/migration-baseline.spec.js
npm run build
```

Expected: every command exits 0, all three Vue roots mount, and `src/editor/EditorApp.vue` exists. If this gate fails, complete the foundation plan first; do not create compatibility workarounds in the case designer.

## File Structure Produced

```text
src/
├─ shared/
│  ├─ types/case.ts
│  ├─ models/case-draft.ts
│  ├─ models/case-templates.ts
│  ├─ services/
│  │  ├─ CaseSchema.ts
│  │  ├─ CaseValidationService.ts
│  │  ├─ CaseReachabilityService.ts
│  │  ├─ CaseCodec.ts
│  │  └─ CaseDraftRepository.ts
│  └─ storage/StorageAdapter.ts
└─ editor/
   ├─ EditorApp.vue
   ├─ stores/case-editor.ts
   ├─ domain/
   │  ├─ case-commands.ts
   │  └─ case-history.ts
   ├─ canvas/
   │  ├─ CaseCanvasRenderer.ts
   │  └─ case-canvas-tools.ts
   ├─ services/
   │  ├─ EditorPreviewGateway.ts
   │  ├─ LegacyEditorPreviewAdapter.ts
   │  └─ AiCaseDesignerClient.ts
   ├─ components/
   │  ├─ NewCaseWizard.vue
   │  ├─ EditorToolbar.vue
   │  ├─ CaseToolPalette.vue
   │  ├─ CaseMapCanvas.vue
   │  ├─ CaseInspector.vue
   │  ├─ PatientGoalPanel.vue
   │  ├─ CaseValidationPanel.vue
   │  ├─ CasePlaytestPanel.vue
   │  ├─ CasePublishDialog.vue
   │  ├─ AiCaseGeneratorDialog.vue
   │  └─ ClassicImportDialog.vue
   └─ styles/case-designer.css
```

## Cross-Plan Execution Order

```text
Vue/TypeScript foundation (all tasks)
        ↓
Case designer Tasks 1–7: draft, history, storage, manual UI, nodes, validation
        ├── TypeScript case runtime plan derived from core gameplay requirements
        └── AI director Tasks 1–8: server, runtime director, blueprint compiler
                         ↓
Case designer Tasks 8–12: playtest, publish, AI UI, legacy cutover, official QA
```

Do not execute Task 8 merely because the editor UI is ready; it needs the real typed runtime contract. Do not execute Task 10 against mocked production endpoints; it needs the validated blueprint/compiler outputs from the AI plan.

---

### Task 1: Define the shared case draft and exact schema

**Files:**
- Create: `src/shared/types/case.ts`
- Create: `src/shared/models/case-draft.ts`
- Create: `src/shared/services/CaseSchema.ts`
- Create: `tests/unit/case-schema.spec.ts`

**Interfaces:**
- Consumes: no UI or engine module.
- Produces: `CaseDraft`, `CaseNode`, `CaseConfig`, `createCaseDraft()`, `parseCaseDraft()` and `CaseParseResult`.

- [ ] **Step 1: Write failing schema tests**

Create tests proving that a minimal RBC case parses, duplicate node IDs fail, unknown keys fail, classic drafts require `caseConfig: null`, and input objects remain unmodified.

```ts
const result = parseCaseDraft(createCaseDraft({ primaryCell: 'rbc' }))
expect(result.ok).toBe(true)
expect(result.value?.mode).toBe('case')
expect(Object.isFrozen(result.value)).toBe(true)
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:unit -- tests/unit/case-schema.spec.ts`

Expected: FAIL because `CaseSchema.ts` does not exist.

- [ ] **Step 3: Define exact discriminated types**

```ts
export type CaseMode = 'case' | 'classic'
export type PrimaryCell = 'rbc' | 'wbc' | 'coop'
export type DraftSource = 'manual' | 'template' | 'ai' | 'import'

export type CaseNode =
  | { readonly kind: 'spawn'; readonly id: string; readonly x: number; readonly y: number; readonly role: PrimaryCell }
  | { readonly kind: 'oxygen-source'; readonly id: string; readonly x: number; readonly y: number; readonly capacity: number }
  | { readonly kind: 'target-tissue'; readonly id: string; readonly x: number; readonly y: number; readonly requiredOxygen: number }
  | { readonly kind: 'infection-site'; readonly id: string; readonly x: number; readonly y: number; readonly severity: 1 | 2 | 3 }
  | { readonly kind: 'checkpoint'; readonly id: string; readonly x: number; readonly y: number }
  | { readonly kind: 'knowledge'; readonly id: string; readonly x: number; readonly y: number; readonly sourceId: string }

export interface CaseVitals {
  readonly oxygen: number
  readonly infection: number
  readonly tissue: number
  readonly oxygenDecayPerSecond: number
  readonly infectionGrowthPerSecond: number
  readonly tissueDecayPerSecond: number
}

export interface OxygenRoute {
  readonly id: string
  readonly sourceId: string
  readonly targetIds: readonly string[]
  readonly requiredDeliveries: number
}

export interface InfectionGoal {
  readonly nodeIds: readonly string[]
  readonly requiredClears: number
}

export interface CaseGoals {
  readonly oxygenRoutes: readonly OxygenRoute[]
  readonly infection: InfectionGoal
  readonly stabilitySeconds: number
}

export interface CaseConfig {
  readonly version: 1
  readonly primaryCell: PrimaryCell
  readonly allyMode: 'scripted' | 'second-player'
  readonly vitals: CaseVitals
  readonly goals: CaseGoals
  readonly allowedEvents: readonly ('ACUTE_HYPOXIA' | 'INFECTION_REBOUND' | 'TRANSPORT_BLOCKAGE' | 'ATP_CRISIS')[]
  readonly briefing: { readonly start: string; readonly success: string; readonly failure: string }
  readonly education: { readonly topic: string; readonly sourceIds: readonly string[] }
}

export interface CaseDraft {
  readonly version: 1
  readonly mode: CaseMode
  readonly id: string
  readonly revision: number
  readonly metadata: CaseMetadata
  readonly map: readonly string[]
  readonly nodes: readonly CaseNode[]
  readonly caseConfig: CaseConfig | null
  readonly editorMeta: {
    readonly source: DraftSource
    readonly templateId?: string
    readonly seed?: number
    readonly updatedAt: string
  }
}

export interface CaseMetadata {
  readonly title: string
  readonly author: string
  readonly difficulty: 'assist' | 'standard' | 'challenge'
  readonly tags: readonly string[]
  readonly icon: string
}
```

Enforce title 1–20 visible characters, author 1–12, at most three tags of 1–8 characters, one registered icon, map height exactly 15 and width 20–160. Later tasks must not rename these stable fields.

- [ ] **Step 4: Implement immutable construction and parsing**

`createCaseDraft()` creates a 15×80 empty case draft with one spawn and bounded standard vitals. `parseCaseDraft(input: unknown)` rejects unknown keys at every level, non-finite numbers, invalid dimensions, duplicate IDs and unsupported versions; it returns a deep-frozen normalized clone.

- [ ] **Step 5: Verify GREEN and types**

Run:

```powershell
npm run test:unit -- tests/unit/case-schema.spec.ts
npm run typecheck
```

Expected: PASS with no `any` or TypeScript suppression.

- [ ] **Step 6: Commit**

```powershell
git add src/shared/types/case.ts src/shared/models/case-draft.ts src/shared/services/CaseSchema.ts tests/unit/case-schema.spec.ts
git commit -m "feat: define typed patient case drafts"
```

### Task 2: Add transactional commands, undo and redo

**Files:**
- Create: `src/editor/domain/case-commands.ts`
- Create: `src/editor/domain/case-history.ts`
- Create: `tests/unit/case-history.spec.ts`

**Interfaces:**
- Consumes: immutable `CaseDraft`.
- Produces: `CaseCommand`, `applyCaseCommand(draft, command)`, `CaseHistory.execute()`, `undo()`, `redo()` and `snapshot`.

- [ ] **Step 1: Write failing history tests**

Cover a paint stroke as one transaction, node add/move/delete, config replacement, imported draft replacement, AI patch replacement, 50-entry history truncation and redo invalidation after a new command.

```ts
history.execute({ type: 'paint-cells', cells: [{ x: 2, y: 13, tile: '#' }] })
expect(history.snapshot.map[13]?.[2]).toBe('#')
history.undo()
expect(history.snapshot.map[13]?.[2]).toBe(' ')
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:unit -- tests/unit/case-history.spec.ts`

Expected: FAIL because the command modules are missing.

- [ ] **Step 3: Define commands without callbacks**

```ts
export type CaseCommand =
  | { readonly type: 'paint-cells'; readonly cells: readonly CellChange[] }
  | { readonly type: 'add-node'; readonly node: CaseNode }
  | { readonly type: 'move-node'; readonly id: string; readonly x: number; readonly y: number }
  | { readonly type: 'remove-node'; readonly id: string }
  | { readonly type: 'replace-config'; readonly config: CaseConfig }
  | { readonly type: 'replace-draft'; readonly draft: CaseDraft; readonly reason: 'import' | 'ai-patch' | 'template' }
```

Commands contain serializable data only. `applyCaseCommand` normalizes through `parseCaseDraft` and throws `CaseCommandError` without modifying the input when a command is invalid.

- [ ] **Step 4: Implement bounded immutable history**

`CaseHistory` stores before/after snapshots, exposes readonly `canUndo` and `canRedo`, groups a continuous pointer stroke into one `paint-cells` command, and caps undo history at 50 committed transactions.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
npm run test:unit -- tests/unit/case-history.spec.ts
npm run typecheck
```

Expected: all history tests pass and command exhaustiveness is typechecked.

- [ ] **Step 6: Commit**

```powershell
git add src/editor/domain/case-commands.ts src/editor/domain/case-history.ts tests/unit/case-history.spec.ts
git commit -m "feat: add transactional case editing history"
```

### Task 3: Add versioned draft storage and legacy slot migration

**Files:**
- Create: `src/shared/storage/StorageAdapter.ts`
- Create: `src/shared/services/CaseDraftRepository.ts`
- Create: `tests/unit/case-draft-repository.spec.ts`
- Create: `src/editor/stores/case-editor.ts`

**Interfaces:**
- Consumes: `CaseDraft`, active save slot and `StorageAdapter`.
- Produces: `CaseDraftRepository.list()`, `load()`, `saveAutoDraft()`, `saveNamedDraft()`, `delete()` and `migrateLegacySlot()`.

- [ ] **Step 1: Write repository tests with an in-memory adapter**

Test per-slot isolation, 300 ms debounced autosave through fake timers, corrupted JSON preservation, idempotent migration from `cellQuest_customLevels` and failure without partial writes.

```ts
await repository.saveNamedDraft(2, draft)
expect((await repository.list(1))).toEqual([])
expect((await repository.list(2))[0]?.id).toBe(draft.id)
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:unit -- tests/unit/case-draft-repository.spec.ts`

Expected: FAIL because `CaseDraftRepository` does not exist.

- [ ] **Step 3: Define the storage boundary**

```ts
export interface StorageAdapter {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}
```

Use keys `cellQuest_caseDrafts_v1_slot_{slot}` and `cellQuest_caseDraftRecovery_v1`. Components and stores must not construct keys directly.

- [ ] **Step 4: Implement safe repository writes**

Parse every read through `parseCaseDraft`. Before replacing a valid collection, write the serialized next value to the recovery key, write the collection, read it back and only then clear recovery. Return typed `RepositoryResult` errors instead of alerts.

- [ ] **Step 5: Connect Pinia autosave**

Create `useCaseEditorStore()` with readonly `draft`, `dirty`, `saveState` and actions that call `CaseHistory`; subscribe to committed transactions and debounce `saveAutoDraft()` by exactly 300 ms.

- [ ] **Step 6: Verify GREEN**

Run:

```powershell
npm run test:unit -- tests/unit/case-draft-repository.spec.ts
npm run typecheck
```

Expected: PASS, including repeat migration producing no duplicates.

- [ ] **Step 7: Commit**

```powershell
git add src/shared/storage/StorageAdapter.ts src/shared/services/CaseDraftRepository.ts src/editor/stores/case-editor.ts tests/unit/case-draft-repository.spec.ts
git commit -m "feat: persist versioned case editor drafts"
```

### Task 4: Replace the compatibility root with the case designer shell

**Files:**
- Create: `src/editor/components/NewCaseWizard.vue`
- Create: `src/editor/components/EditorToolbar.vue`
- Create: `src/editor/components/CaseToolPalette.vue`
- Create: `src/editor/components/CaseInspector.vue`
- Create: `src/editor/styles/case-designer.css`
- Create: `tests/component/NewCaseWizard.spec.ts`
- Modify: `src/editor/EditorApp.vue`
- Modify: `src/editor/main.ts`
- Modify: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `useCaseEditorStore()`, `createCaseDraft()` and template IDs.
- Produces: the four-step new-case wizard and the stable editor regions `toolbar`, `palette`, `canvas`, `inspector`, `status`.

- [ ] **Step 1: Add component-test support and a failing wizard test**

Add script `"test:component": "vitest run tests/component"` and include `tests/component/**/*.spec.ts` in Vitest. Test theme, role, starting layout and difficulty steps; verify the default role is RBC, blank is marked advanced, and completion emits one normalized `CaseDraft`.

- [ ] **Step 2: Verify RED**

Run: `npm run test:component -- tests/component/NewCaseWizard.spec.ts`

Expected: FAIL because the wizard is missing.

- [ ] **Step 3: Implement exact wizard output**

```ts
export interface NewCaseSelection {
  readonly title: string
  readonly organTheme: 'blood' | 'alveoli' | 'lymph'
  readonly educationTopic: 'oxygen-transport' | 'immune-response' | 'cooperation'
  readonly primaryCell: PrimaryCell
  readonly start: 'safe-template' | 'copy-case' | 'blank'
  readonly difficulty: 'assist' | 'standard' | 'challenge'
}
```

The wizard may move backward without losing input. Completing it creates and stores a draft before navigating to the workspace.

- [ ] **Step 4: Build the five-region shell**

`EditorApp.vue` renders the wizard when no draft is open and otherwise renders a semantic `<header>`, `<aside aria-label="病例工具">`, `<main aria-label="病例画布">`, `<aside aria-label="属性检查器">` and `<footer aria-live="polite">`. It must not copy legacy inline markup.

- [ ] **Step 5: Separate case and classic libraries**

Case mode exposes terrain, spawn, checkpoint, oxygen source, target tissue, infection site, ATP, knowledge and decoration tools. Classic mode loads retired objects only after an explicit compatibility action and shows a persistent warning banner.

- [ ] **Step 6: Verify UI, type and build**

Run:

```powershell
npm run test:component -- tests/component/NewCaseWizard.spec.ts
npm run typecheck
npm run lint
npm run build
```

Expected: all commands pass and `dist/editor.html` includes the Vue editor entry only once.

- [ ] **Step 7: Commit**

```powershell
git add src/editor package.json vitest.config.ts tests/component/NewCaseWizard.spec.ts
git commit -m "feat: add Vue patient case designer shell"
```

### Task 5: Implement Canvas tools and semantic node selection

**Files:**
- Create: `src/editor/canvas/CaseCanvasRenderer.ts`
- Create: `src/editor/canvas/case-canvas-tools.ts`
- Create: `src/editor/components/CaseMapCanvas.vue`
- Create: `tests/unit/case-canvas-tools.spec.ts`
- Create: `tests/component/CaseMapCanvas.spec.ts`
- Modify: `src/editor/EditorApp.vue`

**Interfaces:**
- Consumes: readonly `CaseDraft`, `CaseCommand` dispatcher and selected tool.
- Produces: paint, erase, line, rectangle, fill, select, move, copy, paste, flip, zoom and minimap interactions.

- [ ] **Step 1: Write tool geometry tests**

Test Bresenham line cells, normalized rectangle bounds, flood fill stopping at tile boundaries, selection clipping, horizontal flip and no duplicate cells in one stroke.

```ts
expect(lineCells({ x: 1, y: 1 }, { x: 3, y: 1 })).toEqual([
  { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
])
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:unit -- tests/unit/case-canvas-tools.spec.ts`

Expected: FAIL because the tool functions are missing.

- [ ] **Step 3: Implement pure geometry and renderer boundaries**

`case-canvas-tools.ts` contains no DOM access. `CaseCanvasRenderer` receives a canvas context, immutable draft and viewport, and draws terrain, semantic node icons, relationship lines, selection, reachability overlay and diagnostic highlights without mutating editor state.

- [ ] **Step 4: Implement pointer transactions**

`CaseMapCanvas.vue` converts pointer coordinates to grid coordinates, begins one transaction on pointerdown, previews on pointermove and dispatches one command on pointerup. It releases pointer capture on cancel/unmount and never commits outside map bounds.

- [ ] **Step 5: Add keyboard behavior**

Use `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+C`, `Ctrl+V`, `Delete`, `F` for fill and `Space` for pan only when focus is not inside an input. Expose the same actions as labeled buttons.

- [ ] **Step 6: Verify tools and component behavior**

Run:

```powershell
npm run test:unit -- tests/unit/case-canvas-tools.spec.ts
npm run test:component -- tests/component/CaseMapCanvas.spec.ts
npm run typecheck
```

Expected: one drag creates one undo step and no listener remains after unmount.

- [ ] **Step 7: Commit**

```powershell
git add src/editor/canvas src/editor/components/CaseMapCanvas.vue src/editor/EditorApp.vue tests/unit/case-canvas-tools.spec.ts tests/component/CaseMapCanvas.spec.ts
git commit -m "feat: add semantic case canvas tools"
```

### Task 6: Add semantic node inspectors and objective relationships

**Files:**
- Create: `src/editor/components/CaseNodeInspector.vue`
- Create: `src/editor/components/PatientGoalPanel.vue`
- Create: `src/shared/models/case-templates.ts`
- Create: `tests/unit/case-objectives.spec.ts`
- Create: `tests/component/CaseNodeInspector.spec.ts`
- Modify: `src/shared/types/case.ts`
- Modify: `src/editor/stores/case-editor.ts`
- Modify: `src/editor/components/CaseInspector.vue`

**Interfaces:**
- Consumes: selected `CaseNode`, `CaseConfig` and command dispatcher.
- Produces: stable node IDs, oxygen delivery relationships, infection goal membership and deterministic goal suggestions.

- [ ] **Step 1: Write failing objective tests**

Test that adding two tissues to one source suggests two deliveries, selecting two of three infection sites suggests a kill goal of two, deleting a referenced node reports affected relationships, and copying creates a new ID while moving preserves it.

- [ ] **Step 2: Verify RED**

Run: `npm run test:unit -- tests/unit/case-objectives.spec.ts`

Expected: FAIL because goal suggestion functions are absent.

- [ ] **Step 3: Use the stable relationship types from Task 1**

```ts
export interface OxygenRoute {
  readonly id: string
  readonly sourceId: string
  readonly targetIds: readonly string[]
  readonly requiredDeliveries: number
}

export interface InfectionGoal {
  readonly nodeIds: readonly string[]
  readonly requiredClears: number
}
```

Do not redefine these interfaces. Store relationships in `CaseConfig.goals`; never infer them at game load from pixel proximity.

- [ ] **Step 4: Implement kind-specific inspectors**

Each node kind exposes only its bounded fields. Input changes dispatch complete commands after blur or Enter, invalid input remains local with an inline message, and node ID is read-only. No inspector writes the Pinia state object directly.

- [ ] **Step 5: Add relationship editing on the canvas**

Selecting an oxygen source enables “连接目标组织”; subsequent tissue clicks update one `OxygenRoute` and render directional lines. Infection sites have an explicit “计入阶段目标” toggle. Deleting a referenced node opens a confirmation listing affected goal IDs.

- [ ] **Step 6: Implement four safe starting templates**

Register `rbc-transport`, `wbc-infection`, `coop-mixed` and `recovery-short`. Templates return fresh `CaseDraft` values through `createCaseDraft`; they never share mutable arrays.

- [ ] **Step 7: Verify unit and component tests**

Run:

```powershell
npm run test:unit -- tests/unit/case-objectives.spec.ts
npm run test:component -- tests/component/CaseNodeInspector.spec.ts
npm run typecheck
```

Expected: relationship updates are undoable and IDs remain stable.

- [ ] **Step 8: Commit**

```powershell
git add src/shared/types/case.ts src/shared/models/case-templates.ts src/editor/components src/editor/stores/case-editor.ts tests/unit/case-objectives.spec.ts tests/component/CaseNodeInspector.spec.ts
git commit -m "feat: add patient case nodes and objectives"
```

### Task 7: Implement validation, reachability and actionable diagnostics

**Files:**
- Create: `src/shared/services/CaseValidationService.ts`
- Create: `src/shared/services/CaseReachabilityService.ts`
- Create: `src/editor/components/CaseValidationPanel.vue`
- Create: `tests/unit/case-validation.spec.ts`
- Create: `tests/unit/case-reachability.spec.ts`
- Create: `tests/component/CaseValidationPanel.spec.ts`
- Modify: `src/editor/stores/case-editor.ts`
- Modify: `src/editor/components/CaseMapCanvas.vue`

**Interfaces:**
- Consumes: `CaseDraft` and a versioned `MovementEnvelope`.
- Produces: `validateCaseDraft(draft): CaseDiagnostic[]`, `analyzeReachability(draft, role)` and safe `CaseFix` operations.

- [ ] **Step 1: Write failing diagnostic tests**

Cover duplicate spawns, missing oxygen loop, objective count overflow, unreachable required node, unknown AI event target, inevitable tissue failure on the shortest safe route, long checkpoint distance and missing educational source.

```ts
expect(validateCaseDraft(unreachableDraft)).toContainEqual(expect.objectContaining({
  code: 'REQUIRED_NODE_UNREACHABLE',
  severity: 'error',
  nodeIds: ['tissue-1'],
}))
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm run test:unit -- tests/unit/case-validation.spec.ts
npm run test:unit -- tests/unit/case-reachability.spec.ts
```

Expected: FAIL because validators are missing.

- [ ] **Step 3: Define versioned movement constraints**

```ts
export interface MovementEnvelope {
  readonly version: 1
  readonly maxGapTiles: number
  readonly maxStepUpTiles: number
  readonly maxDropTiles: number
  readonly playerHeightTiles: number
}
```

Use values measured from the current engine characterization tests, not guessed values. Store the fixture with the test and update it only when the engine behavior intentionally changes.

- [ ] **Step 4: Implement three validation layers**

Run exact schema checks first, role/objective checks second, and graph reachability third. Diagnostics contain `code`, `severity`, Chinese `message`, `nodeIds`, `cellBounds` and optional serializable `CaseFix`; they contain no Vue component or callback.

- [ ] **Step 5: Implement deterministic safe fixes**

Allow only fixes whose outcome is unambiguous: clamp a number, lower a goal to available nodes, remove an unknown event reference or select the only spawn. Preview the resulting draft and validation delta before dispatching the fix as one history transaction.

- [ ] **Step 6: Connect diagnostics to canvas and panel**

Clicking a diagnostic selects the node or pans to `cellBounds`. Errors block publish/share; warnings require confirmation; local draft save remains available. Use `aria-live="polite"` for validation summary changes.

- [ ] **Step 7: Verify GREEN**

Run:

```powershell
npm run test:unit -- tests/unit/case-validation.spec.ts tests/unit/case-reachability.spec.ts
npm run test:component -- tests/component/CaseValidationPanel.spec.ts
npm run typecheck
```

Expected: tests pass for RBC, WBC and co-op fixtures.

- [ ] **Step 8: Commit**

```powershell
git add src/shared/services/CaseValidationService.ts src/shared/services/CaseReachabilityService.ts src/editor/components/CaseValidationPanel.vue src/editor/components/CaseMapCanvas.vue src/editor/stores/case-editor.ts tests/unit/case-validation.spec.ts tests/unit/case-reachability.spec.ts tests/component/CaseValidationPanel.spec.ts
git commit -m "feat: diagnose unplayable patient cases"
```

### Task 8: Add adapter-independent playtesting and returned diagnostics

> **Inter-plan gate:** Complete the typed case runtime and its `GameEngine` event contract before this task. Tasks 1–7 can be implemented against pure editor/domain modules while runtime migration proceeds in parallel.

**Files:**
- Create: `src/editor/services/EditorPreviewGateway.ts`
- Create: `src/editor/services/LegacyEditorPreviewAdapter.ts`
- Create: `src/editor/components/CasePlaytestPanel.vue`
- Create: `tests/unit/LegacyEditorPreviewAdapter.spec.ts`
- Create: `tests/case-preview.spec.js`
- Modify: `src/shared/types/events.ts`
- Modify: `js/game.js`
- Modify: `src/editor/EditorApp.vue`

**Interfaces:**
- Consumes: a zero-error `CaseDraft`, preview role and typed `GameEngine` bridge.
- Produces: `EditorPreviewGateway.start(draft, options): Promise<PreviewSession>` and `CasePlaytestReport`.

- [ ] **Step 1: Characterize the temporary-level preview bridge**

Write tests before changing `js/game.js`: registering an in-memory preview level returns an opaque ID, load receives no raw draft through DOM globals, ending preview emits one report, and disposing removes the temporary level and listeners.

- [ ] **Step 2: Define the preview contract**

```ts
export interface PreviewOptions {
  readonly role: 'rbc' | 'wbc' | 'coop'
  readonly start: { readonly type: 'full' } | { readonly type: 'cell'; readonly x: number; readonly y: number }
}

export interface CasePlaytestReport {
  readonly completed: boolean
  readonly durationMs: number
  readonly deaths: number
  readonly failureCode?: string
  readonly unvisitedNodeIds: readonly string[]
  readonly crisisEvents: readonly { eventId: string; targetNodeId: string; source: 'ai' | 'local' }[]
  readonly heatCells: readonly { x: number; y: number; count: number }[]
}
```

- [ ] **Step 3: Add a narrow legacy preview hook**

Extend `window.CellQuestLegacy` only with `registerPreviewLevel(level)`, `unregisterPreviewLevel(id)` and report subscription. The adapter converts the published case into the current level shape. Do not expose editor store, `Game` or mutable entities.

- [ ] **Step 4: Implement and test the gateway**

`LegacyEditorPreviewAdapter` validates again, registers the temporary level, calls `GameEngine.loadLevel`, collects typed report events and always unregisters in `dispose()`, including load failure and component unmount.

- [ ] **Step 5: Build playtest controls**

Offer RBC, WBC and co-op only when applicable; offer local cell preview for geometry checks. Returning restores draft revision, viewport and selection, then displays completion, failures, unvisited nodes, crises and heat cells.

- [ ] **Step 6: Verify unit and browser behavior**

Run:

```powershell
npm run test:unit -- tests/unit/LegacyEditorPreviewAdapter.spec.ts
npm test -- tests/case-preview.spec.js
npm run typecheck
```

Expected: repeated open/close leaves zero preview levels and zero duplicate event listeners.

- [ ] **Step 7: Commit**

```powershell
git add src/editor/services/EditorPreviewGateway.ts src/editor/services/LegacyEditorPreviewAdapter.ts src/editor/components/CasePlaytestPanel.vue src/editor/EditorApp.vue src/shared/types/events.ts js/game.js tests/unit/LegacyEditorPreviewAdapter.spec.ts tests/case-preview.spec.js
git commit -m "feat: playtest case drafts through engine adapter"
```

### Task 9: Add secure publishing, CQ2 sharing and import preview

**Files:**
- Create: `src/shared/services/CaseCodec.ts`
- Create: `src/editor/components/CasePublishDialog.vue`
- Create: `src/editor/components/ClassicImportDialog.vue`
- Create: `tests/unit/case-codec.spec.ts`
- Create: `tests/component/CasePublishDialog.spec.ts`
- Create: `tests/case-designer-sharing.spec.js`
- Modify: `src/shared/types/case.ts`
- Modify: `src/editor/stores/case-editor.ts`

**Interfaces:**
- Consumes: zero-error draft, confirmed warnings and latest full-role playtest report.
- Produces: `publishCase(draft, evidence): PublishedCase`, `encodeCaseCode()` and `decodeCaseCode()`.

- [ ] **Step 1: Write codec and publication gate tests**

Test `CQ2!` round trip, 128 KiB decoded limit, unknown keys, executable strings, oversized map, missing playtest, stale playtest revision, warning confirmation and legacy `CQ!` decoding into classic preview.

- [ ] **Step 2: Verify RED**

Run: `npm run test:unit -- tests/unit/case-codec.spec.ts`

Expected: FAIL because `CaseCodec` does not exist.

- [ ] **Step 3: Define the minimal published payload**

```ts
export interface PublishedCase {
  readonly v: 2
  readonly id: string
  readonly revision: number
  readonly name: string
  readonly author: string
  readonly difficulty: 'assist' | 'standard' | 'challenge'
  readonly tags: readonly string[]
  readonly icon: string
  readonly map: readonly string[]
  readonly nodes: readonly CaseNode[]
  readonly caseConfig: CaseConfig
}
```

Do not include command history, prompts, API metadata, model responses, heatmaps or local storage IDs.

- [ ] **Step 4: Implement strict encode/decode**

Use UTF-8 URL-safe Base64 over JSON. Validate before encode and after decode. Normalize Unicode, strip control characters, reject HTML-like text only where markup is not valid prose, and never evaluate imported text.

- [ ] **Step 5: Implement publish and import previews**

Publish shows role, vitals, objectives, reachability, latest full playtest, allowed crises, sources and warnings. Import shows version, mode, dimensions, node counts and diagnostics before writing a new draft; it never overwrites the current draft.

- [ ] **Step 6: Verify all security paths**

Run:

```powershell
npm run test:unit -- tests/unit/case-codec.spec.ts
npm run test:component -- tests/component/CasePublishDialog.spec.ts
npm test -- tests/case-designer-sharing.spec.js tests/security.spec.js
```

Expected: all malicious fixtures are rejected and user text renders as text.

- [ ] **Step 7: Commit**

```powershell
git add src/shared/services/CaseCodec.ts src/shared/types/case.ts src/editor/components/CasePublishDialog.vue src/editor/components/ClassicImportDialog.vue src/editor/stores/case-editor.ts tests/unit/case-codec.spec.ts tests/component/CasePublishDialog.spec.ts tests/case-designer-sharing.spec.js tests/security.spec.js
git commit -m "feat: publish and share validated patient cases"
```

### Task 10: Integrate AI blueprints and constrained patches into the same store

> **Inter-plan gate:** Complete AI director plan Tasks 7–8 first. `/api/generate-case`, `CaseBlueprint`, `CaseCompiler` and the local deterministic fallback must exist and pass their Node/Vitest tests before this task.

**Files:**
- Create: `src/editor/services/AiCaseDesignerClient.ts`
- Create: `src/editor/components/AiCaseGeneratorDialog.vue`
- Create: `tests/unit/AiCaseDesignerClient.spec.ts`
- Create: `tests/component/AiCaseGeneratorDialog.spec.ts`
- Create: `tests/case-designer-ai.spec.js`
- Modify: `src/editor/stores/case-editor.ts`
- Modify: `src/editor/EditorApp.vue`

**Interfaces:**
- Consumes: server `POST /api/generate-case`, optional `POST /api/case-assistant`, shared parser and case compiler delivered by the AI plan.
- Produces: `generateDraft(request, signal)`, `proposePatch(draft, request, signal)` and source/fallback view models.

- [ ] **Step 1: Write client failure-mapping tests**

Cover success, local fallback source, abort, 2.5-second timeout, non-JSON, unknown blueprint field, invalid patch operation and a server body that attempts to include `map`, `script` or HTML.

- [ ] **Step 2: Verify RED**

Run: `npm run test:unit -- tests/unit/AiCaseDesignerClient.spec.ts`

Expected: FAIL because the client is missing.

- [ ] **Step 3: Define exact request and patch operations**

```ts
export type CasePatchOperation =
  | { readonly op: 'add-node'; readonly node: CaseNode }
  | { readonly op: 'remove-node'; readonly nodeId: string }
  | { readonly op: 'set-difficulty'; readonly value: 'assist' | 'standard' | 'challenge' }
  | { readonly op: 'set-primary-cell'; readonly value: PrimaryCell }
  | { readonly op: 'replace-briefing'; readonly value: string }
```

No JSON Pointer, arbitrary property path, code, HTML or map-row operation is accepted.

- [ ] **Step 4: Implement abortable typed fetch**

Create a fresh `AbortController` per request, combine caller cancellation with a 2500 ms timeout, parse `unknown`, validate exact response shape and map failures to `AiCaseDesignerErrorCode`. The browser never reads or stores an API key.

- [ ] **Step 5: Connect generation to the normal draft path**

Compile the blueprint, validate it and dispatch one `replace-draft` transaction with reason `template` or `ai-patch`. Show source, template ID, seed, fallback reason and diagnostics. AI output cannot call repository or publisher directly.

- [ ] **Step 6: Require patch preview and confirmation**

Apply the proposed patch to a copy, run full validation, display field/node/diagnostic differences and commit one undoable command only after confirmation. Cancellation and invalid patches leave the current serialized draft unchanged.

- [ ] **Step 7: Verify online, offline and security behavior**

Run:

```powershell
npm run test:unit -- tests/unit/AiCaseDesignerClient.spec.ts
npm run test:component -- tests/component/AiCaseGeneratorDialog.spec.ts
npm test -- tests/case-designer-ai.spec.js tests/security.spec.js
npm run typecheck
```

Expected: both AI and local sources use the same editor, and the offline path remains fully publishable after validation/playtest.

- [ ] **Step 8: Commit**

```powershell
git add src/editor/services/AiCaseDesignerClient.ts src/editor/components/AiCaseGeneratorDialog.vue src/editor/stores/case-editor.ts src/editor/EditorApp.vue tests/unit/AiCaseDesignerClient.spec.ts tests/component/AiCaseGeneratorDialog.spec.ts tests/case-designer-ai.spec.js tests/security.spec.js
git commit -m "feat: edit AI case drafts through Vue designer"
```

### Task 11: Cut over the legacy editor safely

**Files:**
- Create: `src/editor/services/LegacyCaseImportService.ts`
- Create: `tests/unit/legacy-case-import.spec.ts`
- Create: `tests/case-designer-compat.spec.js`
- Modify: `editor.html`
- Modify: `src/editor/EditorApp.vue`
- Modify: `tests/migration-baseline.spec.js`
- Modify: `docs/migration/rollout-checklist.md`

**Interfaces:**
- Consumes: old custom-level objects, `CQ!`, old safe level literal parser and per-slot storage.
- Produces: isolated classic preview or copied `CaseDraft`; removes legacy editor runtime after parity gates pass.

- [ ] **Step 1: Freeze compatibility fixtures**

Add fixtures for one classic map, one slot-scoped custom map, one `CQ!` code, knowledge cards, tutorials and pipe spawners. Assert import does not change the fixture, conversion creates a new ID, removes the finish gate and reports retired objects for manual handling.

- [ ] **Step 2: Implement safe classic import**

Parse only JSON, share codes and the existing constrained literal format. Classic import opens a labeled preview. “转换为病例” copies terrain/spawn, removes finish semantics, creates an incomplete case config and never guesses oxygen/infection objectives.

- [ ] **Step 3: Add a one-way parity gate to Playwright**

Verify new case, manual edit, undo, autosave, reload, classic import, case conversion, validation, preview, publish and CQ2 re-import. Capture `pageerror`; expected list is empty.

- [ ] **Step 4: Remove legacy editor markup and scripts**

After parity tests pass, reduce `editor.html` to metadata, `<div id="vue-editor-root"></div>` and `/src/editor/main.ts`. Remove legacy inline handlers and the editor load of `js/ai-levels.js`; do not remove game-page scripts in this task.

- [ ] **Step 5: Update migration baseline and checklist**

Replace legacy `#gridWrap` assertions with stable Vue landmarks such as `[data-testid="case-designer"]`. Mark editor Vue cutover complete while leaving game and deck foundation status accurate.

- [ ] **Step 6: Verify compatibility and production build**

Run:

```powershell
npm run test:unit -- tests/unit/legacy-case-import.spec.ts
npm test -- tests/case-designer-compat.spec.js tests/migration-baseline.spec.js tests/editor-storage.spec.js tests/security.spec.js
npm run typecheck
npm run lint
npm run build
```

Expected: all commands pass; `editor.html` contains no inline event attributes, `eval`, legacy editor script or duplicate Vue root.

- [ ] **Step 7: Commit**

```powershell
git add src/editor/services/LegacyCaseImportService.ts src/editor/EditorApp.vue editor.html tests/unit/legacy-case-import.spec.ts tests/case-designer-compat.spec.js tests/migration-baseline.spec.js docs/migration/rollout-checklist.md
git commit -m "refactor: cut over to Vue patient case designer"
```

### Task 12: Prove the manual workflow with official cases and usability gates

> **Inter-plan gate:** The dedicated TypeScript case runtime plan derived from `2026-07-26-core-case-gameplay.md` must be complete before full-role playtest and official-case assertions. Do not fake runtime success in editor tests.

**Files:**
- Create: `tests/case-designer-manual.spec.js`
- Create: `tests/case-designer-official.spec.js`
- Create: `docs/qa/case-designer-usability.md`
- Create: `docs/qa/case-designer-manual-checklist.md`
- Modify: `src/editor/styles/case-designer.css`
- Modify: `src/editor/components/EditorToolbar.vue`
- Modify: `src/editor/components/CaseToolPalette.vue`
- Modify: `src/editor/components/CaseInspector.vue`
- Modify: `src/editor/components/CaseValidationPanel.vue`

**Interfaces:**
- Consumes: completed designer, official six-case data and published-case loader.
- Produces: end-to-end proof that cases can be authored without character codes and that all official cases pass the same publication gate.

- [ ] **Step 1: Write the full manual RBC workflow**

Playwright must create an RBC case from the safe template, add a target tissue through the palette, connect it to the oxygen source, change blood oxygen, resolve validation, full-playtest through a deterministic fixture, publish, reload `CQ2!` and assert the same node IDs and objectives.

- [ ] **Step 2: Write WBC and co-op workflows**

Create a WBC case without oxygen goals, then a co-op mixed case with RBC and WBC responsibilities. Assert no test enters raw characters, JSON or legacy config dialogs.

- [ ] **Step 3: Validate all official cases through shared services**

Load each official case into `parseCaseDraft`, run `validateCaseDraft`, reachability for applicable roles, encode/decode and published runtime load. Expected: zero errors; warnings are documented with an owner and disposition.

- [ ] **Step 4: Complete keyboard and responsive behavior**

At 1280×720 and 1920×1080, ensure canvas, palette, inspector and status remain usable. At narrower widths, collapse the inspector into a labeled drawer. Restore `:focus-visible`, provide text alternatives for icon buttons and respect `prefers-reduced-motion`.

- [ ] **Step 5: Run five-person usability protocol**

Record anonymous results for template creation, node addition, patient-state change, error repair, playtest and publish. Pass when at least four of five participants finish within ten minutes without reading character-code documentation and can state whether they made a transport, immune or cooperative case.

- [ ] **Step 6: Run the full gate**

```powershell
npm run typecheck
npm run lint
npm run test:unit
npm run test:component
npm test
npm run build
npm run test:server
```

Expected: every command exits 0, no browser test has an uncaught page error, and the production editor loads without classic editor scripts.

- [ ] **Step 7: Commit**

```powershell
git add src/editor tests/case-designer-manual.spec.js tests/case-designer-official.spec.js docs/qa/case-designer-usability.md docs/qa/case-designer-manual-checklist.md
git commit -m "test: verify manual patient case authoring"
```

---

## Plan Completion Gate

This plan is complete only when:

1. The Vue/TypeScript foundation gate is already complete.
2. `editor.html` contains no editor business logic or inline event handlers.
3. Manual, template, AI and import flows all yield `CaseDraft`.
4. Case mode exposes no Mario-like or platelet tools by default.
5. Every edit, import and AI patch is undoable.
6. Invalid drafts autosave safely but cannot publish or share.
7. Diagnostics locate the exact node/cells and offer only deterministic fixes.
8. RBC, WBC and co-op previews use the typed engine boundary and return reports.
9. `CQ2!` round trips; `CQ!` imports safely into classic mode.
10. The legacy editor runtime is removed only after compatibility tests pass.
11. Six official cases pass the same parser, validation, preview and publishing path.
12. Typecheck, lint, unit, component, Playwright, build and server tests all pass.

## Relationship to Earlier Plans

- Replaces Task 7 of `2026-07-26-core-case-gameplay.md` in full.
- Replaces the editor/client portions of Tasks 8–9 in `2026-07-26-ai-case-director.md`; its server blueprint endpoints remain required.
- Replaces direct `editor.html` changes in Tasks 3 and 5 of `2026-07-26-product-ugc-operations.md` with `CaseCodec`, Vue dialogs and shared services.
- Depends on, but does not replace, the runtime `CaseEngine`, AI director server, story content, product operations and quality-release gates.
- The future Phaser adapter implements the same preview gateway; no Vue component changes when the engine switches.
