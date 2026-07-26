import type { ClassicEnemyKind } from '../types'

export const CLASSIC_ENEMY_TUNING = Object.freeze({
  staphSpeed: 0.6,
  largeStaphSpeed: 0.4,
  strepRange: 180,
  strepWindupTicks: 42,
  strepDashSpeed: 5.5,
  strepDashTicks: 30,
  strepCooldownTicks: 120,
})

export type ClassicEnemyMode = 'patrol' | 'idle' | 'windup' | 'dash' | 'cooldown'

export interface ClassicEnemyState {
  readonly kind: ClassicEnemyKind
  readonly mode: ClassicEnemyMode
  readonly direction: -1 | 1
  readonly ticksRemaining: number
}

export interface ClassicEnemyObservation {
  readonly playerDeltaX: number
  readonly playerDeltaY: number
  readonly wallAhead: boolean
  readonly groundAhead: boolean
}

export interface ClassicEnemyDecision {
  readonly state: ClassicEnemyState
  readonly velocityX: number
}

export function createEnemyState(kind: ClassicEnemyKind): ClassicEnemyState {
  return {
    kind,
    mode: kind === 'strep' ? 'idle' : 'patrol',
    direction: 1,
    ticksRemaining: 0,
  }
}

export function stepEnemy(
  state: ClassicEnemyState,
  observation: ClassicEnemyObservation,
): ClassicEnemyDecision {
  if (state.kind !== 'strep') return stepPatrol(state, observation)

  if (state.mode === 'idle') {
    const inRange = Math.abs(observation.playerDeltaX) <= CLASSIC_ENEMY_TUNING.strepRange
      && Math.abs(observation.playerDeltaY) <= CLASSIC_ENEMY_TUNING.strepRange
    if (!inRange) return { state, velocityX: 0 }
    const direction = observation.playerDeltaX < 0 ? -1 : 1
    return {
      state: {
        ...state,
        mode: 'windup',
        direction,
        ticksRemaining: CLASSIC_ENEMY_TUNING.strepWindupTicks,
      },
      velocityX: 0,
    }
  }

  if (state.mode === 'windup') {
    if (state.ticksRemaining > 1) {
      return {
        state: { ...state, ticksRemaining: state.ticksRemaining - 1 },
        velocityX: 0,
      }
    }
    return {
      state: {
        ...state,
        mode: 'dash',
        ticksRemaining: CLASSIC_ENEMY_TUNING.strepDashTicks,
      },
      velocityX: state.direction * CLASSIC_ENEMY_TUNING.strepDashSpeed,
    }
  }

  if (state.mode === 'dash') {
    if (observation.wallAhead || state.ticksRemaining <= 1) {
      return {
        state: {
          ...state,
          mode: 'cooldown',
          ticksRemaining: CLASSIC_ENEMY_TUNING.strepCooldownTicks,
        },
        velocityX: 0,
      }
    }
    return {
      state: { ...state, ticksRemaining: state.ticksRemaining - 1 },
      velocityX: state.direction * CLASSIC_ENEMY_TUNING.strepDashSpeed,
    }
  }

  if (state.ticksRemaining > 1) {
    return {
      state: { ...state, ticksRemaining: state.ticksRemaining - 1 },
      velocityX: 0,
    }
  }
  return {
    state: { ...state, mode: 'idle', ticksRemaining: 0 },
    velocityX: 0,
  }
}

function stepPatrol(
  state: ClassicEnemyState,
  observation: ClassicEnemyObservation,
): ClassicEnemyDecision {
  const mustTurn = observation.wallAhead || !observation.groundAhead
  const direction = mustTurn ? (state.direction === 1 ? -1 : 1) : state.direction
  const speed = state.kind === 'staph-large'
    ? CLASSIC_ENEMY_TUNING.largeStaphSpeed
    : CLASSIC_ENEMY_TUNING.staphSpeed
  return {
    state: { ...state, direction },
    velocityX: direction * speed,
  }
}
