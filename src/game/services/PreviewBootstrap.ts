import type { CaseDraft } from '@/shared/models/case-draft'
import { parseCaseDraft } from '@/shared/services/CaseSchema'
import type { PreviewOptions } from '@/editor/services/EditorPreviewGateway'

export interface PreviewBootstrapData {
  readonly draft: CaseDraft
  readonly options: PreviewOptions
  readonly classicLevelId?: string
}
export type PreviewBootstrapResult =
  | { readonly ok: true; readonly value: PreviewBootstrapData }
  | { readonly ok: false; readonly error: string }

export function parsePreviewPayload(raw: string | null): PreviewBootstrapResult {
  if (!raw) return { ok: false, error: '没有可试玩的病例数据' }
  let input: unknown
  try {
    input = JSON.parse(raw)
  } catch {
    return { ok: false, error: '试玩数据不是有效 JSON' }
  }
  if (typeof input !== 'object' || input === null) return { ok: false, error: '试玩数据结构无效' }
  const payload = input as { draft?: unknown; options?: unknown; classicLevelId?: unknown }
  const parsedDraft = parseCaseDraft(payload.draft)
  if (!parsedDraft.ok || !parsedDraft.value.caseConfig) return { ok: false, error: '试玩病例未通过结构校验' }
  if (typeof payload.options !== 'object' || payload.options === null) return { ok: false, error: '试玩选项缺失' }
  const options = payload.options as { role?: unknown; start?: unknown }
  if (options.role !== 'rbc' && options.role !== 'wbc' && options.role !== 'coop') {
    return { ok: false, error: '试玩角色无效' }
  }
  if (typeof options.start !== 'object' || options.start === null || (options.start as { type?: unknown }).type !== 'full') {
    return { ok: false, error: '试玩起点无效' }
  }
  const classicLevelId = typeof payload.classicLevelId === 'string' && payload.classicLevelId ? payload.classicLevelId : undefined
  return {
    ok: true,
    value: { draft: parsedDraft.value, options: { role: options.role, start: { type: 'full' } }, classicLevelId },
  }
}
