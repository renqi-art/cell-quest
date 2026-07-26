import Phaser from 'phaser'
import type { GameEngine } from '@/game/bridge/GameEngine'
import { GameEngineEvents } from '@/game/bridge/GameEngineEvents'
import type { GameEngineEventMap } from '@/shared/types/events'
import type { GameCommand, LoadLevelOptions, PlayerAction } from '@/shared/types/game'
import type { CaseDraft } from '@/shared/models/case-draft'
import { CaseEngine } from '@/shared/domain/CaseEngine'
import { buildPhaserSceneModel, type PhaserSceneModel } from './buildPhaserSceneModel'

const NODE_COLORS: Record<PhaserSceneModel['nodes'][number]['kind'], number> = {
  'oxygen-source': 0x4fc3f7,
  'target-tissue': 0xffb74d,
  'infection-site': 0xef5350,
  checkpoint: 0xffeb3b,
  knowledge: 0xab47bc,
}

export class PhaserGameEngineAdapter implements GameEngine {
  private readonly events = new GameEngineEvents()
  private host: HTMLElement | null = null
  private game: Phaser.Game | null = null
  private draft: CaseDraft | null = null
  private options: LoadLevelOptions = { twoPlayer: false, playerOneCell: 1 }
  private caseEngine: CaseEngine | null = null
  private readonly pressed = new Set<PlayerAction>()
  private terminalEmitted = false

  async mount(host: HTMLElement): Promise<void> {
    this.host = host
  }

  destroy(): void {
    this.game?.destroy(true)
    this.game = null
    this.caseEngine = null
    this.draft = null
    this.pressed.clear()
    this.events.clear()
  }

  async loadLevel(_levelId: string, options: LoadLevelOptions): Promise<void> {
    if (!this.draft) throw new Error('Phaser adapter requires loadCaseDraft for case levels')
    await this.loadCaseDraft(this.draft, options)
  }

  async loadCaseDraft(draft: CaseDraft, options: LoadLevelOptions): Promise<void> {
    if (!this.host) throw new Error('Phaser adapter must be mounted before loading a case')
    if (!draft.caseConfig) throw new Error('Phaser case runtime requires caseConfig')
    this.game?.destroy(true)
    this.draft = draft
    this.options = options
    this.caseEngine = new CaseEngine(draft.caseConfig)
    this.terminalEmitted = false
    const model = buildPhaserSceneModel(draft)
    const events = this.events
    const caseEngine = this.caseEngine
    const pressed = this.pressed
    const tickRuntime = (deltaMs: number) => this.tick(deltaMs)

    await new Promise<void>((resolve, reject) => {
      class CaseScene extends Phaser.Scene {
        private player!: Phaser.GameObjects.Arc
        private body!: Phaser.Physics.Arcade.Body
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
        private carryingOxygen = false

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
            this.player = this.add.circle(
              model.spawn.x * model.tileSize + model.tileSize / 2,
              model.spawn.y * model.tileSize + model.tileSize / 2,
              Math.max(4, model.tileSize * 0.38),
              0xe84b5f,
            )
            this.physics.add.existing(this.player)
            this.body = this.player.body as Phaser.Physics.Arcade.Body
            this.body.setCollideWorldBounds(true).setBounce(0.05)
            this.physics.add.collider(this.player, platforms)
            this.cursors = this.input.keyboard!.createCursorKeys()

            for (const node of model.nodes) this.createNode(node, model.tileSize)
            this.add.text(14, 12, draft.metadata.title || '病例试玩', {
              color: '#edf5ff', fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '16px',
            }).setScrollFactor(0)
            events.emit('state-changed', 'playing')
            events.emit('case-updated', caseEngine!.getSnapshot())
            resolve()
          } catch (cause) {
            reject(cause)
          }
        }

        private createNode(node: PhaserSceneModel['nodes'][number], tileSize: number): void {
          const marker = this.add.circle(
            node.x * tileSize + tileSize / 2,
            node.y * tileSize + tileSize / 2,
            Math.max(4, tileSize * 0.32),
            NODE_COLORS[node.kind],
          )
          this.physics.add.existing(marker, true)
          this.physics.add.overlap(this.player, marker, () => {
            if (!caseEngine?.isActive()) return
            if (node.kind === 'oxygen-source') this.carryingOxygen = true
            if (node.kind === 'target-tissue' && this.carryingOxygen) {
              if (caseEngine!.dispatch({ type: 'oxygenDelivered', amount: 12, nodeId: node.id })) this.carryingOxygen = false
            }
            if (node.kind === 'infection-site') {
              caseEngine!.dispatch({ type: 'infectionCleared', amount: 20, nodeId: node.id })
              marker.setAlpha(0.25)
            }
          })
        }

        override update(_time: number, delta: number): void {
          const left = this.cursors.left.isDown || pressed.has('left')
          const right = this.cursors.right.isDown || pressed.has('right')
          const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || pressed.has('jump')
          this.body.setVelocityX(left ? -150 : right ? 150 : 0)
          if (jump && this.body.blocked.down) this.body.setVelocityY(-310)
          tickRuntime(delta)
        }
      }

      this.game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: this.host!,
        width: 960,
        height: 540,
        backgroundColor: '#07101f',
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 760 }, debug: false } },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [CaseScene],
      })
    })
  }

  private tick(deltaMs: number): void {
    if (!this.caseEngine?.isActive()) return
    this.caseEngine.update(Math.min(deltaMs, 100) / 1000)
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

  pause(): void { this.game?.scene.pause('case-runtime'); this.events.emit('state-changed', 'paused') }
  resume(): void { this.game?.scene.resume('case-runtime'); this.events.emit('state-changed', 'playing') }
  retry(): void { if (this.draft) void this.loadCaseDraft(this.draft, this.options) }
  quitLevel(): void { this.game?.destroy(true); this.game = null; this.events.emit('state-changed', 'hub') }
  setTwoPlayer(enabled: boolean): void { this.options = { ...this.options, twoPlayer: enabled } }
  dispatch(command: GameCommand): void {
    if (command.type === 'pause') return this.pause()
    if (command.type === 'resume') return this.resume()
    if (command.type !== 'input' || command.player !== 1) return
    if (command.pressed) this.pressed.add(command.action)
    else this.pressed.delete(command.action)
  }
  subscribe<K extends keyof GameEngineEventMap>(event: K, listener: GameEngineEventMap[K]): () => void {
    return this.events.subscribe(event, listener)
  }
}
