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

  async loadCaseDraft(draft: CaseDraft, options: LoadLevelOptions): Promise<void> {
    if (!this.host) throw new Error('Phaser adapter must be mounted before loading a case')
    if (!draft.caseConfig) throw new Error('Phaser case runtime requires caseConfig')
    this.game?.destroy(true)
    this.pressed.forEach(actions => actions.clear())
    this.draft = draft
    this.options = options
    this.activeMode = 'case'
    this.activeSceneKey = 'case-runtime'
    this.classicLevelId = null
    this.playerCells.set(1, options.playerOneCell === 2 ? 2 : 1)
    if (options.twoPlayer) this.playerCells.set(2, options.playerTwoCell === 1 ? 1 : 2)
    else this.playerCells.delete(2)
    this.caseEngine = new CaseEngine(draft.caseConfig)
    this.terminalEmitted = false
    this.directorPhase = 0
    this.directorPending = false
    this.directorRunId = `phaser-${draft.id}-${Date.now().toString(36)}`
    const model = buildPhaserSceneModel(draft)
    const events = this.events
    const caseEngine = this.caseEngine
    const pressed = this.pressed
    const tickRuntime = (deltaMs: number) => this.tick(deltaMs)
    const adapterPlayerCell = (index: 1 | 2): 1 | 2 => this.playerCells.get(index) ?? 1

    await new Promise<void>((resolve, reject) => {
      class CaseScene extends Phaser.Scene {
        private players: Array<{ index: 1 | 2; shape: Phaser.GameObjects.Arc; body: Phaser.Physics.Arcade.Body; carryingOxygen: boolean }> = []
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
        private wasd!: Record<'W' | 'A' | 'D', Phaser.Input.Keyboard.Key>

        constructor() { super('case-runtime') }

        create(): void {
          try {
            this.cameras.main.setBackgroundColor('#07101f')
            this.physics.world.setBounds(0, 0, model.worldWidth, model.worldHeight)
            const platforms = this.physics.add.staticGroup()
            for (const tile of model.solids) {
              const rectangle = this.add.rectangle(
                tile.x * model.tileSize + model.tileSize / 2,
                tile.y * model.tileSize + model.tileSize / 2,
                model.tileSize,
                model.tileSize,
                tile.tile === '#' ? 0x253a5c : 0x275f4b,
              )
              platforms.add(rectangle)
            }
            this.players.push(this.createPlayer(1, model.spawn.x, model.spawn.y, this.playerColor(1), platforms))
            if (options.twoPlayer) this.players.push(this.createPlayer(2, model.spawn.x + 1, model.spawn.y, this.playerColor(2), platforms))
            this.cursors = this.input.keyboard!.createCursorKeys()
            this.wasd = this.input.keyboard!.addKeys('W,A,D') as Record<'W' | 'A' | 'D', Phaser.Input.Keyboard.Key>

            for (const node of model.nodes) this.createNode(node, model.tileSize)
            this.add.text(14, 12, draft.metadata.title || '病例试玩', {
              color: '#edf5ff', fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '16px',
            }).setScrollFactor(0)
            const canvas = this.game.canvas
            canvas.setAttribute('role', 'application')
            canvas.setAttribute('aria-label', `${draft.metadata.title} Phaser 病例场景`)
            canvas.dataset.playerCount = String(this.players.length)
            canvas.dataset.playerRoles = options.twoPlayer ? 'rbc,wbc' : (options.playerOneCell === 2 ? 'wbc' : 'rbc')
            events.emit('state-changed', 'playing')
            events.emit('case-updated', caseEngine!.getSnapshot())
            resolve()
          } catch (cause) {
            reject(cause)
          }
        }

        private createPlayer(index: 1 | 2, tileX: number, tileY: number, color: number, platforms: Phaser.Physics.Arcade.StaticGroup) {
          const shape = this.add.circle(
            tileX * model.tileSize + model.tileSize / 2,
            tileY * model.tileSize + model.tileSize / 2,
            Math.max(4, model.tileSize * 0.38),
            color,
          )
          shape.setName(`player-${index}`)
          this.physics.add.existing(shape)
          const body = shape.body as Phaser.Physics.Arcade.Body
          body.setCollideWorldBounds(true).setBounce(0.05)
          this.physics.add.collider(shape, platforms)
          return { index, shape, body, carryingOxygen: false }
        }

        private createNode(node: PhaserSceneModel['nodes'][number], tileSize: number): void {
          const marker = this.add.circle(
            node.x * tileSize + tileSize / 2,
            node.y * tileSize + tileSize / 2,
            Math.max(4, tileSize * 0.32),
            NODE_COLORS[node.kind],
          )
          this.physics.add.existing(marker, true)
          for (const player of this.players) {
            this.physics.add.overlap(player.shape, marker, () => {
              if (!caseEngine?.isActive()) return
              const cell = adapterPlayerCell(player.index)
              if (node.kind === 'oxygen-source' && cell === 1) player.carryingOxygen = true
              if (node.kind === 'target-tissue' && cell === 1 && player.carryingOxygen) {
                if (caseEngine.dispatch({ type: 'oxygenDelivered', amount: 12, nodeId: node.id, source: 'player' })) player.carryingOxygen = false
              }
              if (node.kind === 'infection-site' && cell === 2) {
                if (caseEngine.dispatch({ type: 'infectionCleared', amount: 20, nodeId: node.id, source: 'player' })) marker.setAlpha(0.25)
              }
            })
          }
        }

        private playerColor(index: 1 | 2): number {
          return adapterPlayerCell(index) === 1 ? 0xe84b5f : 0x7bc7ff
        }

        override update(_time: number, delta: number): void {
          for (const player of this.players) {
            const actions = pressed.get(player.index)!
            const left = player.index === 1 ? this.cursors.left.isDown || actions.has('left') : this.wasd.A.isDown || actions.has('left')
            const right = player.index === 1 ? this.cursors.right.isDown || actions.has('right') : this.wasd.D.isDown || actions.has('right')
            const jumpKey = player.index === 1 ? this.cursors.up : this.wasd.W
            const jump = Phaser.Input.Keyboard.JustDown(jumpKey) || actions.has('jump')
            player.body.setVelocityX(left ? -150 : right ? 150 : 0)
            if (jump && player.body.blocked.down) player.body.setVelocityY(-310)
          }
          tickRuntime(delta)
        }
      }

      this.game = this.gameFactory({
        type: Phaser.CANVAS,
        parent: this.host!,
        width: 960,
        height: 540,
        backgroundColor: '#07101f',
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 760 }, debug: false } },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [CaseScene],
      })
    })
    if (draft.caseConfig.allowedEvents.length > 0) void this.requestDirector(1)
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
