import { describe, expect, it } from 'vitest'
import {
  createProjectileState,
  stepProjectile,
} from '@/shared/classic/simulation/ProjectileRules'

describe('classic projectile rules', () => {
  it('moves for 120 ticks then expires', () => {
    let state = createProjectileState({ x: 0, y: 0, velocityX: 6, velocityY: 0 })
    for (let tick = 0; tick < 119; tick += 1) state = stepProjectile(state, 'none').state
    expect(state.active).toBe(true)
    const expired = stepProjectile(state, 'none')
    expect(expired.state.active).toBe(false)
    expect(expired.effect).toBe('expired')
  })

  it.each(['terrain', 'enemy'] as const)('deactivates on %s collision', (collision) => {
    const state = createProjectileState({ x: 0, y: 0, velocityX: 6, velocityY: 0 })
    const result = stepProjectile(state, collision)
    expect(result.state.active).toBe(false)
    expect(result.effect).toBe(collision === 'enemy' ? 'hit-enemy' : 'hit-terrain')
  })
})
