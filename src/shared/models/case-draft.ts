import type { CaseConfig, CaseMetadata, CaseNode, CaseMode, PrimaryCell, DraftSource } from '@/shared/types/case'

export interface CaseDraft {
  readonly version: 1
  readonly mode: CaseMode
  readonly id: string
  readonly revision: number
  readonly metadata: CaseMetadata
  readonly map: readonly string[]
  readonly nodes: readonly CaseNode[]
  readonly caseConfig: CaseConfig | null
  readonly editorMeta: {
    readonly source: DraftSource
    readonly templateId?: string
    readonly seed?: number
    readonly updatedAt: string
  }
}

export type { CaseConfig, CaseMetadata, CaseNode, CaseMode, PrimaryCell, DraftSource }
