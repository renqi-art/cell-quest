import { describe, expect, it } from 'vitest'
import { createCaseTemplate } from '@/shared/models/case-templates'
import { validateCaseDraft } from '@/shared/services/CaseValidationService'

const envelope = {
  version: 1 as const,
  maxGapTiles: 5,
  maxStepUpTiles: 4,
  maxDropTiles: 8,
  playerHeightTiles: 2,
}

describe('official starter templates', () => {
  it.each(['rbc-transport', 'wbc-infection'] as const)('%s is immediately valid and playable', id => {
    const draft = createCaseTemplate(id)
    const errors = validateCaseDraft(draft, envelope).filter(item => item.severity === 'error')
    expect(errors).toEqual([])
  })

  it('connects the oxygen source and target in the RBC goal', () => {
    const draft = createCaseTemplate('rbc-transport')
    expect(draft.caseConfig?.goals.oxygenRoutes).toEqual([
      { id: 'route-1', sourceId: 'o1', targetIds: ['t1'], requiredDeliveries: 3 },
    ])
  })

  it('registers the infection site in the WBC goal', () => {
    const draft = createCaseTemplate('wbc-infection')
    expect(draft.caseConfig?.goals.infection).toEqual({ nodeIds: ['i1'], requiredClears: 1 })
  })
})
