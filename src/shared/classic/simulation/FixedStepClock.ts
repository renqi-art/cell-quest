export interface FixedStepClockOptions {
  readonly hz: number
  readonly maxCatchUpSteps: number
}

export class FixedStepClock {
  private readonly stepMs: number
  private accumulatorMs = 0

  constructor(private readonly options: FixedStepClockOptions) {
    if (!Number.isFinite(options.hz) || options.hz <= 0) throw new Error('Fixed-step hz must be positive')
    if (!Number.isInteger(options.maxCatchUpSteps) || options.maxCatchUpSteps <= 0) {
      throw new Error('Fixed-step maxCatchUpSteps must be a positive integer')
    }
    this.stepMs = 1000 / options.hz
  }

  advance(deltaMs: number, tick: () => void): number {
    const safeDelta = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0
    this.accumulatorMs = Math.min(
      this.accumulatorMs + safeDelta,
      this.stepMs * this.options.maxCatchUpSteps,
    )
    let steps = 0
    while (this.accumulatorMs + this.stepMs * 1e-9 >= this.stepMs && steps < this.options.maxCatchUpSteps) {
      tick()
      this.accumulatorMs -= this.stepMs
      steps += 1
    }
    if (Math.abs(this.accumulatorMs) < 1e-9) this.accumulatorMs = 0
    return steps
  }

  reset(): void {
    this.accumulatorMs = 0
  }
}
