import { describe, expect, it } from 'vitest'
import { FixedStepClock } from '@/shared/classic/simulation/FixedStepClock'

describe('FixedStepClock', () => {
  it('runs six 60 Hz ticks for 100 ms', () => {
    const clock = new FixedStepClock({ hz: 60, maxCatchUpSteps: 8 })
    let ticks = 0

    expect(clock.advance(100, () => { ticks += 1 })).toBe(6)
    expect(ticks).toBe(6)
  })

  it('caps a long frame and discards excess catch-up time', () => {
    const clock = new FixedStepClock({ hz: 60, maxCatchUpSteps: 8 })
    let ticks = 0

    expect(clock.advance(10_000, () => { ticks += 1 })).toBe(8)
    expect(clock.advance(0, () => { ticks += 1 })).toBe(0)
    expect(ticks).toBe(8)
  })

  it('produces the same number of fixed ticks for different render deltas', () => {
    const simulate = (deltas: readonly number[]) => {
      const clock = new FixedStepClock({ hz: 60, maxCatchUpSteps: 8 })
      let ticks = 0
      for (const delta of deltas) clock.advance(delta, () => { ticks += 1 })
      return ticks
    }

    expect(simulate(Array.from({ length: 30 }, () => 1000 / 30))).toBe(60)
    expect(simulate(Array.from({ length: 60 }, () => 1000 / 60))).toBe(60)
    expect(simulate(Array.from({ length: 120 }, () => 1000 / 120))).toBe(60)
  })
})
