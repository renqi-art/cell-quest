import type { ClassicEnemyKind } from '../types'

export interface ClassicCombatantState {
  readonly hp: number
  readonly alive: boolean
  readonly invincibleTicks: number
}

export interface ClassicCombatHit {
  readonly damage: number
  readonly invincibilityTicks: number
  readonly rewardKind: ClassicEnemyKind | null
}

export interface ClassicCombatReward {
  readonly xp: number
  readonly split: number
}

export interface ClassicCombatResult {
  readonly state: ClassicCombatantState
  readonly applied: boolean
  readonly reward: ClassicCombatReward | null
}

const REWARDS: Readonly<Record<ClassicEnemyKind, ClassicCombatReward>> = Object.freeze({
  staph: { xp: 10, split: 0 },
  'staph-large': { xp: 30, split: 2 },
  strep: { xp: 20, split: 0 },
})

export function createCombatant(hp: number): ClassicCombatantState {
  return { hp: Math.max(0, hp), alive: hp > 0, invincibleTicks: 0 }
}

export function applyCombatHit(
  state: ClassicCombatantState,
  hit: ClassicCombatHit,
): ClassicCombatResult {
  if (!state.alive || state.invincibleTicks > 0 || hit.damage <= 0) {
    return { state, applied: false, reward: null }
  }
  const hp = Math.max(0, state.hp - hit.damage)
  const alive = hp > 0
  return {
    state: {
      hp,
      alive,
      invincibleTicks: alive ? Math.max(0, hit.invincibilityTicks) : 0,
    },
    applied: true,
    reward: !alive && hit.rewardKind ? REWARDS[hit.rewardKind] : null,
  }
}

export function tickCombatant(state: ClassicCombatantState): ClassicCombatantState {
  if (state.invincibleTicks <= 0) return state
  return { ...state, invincibleTicks: state.invincibleTicks - 1 }
}
