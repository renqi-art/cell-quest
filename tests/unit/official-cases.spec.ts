import { describe, expect, it } from 'vitest'
import { OFFICIAL_CASES } from '@/shared/content/official-cases'
import { validateCaseDraft } from '@/shared/services/CaseValidationService'
import { CaseEngine } from '@/shared/domain/CaseEngine'

const envelope = { version: 1 as const, maxGapTiles: 5, maxStepUpTiles: 4, maxDropTiles: 8, playerHeightTiles: 2 }

describe('six official patient cases', () => {
  it('forms a six-chapter patient recovery story with unique IDs', () => {
    expect(OFFICIAL_CASES).toHaveLength(6)
    expect(new Set(OFFICIAL_CASES.map(item => item.id)).size).toBe(6)
    expect(OFFICIAL_CASES.map(item => item.chapter)).toEqual([1, 2, 3, 4, 5, 6])
    expect(OFFICIAL_CASES[0]?.patientBeat).toContain('擦伤')
    expect(OFFICIAL_CASES[5]?.patientBeat).toContain('康复')
  })

  it('covers RBC, WBC, and cooperative responsibilities without platelet gameplay', () => {
    const roles = OFFICIAL_CASES.map(item => item.draft.caseConfig?.primaryCell)
    expect(roles).toContain('rbc')
    expect(roles).toContain('wbc')
    expect(roles).toContain('coop')
    expect(JSON.stringify(OFFICIAL_CASES)).not.toMatch(/platelet|血小板/i)
  })

  it.each([0, 1, 2, 3, 4, 5])('case %i passes shared validation and has education sources', index => {
    const official = OFFICIAL_CASES[index]!
    const errors = validateCaseDraft(official.draft, envelope).filter(item => item.severity === 'error')
    expect(errors).toEqual([])
    expect(official.draft.caseConfig?.education.sourceIds.length).toBeGreaterThan(0)
    expect(official.sources.length).toBeGreaterThan(0)
    expect(official.draft.map.some(row => row.includes('F'))).toBe(false)
  })

  it.each([0, 1, 2, 3, 4, 5])('case %i can complete through its configured physiological goals', index => {
    const config = OFFICIAL_CASES[index]!.draft.caseConfig!
    const engine = new CaseEngine(config)
    for (const route of config.goals.oxygenRoutes) {
      for (let delivery = 0; delivery < route.requiredDeliveries; delivery += 1) {
        engine.dispatch({ type: 'oxygenDelivered', amount: 12, nodeId: route.targetIds[0] ?? route.sourceId })
      }
    }
    for (const nodeId of config.goals.infection.nodeIds.slice(0, config.goals.infection.requiredClears)) {
      engine.dispatch({ type: 'infectionCleared', amount: 20, nodeId })
    }
    engine.update(config.goals.stabilitySeconds)
    expect(engine.isComplete()).toBe(true)
  })
})
