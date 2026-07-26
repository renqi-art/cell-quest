import Phaser from 'phaser'
import type { GameEngineEvents } from '@/game/bridge/GameEngineEvents'
import type { LoadLevelOptions, PlayerAction } from '@/shared/types/game'
import type { ParsedClassicLevel } from '@/shared/classic/types'
import { FixedStepClock } from '@/shared/classic/simulation/FixedStepClock'
import { PlayerActor } from '../actors/PlayerActor'
import { EnemyActor } from '../actors/EnemyActor'
import { ProjectileActor } from '../actors/ProjectileActor'
import { ItemActor } from '../actors/ItemActor'
import { QuestionBlockActor } from '../actors/QuestionBlockActor'
import { TerrainSystem } from '../systems/TerrainSystem'
import { HazardSystem } from '../systems/HazardSystem'
import { PlatformSystem } from '../systems/PlatformSystem'
import { CombatSystem, type CombatResolution } from '../systems/CombatSystem'
import { ClassicHudSystem } from '../systems/ClassicHudSystem'
import { applyItem, createClassicItemState, tickClassicItemState, type ClassicItemState } from '@/shared/classic/simulation/ItemRules'
import { ClassicRunStats } from '@/shared/classic/simulation/ClassicRunStats'
import { CLASSIC_TILE_REGISTRY, isClassicTileCharacter } from '@/shared/classic/tiles'
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
    private readonly enemies: EnemyActor[] = []
    private readonly projectiles: ProjectileActor[] = []
    private readonly items: ItemActor[] = []
    private readonly questionBlocks: QuestionBlockActor[] = []
    private readonly playerByShape = new Map<Phaser.GameObjects.GameObject, PlayerActor>()
    private readonly enemyByShape = new Map<Phaser.GameObjects.GameObject, EnemyActor>()
    private readonly projectileByShape = new Map<Phaser.GameObjects.GameObject, ProjectileActor>()
    private readonly itemByShape = new Map<Phaser.GameObjects.GameObject, ItemActor>()
    private readonly questionByShape = new Map<Phaser.GameObjects.GameObject, QuestionBlockActor>()
    private readonly skillWasDown = new Map<1 | 2, boolean>()
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private wasd!: Record<'W' | 'A' | 'D', Phaser.Input.Keyboard.Key>
    private readonly hazardSystem = new HazardSystem()
    private readonly combatSystem = new CombatSystem()
    private readonly hudSystem = new ClassicHudSystem()
    private platformSystem!: PlatformSystem
    private enemyGroup!: Phaser.Physics.Arcade.Group
    private projectileGroup!: Phaser.Physics.Arcade.Group
    private itemGroup!: Phaser.Physics.Arcade.StaticGroup
    private questionGroup!: Phaser.Physics.Arcade.StaticGroup
    private fixedTick = 0
    private randomState = 0x6d2b79f5
    private completed = false
    private itemState: ClassicItemState = createClassicItemState()
    private runStats = new ClassicRunStats({
      totalEnemies: context.level.enemies.length + context.level.bosses.length,
      totalItems: context.level.items.length,
    })

    constructor() {
      super(CLASSIC_SCENE_KEY)
    }

    create(): void {
      const { level, options, events } = context
      const worldWidth = level.definition.width * CLASSIC_TILE_SIZE
      const worldHeight = level.tiles.length * CLASSIC_TILE_SIZE
      this.cameras.main.setBackgroundColor(level.definition.sky[0])
      this.physics.world.setBounds(0, 0, worldWidth, worldHeight)
      const terrain = new TerrainSystem(this).create(level)
      this.platformSystem = new PlatformSystem(
        this,
        terrain.crumble,
        level.definition.floatPlatforms ?? [],
      )

      this.players.push(new PlayerActor(this, 1, level.playerSpawn.col, level.playerSpawn.row, 0xe84b5f))
      if (options.twoPlayer) {
        this.players.push(new PlayerActor(this, 2, level.playerSpawn.col + 1, level.playerSpawn.row, 0x7bc7ff))
      }
      this.enemyGroup = this.physics.add.group({ allowGravity: false })
      this.projectileGroup = this.physics.add.group({ allowGravity: false })
      this.itemGroup = this.physics.add.staticGroup()
      this.questionGroup = this.physics.add.staticGroup()
      level.enemies.forEach(spawn => this.createEnemy(spawn.kind, spawn.col, spawn.row))
      level.items.forEach(spawn => this.createItem({ kind: spawn.kind }, spawn.col, spawn.row))
      level.questionBlocks.forEach(spawn => this.createQuestionBlock(spawn.col, spawn.row, spawn.hidden))
      for (const player of this.players) {
        this.playerByShape.set(player.shape, player)
        this.physics.add.collider(player.shape, terrain.solids)
        this.physics.add.collider(player.shape, terrain.crumble, (_player, platform) => {
          this.platformSystem.contactCrumble(platform as Phaser.GameObjects.GameObject)
        })
        this.physics.add.collider(player.shape, this.platformSystem.floatingGroup)
        this.physics.add.overlap(player.shape, terrain.spikes, () => {
          if (this.hazardSystem.applyTile(player, '^')) this.emitHud()
        })
        this.physics.add.overlap(player.shape, terrain.springs, (_player, spring) => {
          const tile = (spring as Phaser.GameObjects.GameObject).name.endsWith('J') ? 'J' : 'V'
          this.hazardSystem.applyTile(player, tile)
        })
        this.physics.add.overlap(player.shape, terrain.checkpoints, (_player, checkpoint) => {
          const object = checkpoint as unknown as { readonly x: number; readonly y: number }
          const position = {
            col: Math.floor(object.x / CLASSIC_TILE_SIZE),
            row: Math.floor(object.y / CLASSIC_TILE_SIZE),
          }
          if (this.hazardSystem.activateCheckpoint(player, position)) {
            context.events.emit('toast-requested', { message: '检查点已激活', durationMs: 1600 })
          }
        })
        this.physics.add.overlap(player.shape, this.enemyGroup, (playerShape, enemyShape) => {
          this.resolvePlayerEnemy(
            this.playerByShape.get(playerShape as Phaser.GameObjects.GameObject),
            this.enemyByShape.get(enemyShape as Phaser.GameObjects.GameObject),
          )
        })
        this.physics.add.overlap(player.shape, this.itemGroup, (_playerShape, itemShape) => {
          const item = this.itemByShape.get(itemShape as Phaser.GameObjects.GameObject)
          if (item) this.collectItem(player, item)
        })
        this.physics.add.collider(player.shape, this.questionGroup, (_playerShape, questionShape) => {
          const question = this.questionByShape.get(questionShape as Phaser.GameObjects.GameObject)
          if (question) this.hitQuestionBlockActor(player, question)
        })
      }
      this.physics.add.collider(this.enemyGroup, terrain.solids)
      this.physics.add.collider(this.enemyGroup, terrain.crumble)
      if (level.finish) {
        const finish = this.add.rectangle(
          level.finish.col * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
          level.finish.row * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
          CLASSIC_TILE_SIZE,
          CLASSIC_TILE_SIZE * 2,
          0x5adf91,
          0.45,
        )
        finish.setName('classic-finish')
        this.physics.add.existing(finish, true)
        for (const player of this.players) {
          this.physics.add.overlap(player.shape, finish, () => this.tryComplete(true))
        }
      }
      this.physics.add.collider(this.projectileGroup, terrain.solids, (projectileShape) => {
        this.projectileByShape.get(projectileShape as Phaser.GameObjects.GameObject)?.hitTerrain()
      })
      this.physics.add.overlap(this.projectileGroup, this.enemyGroup, (projectileShape, enemyShape) => {
        const projectile = this.projectileByShape.get(projectileShape as Phaser.GameObjects.GameObject)
        const enemy = this.enemyByShape.get(enemyShape as Phaser.GameObjects.GameObject)
        if (!projectile?.hitEnemy() || !enemy) return
        this.consumeCombatResult(this.combatSystem.hitEnemy(enemy, 'projectile'), enemy)
      })

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
      this.fixedTick += 1
      this.platformSystem.fixedUpdate(this.fixedTick)
      this.itemState = tickClassicItemState(this.itemState)
      if (this.itemState.oxygenTicks > 0 && this.fixedTick % 60 === 0) {
        for (const player of this.players) player.heal(1)
      }
      for (const enemy of this.enemies) {
        if (!enemy.isAlive()) continue
        const target = this.nearestPlayer(enemy.shape.x, enemy.shape.y)
        enemy.step({
          playerDeltaX: target ? target.shape.x - enemy.shape.x : 9999,
          playerDeltaY: target ? target.shape.y - enemy.shape.y : 9999,
          wallAhead: enemy.body.blocked.left || enemy.body.blocked.right,
          groundAhead: this.hasGroundAhead(enemy),
        })
      }
      for (const projectile of this.projectiles) projectile.step()
      if (this.fixedTick % 6 === 0) {
        this.runStats = this.runStats.record({ type: 'tick', elapsedMs: 100 })
        this.emitHud()
      }
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
        const skillDown = actions.has('skill')
        if (skillDown && !this.skillWasDown.get(player.playerIndex)) this.attack(player)
        this.skillWasDown.set(player.playerIndex, skillDown)
        if (player.shape.y > context.level.tiles.length * CLASSIC_TILE_SIZE + 60) {
          if (player.applyDamage(player.snapshot().maxHealth)) {
            this.runStats = this.runStats.record({ type: 'death' })
            context.events.emit('player-died', { remainingCells: 0, cellName: '经典细胞' })
            context.events.emit('state-changed', 'dead')
          }
        }
      }
    }

    private emitHud(): void {
      context.events.emit('hud-updated', this.hudSystem.snapshot(
        this.players.map(player => ({
          actor: player,
          cellType: player.playerIndex === 1
            ? context.options.playerOneCell ?? context.level.definition.cellType
            : context.options.playerTwoCell ?? 1,
          cellName: player.playerIndex === 1 ? '经典细胞' : '协作细胞',
        })),
        this.itemState,
        this.runStats,
      ))
    }

    private createEnemy(kind: ParsedClassicLevel['enemies'][number]['kind'], col: number, row: number): EnemyActor {
      const enemy = new EnemyActor(this, kind, col, row)
      this.enemies.push(enemy)
      this.enemyGroup.add(enemy.shape)
      this.enemyByShape.set(enemy.shape, enemy)
      return enemy
    }

    private getProjectile(): ProjectileActor {
      const available = this.projectiles.find(projectile => !projectile.isActive())
      if (available) return available
      const projectile = new ProjectileActor(this)
      this.projectiles.push(projectile)
      this.projectileGroup.add(projectile.shape)
      this.projectileByShape.set(projectile.shape, projectile)
      return projectile
    }

    private attack(player: PlayerActor): void {
      const state = player.snapshot()
      const cellType = player.playerIndex === 1
        ? context.options.playerOneCell ?? context.level.definition.cellType
        : context.options.playerTwoCell ?? 1
      if (cellType === 2) {
        const target = this.enemies.find(enemy => enemy.isAlive()
          && Math.abs(enemy.shape.x - player.shape.x) <= 52
          && Math.abs(enemy.shape.y - player.shape.y) <= 42
          && Math.sign(enemy.shape.x - player.shape.x) === state.facing)
        if (target) this.consumeCombatResult(this.combatSystem.hitEnemy(target, 'melee'), target)
        return
      }
      this.getProjectile().fire(
        player.shape.x + state.facing * 18,
        player.shape.y,
        state.facing,
      )
    }

    private resolvePlayerEnemy(player?: PlayerActor, enemy?: EnemyActor): void {
      if (!player || !enemy || !enemy.isAlive()) return
      const result = this.combatSystem.resolvePlayerEnemy(player, enemy, {
        dashing: player.snapshot().mode === 'dashing',
        descending: player.snapshot().velocity.y > 0,
        playerBottom: player.body.bottom,
        enemyTop: enemy.body.top,
      })
      this.consumeCombatResult(result, enemy)
      if (result.kind === 'player-hit') this.emitHud()
    }

    private consumeCombatResult(result: CombatResolution, enemy: EnemyActor): void {
      if (!result.reward) return
      this.runStats = this.runStats.record({ type: 'kill' })
      for (let index = 0; index < result.reward.split; index += 1) {
        const child = this.createEnemy('staph', enemy.shape.x / CLASSIC_TILE_SIZE, enemy.shape.y / CLASSIC_TILE_SIZE)
        child.shape.setPosition(enemy.shape.x + (index === 0 ? -12 : 12), enemy.shape.y)
        child.body.updateFromGameObject()
      }
      this.emitHud()
      this.tryComplete(false)
    }

    private createItem(item: ItemActor['item'], col: number, row: number): ItemActor {
      const actor = new ItemActor(this, item, col, row)
      this.items.push(actor)
      this.itemGroup.add(actor.shape)
      this.itemByShape.set(actor.shape, actor)
      return actor
    }

    private createQuestionBlock(col: number, row: number, hidden: boolean): QuestionBlockActor {
      const actor = new QuestionBlockActor(this, col, row, hidden)
      this.questionBlocks.push(actor)
      this.questionGroup.add(actor.shape)
      this.questionByShape.set(actor.shape, actor)
      return actor
    }

    private collectItem(player: PlayerActor, actor: ItemActor): void {
      const application = applyItem(this.itemState, actor.item)
      if (!application.collected) {
        context.events.emit('toast-requested', { message: '背包已满', durationMs: 1200 })
        return
      }
      if (!actor.collect()) return
      this.itemState = application.state
      this.runStats = this.runStats.record({ type: 'item' })
      if (actor.item.kind === 'shield') player.grantShield(application.state.shieldTicks)
      if (actor.item.kind === 'memory') {
        context.events.emit('knowledge-opened', { title: '记忆细胞', body: '记忆细胞会保留免疫应答信息。' })
      }
      this.emitHud()
      this.tryComplete(false)
    }

    private hitQuestionBlockActor(player: PlayerActor, actor: QuestionBlockActor): void {
      if (player.body.velocity.y >= 0 || player.shape.y <= actor.shape.y) return
      const output = actor.hit(this.nextRandom())
      if (!output) return
      const col = actor.shape.x / CLASSIC_TILE_SIZE - 0.5
      const row = actor.shape.y / CLASSIC_TILE_SIZE - 1.5
      if (output.kind === 'atp') this.createItem({ kind: 'atp' }, col, row)
      else this.createEnemy('strep', col, row)
    }

    private tryComplete(touchedFinish: boolean): void {
      if (this.completed) return
      const condition = context.level.definition.winCondition
      const complete = condition === 'reach-finish'
        ? touchedFinish
        : condition === 'kill-all'
          ? this.enemies.every(enemy => !enemy.isAlive())
          : this.runStats.snapshot().items >= context.level.items.length
      if (!complete) return
      this.completed = true
      const result = this.runStats.result()
      context.events.emit('level-completed', {
        levelId: context.level.definition.id,
        stars: result.stars,
        elapsedMs: result.elapsedMs,
        completionPercent: result.completionPercent,
      })
      context.events.emit('state-changed', 'complete')
    }

    private nextRandom(): number {
      this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0
      return this.randomState / 0x100000000
    }

    private nearestPlayer(x: number, y: number): PlayerActor | undefined {
      return this.players.reduce<PlayerActor | undefined>((nearest, player) => {
        if (!nearest) return player
        const distance = Math.abs(player.shape.x - x) + Math.abs(player.shape.y - y)
        const nearestDistance = Math.abs(nearest.shape.x - x) + Math.abs(nearest.shape.y - y)
        return distance < nearestDistance ? player : nearest
      }, undefined)
    }

    private hasGroundAhead(enemy: EnemyActor): boolean {
      const direction = enemy.snapshot().brain.direction
      const col = Math.floor((enemy.shape.x + direction * 18) / CLASSIC_TILE_SIZE)
      const row = Math.floor((enemy.body.bottom + 3) / CLASSIC_TILE_SIZE)
      const tile = context.level.tiles[row]?.[col] ?? ' '
      return tile === '_' || (isClassicTileCharacter(tile) && CLASSIC_TILE_REGISTRY[tile].solid)
    }
  }
}
