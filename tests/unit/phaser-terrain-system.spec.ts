import { describe, expect, it } from 'vitest'
import { buildClassicTerrainPlan } from '@/game/phaser/systems/TerrainSystem'
import { parseClassicLevel } from '@/shared/classic/parseClassicLevel'

describe('Classic TerrainSystem plan', () => {
  it('separates solids, hazards, springs, checkpoints, and crumble platforms', () => {
    const parsed = parseClassicLevel({
      id: 'terrain-fixture',
      name: 'terrain',
      width: 8,
      cellType: 1,
      winCondition: 'reach-finish',
      sky: ['#000', '#111'],
      map: ['P^VJ_C F', '########'],
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const plan = buildClassicTerrainPlan(parsed.value)
    expect(plan.solids).toHaveLength(8)
    expect(plan.spikes).toEqual([{ col: 1, row: 0 }])
    expect(plan.springs).toEqual([
      { col: 2, row: 0, tile: 'V' },
      { col: 3, row: 0, tile: 'J' },
    ])
    expect(plan.crumble).toEqual([{ col: 4, row: 0 }])
    expect(plan.checkpoints).toEqual([{ col: 5, row: 0 }])
  })
})
