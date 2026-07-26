import { describe, expect, it } from 'vitest'
import {
  CLASSIC_ENEMY_TUNING,
  createEnemyState,
  stepEnemy,
} from '@/shared/classic/simulation/EnemyBrain'

describe('classic enemy brain', () => {
  it('patrols staph and turns at walls or ledges', () => {
    const state = createEnemyState('staph')
    const forward = stepEnemy(state, {
      playerDeltaX: 500,
      playerDeltaY: 0,
      wallAhead: false,
      groundAhead: true,
    })
    expect(forward.velocityX).toBe(CLASSIC_ENEMY_TUNING.staphSpeed)
    const turned = stepEnemy(forward.state, {
      playerDeltaX: 500,
      playerDeltaY: 0,
      wallAhead: true,
      groundAhead: true,
    })
    expect(turned.state.direction).toBe(-1)
    expect(turned.velocityX).toBe(-CLASSIC_ENEMY_TUNING.staphSpeed)
  })

  it('moves strep through idle, windup, dash, and cooldown', () => {
    let state = createEnemyState('strep')
    state = stepEnemy(state, {
      playerDeltaX: 100,
      playerDeltaY: 0,
      wallAhead: false,
      groundAhead: true,
    }).state
    expect(state.mode).toBe('windup')
    for (let tick = 1; tick < CLASSIC_ENEMY_TUNING.strepWindupTicks; tick += 1) {
      state = stepEnemy(state, {
        playerDeltaX: 100,
        playerDeltaY: 0,
        wallAhead: false,
        groundAhead: true,
      }).state
    }
    const dash = stepEnemy(state, {
      playerDeltaX: 100,
      playerDeltaY: 0,
      wallAhead: false,
      groundAhead: true,
    })
    expect(dash.state.mode).toBe('dash')
    expect(dash.velocityX).toBe(CLASSIC_ENEMY_TUNING.strepDashSpeed)
    const stopped = stepEnemy(dash.state, {
      playerDeltaX: 20,
      playerDeltaY: 0,
      wallAhead: true,
      groundAhead: true,
    })
    expect(stopped.state.mode).toBe('cooldown')
  })
})
