import { describe, expect, it } from 'vitest'
import { TideState } from '@/shared/classic/simulation/TideState'

describe('classic tide state', () => {
  it('moves through surge, warning, and normal phases on fixed ticks', () => {
    expect(new TideState(0).step(false).phase).toBe('surge')
    expect(new TideState(149).step(false).phase).toBe('warning')
    expect(new TideState(179).step(false).phase).toBe('normal')
  })

  it('reports pause without freezing the physiological cycle', () => {
    const paused = new TideState(10).step(true)
    expect(paused.phase).toBe('paused')
    expect(paused.state.tick).toBe(11)
  })

  it('reduces surge duration and drain as healing progresses', () => {
    const healthy = new TideState(100, 1).step(false)
    expect(healthy.phase).toBe('normal')
    expect(healthy.drainMultiplier).toBe(1)
    const wounded = new TideState(100, 0).step(false)
    expect(wounded.phase).toBe('surge')
    expect(wounded.drainMultiplier).toBe(3)
  })
})
