import { describe, expect, it } from 'vitest'
import {
  CLASSIC_PLATFORM_TUNING,
  floatingPlatformY,
  stepCrumblePlatform,
  type CrumblePlatformState,
} from '@/shared/classic/simulation/CrumblePlatformState'

describe('classic platform states', () => {
  it('transitions solid to shaking to gone and respawns', () => {
    let state: CrumblePlatformState = { phase: 'solid', ticksRemaining: 0 }
    state = stepCrumblePlatform(state, true)
    expect(state).toEqual({
      phase: 'shaking',
      ticksRemaining: CLASSIC_PLATFORM_TUNING.crumbleShakeTicks,
    })
    for (let tick = 0; tick < CLASSIC_PLATFORM_TUNING.crumbleShakeTicks; tick += 1) {
      state = stepCrumblePlatform(state, false)
    }
    expect(state).toEqual({
      phase: 'gone',
      ticksRemaining: CLASSIC_PLATFORM_TUNING.crumbleRespawnTicks,
    })
    for (let tick = 0; tick < CLASSIC_PLATFORM_TUNING.crumbleRespawnTicks; tick += 1) {
      state = stepCrumblePlatform(state, false)
    }
    expect(state).toEqual({ phase: 'solid', ticksRemaining: 0 })
  })

  it('computes floating platform position from fixed tick and phase', () => {
    expect(floatingPlatformY({ baseY: 100, range: 32, speed: 0.035, phase: 0 }, 0)).toBe(100)
    expect(floatingPlatformY({ baseY: 100, range: 32, speed: 0.035, phase: Math.PI / 2 }, 0)).toBe(132)
  })
})
