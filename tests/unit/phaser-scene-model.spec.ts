import { describe, expect, it } from 'vitest'
import { buildPhaserSceneModel } from '@/game/phaser/buildPhaserSceneModel'
import { createCaseTemplate } from '@/shared/models/case-templates'

describe('Phaser case scene model', () => {
  it('maps terrain, spawn, and physiological nodes without finish semantics', () => {
    const draft = createCaseTemplate('rbc-transport')
    const model = buildPhaserSceneModel({ ...draft, map: draft.map.map((row, index) => index === 13 ? row.slice(0, 30) + 'F' + row.slice(31) : row) })
    expect(model.solids.length).toBeGreaterThan(0)
    expect(model.spawn).toEqual(expect.objectContaining({ x: 1, y: 13 }))
    expect(model.nodes.some(node => node.kind === 'oxygen-source')).toBe(true)
    expect(model.nodes.some(node => node.kind === 'target-tissue')).toBe(true)
    expect(model.solids.every(tile => tile.tile === '#' || tile.tile === '=')).toBe(true)
  })

  it('chooses a bounded scale that fits the viewport', () => {
    const model = buildPhaserSceneModel(createCaseTemplate('wbc-infection'), { width: 800, height: 450 })
    expect(model.tileSize).toBeGreaterThanOrEqual(6)
    expect(model.worldWidth).toBeLessThanOrEqual(800)
    expect(model.worldHeight).toBeLessThanOrEqual(450)
  })
})
