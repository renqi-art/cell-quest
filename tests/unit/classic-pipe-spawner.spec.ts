import { describe, expect, it } from 'vitest'
import { PipeSpawnerState } from '@/shared/classic/simulation/PipeSpawnerState'

describe('classic pipe spawner state', () => {
  it.each(['contact', 'proximity'] as const)('spawns on a %s trigger', (trigger) => {
    const spawner = new PipeSpawnerState({ trigger, intervalTicks: 3, maxSpawn: 2 })
    expect(spawner.step(true, 0).spawn).toBe(true)
    expect(spawner.step(false, 0).spawn).toBe(false)
  })

  it('spawns timer pipes at intervals and respects active/max limits', () => {
    const spawner = new PipeSpawnerState({ trigger: 'timer', intervalTicks: 2, maxSpawn: 2 })
    expect(spawner.step(false, 0).spawn).toBe(false)
    expect(spawner.step(false, 0).spawn).toBe(true)
    expect(spawner.step(false, 2).spawn).toBe(false)
    spawner.step(false, 0)
    expect(spawner.step(false, 0).spawn).toBe(false)
  })
})
