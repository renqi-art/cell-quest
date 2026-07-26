export const CLASSIC_HAZARD_TUNING = Object.freeze({
  spikeDamage: 5,
  damageInvincibilityTicks: 90,
  springVelocity: -14,
  heartSpringVelocity: -16,
})

export type ClassicHazardResult =
  | {
      readonly type: 'damage'
      readonly amount: number
      readonly invincibilityTicks: number
    }
  | {
      readonly type: 'launch'
      readonly velocityY: number
    }

export function resolveHazardContact(tile: string): ClassicHazardResult | null {
  if (tile === '^') {
    return {
      type: 'damage',
      amount: CLASSIC_HAZARD_TUNING.spikeDamage,
      invincibilityTicks: CLASSIC_HAZARD_TUNING.damageInvincibilityTicks,
    }
  }
  if (tile === 'V') {
    return { type: 'launch', velocityY: CLASSIC_HAZARD_TUNING.springVelocity }
  }
  if (tile === 'J') {
    return { type: 'launch', velocityY: CLASSIC_HAZARD_TUNING.heartSpringVelocity }
  }
  return null
}
