import { describe, it, expect } from 'vitest'
import { CaseEngine } from '@/shared/domain/CaseEngine'
import type { CaseConfig } from '@/shared/types/case'

const defaultConfig: CaseConfig = {
  version: 1,
  primaryCell: 'rbc',
  allyMode: 'scripted',
  vitals: {
    oxygen: 80,
    infection: 20,
    tissue: 70,
    oxygenDecayPerSecond: 2,
    infectionGrowthPerSecond: 1.5,
    tissueDecayPerSecond: 0.5,
  },
  goals: {
    oxygenRoutes: [{ id: 'route_0', sourceId: 'o2_0', targetIds: ['tissue_0'], requiredDeliveries: 1 }],
    infection: { nodeIds: ['inf_0'], requiredClears: 1 },
    stabilitySeconds: 3,
  },
  allowedEvents: [],
  briefing: { start: '', success: '', failure: '' },
  education: { topic: '', sourceIds: [] },
}

describe('CaseEngine', () => {
  it('initializes with clamped vitals', () => {
    const engine = new CaseEngine(defaultConfig)
    const snap = engine.getSnapshot()
    expect(snap.vitals).toEqual({ oxygen: 80, infection: 20, tissue: 70 })
    expect(snap.status).toBe('active')
    expect(engine.isActive()).toBe(true)
    expect(engine.isComplete()).toBe(false)
    expect(engine.isFailed()).toBe(false)
  })

  it('clamps vitals to [0, 100]', () => {
    const config: CaseConfig = {
      ...defaultConfig,
      vitals: { ...defaultConfig.vitals, oxygen: 150, infection: -10, tissue: 60 },
    }
    const engine = new CaseEngine(config)
    expect(engine.getSnapshot().vitals.oxygen).toBe(100)
    expect(engine.getSnapshot().vitals.infection).toBe(0)
  })

  it('processes oxygenDelivered event', () => {
    const engine = new CaseEngine(defaultConfig)
    engine.dispatch({ type: 'oxygenDelivered', amount: 10, nodeId: 'o2_0' })
    const snap = engine.getSnapshot()
    expect(snap.vitals.oxygen).toBe(90)
    expect(snap.progress.oxygenDeliveries).toBe(1)
  })

  it('deduplicates infectionCleared by nodeId', () => {
    const engine = new CaseEngine(defaultConfig)
    expect(engine.dispatch({ type: 'infectionCleared', amount: 15, nodeId: 'inf_0' })).toBe(true)
    expect(engine.dispatch({ type: 'infectionCleared', amount: 15, nodeId: 'inf_0' })).toBe(false)
    const snap = engine.getSnapshot()
    expect(snap.vitals.infection).toBe(5)
    expect(snap.progress.infectionSitesCleared).toBe(1)
  })

  it('decays vitals on update (1 second)', () => {
    const engine = new CaseEngine(defaultConfig)
    engine.update(1)
    const snap = engine.getSnapshot()
    // oxygen: 80 - 2 * 1.2 = 77.6 (infectionFactor = 1 + 20/100 = 1.2)
    expect(snap.vitals.oxygen).toBeCloseTo(77.6, 0)
    // infection: 20 + 1.5 = 21.5
    expect(snap.vitals.infection).toBeCloseTo(21.5, 0)
  })

  it('amplifies oxygen decay when infection is high', () => {
    const config: CaseConfig = {
      ...defaultConfig,
      vitals: { ...defaultConfig.vitals, infection: 80 },
    }
    const engine = new CaseEngine(config)
    engine.update(1)
    // infectionFactor = 1 + 80/100 = 1.8
    // oxygen: 80 - 2 * 1.8 = 76.4
    expect(engine.getSnapshot().vitals.oxygen).toBeCloseTo(76.4, 0)
  })

  it('degrades tissue when oxygen is critically low', () => {
    const config: CaseConfig = {
      ...defaultConfig,
      vitals: { ...defaultConfig.vitals, oxygen: 30 },
    }
    const engine = new CaseEngine(config)
    engine.update(1)
    // tissue: 70 - 0.5 = 69.5
    expect(engine.getSnapshot().vitals.tissue).toBeCloseTo(69.5, 0)
  })

  it('degrades tissue when infection is critically high', () => {
    const config: CaseConfig = {
      ...defaultConfig,
      vitals: { ...defaultConfig.vitals, infection: 85 },
    }
    const engine = new CaseEngine(config)
    engine.update(1)
    expect(engine.getSnapshot().vitals.tissue).toBeLessThan(70)
  })

  it('fails when tissue reaches 0', () => {
    const config: CaseConfig = {
      ...defaultConfig,
      vitals: {
        ...defaultConfig.vitals,
        tissue: 1,
        oxygenDecayPerSecond: 0,
        infectionGrowthPerSecond: 0,
        tissueDecayPerSecond: 5,
      },
    }
    // Need oxygen < 35 or infection > 70 to trigger tissue decay
    const engine = new CaseEngine({ ...config, vitals: { ...config.vitals, oxygen: 30 } })
    engine.update(1)
    // tissue: 1 - 5 = -4 → clamped to 0 → failed
    expect(engine.getSnapshot().status).toBe('failed')
    expect(engine.isFailed()).toBe(true)
  })

  it('completes after stability threshold', () => {
    const engine = new CaseEngine(defaultConfig)
    // Meet all goals
    engine.dispatch({ type: 'oxygenDelivered', amount: 10, nodeId: 'o2_0' })
    engine.dispatch({ type: 'infectionCleared', amount: 20, nodeId: 'inf_0' })
    // Vitals are still good: oxygen=90, infection=5, tissue=70
    engine.update(1)
    expect(engine.getSnapshot().stableFor).toBe(1)
    expect(engine.getSnapshot().status).toBe('active')
    engine.update(3) // total 4 >= stabilitySeconds=3
    expect(engine.getSnapshot().status).toBe('complete')
    expect(engine.isComplete()).toBe(true)
  })

  it('resets stableFor on regression (vitals drop below threshold before stability)', () => {
    const config: CaseConfig = {
      ...defaultConfig,
      vitals: {
        ...defaultConfig.vitals,
        oxygen: 42,  // just above 40 threshold
        infection: 20,
        tissue: 70,
        oxygenDecayPerSecond: 3,  // fast decay
        infectionGrowthPerSecond: 0,
        tissueDecayPerSecond: 0,
      },
    }
    const engine = new CaseEngine(config)
    engine.dispatch({ type: 'oxygenDelivered', amount: 10, nodeId: 'o2_0' })
    engine.dispatch({ type: 'infectionCleared', amount: 20, nodeId: 'inf_0' })
    engine.update(1) // oxygen: 42+10 - 3*1.2 ≈ 48.4, still > 40, stableFor=1
    expect(engine.getSnapshot().stableFor).toBe(1)
    engine.update(5) // oxygen: ~48.4 - 3*1.2*5 ≈ 30.4, below 40! stability resets
    expect(engine.getSnapshot().stableFor).toBe(0)
  })

  it('ignores dispatch after completion', () => {
    const engine = new CaseEngine(defaultConfig)
    engine.dispatch({ type: 'oxygenDelivered', amount: 10, nodeId: 'o2_0' })
    engine.dispatch({ type: 'infectionCleared', amount: 20, nodeId: 'inf_0' })
    engine.update(5)
    expect(engine.getSnapshot().status).toBe('complete')
    const prevOxygen = engine.getSnapshot().vitals.oxygen
    engine.dispatch({ type: 'oxygenDelivered', amount: 10, nodeId: 'o2_1' })
    expect(engine.getSnapshot().vitals.oxygen).toBe(prevOxygen) // no change
  })

  it('ignores update after completion', () => {
    const engine = new CaseEngine(defaultConfig)
    engine.dispatch({ type: 'oxygenDelivered', amount: 10, nodeId: 'o2_0' })
    engine.dispatch({ type: 'infectionCleared', amount: 20, nodeId: 'inf_0' })
    engine.update(5)
    const prevVitals = { ...engine.getSnapshot().vitals }
    engine.update(10)
    expect(engine.getSnapshot().vitals).toEqual(prevVitals)
  })

  it('handles playerDied event', () => {
    const engine = new CaseEngine(defaultConfig)
    engine.dispatch({ type: 'playerDied', playerIndex: 1 })
    const snap = engine.getSnapshot()
    expect(snap.vitals.oxygen).toBe(72)   // 80 - 8
    expect(snap.vitals.infection).toBe(26) // 20 + 6
    expect(snap.vitals.tissue).toBe(65)   // 70 - 5
  })

  it('playerDied can cause failure if tissue reaches 0', () => {
    const config: CaseConfig = {
      ...defaultConfig,
      vitals: { ...defaultConfig.vitals, tissue: 4 },
    }
    const engine = new CaseEngine(config)
    engine.dispatch({ type: 'playerDied', playerIndex: 1 })
    // tissue: 4 - 5 = -1 → clamped to 0 → failed
    expect(engine.isFailed()).toBe(true)
  })

  it('buildResult returns correct report', () => {
    const engine = new CaseEngine(defaultConfig)
    engine.dispatch({ type: 'oxygenDelivered', amount: 10, nodeId: 'o2_0' })
    engine.dispatch({ type: 'infectionCleared', amount: 20, nodeId: 'inf_0' })
    engine.dispatch({ type: 'playerDied', playerIndex: 1 })
    engine.update(5)
    const result = engine.buildResult()
    expect(result.status).toBe('complete')
    expect(result.progress.oxygenDeliveries).toBe(1)
    expect(result.progress.infectionSitesCleared).toBe(1)
    expect(result.deaths).toBe(1)
    expect(result.durationMs).toBeGreaterThan(0)
  })

  it('currentObjective shows remaining goals', () => {
    const engine = new CaseEngine(defaultConfig)
    const snap1 = engine.getSnapshot()
    expect(snap1.currentObjective).toContain('供氧')
    expect(snap1.currentObjective).toContain('清除感染')

    engine.dispatch({ type: 'oxygenDelivered', amount: 10, nodeId: 'o2_0' })
    const snap2 = engine.getSnapshot()
    expect(snap2.currentObjective).not.toContain('供氧')
    expect(snap2.currentObjective).toContain('清除感染')

    engine.dispatch({ type: 'infectionCleared', amount: 20, nodeId: 'inf_0' })
    const snap3 = engine.getSnapshot()
    expect(snap3.currentObjective).toContain('保持指标稳定')
  })

  it('natural tissue regeneration when vitals are good', () => {
    const engine = new CaseEngine(defaultConfig)
    engine.dispatch({ type: 'oxygenDelivered', amount: 20, nodeId: 'o2_0' })
    engine.dispatch({ type: 'infectionCleared', amount: 25, nodeId: 'inf_0' })
    // Now oxygen=100, infection=0, tissue=70
    // Manual damage:
    engine.dispatch({ type: 'playerDied', playerIndex: 1 })
    // tissue: 70 - 5 = 65
    const beforeRegen = engine.getSnapshot().vitals.tissue
    engine.update(10) // 10 seconds: +0.3*10 = +3, max 100
    expect(engine.getSnapshot().vitals.tissue).toBeGreaterThan(beforeRegen)
  })
})
