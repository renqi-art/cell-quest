import type { CaseBlueprint } from '@/editor/services/AiCaseDesignerClient'
import type { CaseDraft } from '@/shared/models/case-draft'
import { createCaseDraft } from '@/shared/services/CaseSchema'
import type { CaseConfig, CaseNode } from '@/shared/types/case'

export interface CompileCaseOptions {
  readonly seed: string
  readonly source?: 'ai' | 'template'
}

const ALLOWED_EVENTS = new Set<CaseConfig['allowedEvents'][number]>([
  'ACUTE_HYPOXIA',
  'INFECTION_REBOUND',
  'TRANSPORT_BLOCKAGE',
  'ATP_CRISIS',
])

function stableHash(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function isAllowedEvent(value: string): value is CaseConfig['allowedEvents'][number] {
  return ALLOWED_EVENTS.has(value as CaseConfig['allowedEvents'][number])
}

export function compileCaseBlueprint(
  blueprint: CaseBlueprint,
  options: CompileCaseOptions,
): CaseDraft {
  const base = createCaseDraft({ primaryCell: blueprint.primaryCell })
  if (!base.caseConfig) throw new Error('Case blueprint requires case mode')

  const fingerprint = stableHash(JSON.stringify(blueprint) + ':' + options.seed)
  const nodes: CaseNode[] = [
    { kind: 'spawn', id: 'spawn-' + fingerprint, x: 1, y: 13, role: blueprint.primaryCell },
  ]
  const oxygenRoutes: CaseConfig['goals']['oxygenRoutes'][number][] = []
  const infectionNodeIds: string[] = []

  for (let index = 0; index < blueprint.nodeCounts.oxygenRoutes; index += 1) {
    const sourceId = 'oxygen-' + fingerprint + '-' + index
    const targetId = 'tissue-' + fingerprint + '-' + index
    nodes.push({ kind: 'oxygen-source', id: sourceId, x: 8 + index * 14, y: 13, capacity: 3 })
    nodes.push({ kind: 'target-tissue', id: targetId, x: 15 + index * 14, y: 13, requiredOxygen: 3 })
    oxygenRoutes.push({
      id: 'route-' + fingerprint + '-' + index,
      sourceId,
      targetIds: [targetId],
      requiredDeliveries: 3,
    })
  }

  for (let index = 0; index < blueprint.nodeCounts.infectionSites; index += 1) {
    const id = 'infection-' + fingerprint + '-' + index
    nodes.push({ kind: 'infection-site', id, x: 50 + index * 8, y: 13, severity: 2 })
    infectionNodeIds.push(id)
  }

  return {
    ...base,
    id: 'case-' + fingerprint,
    metadata: {
      title: blueprint.title,
      author: 'AI 病例设计器',
      difficulty: blueprint.difficulty,
      tags: [...blueprint.tags],
      icon: blueprint.icon,
    },
    nodes,
    caseConfig: {
      version: 1,
      primaryCell: blueprint.primaryCell,
      allyMode: 'scripted',
      vitals: {
        ...blueprint.vitals,
        oxygenDecayPerSecond: blueprint.oxygenDecayPerSecond,
        infectionGrowthPerSecond: blueprint.infectionGrowthPerSecond,
        tissueDecayPerSecond: blueprint.tissueDecayPerSecond,
      },
      goals: {
        oxygenRoutes,
        infection: { nodeIds: infectionNodeIds, requiredClears: infectionNodeIds.length },
        stabilitySeconds: blueprint.stabilitySeconds,
      },
      allowedEvents: blueprint.allowedEvents.filter(isAllowedEvent),
      briefing: {
        start: blueprint.description,
        success: '患者指标恢复稳定。',
        failure: '患者组织状态恶化，请调整供氧与免疫策略。',
      },
      education: {
        topic: blueprint.educationalTopic,
        sourceIds: ['blueprint-' + fingerprint],
      },
    },
    editorMeta: {
      source: options.source ?? 'ai',
      updatedAt: new Date().toISOString(),
    },
  }
}
