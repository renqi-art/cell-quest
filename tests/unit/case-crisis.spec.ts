import { describe, expect, it } from 'vitest'
import { CaseEngine } from '@/shared/domain/CaseEngine'
import type { CaseConfig } from '@/shared/types/case'
import type { DirectorPlan } from '@/shared/types/director'

const config: CaseConfig = {
  version: 1, primaryCell: 'rbc', allyMode: 'scripted',
  vitals: { oxygen: 80, infection: 20, tissue: 70, oxygenDecayPerSecond: 2, infectionGrowthPerSecond: 1, tissueDecayPerSecond: 0.5 },
  goals: { oxygenRoutes: [], infection: { nodeIds: [], requiredClears: 0 }, stabilitySeconds: 30 },
  allowedEvents: ['ACUTE_HYPOXIA', 'INFECTION_REBOUND', 'TRANSPORT_BLOCKAGE', 'ATP_CRISIS'],
  briefing: { start: '', success: '', failure: '' }, education: { topic: '', sourceIds: [] },
}
function plan(eventId: DirectorPlan['eventId'], goal: DirectorPlan['goal'] = { oxygenDeliveries: 1 }): DirectorPlan {
  return { eventId, targetNode: 'tissue_0', severity: 2, goal, doctorLine: '危机', reason: '测试' }
}

describe('CaseEngine crisis execution', () => {
  it('increases oxygen decay during acute hypoxia and clears the modifier', () => {
    const baseline = new CaseEngine(config)
    baseline.update(1)
    const engine = new CaseEngine(config)
    expect(engine.startCrisis(plan('ACUTE_HYPOXIA'), 'ai')).toBe(true)
    engine.update(1)
    expect(engine.getSnapshot().vitals.oxygen).toBeLessThan(baseline.getSnapshot().vitals.oxygen)
    expect(engine.getCrisisSnapshot()?.source).toBe('ai')
    engine.completeCurrentCrisis()
    expect(engine.getCrisisSnapshot()).toBeNull()
  })

  it('activates infection rebound and increases infection growth', () => {
    const engine = new CaseEngine(config)
    engine.startCrisis(plan('INFECTION_REBOUND', { infectionSites: 1 }), 'local')
    expect(engine.getCrisisSnapshot()?.activeInfectionNodeId).toBe('tissue_0')
    const before = engine.getSnapshot().vitals.infection
    engine.update(1)
    expect(engine.getSnapshot().vitals.infection - before).toBeGreaterThan(config.vitals.infectionGrowthPerSecond)
  })

  it('blocks the selected transport target until the crisis clears', () => {
    const engine = new CaseEngine(config)
    engine.startCrisis(plan('TRANSPORT_BLOCKAGE'), 'local')
    expect(engine.dispatch({ type: 'oxygenDelivered', amount: 5, nodeId: 'tissue_0' })).toBe(false)
    engine.completeCurrentCrisis()
    expect(engine.dispatch({ type: 'oxygenDelivered', amount: 5, nodeId: 'tissue_0' })).toBe(true)
  })

  it('raises ATP costs and completes from explicit goal progress', () => {
    const engine = new CaseEngine(config)
    engine.startCrisis(plan('ATP_CRISIS', { oxygenDeliveries: 1 }), 'ai')
    expect(engine.getCrisisSnapshot()?.atpCostMultiplier).toBeGreaterThan(1)
    engine.dispatch({ type: 'oxygenDelivered', amount: 5, nodeId: 'other_0' })
    expect(engine.getCrisisSnapshot()).toBeNull()
  })

  it('rejects concurrent and non-whitelisted crises', () => {
    const engine = new CaseEngine({ ...config, allowedEvents: ['ACUTE_HYPOXIA'] })
    expect(engine.startCrisis(plan('ACUTE_HYPOXIA'), 'local')).toBe(true)
    expect(engine.startCrisis(plan('ATP_CRISIS'), 'local')).toBe(false)
    engine.completeCurrentCrisis()
    expect(engine.startCrisis(plan('ATP_CRISIS'), 'local')).toBe(false)
  })
})
