import { describe, expect, it, vi } from 'vitest'
import {
  CombatSystem,
  type CombatEnemyPort,
  type CombatPlayerPort,
} from '@/game/phaser/systems/CombatSystem'

function player(): CombatPlayerPort {
  return {
    applyDamage: vi.fn(() => true),
    launch: vi.fn(),
  }
}

function enemy(alive = true): CombatEnemyPort {
  return {
    hit: vi.fn(() => ({
      applied: true,
      alive,
      reward: alive ? null : { xp: 10, split: 0 },
    })),
  }
}

describe('CombatSystem collision seam', () => {
  it('routes dash and stomp contacts to the enemy once', () => {
    const system = new CombatSystem()
    const target = enemy(false)
    const actor = player()

    expect(system.resolvePlayerEnemy(actor, target, {
      dashing: true,
      descending: false,
      playerBottom: 20,
      enemyTop: 20,
    }).kind).toBe('enemy-hit')
    expect(target.hit).toHaveBeenCalledTimes(1)
    expect(target.hit).toHaveBeenCalledWith(2)

    const stompTarget = enemy(false)
    expect(system.resolvePlayerEnemy(actor, stompTarget, {
      dashing: false,
      descending: true,
      playerBottom: 18,
      enemyTop: 20,
    }).kind).toBe('stomp')
    expect(stompTarget.hit).toHaveBeenCalledWith(1)
    expect(actor.launch).toHaveBeenCalledWith(-8)
  })

  it('damages the player on an ordinary body contact', () => {
    const system = new CombatSystem()
    const actor = player()

    expect(system.resolvePlayerEnemy(actor, enemy(), {
      dashing: false,
      descending: false,
      playerBottom: 40,
      enemyTop: 20,
    }).kind).toBe('player-hit')
    expect(actor.applyDamage).toHaveBeenCalledWith(5)
  })

  it('routes projectile and melee hits through the enemy port', () => {
    const system = new CombatSystem()
    const target = enemy(false)

    expect(system.hitEnemy(target, 'projectile').kind).toBe('enemy-hit')
    expect(system.hitEnemy(target, 'melee').kind).toBe('enemy-hit')
    expect(target.hit).toHaveBeenNthCalledWith(1, 1)
    expect(target.hit).toHaveBeenNthCalledWith(2, 1)
  })
})
