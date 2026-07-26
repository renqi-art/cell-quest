export interface ClassicProjectileState {
  readonly x: number
  readonly y: number
  readonly velocityX: number
  readonly velocityY: number
  readonly damage: number
  readonly lifeTicks: number
  readonly active: boolean
}

export type ClassicProjectileCollision = 'none' | 'terrain' | 'enemy'
export type ClassicProjectileEffect = 'expired' | 'hit-terrain' | 'hit-enemy' | null

export interface ClassicProjectileStep {
  readonly state: ClassicProjectileState
  readonly effect: ClassicProjectileEffect
}

export function createProjectileState(
  initial: Pick<ClassicProjectileState, 'x' | 'y' | 'velocityX' | 'velocityY'>,
): ClassicProjectileState {
  return {
    ...initial,
    damage: 1,
    lifeTicks: 120,
    active: true,
  }
}

export function stepProjectile(
  state: ClassicProjectileState,
  collision: ClassicProjectileCollision,
): ClassicProjectileStep {
  if (!state.active) return { state, effect: null }
  if (collision !== 'none') {
    return {
      state: { ...state, active: false },
      effect: collision === 'enemy' ? 'hit-enemy' : 'hit-terrain',
    }
  }
  const lifeTicks = state.lifeTicks - 1
  return {
    state: {
      ...state,
      x: state.x + state.velocityX,
      y: state.y + state.velocityY,
      lifeTicks,
      active: lifeTicks > 0,
    },
    effect: lifeTicks > 0 ? null : 'expired',
  }
}
