import { createCaseDraft } from '@/shared/services/CaseSchema'
import type { CaseDraft } from '@/shared/models/case-draft'

export type TemplateId = 'rbc-transport' | 'wbc-infection'

export function createCaseTemplate(id: TemplateId): CaseDraft {
  switch (id) {
    case 'rbc-transport': {
      const draft = createCaseDraft({ primaryCell: 'rbc' })
      if (!draft.caseConfig) return draft
      return {
        ...draft,
        nodes: [
          ...draft.nodes,
          { kind: 'oxygen-source', id: 'o1', x: 20, y: 13, capacity: 3 },
          { kind: 'target-tissue', id: 't1', x: 70, y: 13, requiredOxygen: 3 },
        ],
        metadata: { ...draft.metadata, title: '氧气运输', tags: ['供氧', '红细胞'] },
        caseConfig: {
          ...draft.caseConfig,
          goals: {
            ...draft.caseConfig.goals,
            oxygenRoutes: [
              { id: 'route-1', sourceId: 'o1', targetIds: ['t1'], requiredDeliveries: 3 },
            ],
            infection: { nodeIds: [], requiredClears: 0 },
          },
          allowedEvents: ['ACUTE_HYPOXIA', 'TRANSPORT_BLOCKAGE', 'ATP_CRISIS'],
          education: { topic: '红细胞如何向组织运输氧气', sourceIds: ['who-oxygen-transport'] },
        },
      }
    }
    case 'wbc-infection': {
      const draft = createCaseDraft({ primaryCell: 'wbc' })
      if (!draft.caseConfig) return draft
      return {
        ...draft,
        nodes: [
          ...draft.nodes,
          { kind: 'infection-site', id: 'i1', x: 70, y: 13, severity: 2 },
        ],
        metadata: { ...draft.metadata, title: '感染清除', tags: ['感染', '白细胞'] },
        caseConfig: {
          ...draft.caseConfig,
          goals: {
            ...draft.caseConfig.goals,
            oxygenRoutes: [],
            infection: { nodeIds: ['i1'], requiredClears: 1 },
          },
          allowedEvents: ['INFECTION_REBOUND', 'ATP_CRISIS'],
          education: { topic: '白细胞如何识别并清除感染', sourceIds: ['who-immune-response'] },
        },
      }
    }
  }
}
