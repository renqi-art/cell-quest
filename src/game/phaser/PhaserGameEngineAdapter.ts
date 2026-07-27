import Phaser from 'phaser'
import type { GameEngine } from '@/game/bridge/GameEngine'
import { GameEngineEvents } from '@/game/bridge/GameEngineEvents'
import type { GameEngineEventMap } from '@/shared/types/events'
import type { GameCommand, LoadLevelOptions, PlayerAction } from '@/shared/types/game'
import type { CaseDraft } from '@/shared/models/case-draft'
import { CaseEngine } from '@/shared/domain/CaseEngine'
import { CaseDirectorClient } from '@/game/services/CaseDirectorClient'
import type { DirectorContext } from '@/shared/types/director'
import { buildPhaserSceneModel, type PhaserSceneModel } from './buildPhaserSceneModel'
import { ClassicLevelRepository } from '@/shared/classic/ClassicLevelRepository'
import { OFFICIAL_CLASSIC_LEVELS } from '@/shared/classic/levels/officialLevels'
import { CLASSIC_SCENE_KEY, createClassicScene } from './scenes/ClassicScene'

const NODE_COLORS: Record<PhaserSceneModel['nodes'][number]['kind'], number> = {
  'oxygen-source': 0x4fc3f7,
  'target-tissue': 0xffb74d,
  'infection-site': 0xef5350,
  checkpoint: 0xffeb3b,
  knowledge: 0xab47bc,
}

export interface PhaserGameEngineAdapterOptions {
  readonly gameFactory?: (config: Phaser.Types.Core.GameConfig) => Phaser.Game
  readonly classicLevels?: ClassicLevelRepository
}

export class PhaserGameEngineAdapter implements GameEngine {
  private readonly events = new GameEngineEvents()
  private host: HTMLElement | null = null
  private game: Phaser.Game | null = null
  private draft: CaseDraft | null = null
  private options: LoadLevelOptions = { twoPlayer: false, playerOneCell: 1 }
  private caseEngine: CaseEngine | null = null
  private readonly pressed = new Map<1 | 2, Set<PlayerAction>>([[1, new Set()], [2, new Set()]])
  private readonly playerCells = new Map<1 | 2, 1 | 2>()
  private terminalEmitted = false
  private directorPhase: 0 | 1 | 2 = 0
  private directorPending = false
  private directorRunId = ''

  private readonly gameFactory: (config: Phaser.Types.Core.GameConfig) => Phaser.Game
  private readonly classicLevels: ClassicLevelRepository
  private activeMode: 'classic' | 'case' | null = null
  private activeSceneKey = 'case-runtime'
  private classicLevelId: string | null = null

  constructor(
    private readonly directorClient: Pick<CaseDirectorClient, 'nextPlan'> = new CaseDirectorClient(),
    options: PhaserGameEngineAdapterOptions = {},
  ) {
    this.gameFactory = options.gameFactory ?? (config => new Phaser.Game(config))
    this.classicLevels = options.classicLevels ?? new ClassicLevelRepository(OFFICIAL_CLASSIC_LEVELS)
  }

  async mount(host: HTMLElement): Promise<void> {
    this.host = host
  }

  destroy(): void {
    this.game?.destroy(true)
    this.game = null
    this.caseEngine = null
    this.draft = null
    this.pressed.forEach(actions => actions.clear())
    this.directorPhase = 0
    this.directorPending = false
    this.events.clear()
  }

  async loadLevel(levelId: string, options: LoadLevelOptions): Promise<void> {
    if (!this.host) throw new Error('Phaser adapter must be mounted before loading a classic level')
    const level = this.classicLevels.get(levelId)
    this.game?.destroy(true)
    this.pressed.forEach(actions => actions.clear())
    this.draft = null
    this.caseEngine = null
    this.options = options
    this.activeMode = 'classic'
    this.activeSceneKey = CLASSIC_SCENE_KEY
    this.classicLevelId = levelId
    const Scene = createClassicScene({ level, options, pressed: this.pressed, events: this.events })
    this.game = this.gameFactory({
      type: Phaser.CANVAS,
      parent: this.host,
      width: 800,
      height: 480,
      backgroundColor: level.definition.sky[0],
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [Scene],
    })
  }

  async loadCaseDraft(draft: CaseDraft, options: LoadLevelOptions, classicLevelId?: string): Promise<void> {
    if (!this.host) throw new Error('Phaser adapter must be mounted before loading a case')
    if (!draft.caseConfig) throw new Error('Phaser case runtime requires caseConfig')

    // Classic level mode: load the full classic level scene, then overlay case mechanics
    if (classicLevelId) {
      await this.loadClassicLevelScene(classicLevelId, options)
      this.draft = draft
      this.activeMode = 'case'
      this.activeSceneKey = CLASSIC_SCENE_KEY
      this.classicLevelId = classicLevelId
      this.playerCells.set(1, options.playerOneCell === 2 ? 2 : 1)
      if (options.twoPlayer) this.playerCells.set(2, options.playerTwoCell === 1 ? 1 : 2)
      else this.playerCells.delete(2)
      this.caseEngine = new CaseEngine(draft.caseConfig)
      this.terminalEmitted = false
      this.directorPhase = 0
      this.directorPending = false
      this.directorRunId = `phaser-${draft.id}-${Date.now().toString(36)}`
      this.overlayCaseNodesOnClassicScene(draft)
      this.events.emit('case-updated', this.caseEngine.getSnapshot())
      if (draft.caseConfig.allowedEvents.length > 0) void this.requestDirector(1)
      return
    }

    // Standalone case scene (editor preview) — not supported yet
    throw new Error('Case requires classicLevelId')
  }

  private async loadClassicLevelScene(levelId: string, options: LoadLevelOptions): Promise<void> {
    const level = this.classicLevels.get(levelId)
    this.game?.destroy(true)
    this.pressed.forEach(actions => actions.clear())
    this.options = options

    return new Promise<void>((resolve) => {
      const Scene = createClassicScene({ level, options, pressed: this.pressed, events: this.events })
      // Wrap the scene to resolve the promise after create() runs
      const BootstrappedScene = class extends (Scene as new (...args: unknown[]) => Phaser.Scene & { create(): void }) {
        override create(): void {
          super.create()
          resolve()
        }
      }
      this.game = this.gameFactory({
        type: Phaser.CANVAS,
        parent: this.host!,
        width: 800,
        height: 480,
        backgroundColor: level.definition.sky[0],
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [BootstrappedScene],
      })
    })
  }

  private overlayCaseNodesOnClassicScene(draft: CaseDraft): void {
    const scene = this.game!.scene.getScene(CLASSIC_SCENE_KEY)
    if (!scene) return
    const TILE = 12
    const caseEngine = this.caseEngine!
    const adapterPlayerCell = (index: 1 | 2): 1 | 2 => this.playerCells.get(index) ?? 1

    for (const node of draft.nodes) {
      if (node.kind === 'spawn') continue
      const gfx = scene.add.graphics()
      const cx = node.x * TILE + TILE / 2
      const cy = node.y * TILE
      const r = TILE * 0.45

      switch (node.kind) {
        case 'oxygen-source':
          gfx.fillStyle(0x4fc3f7, 1); gfx.fillCircle(cx, cy, r)
          gfx.lineStyle(2, 0xffffff, 0.6); gfx.strokeCircle(cx, cy, r)
          gfx.fillStyle(0xffffff, 0.6); gfx.fillCircle(cx, cy, r * 0.3)
          break
        case 'target-tissue':
          gfx.fillStyle(0xffb74d, 1); gfx.fillCircle(cx, cy, r)
          gfx.lineStyle(2, 0xffffff, 0.6); gfx.strokeCircle(cx, cy, r)
          gfx.lineStyle(1, 0xffffff, 0.6)
          gfx.lineBetween(cx - r * 0.5, cy, cx + r * 0.5, cy)
          gfx.lineBetween(cx, cy - r * 0.5, cx, cy + r * 0.5)
          break
        case 'infection-site':
          gfx.fillStyle(0xef5350, 1); gfx.fillCircle(cx, cy, r)
          gfx.lineStyle(2, 0xffffff, 0.5); gfx.strokeCircle(cx, cy, r)
          gfx.fillStyle(0x000000, 0.4); gfx.fillCircle(cx, cy, r * 0.35)
          break
        default:
          gfx.fillStyle(0x888888, 0.5); gfx.fillCircle(cx, cy, r)
      }
      gfx.setDepth(5)

      // Pulse animation
      scene.tweens.add({
        targets: gfx, alpha: 0.7, duration: 800,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      })

      // Store node data for overlap detection
      ;(gfx as unknown as Record<string, unknown>).caseNode = node

      // Poll-based overlap: check in tick callback
      const updateLoop = scene.time.addEvent({
        delay: 200, loop: true,
        callback: () => {
          if (!caseEngine?.isActive()) return
          // Check if any player is near this node via scene children
          const p1 = scene.children.getByName('player-1') as Phaser.GameObjects.GameObject | null
          if (!p1) return
          const dist = Phaser.Math.Distance.Between(
            (p1 as Phaser.GameObjects.Sprite).x ?? (p1 as unknown as { x: number }).x ?? 0,
            (p1 as Phaser.GameObjects.Sprite).y ?? (p1 as unknown as { y: number }).y ?? 0,
            cx, cy,
          )
          if (dist > TILE * 1.5) return

          const cell = adapterPlayerCell(1)
          if (node.kind === 'oxygen-source' && cell === 1) {
            const p = (scene as unknown as Record<string, unknown>)._p1Carry as { o2: boolean } | undefined
            if (p) p.o2 = true
            gfx.setAlpha(0.35)
          }
          if (node.kind === 'target-tissue' && cell === 1) {
            const p = (scene as unknown as Record<string, unknown>)._p1Carry as { o2: boolean } | undefined
            if (p?.o2 && caseEngine.dispatch({ type: 'oxygenDelivered', amount: 12, nodeId: node.id, source: 'player' })) {
              if (p) p.o2 = false
            }
          }
          if (node.kind === 'infection-site' && cell === 2) {
            if (caseEngine.dispatch({ type: 'infectionCleared', amount: 20, nodeId: node.id, source: 'player' })) {
              gfx.setAlpha(0.2)
            }
          }
        },
      })

      // Store timer for cleanup
      ;(gfx as unknown as Record<string, unknown>)._caseTimer = updateLoop
    }
  }

  private tick(deltaMs: number): void {
    if (!this.caseEngine?.isActive()) return
    const crisisBefore = this.caseEngine.getCrisisSnapshot()
    this.caseEngine.update(Math.min(deltaMs, 100) / 1000)
    const crisisAfter = this.caseEngine.getCrisisSnapshot()
    if (crisisBefore && !crisisAfter && this.directorPhase === 1 && !this.directorPending) void this.requestDirector(2)
    const snapshot = this.caseEngine.getSnapshot()
    this.events.emit('case-updated', snapshot)
    if (this.terminalEmitted) return
    if (snapshot.status === 'complete') {
      this.terminalEmitted = true
      this.events.emit('case-completed', this.caseEngine.buildResult())
      this.events.emit('state-changed', 'complete')
    } else if (snapshot.status === 'failed') {
      this.terminalEmitted = true
      this.events.emit('case-failed', this.caseEngine.buildResult())
      this.events.emit('state-changed', 'dead')
    }
  }

  private async requestDirector(phase: 1 | 2): Promise<void> {
    const engineAtRequest = this.caseEngine
    const config = this.draft?.caseConfig
    if (!engineAtRequest || !config || this.directorPending || this.directorPhase >= phase) return
    const validTargetNodes = Array.from(new Set([
      ...config.goals.oxygenRoutes.flatMap(route => route.targetIds),
      ...config.goals.infection.nodeIds,
    ]))
    if (config.allowedEvents.length === 0 || validTargetNodes.length === 0) return
    const snapshot = engineAtRequest.getSnapshot()
    const context: DirectorContext = {
      schemaVersion: 1,
      levelId: this.draft!.id,
      mode: config.primaryCell === 'coop' ? 'coop' : 'single',
      primaryCell: config.primaryCell === 'wbc' ? 'wbc' : 'rbc',
      phase,
      runId: this.directorRunId,
      vitals: snapshot.vitals,
      performance: { deaths: 0, elapsedMs: snapshot.elapsedMs },
      allowedEvents: config.allowedEvents,
      validTargetNodes,
    }
    this.directorPending = true
    this.events.emit('director-pending', true)
    try {
      const decision = await this.directorClient.nextPlan(context)
      if (this.caseEngine !== engineAtRequest || !engineAtRequest.startCrisis(decision.plan, decision.source)) return
      this.directorPhase = phase
      this.events.emit('director-decision', { ...decision, phase, requestedAt: new Date().toISOString() })
    } finally {
      this.directorPending = false
      this.events.emit('director-pending', false)
    }
  }

  pause(): void { this.game?.scene.pause(this.activeSceneKey); this.events.emit('state-changed', 'paused') }
  resume(): void { this.game?.scene.resume(this.activeSceneKey); this.events.emit('state-changed', 'playing') }
  retry(): void {
    if (this.activeMode === 'classic' && this.classicLevelId) void this.loadLevel(this.classicLevelId, this.options)
    else if (this.draft) void this.loadCaseDraft(this.draft, this.options)
  }
  quitLevel(): void { this.game?.destroy(true); this.game = null; this.events.emit('state-changed', 'hub') }
  setTwoPlayer(enabled: boolean): void { this.options = { ...this.options, twoPlayer: enabled } }
  swapPlayerRoles(): void {
    if (!this.options.twoPlayer) return
    if (this.activeMode === 'classic') {
      const first = this.options.playerOneCell ?? 1
      const second = this.options.playerTwoCell ?? 1
      this.options = { ...this.options, playerOneCell: second, playerTwoCell: first }
      const scene = this.game?.scene.getScene(CLASSIC_SCENE_KEY) as unknown as { swapPlayerRoles?: () => void } | undefined
      scene?.swapPlayerRoles?.()
      return
    }
    const first = this.playerCells.get(1) ?? 1
    const second = this.playerCells.get(2) ?? 2
    this.playerCells.set(1, second)
    this.playerCells.set(2, first)
    this.options = { ...this.options, playerOneCell: second, playerTwoCell: first }
    const scene = this.game?.scene.getScene('case-runtime')
    const playerOne = scene?.children.getByName('player-1') as Phaser.GameObjects.Arc | null
    const playerTwo = scene?.children.getByName('player-2') as Phaser.GameObjects.Arc | null
    playerOne?.setFillStyle(second === 1 ? 0xe84b5f : 0x7bc7ff)
    playerTwo?.setFillStyle(first === 1 ? 0xe84b5f : 0x7bc7ff)
    if (this.game?.canvas) this.game.canvas.dataset.playerRoles = second === 1 ? 'rbc,wbc' : 'wbc,rbc'
  }
  dispatch(command: GameCommand): void {
    if (command.type === 'pause') return this.pause()
    if (command.type === 'resume') return this.resume()
    if (command.type !== 'input') return
    const actions = this.pressed.get(command.player)
    if (!actions) return
    if (command.pressed) actions.add(command.action)
    else actions.delete(command.action)
  }
  subscribe<K extends keyof GameEngineEventMap>(event: K, listener: GameEngineEventMap[K]): () => void {
    return this.events.subscribe(event, listener)
  }
}
