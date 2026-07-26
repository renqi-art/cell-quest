export type TidePhase = 'surge' | 'warning' | 'normal' | 'paused'

export interface TideResult {
  readonly state: TideState
  readonly phase: TidePhase
  readonly drainMultiplier: number
  readonly speedMultiplier: number
}

export class TideState {
  constructor(
    readonly tick = 0,
    readonly healingProgress = 0,
  ) {}

  step(paused: boolean): TideResult {
    const next = new TideState(this.tick + 1, clamp01(this.healingProgress))
    if (paused) {
      return {
        state: next,
        phase: 'paused',
        drainMultiplier: 1,
        speedMultiplier: 1,
      }
    }
    const cycleTicks = 360 + Math.floor(next.healingProgress * 180)
    const surgeTicks = Math.max(30, 180 - Math.floor(next.healingProgress * 90))
    const cycleTick = next.tick % cycleTicks
    const phase: TidePhase = cycleTick < surgeTicks - 30
      ? 'surge'
      : cycleTick < surgeTicks
        ? 'warning'
        : 'normal'
    const surge = phase === 'surge'
    return {
      state: next,
      phase,
      drainMultiplier: surge ? 3 * (1 - next.healingProgress * 0.5) : 1,
      speedMultiplier: surge ? 0.5 : 1,
    }
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
