import { describe, expect, it } from 'vitest'
import { ClassicRunStats } from '@/shared/classic/simulation/ClassicRunStats'

describe('ClassicRunStats', () => {
  it('records kills, items, deaths, and elapsed time immutably', () => {
    const initial = new ClassicRunStats({ totalEnemies: 4, totalItems: 5 })
    const result = initial
      .record({ type: 'tick', elapsedMs: 1250 })
      .record({ type: 'kill' })
      .record({ type: 'item' })
      .record({ type: 'death' })
      .snapshot()

    expect(initial.snapshot()).toMatchObject({ elapsedMs: 0, kills: 0, items: 0, deaths: 0 })
    expect(result).toMatchObject({ elapsedMs: 1250, kills: 1, items: 1, deaths: 1 })
  })

  it('uses the legacy dual completion and star thresholds', () => {
    const twoStars = new ClassicRunStats({ totalEnemies: 5, totalItems: 5 })
      .record({ type: 'kill', count: 3 })
      .record({ type: 'item', count: 3 })
      .result()
    expect(twoStars).toMatchObject({ completionPercent: 60, stars: 2, perfect: false })

    const perfect = new ClassicRunStats({ totalEnemies: 2, totalItems: 2 })
      .record({ type: 'kill', count: 2 })
      .record({ type: 'item', count: 2 })
      .result()
    expect(perfect).toMatchObject({ completionPercent: 100, stars: 3, perfect: true })

    const death = new ClassicRunStats({ totalEnemies: 0, totalItems: 0 })
      .record({ type: 'death' })
      .result()
    expect(death).toMatchObject({ completionPercent: 100, stars: 2, perfect: false })
  })
})
