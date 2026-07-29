import Phaser from 'phaser'
import type { GameEngineEvents } from '@/game/bridge/GameEngineEvents'
import type { CellType, LoadLevelOptions, PlayerAction } from '@/shared/types/game'
import type { PlayerInputFrame } from '@/shared/classic/simulation/player-types'
import type { ParsedClassicLevel } from '@/shared/classic/types'
import { FixedStepClock } from '@/shared/classic/simulation/FixedStepClock'
import { PlayerActor } from '../actors/PlayerActor'
import { EnemyActor } from '../actors/EnemyActor'
import { ProjectileActor } from '../actors/ProjectileActor'
import { ItemActor } from '../actors/ItemActor'
import { QuestionBlockActor } from '../actors/QuestionBlockActor'
import { BossActor } from '../actors/BossActor'
import { NpcActor } from '../actors/NpcActor'
import { TerrainSystem } from '../systems/TerrainSystem'
import { HazardSystem } from '../systems/HazardSystem'
import { PlatformSystem } from '../systems/PlatformSystem'
import { CombatSystem, type CombatResolution } from '../systems/CombatSystem'
import { ClassicHudSystem } from '../systems/ClassicHudSystem'
import { TideSystem } from '../systems/TideSystem'
import { SpawnSystem } from '../systems/SpawnSystem'
import { ClassicInputRouter, swapPlayerRoles } from '../systems/ClassicInputRouter'
import { CameraSystem } from '../systems/CameraSystem'
import { audio } from '@/game/audio/AudioManager'
import { applyItem, createClassicItemState, tickClassicItemState, type ClassicItemState } from '@/shared/classic/simulation/ItemRules'
import { ClassicRunStats } from '@/shared/classic/simulation/ClassicRunStats'
import { canCompleteClassicLevel } from '@/shared/classic/simulation/CompletionRules'
import type { BossEffect } from '@/shared/classic/simulation/BossBrain'
import { CLASSIC_TILE_REGISTRY, isClassicTileCharacter } from '@/shared/classic/tiles'
import {
  CLASSIC_MAX_CATCH_UP_STEPS,
  CLASSIC_SIMULATION_HZ,
  CLASSIC_TILE_SIZE,
} from '../config/classic-physics'

/** 脚步声触发间隔（ms）：调大以降低触发频率，消除连续播放造成的爆音刺耳 */
const FOOTSTEP_INTERVAL_MS = 480

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
    private readonly bosses: BossActor[] = []
    private readonly npcs: NpcActor[] = []
    private readonly playerByShape = new Map<Phaser.GameObjects.GameObject, PlayerActor>()
    private readonly enemyByShape = new Map<Phaser.GameObjects.GameObject, EnemyActor>()
    private readonly projectileByShape = new Map<Phaser.GameObjects.GameObject, ProjectileActor>()
    private readonly itemByShape = new Map<Phaser.GameObjects.GameObject, ItemActor>()
    private readonly questionByShape = new Map<Phaser.GameObjects.GameObject, QuestionBlockActor>()
    private readonly bossByShape = new Map<Phaser.GameObjects.GameObject, BossActor>()
    private readonly npcByShape = new Map<Phaser.GameObjects.GameObject, NpcActor>()
    private readonly skillWasDown = new Map<1 | 2, boolean>()
    private readonly footstepState = new Map<1 | 2, { walking: boolean; nextAt: number }>()
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private wasd!: Record<'W' | 'A' | 'S' | 'D' | 'Q' | 'E', Phaser.Input.Keyboard.Key>
    private p1Dash!: Phaser.Input.Keyboard.Key
    private p1Skill!: Phaser.Input.Keyboard.Key
    private inputRouter!: ClassicInputRouter
    private readonly hazardSystem = new HazardSystem()
    private readonly combatSystem = new CombatSystem()
    private readonly hudSystem = new ClassicHudSystem()
    private platformSystem!: PlatformSystem
    private enemyGroup!: Phaser.Physics.Arcade.Group
    private projectileGroup!: Phaser.Physics.Arcade.Group
    private itemGroup!: Phaser.Physics.Arcade.StaticGroup
    private questionGroup!: Phaser.Physics.Arcade.StaticGroup
    private bossGroup!: Phaser.Physics.Arcade.Group
    private npcGroup!: Phaser.Physics.Arcade.StaticGroup
    private tideSystem!: TideSystem
    private spawnSystem!: SpawnSystem
    private cameraSystem!: CameraSystem
    private fixedTick = 0
    private randomState = 0x6d2b79f5
    private completed = false
    private playerCells = new Map<1 | 2, CellType>([
      [1, context.options.playerOneCell ?? context.level.definition.cellType],
      [2, context.options.playerTwoCell ?? 1],
    ])
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
      this.bossGroup = this.physics.add.group({ allowGravity: false })
      this.npcGroup = this.physics.add.staticGroup()
      this.tideSystem = new TideSystem(this, Boolean(level.definition.tide))
      this.spawnSystem = new SpawnSystem(level.definition.pipeSpawners ?? [])
      level.enemies.forEach(spawn => this.createEnemy(spawn.kind, spawn.col, spawn.row))
      level.items.forEach(spawn => this.createItem({ kind: spawn.kind }, spawn.col, spawn.row))
      level.questionBlocks.forEach(spawn => this.createQuestionBlock(spawn.col, spawn.row, spawn.hidden))
      level.bosses.forEach(spawn => this.createBoss(spawn.col, spawn.row))
      level.npcs.forEach(spawn => this.createNpc(spawn.col, spawn.row))
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
        this.physics.add.overlap(player.shape, this.bossGroup, (_playerShape, bossShape) => {
          const boss = this.bossByShape.get(bossShape as Phaser.GameObjects.GameObject)
          if (boss) this.resolvePlayerBoss(player, boss)
        })
        this.physics.add.overlap(player.shape, this.npcGroup, (_playerShape, npcShape) => {
          const npc = this.npcByShape.get(npcShape as Phaser.GameObjects.GameObject)
          if (npc?.interact()) {
            context.events.emit('tutorial-opened', {
              speaker: '????',
              color: '#79d7c5',
              body: '??????????????????? Boss ???',
            })
          }
        })
      }
      this.physics.add.collider(this.enemyGroup, terrain.solids)
      this.physics.add.collider(this.enemyGroup, terrain.crumble)
      this.physics.add.collider(this.bossGroup, terrain.solids)
      this.physics.add.collider(this.bossGroup, terrain.crumble)
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
      this.physics.add.overlap(this.projectileGroup, this.bossGroup, (projectileShape, bossShape) => {
        const projectile = this.projectileByShape.get(projectileShape as Phaser.GameObjects.GameObject)
        const boss = this.bossByShape.get(bossShape as Phaser.GameObjects.GameObject)
        if (!projectile?.hitEnemy() || !boss) return
        this.consumeBossEffects(boss, boss.hit(1))
      })

      this.cursors = this.input.keyboard!.createCursorKeys()
      this.wasd = this.input.keyboard!.addKeys('W,A,S,D,Q,E') as Record<'W' | 'A' | 'S' | 'D' | 'Q' | 'E', Phaser.Input.Keyboard.Key>
      this.p1Dash = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
      this.p1Skill = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      this.inputRouter = new ClassicInputRouter(context.pressed, {
        isDown: (player, action) => this.keyboardActionDown(player, action),
      })
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.inputRouter.shutdown())
      this.cameras.main.setBounds(0, 0, worldWidth, worldHeight)
      this.cameraSystem = new CameraSystem(this.cameras.main, { width: worldWidth, height: worldHeight })
      this.cameraSystem.step(this.players.map(player => player.shape), { snap: true })

      const canvas = this.game.canvas
      canvas.setAttribute('role', 'application')
      canvas.setAttribute('aria-label', `${level.definition.name} Phaser 经典场景`)
      canvas.dataset.runtime = 'phaser-classic'
      canvas.dataset.playerCount = String(this.players.length)
      canvas.dataset.playerRoles = this.players.map(player => this.cellTypeFor(player.playerIndex)).join(',')
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
      const tide = this.tideSystem.step(false, this.runStats.result().completionPercent / 100)
      if (tide?.phase === 'surge') {
        this.itemState = {
          ...this.itemState,
          energy: Math.max(0, this.itemState.energy - 0.01 * tide.drainMultiplier),
        }
      }
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
      const spawnRequests = this.spawnSystem.step(
        this.players.map(player => ({ x: player.shape.x, y: player.shape.y })),
        this.enemies.filter(enemy => enemy.isAlive()).length,
      )
      for (const request of spawnRequests) this.createEnemy(request.kind, request.col, request.row)
      for (const boss of this.bosses) {
        if (!boss.snapshot().alive) continue
        const target = this.nearestPlayer(boss.shape.x, boss.shape.y)
        const distance = target
          ? Math.abs(target.shape.x - boss.shape.x) + Math.abs(target.shape.y - boss.shape.y)
          : 9999
        this.consumeBossEffects(boss, boss.step(distance, () => this.nextRandom()))
      }
      for (const projectile of this.projectiles) projectile.step()
      if (this.fixedTick % 6 === 0) {
        this.runStats = this.runStats.record({ type: 'tick', elapsedMs: 100 })
        this.emitHud()
      }
      for (const player of this.players) {
        const frame = this.inputRouter.frame(player.playerIndex)
        const events = player.step(frame, {
          grounded: player.body.blocked.down,
          headClear: !player.body.blocked.up,
          horizontalBlocked: player.body.blocked.left || player.body.blocked.right,
        })
        for (const ev of events) {
          if (ev.type === 'jumped') audio.play('jump')
          else if (ev.type === 'dashed') audio.play('skill')
        }
        this.updateFootsteps(player, frame)
        const skillDown = this.inputRouter.isDown(player.playerIndex, 'skill')
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
      this.cameraSystem.step(this.players.map(player => player.shape))
    }

    swapPlayerRoles(): void {
      if (this.players.length < 2) return
      this.playerCells = swapPlayerRoles(this.playerCells)
      this.game.canvas.dataset.playerRoles = `${this.cellTypeFor(1)},${this.cellTypeFor(2)}`
      this.emitHud()
    }

    /**
     * 走路脚步声：角色处于地面且水平移动时循环触发；静止 / 起跳 / 腾空立即停止。
     * 复用现有音效体系（audio.playFootstep，音量 0.4），节流避免密集爆音；
     * 属游戏特效音效，不受 BGM 静音按钮控制，且不会触发 BGM 下压。
     */
    private updateFootsteps(player: PlayerActor, frame: PlayerInputFrame): void {
      const grounded = player.body.blocked.down
      // 走路判定：在地面 且 按住左/右方向（移动意图）。
      // 不依赖物理速度数值，避免 Phaser 物理步与模拟步时序导致的漏判。
      const moving = frame.left || frame.right
      const walking = grounded && moving

      let st = this.footstepState.get(player.playerIndex)
      if (!st) {
        st = { walking: false, nextAt: 0 }
        this.footstepState.set(player.playerIndex, st)
      }

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      if (walking) {
        if (!st.walking) {
          st.walking = true
          // 起步立即来一脚，并设定后续节奏间隔
          st.nextAt = now + FOOTSTEP_INTERVAL_MS
          audio.playFootstep()
          console.log(`角色行走播放脚步声 (P${player.playerIndex})`)
        } else if (now >= st.nextAt) {
          st.nextAt = now + FOOTSTEP_INTERVAL_MS
          audio.playFootstep()
        }
      } else {
        if (st.walking) {
          st.walking = false
          console.log(`角色停止终止脚步声 (P${player.playerIndex})`)
        }
        // 不在走路：重置计时，下次起步立刻触发
        st.nextAt = 0
      }
    }

    private keyboardActionDown(player: 1 | 2, action: PlayerAction): boolean {
      if (player === 1) {
        if (action === 'left') return this.cursors.left.isDown
        if (action === 'right') return this.cursors.right.isDown
        if (action === 'down') return this.cursors.down.isDown
        if (action === 'jump') return this.cursors.up.isDown
        if (action === 'dash') return this.p1Dash.isDown
        if (action === 'skill') return this.p1Skill.isDown
        return false
      }
      if (action === 'left') return this.wasd.A.isDown
      if (action === 'right') return this.wasd.D.isDown
      if (action === 'down') return this.wasd.S.isDown
      if (action === 'jump') return this.wasd.W.isDown
      if (action === 'dash') return this.wasd.Q.isDown
      if (action === 'skill') return this.wasd.E.isDown
      return false
    }

    private cellTypeFor(player: 1 | 2): CellType {
      return this.playerCells.get(player) ?? 1
    }

    private emitHud(): void {
      context.events.emit('hud-updated', this.hudSystem.snapshot(
        this.players.map(player => ({
          actor: player,
          cellType: this.cellTypeFor(player.playerIndex),
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
      audio.play('attack')
      const state = player.snapshot()
      const cellType = this.cellTypeFor(player.playerIndex)
      if (cellType === 2) {
        const target = this.enemies.find(enemy => enemy.isAlive()
          && Math.abs(enemy.shape.x - player.shape.x) <= 52
          && Math.abs(enemy.shape.y - player.shape.y) <= 42
          && Math.sign(enemy.shape.x - player.shape.x) === state.facing)
        if (target) {
          this.consumeCombatResult(this.combatSystem.hitEnemy(target, 'melee'), target)
          return
        }
        const boss = this.bosses.find(candidate => candidate.snapshot().alive
          && Math.abs(candidate.shape.x - player.shape.x) <= 84
          && Math.abs(candidate.shape.y - player.shape.y) <= 58)
        if (boss) this.consumeBossEffects(boss, boss.hit(2))
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

    private resolvePlayerBoss(player: PlayerActor, boss: BossActor): void {
      if (!boss.snapshot().alive) return
      const state = player.snapshot()
      const attacking = state.mode === 'dashing'
        || (state.velocity.y > 0 && player.body.bottom <= boss.body.top + 8)
      if (attacking) {
        this.consumeBossEffects(boss, boss.hit(state.mode === 'dashing' ? 2 : 1))
        if (state.velocity.y > 0) player.launch(-8)
      } else if (player.applyDamage(10)) {
        this.emitHud()
      }
    }

    private consumeBossEffects(boss: BossActor, effects: readonly BossEffect[]): void {
      for (const effect of effects) {
        if (effect.type === 'phase') this.cameraSystem.requestShake(240, 0.012)
        if (effect.type === 'ring') this.cameraSystem.requestShake(140, 0.006)
        if (effect.type === 'leukocidin-hit' || effect.type === 'shock-hit') {
          for (const player of this.players) player.applyDamage(effect.damage)
        }
        if (effect.type === 'summon') {
          for (let index = 0; index < effect.count; index += 1) {
            const enemy = this.createEnemy('staph', boss.shape.x / CLASSIC_TILE_SIZE, boss.shape.y / CLASSIC_TILE_SIZE)
            enemy.shape.setPosition(boss.shape.x + (index === 0 ? -42 : 42), boss.shape.y)
            enemy.body.updateFromGameObject()
          }
        }
        if (effect.type === 'ring') {
          this.add.circle(boss.shape.x, boss.shape.y, 12)
            .setStrokeStyle(3, 0xff7070, 0.8)
            .setDepth(4)
            .setScale(4)
            .setAlpha(0.35)
            .setActive(false)
        }
        if (effect.type === 'died') {
          this.runStats = this.runStats.record({ type: 'kill' })
          context.events.emit('toast-requested', { message: 'Boss ???', durationMs: 1800 })
          this.emitHud()
          this.tryComplete(false)
        }
      }
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

    private createBoss(col: number, row: number): BossActor {
      const actor = new BossActor(this, col, row)
      this.bosses.push(actor)
      this.bossGroup.add(actor.shape)
      this.bossByShape.set(actor.shape, actor)
      return actor
    }

    private createNpc(col: number, row: number): NpcActor {
      const actor = new NpcActor(this, col, row)
      this.npcs.push(actor)
      this.npcGroup.add(actor.shape)
      this.npcByShape.set(actor.shape, actor)
      return actor
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
      audio.play('pickup')
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
      const complete = canCompleteClassicLevel(context.level.definition.winCondition, {
        touchedFinish,
        allEnemiesDefeated: this.enemies.every(enemy => !enemy.isAlive()),
        allItemsCollected: this.runStats.snapshot().items >= context.level.items.length,
        bossAlive: this.bosses.some(boss => boss.snapshot().alive),
      })
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
