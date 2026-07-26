import { describe, expect, it } from 'vitest'
import { applyCombatHit, createCombatant } from '@/shared/classic/simulation/CombatRules'

describe('classic combat rules', () => {
  it('applies one hit during an invincibility window', () => {
    const first = applyCombatHit(createCombatant(100), {
      damage: 5,
      invincibilityTicks: 90,
      rewardKind: null,
    })
    expect(first.state.hp).toBe(95)
    expect(first.state.invincibleTicks).toBe(90)
    expect(applyCombatHit(first.state, {
      damage: 5,
      invincibilityTicks: 90,
      rewardKind: null,
    }).applied).toBe(false)
  })

  it('kills large staph with two damage and requests two split children', () => {
    const result = applyCombatHit(createCombatant(2), {
      damage: 2,
      invincibilityTicks: 0,
      rewardKind: 'staph-large',
    })
    expect(result.state.alive).toBe(false)
    expect(result.reward).toEqual({ xp: 30, split: 2 })
  })

  it('awards the configured projectile kill reward', () => {
    const result = applyCombatHit(createCombatant(1), {
      damage: 1,
      invincibilityTicks: 0,
      rewardKind: 'strep',
    })
    expect(result.reward).toEqual({ xp: 20, split: 0 })
  })
})
