import Phaser from 'phaser'
import type { GameEngineEvents } from '@/game/bridge/GameEngineEvents'
import type { LoadLevelOptions, PlayerAction } from '@/shared/types/game'
import type { ParsedClassicLevel } from '@/shared/classic/types'
import { CLASSIC_TILE_REGISTRY, isClassicTileCharacter } from '@/shared/classic/tiles'
import { FixedStepClock } from '@/shared/classic/simulation/FixedStepClock'
import { PlayerActor } from '../actors/PlayerActor'
import {
  CLASSIC_MAX_CATCH_UP_STEPS,
  CLASSIC_SIMULATION_HZ,
  CLASSIC_TILE_SIZE,
} from '../config/classic-physics'

export const CLASSIC_SCENE_KEY = 'classic-runtime'

export interface ClassicSceneContext {
  readonly level: ParsedClassicLevel
  readonly options: LoadLevelOptions
  readonly pressed: ReadonlyMap<1 | 2, Set<PlayerAction>>
  readonly events: GameEngineEvents
}

export function createClassicScene(context: ClassicSceneContext): typeof Phaser.Scene {
  return class ClassicScene extends Phaser.Scene {
    private readonly clock = new FixedStepClock({
      hz: CLASSIC_SIMULATION_HZ,
      maxCatchUpSteps: CLASSIC_MAX_CATCH_UP_STEPS,
    })
    private readonly players: PlayerActor[] = []
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private wasd!: Record<'W' | 'A' | 'D', Phaser.Input.Keyboard.Key>

    constructor() {
      super(CLASSIC_SCENE_KEY)
    }

    create(): void {
      const { level, options, events } = context
      const worldWidth = level.definition.width * CLASSIC_TILE_SIZE
      const worldHeight = level.tiles.length * CLASSIC_TILE_SIZE
      this.cameras.main.setBackgroundColor(level.definition.sky[0])
      this.physics.world.setBounds(0, 0, worldWidth, worldHeight)
      const solids = this.physics.add.staticGroup()

      level.tiles.forEach((row, rowIndex) => row.forEach((character, colIndex) => {
        if (!isClassicTileCharacter(character) || !CLASSIC_TILE_REGISTRY[character].solid) return
        const tile = this.add.rectangle(
          colIndex * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
          rowIndex * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
          CLASSIC_TILE_SIZE,
          CLASSIC_TILE_SIZE,
          character === 'B' ? 0x7a2438 : 0x334b69,
        )
        solids.add(tile)
      }))

      this.players.push(new PlayerActor(this, 1, level.playerSpawn.col, level.playerSpawn.row, 0xe84b5f))
      if (options.twoPlayer) {
        this.players.push(new PlayerActor(this, 2, level.playerSpawn.col + 1, level.playerSpawn.row, 0x7bc7ff))
      }
      for (const player of this.players) this.physics.add.collider(player.shape, solids)

      this.cursors = this.input.keyboard!.createCursorKeys()
      this.wasd = this.input.keyboard!.addKeys('W,A,D') as Record<'W' | 'A' | 'D', Phaser.Input.Keyboard.Key>
      this.cameras.main.setBounds(0, 0, worldWidth, worldHeight)
      this.cameras.main.startFollow(this.players[0]!.shape, true, 1, 1)

      const canvas = this.game.canvas
      canvas.setAttribute('role', 'application')
      canvas.setAttribute('aria-label', `${level.definition.name} Phaser 经典场景`)
      canvas.dataset.runtime = 'phaser-classic'
      canvas.dataset.playerCount = String(this.players.length)
      events.emit('state-changed', 'playing')
      this.emitHud()
    }

    override update(_time: number, delta: number): void {
      this.clock.advance(delta, () => this.fixedUpdate())
    }

    private fixedUpdate(): void {
      for (const player of this.players) {
        const actions = context.pressed.get(player.playerIndex) ?? new Set<PlayerAction>()
        const leftKey = player.playerIndex === 1 ? this.cursors.left : this.wasd.A
        const rightKey = player.playerIndex === 1 ? this.cursors.right : this.wasd.D
        const jumpKey = player.playerIndex === 1 ? this.cursors.up : this.wasd.W
        player.step({
          left: leftKey.isDown || actions.has('left'),
          right: rightKey.isDown || actions.has('right'),
          down: (player.playerIndex === 1 ? this.cursors.down.isDown : false) || actions.has('down'),
          jumpPressed: Phaser.Input.Keyboard.JustDown(jumpKey) || actions.has('jump'),
          jumpHeld: jumpKey.isDown || actions.has('jump'),
          dashPressed: actions.has('dash'),
        }, {
          grounded: player.body.blocked.down,
          headClear: !player.body.blocked.up,
          horizontalBlocked: player.body.blocked.left || player.body.blocked.right,
        })
      }
    }

    private emitHud(): void {
      context.events.emit('hud-updated', {
        players: this.players.map(player => {
          const state = player.snapshot()
          return {
            player: player.playerIndex,
            health: state.health,
            maxHealth: state.maxHealth,
            cellType: player.playerIndex === 1
              ? context.options.playerOneCell ?? context.level.definition.cellType
              : context.options.playerTwoCell ?? 1,
            cellName: player.playerIndex === 1 ? '经典细胞' : '协作细胞',
          }
        }),
        energy: 100,
        maxEnergy: 100,
        elapsedMs: 0,
        kills: 0,
        items: 0,
      })
    }
  }
}
