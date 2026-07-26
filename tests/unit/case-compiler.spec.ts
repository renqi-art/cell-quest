import { describe, expect, it } from 'vitest'
import { compileCaseBlueprint } from '@/shared/services/CaseCompiler'
import { validateCaseDraft } from '@/shared/services/CaseValidationService'
import type { CaseBlueprint } from '@/editor/services/AiCaseDesignerClient'

const blueprint: CaseBlueprint = {
  title: '联合免疫病例',
  primaryCell: 'coop',
  difficulty: 'standard',
  tags: ['供氧', '感染'],
  icon: '🫁',
  description: '同时处理缺氧与感染。',
  vitals: { oxygen: 65, infection: 35, tissue: 70 },
  oxygenDecayPerSecond: 2,
  infectionGrowthPerSecond: 1.5,
  tissueDecayPerSecond: 0.5,
  nodeCounts: { oxygenRoutes: 2, infectionSites: 2 },
  allowedEvents: ['ACUTE_HYPOXIA', 'INFECTION_REBOUND'],
  educationalTopic: '免疫与氧运输',
  stabilitySeconds: 6,
}
const envelope = { version: 1 as const, maxGapTiles: 5, maxStepUpTiles: 4, maxDropTiles: 8, playerHeightTiles: 2 }

describe('CaseCompiler', () => {
  it('compiles a constrained blueprint into a valid playable draft', () => {
    const draft = compileCaseBlueprint(blueprint, { seed: 'same-patient' })
    expect(draft.editorMeta.source).toBe('ai')
    expect(draft.nodes.filter(node => node.kind === 'oxygen-source')).toHaveLength(2)
    expect(draft.nodes.filter(node => node.kind === 'target-tissue')).toHaveLength(2)
    expect(draft.nodes.filter(node => node.kind === 'infection-site')).toHaveLength(2)
    expect(validateCaseDraft(draft, envelope).filter(item => item.severity === 'error')).toEqual([])
  })

  it('is deterministic for the same blueprint and seed', () => {
    const first = compileCaseBlueprint(blueprint, { seed: 'fixed' })
    const second = compileCaseBlueprint(blueprint, { seed: 'fixed' })
    expect(second.id).toBe(first.id)
    expect(second.map).toEqual(first.map)
    expect(second.nodes).toEqual(first.nodes)
    expect(second.caseConfig).toEqual(first.caseConfig)
  })
})
