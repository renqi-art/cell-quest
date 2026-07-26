import { describe, expect, it } from 'vitest'
import {
  createClassicItemState,
  tickClassicItemState,
} from '@/shared/classic/simulation/ItemRules'

describe('classic item timers', () => {
  it('counts oxygen down in fixed ticks without going negative', () => {
    const state = createClassicItemState({ oxygenTicks: 5, shieldTicks: 5 })
    expect(tickClassicItemState(state, 3)).toMatchObject({
      oxygenTicks: 2,
      shieldTicks: 2,
    })
    expect(tickClassicItemState(state, 10)).toMatchObject({
      oxygenTicks: 0,
      shieldTicks: 0,
    })
  })
})
