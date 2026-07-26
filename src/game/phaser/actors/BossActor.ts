import Phaser from 'phaser'
import {
  createBossState,
  damageBoss,
  stepBoss,
  type BossDecision,
  type BossEffect,
  type BossState,
} from '@/shared/classic/simulation/BossBrain'
import { CLASSIC_TILE_SIZE } from '../config/classic-physics'

export class BossActor {
  readonly shape: Phaser.GameObjects.Rectangle
  readonly body: Phaser.Physics.Arcade.Body
  private state: BossState = createBossState()

  constructor(scene: Phaser.Scene, col: number, row: number) {
    this.shape = scene.add.rectangle(
      col * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
      row * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
      72,
      56,
      0xd5a62c,
    )
    this.shape.setName('classic-boss')
    scene.physics.add.existing(this.shape)
    this.body = this.shape.body as Phaser.Physics.Arcade.Body
    this.body.setAllowGravity(false)
    this.body.setCollideWorldBounds(true)
  }

  step(playerDistance: number, random: () => number): readonly BossEffect[] {
    if (!this.state.alive) return []
    const result = stepBoss(this.state, { playerDistance, wasHit: false }, random)
    this.apply(result)
    const speed = result.state.phase === 3 ? 45 : 24
    if (this.body.blocked.left) this.body.setVelocityX(speed)
    else if (this.body.blocked.right) this.body.setVelocityX(-speed)
    else if (this.body.velocity.x === 0) this.body.setVelocityX(-speed)
    return result.effects
  }

  hit(damage: number): readonly BossEffect[] {
    const result = damageBoss(this.state, damage)
    this.apply(result)
    return result.effects
  }

  snapshot(): BossState {
    return this.state
  }

  private apply(decision: BossDecision): void {
    this.state = decision.state
    this.shape.setAlpha(decision.state.shieldHp > 0 ? 0.72 : 1)
    if (!decision.state.alive) {
      this.body.enable = false
      this.body.stop()
      this.shape.setActive(false).setVisible(false)
    }
  }
}
