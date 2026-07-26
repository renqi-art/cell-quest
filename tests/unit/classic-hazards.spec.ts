import { describe, expect, it } from 'vitest'
import { CLASSIC_HAZARD_TUNING, resolveHazardContact } from '@/shared/classic/simulation/HazardRules'

describe('classic hazard rules', () => {
  it('routes spikes through the common legacy damage amount', () => {
    expect(resolveHazardContact('^')).toEqual({
      type: 'damage',
      amount: 5,
      invincibilityTicks: 90,
    })
  })

  it('launches spring and heart-pump tiles at their fixed velocities', () => {
    expect(resolveHazardContact('V')).toEqual({
      type: 'launch',
      velocityY: CLASSIC_HAZARD_TUNING.springVelocity,
    })
    expect(resolveHazardContact('J')).toEqual({
      type: 'launch',
      velocityY: CLASSIC_HAZARD_TUNING.heartSpringVelocity,
    })
    expect(CLASSIC_HAZARD_TUNING.heartSpringVelocity)
      .toBeLessThan(CLASSIC_HAZARD_TUNING.springVelocity)
  })

  it('does not invent a hazard for ordinary terrain', () => {
    expect(resolveHazardContact('#')).toBeNull()
  })
})
