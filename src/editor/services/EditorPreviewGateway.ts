import type { CaseDraft } from '@/shared/models/case-draft'

/** 试玩选项 */
export interface PreviewOptions {
  readonly role: 'rbc' | 'wbc' | 'coop'
  readonly start: { readonly type: 'full' } | { readonly type: 'cell'; readonly x: number; readonly y: number }
}

/** 试玩结束后返回的报告 */
export interface CasePlaytestReport {
  /** 是否成功完成所有目标 */
  readonly completed: boolean
  /** 试玩耗时 (ms) */
  readonly durationMs: number
  /** 死亡次数 */
  readonly deaths: number
  /** 失败原因码 (complete=false 时) */
  readonly failureCode?: string
  /** 未到达/未访问的节点 ID */
  readonly unvisitedNodeIds: readonly string[]
  /** 触发的危机事件 */
  readonly crisisEvents: readonly { eventId: string; targetNodeId: string; source: 'ai' | 'local' }[]
  /** 热力单元格 (玩家频繁活动的坐标) */
  readonly heatCells: readonly { x: number; y: number; count: number }[]
}

/** 试玩会话句柄 */
export interface PreviewSession {
  readonly sessionId: string
  readonly report: Promise<CasePlaytestReport>
  dispose(): void
}

/** 试玩网关抽象 — 编辑器与引擎之间的预览桥 */
export interface EditorPreviewGateway {
  /**
   * 启动一次病例试玩。
   * @param draft 零错误的病例草稿
   * @param options 角色和起点选择
   * @returns PreviewSession — 编辑器可等待 report，或在任意时刻 dispose
   */
  start(draft: CaseDraft, options: PreviewOptions): Promise<PreviewSession>
}
