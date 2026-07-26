import { describe, expect, it } from 'vitest'
import { createCaseDraft } from '@/shared/services/CaseSchema'
import { analyzeReachability } from '@/shared/services/CaseReachabilityService'
import type { MovementEnvelope } from '@/shared/services/CaseReachabilityService'
import { validateCaseDraft } from '@/shared/services/CaseValidationService'
import { createCaseTemplate } from '@/shared/models/case-templates'

const DEFAULT_ENVELOPE: MovementEnvelope = {
  version: 1,
  maxGapTiles: 3,
  maxStepUpTiles: 2,
  maxDropTiles: 5,
  playerHeightTiles: 2,
}

describe('CaseReachabilityService', () => {
  it('finds reachable nodes on a flat map', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc' })
    const result = analyzeReachability(draft, 'rbc', DEFAULT_ENVELOPE)
    expect(result.reachableIds.size).toBeGreaterThan(0)
    expect(result.reachableIds.has(draft.nodes[0]!.id)).toBe(true)
  })

  it('reports unreachable nodes blocked by walls', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc' })
    // Add a node trapped behind walls
    const node = { kind: 'target-tissue' as const, id: 't1', x: 10, y: 0, requiredOxygen: 1 }
    const mapArr = draft.map.map(row => row)
    // Block path with solid wall
    for (let y = 0; y < 15; y++) {
      mapArr[y] = mapArr[y]!.slice(0, 5) + '#' + mapArr[y]!.slice(6)
    }
    const unreachableDraft = { ...draft, nodes: [...draft.nodes, node], map: mapArr }

    const result = analyzeReachability(unreachableDraft, 'rbc', DEFAULT_ENVELOPE)
    expect(result.reachableIds.has('t1')).toBe(false)
    expect(result.unreachableIds).toContain('t1')
  })
})

describe('CaseValidationService', () => {
  it('validates a minimal draft without errors', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc' })
    const diagnostics = validateCaseDraft(draft, DEFAULT_ENVELOPE)
    expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0)
  })

  it('detects duplicate spawn nodes', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc' })
    const duplicate = {
      ...draft,
      nodes: [...draft.nodes, { kind: 'spawn' as const, id: 's2', x: 5, y: 13, role: 'rbc' as const }],
    }
    const diagnostics = validateCaseDraft(duplicate, DEFAULT_ENVELOPE)
    expect(diagnostics.some(d => d.code === 'DUPLICATE_SPAWN')).toBe(true)
  })

  it('detects unreachable required nodes', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc' })
    const node = { kind: 'target-tissue' as const, id: 't1', x: 10, y: 0, requiredOxygen: 5 }
    const mapArr = draft.map.map(row => row)
    for (let y = 0; y < 15; y++) {
      mapArr[y] = mapArr[y]!.slice(0, 5) + '#' + mapArr[y]!.slice(6)
    }
    const unreachableDraft = { ...draft, nodes: [...draft.nodes, node], map: mapArr, caseConfig: { ...draft.caseConfig!, goals: { ...draft.caseConfig!.goals, oxygenRoutes: [{ id: 'r1', sourceId: 'none', targetIds: ['t1'], requiredDeliveries: 1 }] } } }

    const diagnostics = validateCaseDraft(unreachableDraft, DEFAULT_ENVELOPE)
    expect(diagnostics.some(d => d.code === 'REQUIRED_NODE_UNREACHABLE')).toBe(true)
  })

  it('covers templates for rbc-transport', () => {
    const template = createCaseTemplate('rbc-transport')
    expect(template.mode).toBe('case')
    expect(template.caseConfig?.primaryCell).toBe('rbc')
  })

  it('covers template for wbc-infection', () => {
    const template = createCaseTemplate('wbc-infection')
    expect(template.caseConfig?.primaryCell).toBe('wbc')
  })
})
