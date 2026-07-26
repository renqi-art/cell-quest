# Classic Phaser Parity Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all six classic levels, custom classic levels, actors, hazards, combat, camera, and audio from the legacy Canvas runtime into the typed Phaser runtime, then remove every production dependency on `LegacyGameEngineAdapter`.

**Architecture:** Pure TypeScript modules parse and validate classic level data and own deterministic rule state. Focused Phaser scenes, actors, and systems adapt those rules to Arcade Physics, rendering, input, camera, audio, and `GameEngine` events; Vue receives only commands and low-frequency snapshots.

**Tech Stack:** Vue 3.5, TypeScript 6 strict mode, Vite 8, Phaser 3.90 Arcade Physics, Pinia 4, Vitest 4, Vue Test Utils, Playwright 1.61.

## Global Constraints

- `src/shared` must not import Vue, Pinia, or Phaser.
- Classic simulation uses a 60 Hz fixed step and caps catch-up after long frames.
- Existing classic map characters, six built-in level values, old custom levels, and `CQ!` share codes remain compatible.
- Vue and Phaser communicate only through `GameEngine`, commands, events, and low-frequency snapshots.
- Each behavior is implemented test-first: observe the expected failure, write the minimum implementation, then refactor while green.
- Do not add new features to the legacy runtime.
- Do not silently fall back to Legacy after the Phaser classic route is enabled.
- Preserve user-owned untracked `audit/` and `dist/`; never stage, delete, or overwrite them.
- Keep production dependency versions exact when touched; do not use semver ranges.
- Every task ends with a focused commit and a clean diff limited to the listed files.

## File Map

| Area | Responsibility |
|---|---|
| `src/shared/classic/types.ts` | Engine-independent classic level and parsed entity contracts |
| `src/shared/classic/tiles.ts` | Character whitelist and tile semantics |
| `src/shared/classic/parseClassicLevel.ts` | Pure map/config parser with structured warnings/errors |
| `src/shared/classic/levels/` | Six built-in levels as inert TypeScript data |
| `src/shared/classic/ClassicLevelRepository.ts` | Built-in, local custom, and share-code lookup |
| `src/shared/classic/simulation/` | Fixed step, player, enemy, hazard, combat, spawn, and score rules |
| `src/game/phaser/scenes/ClassicScene.ts` | Classic Scene lifecycle and system composition |
| `src/game/phaser/scenes/CaseScene.ts` | Existing case Scene extracted from the adapter |
| `src/game/phaser/actors/` | Phaser views/bodies for players, enemies, Boss, NPC, items, projectiles |
| `src/game/phaser/systems/` | Terrain, hazards, combat, spawning, camera, HUD snapshots |
| `src/game/phaser/audio/ClassicAudioController.ts` | Music, synthesized/file SFX, unlock, pause, and teardown |
| `src/game/phaser/PhaserGameEngineAdapter.ts` | Mode selection, command routing, and event translation |
| `tests/fixtures/classic/` | Frozen compatibility inputs and expected summaries |
| `tests/unit/classic-*.spec.ts` | Pure-domain behavior tests |
| `tests/unit/phaser-*.spec.ts` | Phaser adapter/system seam tests |
| `tests/classic-phaser.spec.ts` | Browser-level classic gameplay and lifecycle tests |

---

### Task 1: Freeze the classic format and parse it without globals

**Files:**
- Create: `src/shared/classic/types.ts`
- Create: `src/shared/classic/tiles.ts`
- Create: `src/shared/classic/parseClassicLevel.ts`
- Create: `tests/fixtures/classic/minimal-level.ts`
- Create: `tests/unit/classic-level-parser.spec.ts`
- Modify: `docs/migration/behavior-baseline.md`

**Interfaces:**
- Produces: `ClassicLevelDefinition`, `ParsedClassicLevel`, `ClassicSpawn`, `ClassicLevelIssue`
- Produces: `parseClassicLevel(input: unknown): { ok: true; value: ParsedClassicLevel; warnings: readonly ClassicLevelIssue[] } | { ok: false; errors: readonly ClassicLevelIssue[] }`
- Consumes: no browser or Phaser APIs

- [ ] **Step 1: Write the failing parser contract tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseClassicLevel } from '@/shared/classic/parseClassicLevel'
import { MINIMAL_CLASSIC_LEVEL } from '../fixtures/classic/minimal-level'

describe('parseClassicLevel', () => {
  it('separates terrain and spawn descriptors without executing input', () => {
    const result = parseClassicLevel(MINIMAL_CLASSIC_LEVEL)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.playerSpawn).toEqual({ col: 0, row: 1 })
    expect(result.value.finish).toEqual({ col: 4, row: 1 })
    expect(result.value.enemies).toEqual([{ kind: 'staph', col: 2, row: 1 }])
    expect(result.value.tiles[2]).toEqual(['#', '#', '#', '#', '#'])
  })

  it('downgrades an unknown character to empty with a warning', () => {
    const result = parseClassicLevel({ ...MINIMAL_CLASSIC_LEVEL, map: ['P! F', '####'] })
    expect(result.ok && result.warnings).toEqual([
      expect.objectContaining({ code: 'unknown-character', col: 1, row: 0 }),
    ])
  })

  it('rejects missing spawn and finish', () => {
    const result = parseClassicLevel({ ...MINIMAL_CLASSIC_LEVEL, map: ['   ', '###'] })
    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: 'missing-player-spawn' }),
        expect.objectContaining({ code: 'missing-finish' }),
      ]),
    })
  })
})
```

- [ ] **Step 2: Run the focused test and confirm the missing-module failure**

Run: `npm run test:unit -- tests/unit/classic-level-parser.spec.ts`  
Expected: FAIL because `@/shared/classic/parseClassicLevel` does not exist.

- [ ] **Step 3: Add the exact inert contracts and tile registry**

```ts
export type ClassicWinCondition = 'collect-all' | 'kill-all' | 'reach-finish'
export type ClassicEnemyKind = 'staph' | 'staph-large' | 'strep'
export type ClassicItemKind =
  | 'shield' | 'oxygen' | 'complement' | 'coin' | 'food'
  | 'drink' | 'nutrition' | 'atp' | 'memory'

export interface ClassicLevelDefinition {
  readonly id: string
  readonly name: string
  readonly width: number
  readonly cellType: 1 | 2 | 3
  readonly winCondition: ClassicWinCondition
  readonly sky: readonly [string, string]
  readonly map: readonly string[]
  readonly floatPlatforms?: readonly ClassicFloatingPlatformDefinition[]
  readonly pipeSpawners?: readonly ClassicPipeSpawnerDefinition[]
  readonly tutorials?: readonly ClassicTutorialDefinition[]
  readonly knowledgeCards?: readonly ClassicKnowledgeCardDefinition[]
}

export interface ClassicFloatingPlatformDefinition {
  readonly x: number
  readonly y: number
  readonly range: number
  readonly speed: number
  readonly phase?: number
}

export interface ClassicPipeSpawnerDefinition {
  readonly col: number
  readonly row: number
  readonly direction?: 'up' | 'up-jump'
  readonly trigger: 'contact' | 'proximity' | 'timer'
  readonly range?: number
  readonly enemy?: ClassicEnemyKind
  readonly intervalTicks?: number
  readonly maxSpawn?: number
}

export interface ClassicTutorialDefinition {
  readonly x: number
  readonly title: string
  readonly text: string
}

export interface ClassicKnowledgeCardDefinition {
  readonly x: number
  readonly key: string
  readonly title: string
  readonly text: string
}

export interface ClassicSpawn {
  readonly kind: ClassicEnemyKind
  readonly col: number
  readonly row: number
}

export interface ClassicLevelIssue {
  readonly code: string
  readonly message: string
  readonly col?: number
  readonly row?: number
}

export interface ParsedClassicLevel {
  readonly definition: ClassicLevelDefinition
  readonly tiles: readonly (readonly string[])[]
  readonly playerSpawn: { readonly col: number; readonly row: number }
  readonly finish: { readonly col: number; readonly row: number }
  readonly enemies: readonly ClassicSpawn[]
  readonly items: readonly { readonly kind: ClassicItemKind; readonly col: number; readonly row: number }[]
  readonly checkpoints: readonly { readonly col: number; readonly row: number }[]
  readonly bosses: readonly { readonly col: number; readonly row: number }[]
  readonly npcs: readonly { readonly col: number; readonly row: number }[]
  readonly questionBlocks: readonly { readonly col: number; readonly row: number; readonly hidden: boolean }[]
}
```

`tiles.ts` must export a frozen `CLASSIC_TILE_REGISTRY` covering `# = S B p ^ V J _ H` and a frozen entity character registry covering every character listed in the approved spec.

- [ ] **Step 4: Implement a pure, exhaustive parser**

The parser must:

```ts
const normalizedRows = definition.map.map(row => row.padEnd(definition.width, ' ').slice(0, definition.width))
```

It must use `switch` with exhaustive typed descriptor creation, convert unknown characters to `' '`, collect every validation error in one pass, and never call `eval`, `Function`, DOM APIs, storage, or global constructors.

- [ ] **Step 5: Run parser tests, typecheck, and lint**

Run: `npm run test:unit -- tests/unit/classic-level-parser.spec.ts`  
Expected: 3 tests PASS.

Run: `npm run typecheck`  
Expected: exit 0.

Run: `npm run lint`  
Expected: exit 0.

- [ ] **Step 6: Record the measured legacy constants and commit**

Add an explicit table to `docs/migration/behavior-baseline.md` for `TILE`, movement acceleration/max speed/friction, gravity/max fall, jump velocity, coyote frames, jump-buffer frames, dash speed/duration/cooldown, spike damage/invincibility, spring launch speed, camera follow factor, and shake decay. Values must be copied from the current constants, not guessed.

```powershell
git add src/shared/classic tests/fixtures/classic tests/unit/classic-level-parser.spec.ts docs/migration/behavior-baseline.md
git commit -m "feat: add typed classic level parser"
```

---

### Task 2: Convert the six official levels and keep old custom content compatible

**Files:**
- Create: `src/shared/classic/levels/level0-blood.ts`
- Create: `src/shared/classic/levels/level1-wbc.ts`
- Create: `src/shared/classic/levels/level2-alveoli.ts`
- Create: `src/shared/classic/levels/level3-vessel.ts`
- Create: `src/shared/classic/levels/level4-lymph.ts`
- Create: `src/shared/classic/levels/level5-boss.ts`
- Create: `src/shared/classic/levels/officialLevels.ts`
- Create: `src/shared/classic/ClassicLevelRepository.ts`
- Create: `tests/fixtures/classic/official-level-summaries.json`
- Create: `tests/unit/classic-level-repository.spec.ts`
- Modify: `src/editor/services/LegacyCaseImportService.ts`
- Modify: `src/shared/services/CaseCodec.ts`
- Modify: `docs/migration/level-format-compatibility.md`

**Interfaces:**
- Consumes: `ClassicLevelDefinition`, `parseClassicLevel`
- Produces: `OFFICIAL_CLASSIC_LEVELS: readonly ClassicLevelDefinition[]`
- Produces: `ClassicLevelRepository.get(levelId: string): ParsedClassicLevel`
- Produces: `ClassicLevelRepository.importLegacyShareCode(code: string): ParsedClassicLevel`

- [ ] **Step 1: Write failing fixture parity tests**

```ts
it.each([
  ['0', 135, 'collect-all'],
  ['1', 135, 'kill-all'],
  ['2', 135, 'kill-all'],
  ['3', 135, 'collect-all'],
  ['4', 135, 'kill-all'],
  ['5', 135, 'kill-all'],
] as const)('loads official classic level %s', (id, width, winCondition) => {
  const parsed = repository.get(id)
  expect(parsed.definition.width).toBe(width)
  expect(parsed.definition.winCondition).toBe(winCondition)
  expect(parsed.playerSpawn).toBeDefined()
  expect(parsed.finish).toBeDefined()
})
```

Add a frozen legacy custom-level object and a real sanitized `CQ!` sample; assert import → parse → export preserves map rows, cell type, win condition, floating platforms, pipe spawners, tutorial text, and knowledge text.

- [ ] **Step 2: Run and observe missing repository/levels**

Run: `npm run test:unit -- tests/unit/classic-level-repository.spec.ts`  
Expected: FAIL because the repository and official modules do not exist.

- [ ] **Step 3: Move level values into inert TypeScript modules**

Each level module must follow:

```ts
import type { ClassicLevelDefinition } from '../types'

export const LEVEL_0_BLOOD = {
  id: '0',
  name: '血液循环',
  width: 135,
  cellType: 3,
  winCondition: 'collect-all',
  sky: ['#existing-value-1', '#e8a0a0'],
  map: [
    // Copy every existing row byte-for-byte.
  ],
  floatPlatforms: [],
  pipeSpawners: [
    { col: 10, row: 9, direction: 'up-jump', trigger: 'proximity', range: 2 },
    { col: 75, row: 6, direction: 'up', trigger: 'contact' },
  ],
  tutorials: [],
  knowledgeCards: [],
} as const satisfies ClassicLevelDefinition
```

Replace legacy color constants with the exact resolved string values from `js/config.js`. Do not import any legacy `.js` file.

- [ ] **Step 4: Implement repository lookup and safe custom import**

```ts
export class ClassicLevelRepository {
  constructor(
    private readonly builtIns = OFFICIAL_CLASSIC_LEVELS,
    private readonly customSource: () => readonly unknown[] = () => [],
  ) {}

  get(levelId: string): ParsedClassicLevel {
    const input = this.resolveInput(levelId)
    const result = parseClassicLevel(input)
    if (!result.ok) throw new ClassicLevelValidationError(levelId, result.errors)
    return result.value
  }
}
```

The repository uses canonical string ids `0..5`. Existing one-based menu ids are converted exactly once at the Vue/legacy-data boundary by `normalizeClassicMenuLevelId(menuId: number): string`; the repository itself never accepts ambiguous one-based aliases. Custom ids start at `7`. Invalid ids throw `ClassicLevelValidationError`.

- [ ] **Step 5: Verify fixture parity and content safety**

Run: `npm run test:unit -- tests/unit/classic-level-repository.spec.ts tests/unit/legacy-case-import.spec.ts`  
Expected: PASS.

Run: `npm run validate:content`  
Expected: exit 0.

Run: `npm run typecheck && npm run lint`  
Expected: both exit 0.

- [ ] **Step 6: Document compatibility and commit**

Document every character, normalization rule, legacy field mapping, rejection rule, and the fixed samples used in tests.

```powershell
git add src/shared/classic src/editor/services/LegacyCaseImportService.ts src/shared/services/CaseCodec.ts tests/fixtures/classic tests/unit/classic-level-repository.spec.ts docs/migration/level-format-compatibility.md
git commit -m "feat: migrate classic level data to TypeScript"
```

---

### Task 3: Build the deterministic clock and player motor

**Files:**
- Create: `src/shared/classic/simulation/FixedStepClock.ts`
- Create: `src/shared/classic/simulation/PlayerMotor.ts`
- Create: `src/shared/classic/simulation/player-types.ts`
- Create: `tests/unit/classic-fixed-step.spec.ts`
- Create: `tests/unit/classic-player-motor.spec.ts`

**Interfaces:**
- Produces: `FixedStepClock.advance(deltaMs: number, tick: () => void): number`
- Produces: `PlayerMotor.step(state: PlayerMotorState, input: PlayerInputFrame, contacts: PlayerContacts): PlayerMotorResult`
- Produces: `CLASSIC_PLAYER_TUNING`, copied from the approved behavior baseline

- [ ] **Step 1: Write failing fixed-step and player behavior tests**

```ts
it('runs six 60 Hz ticks for 100 ms and caps long-frame catch-up', () => {
  const clock = new FixedStepClock({ hz: 60, maxCatchUpSteps: 8 })
  let ticks = 0
  expect(clock.advance(100, () => { ticks += 1 })).toBe(6)
  expect(ticks).toBe(6)
  expect(clock.advance(10_000, () => { ticks += 1 })).toBe(8)
})

it('honors coyote time, jump buffering, variable jump, crouch clearance, and dash lock', () => {
  const motor = new PlayerMotor(CLASSIC_PLAYER_TUNING)
  const afterDash = motor.step(readyPlayer(), { right: true, dashPressed: true }, groundedContacts())
  expect(afterDash.state.mode).toBe('dashing')
  expect(afterDash.state.velocity.x).toBe(CLASSIC_PLAYER_TUNING.dashSpeed)
  expect(afterDash.state.velocity.y).toBe(0)
})
```

Add numerical assertions for acceleration, friction, max speed, jump apex tick, second jump, early-release height, crouch body height, dash distance/cooldown, and damage invincibility.

- [ ] **Step 2: Run and confirm missing implementations**

Run: `npm run test:unit -- tests/unit/classic-fixed-step.spec.ts tests/unit/classic-player-motor.spec.ts`  
Expected: FAIL because both modules are missing.

- [ ] **Step 3: Implement immutable motor transitions**

```ts
export interface PlayerMotorResult {
  readonly state: PlayerMotorState
  readonly requestedBody: 'standing' | 'crouching'
  readonly events: readonly PlayerMotorEvent[]
}

export class PlayerMotor {
  constructor(private readonly tuning: ClassicPlayerTuning) {}

  step(state: PlayerMotorState, input: PlayerInputFrame, contacts: PlayerContacts): PlayerMotorResult {
    // decrement timers → resolve crouch → resolve dash → horizontal control
    // → buffered/coyote jump → variable jump → gravity → return next state/events
  }
}
```

No method may read `Date.now`, `performance`, Phaser, DOM, storage, `Game`, or keyboard state.

- [ ] **Step 4: Run deterministic tests at 30/60/120 render deltas**

Run: `npm run test:unit -- tests/unit/classic-fixed-step.spec.ts tests/unit/classic-player-motor.spec.ts`  
Expected: all trajectories produce the same final fixed-tick state.

- [ ] **Step 5: Run static checks and commit**

```powershell
npm run typecheck
npm run lint
git add src/shared/classic/simulation tests/unit/classic-fixed-step.spec.ts tests/unit/classic-player-motor.spec.ts
git commit -m "feat: add deterministic classic player simulation"
```

---

### Task 4: Extract the case Scene and add a real Classic Scene route

**Files:**
- Create: `src/game/phaser/scenes/CaseScene.ts`
- Create: `src/game/phaser/scenes/ClassicScene.ts`
- Create: `src/game/phaser/actors/PlayerActor.ts`
- Create: `src/game/phaser/config/classic-physics.ts`
- Create: `src/game/phaser/config/classic-controls.ts`
- Create: `tests/unit/phaser-adapter-routing.spec.ts`
- Create: `tests/unit/phaser-player-actor.spec.ts`
- Modify: `src/game/phaser/PhaserGameEngineAdapter.ts`

**Interfaces:**
- Consumes: `ClassicLevelRepository`, `FixedStepClock`, `PlayerMotor`
- Produces: `createCaseScene(context): Phaser.Types.Scenes.SettingsConfig | typeof Phaser.Scene`
- Produces: `createClassicScene(context): typeof Phaser.Scene`
- Produces: `ClassicScenePort` with `pause`, `resume`, `dispatch`, `snapshot`, `shutdown`

- [ ] **Step 1: Write failing adapter routing tests**

```ts
it('routes loadLevel to classic and loadCaseDraft to case without legacy globals', async () => {
  const adapter = new PhaserGameEngineAdapter(director, { gameFactory, classicLevels })
  await adapter.mount(host)
  await adapter.loadLevel('0', { twoPlayer: false, playerOneCell: 3 })
  expect(gameFactory).toHaveBeenCalledWith(expect.objectContaining({ mode: 'classic' }))
  await adapter.loadCaseDraft(caseDraft, { twoPlayer: false, playerOneCell: 1 })
  expect(gameFactory).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'case' }))
})
```

Test that `retry` reloads the current mode, `quitLevel` destroys the active game once, and `destroy` clears events and pressed actions.

- [ ] **Step 2: Run and observe classic routing failure**

Run: `npm run test:unit -- tests/unit/phaser-adapter-routing.spec.ts tests/unit/phaser-player-actor.spec.ts`  
Expected: FAIL because `loadLevel` still requires a case draft.

- [ ] **Step 3: Extract existing case code without behavior changes**

Move the nested `CaseScene` class out of `PhaserGameEngineAdapter.ts`. Preserve existing node colors, player roles, director ticking, canvas accessibility attributes, events, and tests exactly.

- [ ] **Step 4: Add Classic Scene composition and PlayerActor**

`ClassicScene.create()` must:

```ts
const parsed = context.levels.get(context.levelId)
this.clock = new FixedStepClock({ hz: 60, maxCatchUpSteps: 8 })
this.world = context.worldFactory.create(this, parsed, context.options)
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdownClassic())
```

`PlayerActor` owns the Arcade body and applies `PlayerMotorResult` to velocity/body size. It must not own save, UI, camera, audio, or level lookup.

- [ ] **Step 5: Verify existing case behavior plus new classic bootstrap**

Run: `npm run test:unit -- tests/unit/phaser-scene-model.spec.ts tests/unit/phaser-adapter-routing.spec.ts tests/unit/phaser-player-actor.spec.ts`  
Expected: PASS.

Run: `npm run typecheck && npm run lint`  
Expected: exit 0.

- [ ] **Step 6: Commit the two-mode Phaser foundation**

```powershell
git add src/game/phaser tests/unit/phaser-adapter-routing.spec.ts tests/unit/phaser-player-actor.spec.ts
git commit -m "feat: add Phaser classic scene foundation"
```

---

### Task 5: Migrate terrain, spikes, springs, checkpoints, and platforms

**Files:**
- Create: `src/shared/classic/simulation/HazardRules.ts`
- Create: `src/shared/classic/simulation/CrumblePlatformState.ts`
- Create: `src/game/phaser/systems/TerrainSystem.ts`
- Create: `src/game/phaser/systems/HazardSystem.ts`
- Create: `src/game/phaser/systems/PlatformSystem.ts`
- Create: `tests/unit/classic-hazards.spec.ts`
- Create: `tests/unit/classic-platforms.spec.ts`
- Create: `tests/unit/phaser-terrain-system.spec.ts`
- Modify: `src/game/phaser/scenes/ClassicScene.ts`

**Interfaces:**
- Produces: `DamageEvent`, `SpringEvent`, `CheckpointEvent`
- Produces: `CrumblePlatformState.step(contacted: boolean): CrumblePlatformState`
- Produces: `TerrainSystem.create(parsed): ClassicTerrainGroups`

- [ ] **Step 1: Write failing state and collision-seam tests**

Test exact directional spike hit boxes, damage/invincibility, spring launch velocity, checkpoint idempotence, fall death, crumble transitions, floating platform phase, and temporary platform collision/lifetime.

```ts
expect(stepCrumble({ phase: 'solid', ticks: 0 }, true)).toEqual({
  phase: 'shaking',
  ticks: CLASSIC_PLATFORM_TUNING.crumbleShakeTicks,
})
```

- [ ] **Step 2: Run and confirm missing systems**

Run: `npm run test:unit -- tests/unit/classic-hazards.spec.ts tests/unit/classic-platforms.spec.ts tests/unit/phaser-terrain-system.spec.ts`  
Expected: FAIL on missing modules.

- [ ] **Step 3: Implement domain states and Phaser groups**

Create separate static groups for solids, directional hazards, springs, and checkpoints; create dynamic bodies for floating/crumble/temporary platforms. Route every damage overlap through `HazardSystem.apply(event)` and every spring through a `PlayerActor.launch(yVelocity)` method.

- [ ] **Step 4: Add a vertical-slice Scene test**

Build the minimal fixture in a headless/test Scene and assert player spawn, ground collision, jump, spike damage, spring launch, checkpoint activation, death, and respawn coordinates.

- [ ] **Step 5: Run vertical-slice and regression checks**

Run: `npm run test:unit -- tests/unit/classic-hazards.spec.ts tests/unit/classic-platforms.spec.ts tests/unit/phaser-terrain-system.spec.ts`  
Expected: PASS.

Run: `npm run typecheck && npm run lint && npm run build`  
Expected: all exit 0.

- [ ] **Step 6: Commit**

```powershell
git add src/shared/classic/simulation src/game/phaser/systems src/game/phaser/scenes/ClassicScene.ts tests/unit/classic-hazards.spec.ts tests/unit/classic-platforms.spec.ts tests/unit/phaser-terrain-system.spec.ts
git commit -m "feat: migrate classic terrain and hazards to Phaser"
```

---

### Task 6: Migrate enemies, combat, projectiles, and kill rewards

**Files:**
- Create: `src/shared/classic/simulation/EnemyBrain.ts`
- Create: `src/shared/classic/simulation/CombatRules.ts`
- Create: `src/shared/classic/simulation/ProjectileRules.ts`
- Create: `src/game/phaser/actors/EnemyActor.ts`
- Create: `src/game/phaser/actors/ProjectileActor.ts`
- Create: `src/game/phaser/systems/CombatSystem.ts`
- Create: `tests/unit/classic-enemy-brain.spec.ts`
- Create: `tests/unit/classic-combat.spec.ts`
- Create: `tests/unit/classic-projectile.spec.ts`
- Modify: `src/game/phaser/scenes/ClassicScene.ts`

**Interfaces:**
- Produces: `EnemyBrain.step(state, observation, rng): EnemyDecision`
- Produces: `CombatRules.resolve(event, combatants): CombatResult`
- Produces: `ProjectileRules.step(state, collision): ProjectileResult`
- Consumes: an injectable `RandomSource.next(): number`

- [ ] **Step 1: Write failing enemy and combat tests**

Cover staph patrol/edge turn, large staph HP/death split, strep idle→windup→dash→cooldown, crouch evasion, stomp, dash hit, melee, invincibility, knockback, kill count, seeded XP/equipment drop, projectile lifetime, wall hit, enemy hit, and object return to pool.

```ts
const dash = brain.step(windupAtLastTick(), playerAhead(), fixedRandom(0.5))
expect(dash.state.mode).toBe('dash')
expect(dash.velocity.x).toBe(CLASSIC_ENEMY_TUNING.strepDashSpeed)
```

- [ ] **Step 2: Run and observe missing modules**

Run: `npm run test:unit -- tests/unit/classic-enemy-brain.spec.ts tests/unit/classic-combat.spec.ts tests/unit/classic-projectile.spec.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement typed state machines and single damage entry**

`EnemyActor` translates `EnemyDecision` to body velocity/animation. `CombatSystem` is the only class that mutates health, invincibility, kill/reward state, or projectile activity. Use Phaser Groups with `get`/`killAndHide` for projectiles and spawned mini enemies.

- [ ] **Step 4: Add Scene collision integration tests**

Assert collision groups connect player↔enemy, weapon↔enemy, projectile↔enemy/terrain, and stomp↔enemy exactly once per fixed tick.

- [ ] **Step 5: Verify deterministic combat**

Run the three focused specs twice with the same seed; expected snapshots must be identical. Then run `npm run typecheck && npm run lint`.

- [ ] **Step 6: Commit**

```powershell
git add src/shared/classic/simulation src/game/phaser/actors src/game/phaser/systems/CombatSystem.ts src/game/phaser/scenes/ClassicScene.ts tests/unit/classic-enemy-brain.spec.ts tests/unit/classic-combat.spec.ts tests/unit/classic-projectile.spec.ts
git commit -m "feat: migrate classic enemies and combat to Phaser"
```

---

### Task 7: Migrate items, question blocks, abilities, and HUD statistics

**Files:**
- Create: `src/shared/classic/simulation/ItemRules.ts`
- Create: `src/shared/classic/simulation/ClassicRunStats.ts`
- Create: `src/game/phaser/actors/ItemActor.ts`
- Create: `src/game/phaser/actors/QuestionBlockActor.ts`
- Create: `src/game/phaser/systems/ClassicHudSystem.ts`
- Create: `tests/unit/classic-items.spec.ts`
- Create: `tests/unit/classic-run-stats.spec.ts`
- Modify: `src/game/phaser/actors/PlayerActor.ts`
- Modify: `src/game/phaser/scenes/ClassicScene.ts`
- Modify: `src/shared/types/game.ts`

**Interfaces:**
- Produces: `applyItem(state, item): ItemApplication`
- Produces: `ClassicRunStats.record(event): ClassicRunStats`
- Produces: `ClassicHudSystem.snapshot(): HudSnapshot`

- [ ] **Step 1: Write failing item/stat tests**

Table-test shield, oxygen, complement ammo, coin, food, drink, nutrition, ATP, memory, XP, equipment, full inventory rejection, question-block one-shot output, ability cooldowns, completion percentage, stars, kills, items, deaths, and elapsed time.

- [ ] **Step 2: Run and observe missing rules**

Run: `npm run test:unit -- tests/unit/classic-items.spec.ts tests/unit/classic-run-stats.spec.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement item rules and Phaser actors**

Each item actor emits a typed collection event and disables itself; it does not write Pinia/storage. `QuestionBlockActor` tracks `unused | hit | used` and requests an item from the configured deterministic table.

- [ ] **Step 4: Emit bounded HUD snapshots**

Emit `hud-updated` at 10 Hz or on meaningful state changes, never on every render frame. Extend `HudSnapshot` only with optional typed fields required by the existing Vue HUD; keep existing case consumers source-compatible.

- [ ] **Step 5: Run unit, component, and static checks**

Run: `npm run test:unit -- tests/unit/classic-items.spec.ts tests/unit/classic-run-stats.spec.ts`  
Run: `npm run test:component`  
Run: `npm run typecheck && npm run lint`  
Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/shared/classic src/shared/types/game.ts src/game/phaser/actors src/game/phaser/systems/ClassicHudSystem.ts src/game/phaser/scenes/ClassicScene.ts tests/unit/classic-items.spec.ts tests/unit/classic-run-stats.spec.ts
git commit -m "feat: migrate classic items and run statistics"
```

---

### Task 8: Migrate tide, pipe spawning, NPC, and Boss

**Files:**
- Create: `src/shared/classic/simulation/TideState.ts`
- Create: `src/shared/classic/simulation/PipeSpawnerState.ts`
- Create: `src/shared/classic/simulation/BossBrain.ts`
- Create: `src/game/phaser/actors/BossActor.ts`
- Create: `src/game/phaser/actors/NpcActor.ts`
- Create: `src/game/phaser/systems/TideSystem.ts`
- Create: `src/game/phaser/systems/SpawnSystem.ts`
- Create: `tests/unit/classic-tide.spec.ts`
- Create: `tests/unit/classic-pipe-spawner.spec.ts`
- Create: `tests/unit/classic-boss.spec.ts`
- Modify: `src/game/phaser/scenes/ClassicScene.ts`

**Interfaces:**
- Produces: `TideState.step(paused: boolean): TideResult`
- Produces: `PipeSpawnerState.step(trigger, activeCount): PipeSpawnDecision`
- Produces: `BossBrain.step(state, observation, rng): BossDecision`

- [ ] **Step 1: Write failing world/Boss state tests**

Cover tide normal/warning/surge/pause, healing reduction, contact/proximity/timer pipe triggers, interval/max count, Boss encounter gate, phases at 70%/30%, shield, ring, leukocidin, summon, shock, biofilm regeneration/interruption, NPC interaction, Boss death, and locked finish.

- [ ] **Step 2: Run and confirm missing modules**

Run: `npm run test:unit -- tests/unit/classic-tide.spec.ts tests/unit/classic-pipe-spawner.spec.ts tests/unit/classic-boss.spec.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement pure state machines**

Use fixed tick counters and injected randomness only. Boss decisions emit typed effects; `BossActor` and `SpawnSystem` materialize them. No Boss method may access `Game`, DOM, audio, Vue, or storage.

- [ ] **Step 4: Integrate special systems and completion gate**

`ClassicScene` updates tide/spawn/Boss once per fixed tick. The finish overlap calls one `canCompleteClassicLevel(stats, world)` rule that enforces `collect-all`, `kill-all`, Boss death, or `reach-finish`.

- [ ] **Step 5: Run six-level reachability smoke setup**

For every official parsed level, create/destroy a Classic Scene and assert all configured entity/spawn descriptors are consumed without an unknown kind or uncaught error.

Run: `npm run test:unit -- tests/unit/classic-tide.spec.ts tests/unit/classic-pipe-spawner.spec.ts tests/unit/classic-boss.spec.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/shared/classic/simulation src/game/phaser/actors/BossActor.ts src/game/phaser/actors/NpcActor.ts src/game/phaser/systems src/game/phaser/scenes/ClassicScene.ts tests/unit/classic-tide.spec.ts tests/unit/classic-pipe-spawner.spec.ts tests/unit/classic-boss.spec.ts
git commit -m "feat: migrate classic world systems and boss"
```

---

### Task 9: Add two-player input and the dynamic camera

**Files:**
- Create: `src/shared/classic/simulation/CameraDirector.ts`
- Create: `src/game/phaser/systems/ClassicInputRouter.ts`
- Create: `src/game/phaser/systems/CameraSystem.ts`
- Create: `tests/unit/classic-camera-director.spec.ts`
- Create: `tests/unit/phaser-input-router.spec.ts`
- Modify: `src/game/phaser/scenes/ClassicScene.ts`
- Modify: `src/game/phaser/PhaserGameEngineAdapter.ts`

**Interfaces:**
- Produces: `computeCameraTarget(players, viewport, world, previous): CameraDirective`
- Produces: `ClassicInputRouter.frame(player: 1 | 2): PlayerInputFrame`
- Consumes: existing `GameCommand` input actions and `LoadLevelOptions`

- [ ] **Step 1: Write failing input/camera tests**

Test P1/P2 independence, keyboard plus dispatched commands, role swap, single-player smoothing, two-player bounding center, min/max zoom, world clamping, shake priority/decay, pause freeze, respawn snap, and reduced-motion shake scale.

- [ ] **Step 2: Run and observe missing modules**

Run: `npm run test:unit -- tests/unit/classic-camera-director.spec.ts tests/unit/phaser-input-router.spec.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement pure camera directives and Phaser application**

```ts
export interface CameraDirective {
  readonly centerX: number
  readonly centerY: number
  readonly zoom: number
  readonly shake: { readonly durationMs: number; readonly intensity: number } | null
  readonly snap: boolean
}
```

`CameraSystem` applies only camera state and never repositions physics bodies. `ClassicInputRouter.shutdown()` removes every keyboard and external subscription.

- [ ] **Step 4: Integrate two PlayerActors and role swapping**

Create player 2 only when `options.twoPlayer`; maintain independent health, input, and abilities. Swap role/cell assignments through an explicit Scene method while preserving player indexes and positions.

- [ ] **Step 5: Verify tests and lifecycle counters**

Run: `npm run test:unit -- tests/unit/classic-camera-director.spec.ts tests/unit/phaser-input-router.spec.ts`  
Run: `npm run test:component`  
Run: `npm run typecheck && npm run lint`  
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/shared/classic/simulation/CameraDirector.ts src/game/phaser/systems src/game/phaser/scenes/ClassicScene.ts src/game/phaser/PhaserGameEngineAdapter.ts tests/unit/classic-camera-director.spec.ts tests/unit/phaser-input-router.spec.ts
git commit -m "feat: add classic co-op and dynamic camera"
```

---

### Task 10: Migrate complete classic audio and event-driven effects

**Files:**
- Create: `src/game/phaser/audio/classic-audio-events.ts`
- Create: `src/game/phaser/audio/ClassicAudioController.ts`
- Create: `src/game/phaser/systems/ClassicEffectsSystem.ts`
- Create: `tests/unit/classic-audio.spec.ts`
- Create: `tests/unit/classic-effects.spec.ts`
- Modify: `src/game/phaser/scenes/ClassicScene.ts`
- Modify: `src/game/styles/motion.css`

**Interfaces:**
- Produces: `ClassicAudioController.handle(event: ClassicAudioEvent): void`
- Produces: `ClassicAudioController.unlock(): Promise<boolean>`
- Produces: `ClassicAudioController.pause/resume/destroy`
- Consumes: typed actor/world events only

- [ ] **Step 1: Write failing audio mapping and teardown tests**

Assert every required event has a file or oscillator definition; music changes per level; pause/resume are idempotent; destroy stops all nodes/sounds; unlock failure emits a nonfatal status; repeated Scene creation does not grow active audio nodes.

- [ ] **Step 2: Run and observe missing audio controller**

Run: `npm run test:unit -- tests/unit/classic-audio.spec.ts tests/unit/classic-effects.spec.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement audio definitions and controller**

Copy the existing waveform, frequency, duration, and gain values from `Sfx` into frozen typed definitions. Use Phaser Sound for files and a Scene-owned Web Audio synthesizer only where the legacy sound is synthesized. Register the first-interaction unlock handler once and remove it on destroy.

- [ ] **Step 4: Implement event-driven particles/animations**

Effects subscribe to jump, dash, hit, death, pickup, spring, tide, checkpoint, Boss phase, and completion events. `prefers-reduced-motion` scales camera shake and cosmetic particle counts but leaves collision/timing unchanged.

- [ ] **Step 5: Verify mapping completeness and build**

Run: `npm run test:unit -- tests/unit/classic-audio.spec.ts tests/unit/classic-effects.spec.ts`  
Run: `npm run typecheck && npm run lint && npm run build`  
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/game/phaser/audio src/game/phaser/systems/ClassicEffectsSystem.ts src/game/phaser/scenes/ClassicScene.ts src/game/styles/motion.css tests/unit/classic-audio.spec.ts tests/unit/classic-effects.spec.ts
git commit -m "feat: migrate classic audio and effects"
```

---

### Task 11: Switch Vue and editor preview to Phaser-only classic execution

**Files:**
- Create: `src/editor/services/PhaserEditorPreviewAdapter.ts`
- Create: `tests/unit/PhaserEditorPreviewAdapter.spec.ts`
- Modify: `src/game/GameApp.vue`
- Modify: `src/game/services/PreviewBootstrap.ts`
- Modify: `src/editor/stores/case-editor.ts`
- Modify: `src/game/main.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `tests/unit/preview-bootstrap.spec.ts`
- Modify: `tests/component/CaseEditorDialogs.spec.ts`

**Interfaces:**
- Consumes: `PhaserGameEngineAdapter.loadLevel` and existing `GameEngine`
- Produces: editor preview session with explicit `mount`, `load`, and `destroy`
- Removes: production selection of `LegacyGameEngineAdapter`

- [ ] **Step 1: Write failing Vue/bootstrap cutover tests**

Assert game bootstrap always constructs Phaser, classic menu invokes `loadLevel`, case flow invokes `loadCaseDraft`, editor preview uses the Phaser adapter, preview close destroys the Scene, and no test fixture needs `window.CellQuestLegacy`.

- [ ] **Step 2: Run and confirm legacy selection is still observed**

Run: `npm run test:unit -- tests/unit/PhaserEditorPreviewAdapter.spec.ts tests/unit/preview-bootstrap.spec.ts`  
Run: `npm run test:component -- tests/component/CaseEditorDialogs.spec.ts`  
Expected: FAIL on Legacy expectations.

- [ ] **Step 3: Implement Phaser-only bootstrap and editor preview**

Remove `LegacyGameEngineAdapter` imports from Vue/editor production code. Parse editor classic output through `ClassicLevelRepository`/the same validation path before calling the Phaser engine. Show structured validation errors in the existing dialog.

- [ ] **Step 4: Add browser smoke coverage before deleting legacy files**

Add Playwright flows for classic level entry, pause/resume, exit/reentry, editor preview open/close/reopen, and no `pageerror`/console error.

- [ ] **Step 5: Verify app/component/browser cutover**

Run: `npm run test:unit`  
Run: `npm run test:component`  
Run: `npm test -- tests/classic-phaser.spec.ts`  
Run: `npm run typecheck && npm run lint && npm run build`  
Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/game src/editor src/vite-env.d.ts tests/unit tests/component tests/classic-phaser.spec.ts
git commit -m "feat: switch classic runtime and preview to Phaser"
```

---

### Task 12: Prove six-level parity, remove legacy runtime, and reopen release gates

**Files:**
- Create: `tests/classic-phaser.spec.ts`
- Create: `tests/classic-phaser-lifecycle.spec.ts`
- Create: `tests/fixtures/classic/legacy-custom-level.json`
- Modify: `index.html`
- Modify: `editor.html`
- Modify: `deck.html`
- Modify: `server.js`
- Modify: `scripts/report-tests.cjs`
- Modify: `scripts/package-offline.cjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/migration/phaser-spike-results.md`
- Modify: `docs/migration/rollout-checklist.md`
- Modify: `docs/migration/rollback-guide.md`
- Modify: `docs/evidence/TEST_REPORT.md`
- Modify: `docs/evidence/FINAL_ACCEPTANCE_REPORT.md`
- Delete only after zero-consumer proof: `src/game/bridge/LegacyGameEngineAdapter.ts`
- Delete only after zero-consumer proof: `src/editor/services/LegacyEditorPreviewAdapter.ts`
- Delete only after production/static zero-consumer proof: obsolete runtime files under `js/`

**Interfaces:**
- Consumes: complete Phaser classic runtime
- Produces: enforceable test/evidence gates bound to the candidate SHA
- Removes: `LegacyGameEngineAdapter`, `window.CellQuestLegacy`, ordered classic script loading

- [ ] **Step 1: Write the final browser matrix before cleanup**

`tests/classic-phaser.spec.ts` must parameterize all six official ids and assert: Phaser canvas marker, spawn, one level-specific mechanic, reachable completion route or deterministic test fixture route, correct result, and no uncaught errors. Add representative two-player role swap, death/checkpoint/retry, old custom level, `CQ!`, editor preview, pause/exit/reentry, and audio-unlock-denied cases.

`tests/classic-phaser-lifecycle.spec.ts` must enter/exit ten times and assert one active canvas, one active Scene, bounded listener counts, no duplicate key response, and no active audio from destroyed Scenes.

- [ ] **Step 2: Run the matrix against the still-present legacy files**

Run: `npm test -- tests/classic-phaser.spec.ts tests/classic-phaser-lifecycle.spec.ts`  
Expected: PASS while production routes already use Phaser only.

- [ ] **Step 3: Prove zero consumers and remove obsolete entries**

Run:

```powershell
rg -n "LegacyGameEngineAdapter|LegacyEditorPreviewAdapter|CellQuestLegacy|window\\.Game|\\bGame\\." src index.html editor.html deck.html
rg -n "<script[^>]+js/(config|levels|entities|game|editor)" index.html editor.html deck.html
```

Expected before deletion: zero production consumers; test-only legacy references must be listed and either converted to fixed fixtures or deleted. Then remove only files proven unreachable from HTML, Vite inputs, server routes, tests, and offline packaging.

- [ ] **Step 4: Run all automated release gates from a clean candidate worktree**

Run in order:

```powershell
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run test:component
npm run test:director
npm run test:server
npm run test:content
npm run test:evidence
npm run test:offline
npm test
npm run validate:content
npm run build
npm run report:tests
```

Expected: every command exits 0, reports the exact candidate SHA, and contains no skipped critical classic test.

- [ ] **Step 5: Perform and record manual parity QA**

On the exact candidate SHA, record six single-player runs, one representative two-player role-swap run, one old custom-level run, one `CQ!` run, audio/background music checks, camera checks, death/checkpoint/retry, pause/exit/reentry, and editor preview. Update the rollout, rollback, test, and final acceptance documents with actual evidence paths and results.

- [ ] **Step 6: Verify final architecture and package**

Run:

```powershell
rg -n "LegacyGameEngineAdapter|LegacyEditorPreviewAdapter|CellQuestLegacy|window\\.Game|\\bGame\\." src index.html editor.html deck.html
npm run package:offline
npm audit --omit=dev
git status --short
```

Expected: static search returns no production legacy runtime dependency; offline package succeeds; production audit reports zero vulnerabilities; only known user-owned `audit/` and `dist/` remain outside the intended commit.

Before the build, replace the current Phaser range with the exact installed version:

```json
"phaser": "3.90.0"
```

- [ ] **Step 7: Commit the release candidate**

```powershell
git add index.html editor.html deck.html server.js package.json package-lock.json src tests scripts docs/migration docs/evidence
git commit -m "feat: complete classic Phaser parity migration"
```

Do not stage root `audit/` or root `dist/`. Record the resulting SHA in a freshly generated final acceptance report before declaring `RELEASE APPROVED`.

