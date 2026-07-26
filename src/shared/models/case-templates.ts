import { createCaseDraft } from '@/shared/services/CaseSchema'
import type { CaseDraft } from '@/shared/models/case-draft'

export type TemplateId = 'rbc-transport' | 'wbc-infection'

export function createCaseTemplate(id: TemplateId): CaseDraft {
  switch (id) {
    case 'rbc-transport': {
      const draft = createCaseDraft({ primaryCell: 'rbc' })
      const node = { kind: 'target-tissue' as const, id: 't1', x: 70, y: 13, requiredOxygen: 3 }
      return { ...draft, nodes: [...draft.nodes, node], metadata: { ...draft.metadata, title: '氧气运输', tags: ['供氧', '红细胞'] } }
    }
    case 'wbc-infection': {
      const draft = createCaseDraft({ primaryCell: 'wbc' })
      const node = { kind: 'infection-site' as const, id: 'i1', x: 70, y: 13, severity: 2 as const }
      return { ...draft, nodes: [...draft.nodes, node], metadata: { ...draft.metadata, title: '感染清除', tags: ['感染', '白细胞'] } }
    }
    default:
      return createCaseDraft({ primaryCell: 'rbc' })
  }
}
