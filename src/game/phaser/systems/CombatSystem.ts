import type { ClassicCombatReward } from '@/shared/classic/simulation/CombatRules'

export interface CombatPlayerPort {
  applyDamage(amount: number): boolean
  launch(velocityY: number): void
}

export interface CombatEnemyHit {
  readonly applied: boolean
  readonly alive: boolean
  readonly reward: ClassicCombatReward | null
}

export interface CombatEnemyPort {
  hit(damage: number): CombatEnemyHit
}

export interface PlayerEnemyContact {
  readonly dashing: boolean
  readonly descending: boolean
  readonly playerBottom: number
  readonly enemyTop: number
}

export type CombatSource = 'dash' | 'stomp' | 'melee' | 'projectile'

export type CombatResolution =
  | { readonly kind: 'none'; readonly reward: null }
  | { readonly kind: 'player-hit'; readonly reward: null }
  | { readonly kind: 'stomp'; readonly reward: ClassicCombatReward | null }
  | { readonly kind: 'enemy-hit'; readonly reward: ClassicCombatReward | null }

export class CombatSystem {
  resolvePlayerEnemy(
    player: CombatPlayerPort,
    enemy: CombatEnemyPort,
    contact: PlayerEnemyContact,
  ): CombatResolution {
    if (contact.dashing) return this.hitEnemy(enemy, 'dash')
    if (contact.descending && contact.playerBottom <= contact.enemyTop + 6) {
      const result = this.hitEnemy(enemy, 'stomp')
      if (result.kind === 'enemy-hit') player.launch(-8)
      return { kind: 'stomp', reward: result.reward }
    }
    return player.applyDamage(5)
      ? { kind: 'player-hit', reward: null }
      : { kind: 'none', reward: null }
  }

  hitEnemy(enemy: CombatEnemyPort, source: CombatSource): CombatResolution {
    const damage = source === 'dash' ? 2 : 1
    const result = enemy.hit(damage)
    return result.applied
      ? { kind: 'enemy-hit', reward: result.reward }
      : { kind: 'none', reward: null }
  }
}
