import type { CaseDraft } from '@/shared/models/case-draft'
import type { MovementEnvelope } from './CaseReachabilityService'
import { analyzeReachability } from './CaseReachabilityService'

export interface CaseDiagnostic {
  readonly code: string
  readonly severity: 'error' | 'warning' | 'info'
  readonly message: string
  readonly nodeIds?: readonly string[]
  readonly cellBounds?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
}

export function validateCaseDraft(draft: CaseDraft, envelope: MovementEnvelope): CaseDiagnostic[] {
  const diagnostics: CaseDiagnostic[] = []

  // Check for duplicate spawns
  const spawns = draft.nodes.filter(n => n.kind === 'spawn')
  if (spawns.length > 1) {
    diagnostics.push({
      code: 'DUPLICATE_SPAWN',
      severity: 'error',
      message: '存在多个出生点',
      nodeIds: spawns.map(s => s.id),
    })
  }
  if (spawns.length === 0) {
    diagnostics.push({
      code: 'MISSING_SPAWN',
      severity: 'error',
      message: '缺少出生点',
    })
  }

  // Check reachability
  const role: 'rbc' | 'wbc' = draft.caseConfig?.primaryCell === 'coop' ? 'rbc' : (draft.caseConfig?.primaryCell ?? 'rbc')
  const { unreachableIds } = analyzeReachability(draft, role, envelope)

  for (const id of unreachableIds) {
    const node = draft.nodes.find(n => n.id === id)
    diagnostics.push({
      code: 'REQUIRED_NODE_UNREACHABLE',
      severity: 'error',
      message: `节点 ${node?.id ?? id} 不可达`,
      nodeIds: [id],
      cellBounds: node ? { x: node.x, y: node.y, w: 1, h: 1 } : undefined,
    })
  }

  // Check caseConfig goals reference valid nodes
  if (draft.caseConfig) {
    const config = draft.caseConfig
    for (const route of config.goals.oxygenRoutes) {
      if (!draft.nodes.some(n => n.id === route.sourceId)) {
        diagnostics.push({
          code: 'INVALID_GOAL_SOURCE',
          severity: 'error',
          message: `供氧目标引用了不存在的源节点 ${route.sourceId}`,
          nodeIds: [route.sourceId],
        })
      }
      for (const tid of route.targetIds) {
        if (!draft.nodes.some(n => n.id === tid)) {
          diagnostics.push({
            code: 'INVALID_GOAL_TARGET',
            severity: 'error',
            message: `供氧目标引用了不存在的目标节点 ${tid}`,
            nodeIds: [tid],
          })
        }
      }
    }

    if (config.education.sourceIds.length === 0) {
      diagnostics.push({
        code: 'MISSING_SOURCES',
        severity: 'warning',
        message: '缺少科普来源',
      })
    }
  }

  return diagnostics
}
