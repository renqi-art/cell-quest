import Phaser from 'phaser'
import {
  createEnemyState,
  stepEnemy,
  type ClassicEnemyObservation,
  type ClassicEnemyState,
} from '@/shared/classic/simulation/EnemyBrain'
import {
  applyCombatHit,
  createCombatant,
  tickCombatant,
  type ClassicCombatantState,
} from '@/shared/classic/simulation/CombatRules'
import type { ClassicEnemyKind } from '@/shared/classic/types'
import { CLASSIC_SIMULATION_HZ, CLASSIC_TILE_SIZE } from '../config/classic-physics'
import type { CombatEnemyHit } from '../systems/CombatSystem'

const ENEMY_COLOR: Readonly<Record<ClassicEnemyKind, number>> = {
  staph: 0x74c365,
  'staph-large': 0x3e9b4f,
  strep: 0xd35757,
}

export class EnemyActor {
  readonly shape: Phaser.GameObjects.Rectangle
  readonly body: Phaser.Physics.Arcade.Body
  private brainState: ClassicEnemyState
  private combatState: ClassicCombatantState

  constructor(
    scene: Phaser.Scene,
    readonly kind: ClassicEnemyKind,
    col: number,
    row: number,
  ) {
    const size = kind === 'staph-large' ? 44 : 26
    this.shape = scene.add.rectangle(
      col * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
      row * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
      size,
      size,
      ENEMY_COLOR[kind],
    )
    this.shape.setName(`classic-enemy-${kind}`)
    scene.physics.add.existing(this.shape)
    this.body = this.shape.body as Phaser.Physics.Arcade.Body
    this.body.setAllowGravity(false)
    this.body.setCollideWorldBounds(true)
    this.brainState = createEnemyState(kind)
    this.combatState = createCombatant(kind === 'staph-large' ? 2 : 1)
  }

  step(observation: ClassicEnemyObservation): void {
    if (!this.combatState.alive) return
    this.combatState = tickCombatant(this.combatState)
    const result = stepEnemy(this.brainState, observation)
    this.brainState = result.state
    this.body.setVelocityX(result.velocityX * CLASSIC_SIMULATION_HZ)
  }

  hit(damage: number): CombatEnemyHit {
    const result = applyCombatHit(this.combatState, {
      damage,
      invincibilityTicks: 0,
      rewardKind: this.kind,
    })
    this.combatState = result.state
    if (!result.state.alive) this.deactivate()
    return {
      applied: result.applied,
      alive: result.state.alive,
      reward: result.reward,
    }
  }

  isAlive(): boolean {
    return this.combatState.alive
  }

  snapshot(): { readonly brain: ClassicEnemyState; readonly combat: ClassicCombatantState } {
    return { brain: this.brainState, combat: this.combatState }
  }

  private deactivate(): void {
    this.body.enable = false
    this.body.stop()
    this.shape.setActive(false).setVisible(false)
  }
}
