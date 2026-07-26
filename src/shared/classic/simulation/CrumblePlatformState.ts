export const CLASSIC_PLATFORM_TUNING = Object.freeze({
  crumbleShakeTicks: 45,
  crumbleRespawnTicks: 240,
})

export type CrumblePlatformPhase = 'solid' | 'shaking' | 'gone'

export interface CrumblePlatformState {
  readonly phase: CrumblePlatformPhase
  readonly ticksRemaining: number
}

export interface FloatingPlatformMotion {
  readonly baseY: number
  readonly range: number
  readonly speed: number
  readonly phase: number
}

export function stepCrumblePlatform(
  state: CrumblePlatformState,
  contacted: boolean,
): CrumblePlatformState {
  if (state.phase === 'solid') {
    return contacted
      ? { phase: 'shaking', ticksRemaining: CLASSIC_PLATFORM_TUNING.crumbleShakeTicks }
      : state
  }
  const ticksRemaining = Math.max(0, state.ticksRemaining - 1)
  if (ticksRemaining > 0) return { ...state, ticksRemaining }
  if (state.phase === 'shaking') {
    return { phase: 'gone', ticksRemaining: CLASSIC_PLATFORM_TUNING.crumbleRespawnTicks }
  }
  return { phase: 'solid', ticksRemaining: 0 }
}

export function floatingPlatformY(motion: FloatingPlatformMotion, tick: number): number {
  return motion.baseY + Math.sin(tick * motion.speed + motion.phase) * motion.range
}
