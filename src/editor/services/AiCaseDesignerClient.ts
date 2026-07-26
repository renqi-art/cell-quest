/** Exact browser-side contract for the server-generated, non-executable case blueprint. */
export interface CaseBlueprint {
  readonly title: string
  readonly primaryCell: 'rbc' | 'wbc' | 'coop'
  readonly difficulty: 'assist' | 'standard' | 'challenge'
  readonly tags: readonly string[]
  readonly icon: string
  readonly description: string
  readonly vitals: { readonly oxygen: number; readonly infection: number; readonly tissue: number }
  readonly oxygenDecayPerSecond: number
  readonly infectionGrowthPerSecond: number
  readonly tissueDecayPerSecond: number
  readonly nodeCounts: { readonly oxygenRoutes: number; readonly infectionSites: number }
  readonly allowedEvents: readonly string[]
  readonly educationalTopic: string
  readonly stabilitySeconds: number
}

export interface GenerateSuccess {
  readonly ok: true
  readonly source: 'ai' | 'local'
  readonly blueprint: CaseBlueprint
}
export interface GenerateError {
  readonly ok: false
  readonly error: string
  readonly code: AiCaseDesignerErrorCode
}
export type GenerateResult = GenerateSuccess | GenerateError
export type AiCaseDesignerErrorCode = 'TIMEOUT' | 'NETWORK' | 'INVALID_RESPONSE' | 'SERVER_ERROR' | 'ABORTED'

const TIMEOUT_MS = 2500
const BLUEPRINT_KEYS = new Set([
  'title', 'primaryCell', 'difficulty', 'tags', 'icon', 'description', 'vitals',
  'oxygenDecayPerSecond', 'infectionGrowthPerSecond', 'tissueDecayPerSecond',
  'nodeCounts', 'allowedEvents', 'educationalTopic', 'stabilitySeconds',
])
const EVENT_IDS = new Set(['ACUTE_HYPOXIA', 'INFECTION_REBOUND', 'TRANSPORT_BLOCKAGE', 'ATP_CRISIS'])
const UNSAFE_TEXT = /<\s*(script|iframe)|javascript:|\beval\s*\(|\bfunction\s*\(/i

export class AiCaseDesignerClient {
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number

  constructor(opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.timeoutMs = opts.timeoutMs ?? TIMEOUT_MS
  }

  async generate(prompt: string, signal?: AbortSignal): Promise<GenerateResult> {
    const controller = new AbortController()
    const combinedSignal = signal ? combineSignals(signal, controller.signal) : controller.signal
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchImpl('/api/generate-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: combinedSignal,
      })
      if (!response.ok) return { ok: false, error: '病例生成服务暂时不可用', code: 'SERVER_ERROR' }

      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        return { ok: false, error: '病例生成服务返回了无效数据', code: 'INVALID_RESPONSE' }
      }

      if (!isGenerateResponse(payload) || !payload.ok || !isCaseBlueprint(payload.blueprint)) {
        return { ok: false, error: '病例蓝图不符合安全契约', code: 'INVALID_RESPONSE' }
      }
      return { ok: true, source: payload.source, blueprint: payload.blueprint }
    } catch (cause: unknown) {
      if (combinedSignal.aborted) {
        if (signal?.aborted) return { ok: false, error: '请求已取消', code: 'ABORTED' }
        return { ok: false, error: '病例生成超时', code: 'TIMEOUT' }
      }
      return { ok: false, error: cause instanceof Error ? cause.message : '网络错误', code: 'NETWORK' }
    } finally {
      clearTimeout(timer)
    }
  }
}

function combineSignals(first: AbortSignal, second: AbortSignal): AbortSignal {
  if (first.aborted || second.aborted) return AbortSignal.abort()
  const controller = new AbortController()
  const abort = () => controller.abort()
  first.addEventListener('abort', abort, { once: true })
  second.addEventListener('abort', abort, { once: true })
  return controller.signal
}

function isExactObject(value: unknown, keys: ReadonlySet<string>): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.keys(value).every(key => keys.has(key))
}

function finiteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function safeText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength && !UNSAFE_TEXT.test(value)
}

function isGenerateResponse(value: unknown): value is { ok: true; source: 'ai' | 'local'; blueprint: unknown } {
  if (!isExactObject(value, new Set(['ok', 'source', 'blueprint']))) return false
  return value.ok === true && (value.source === 'ai' || value.source === 'local') && 'blueprint' in value
}

function isCaseBlueprint(value: unknown): value is CaseBlueprint {
  if (!isExactObject(value, BLUEPRINT_KEYS)) return false
  if (!safeText(value.title, 80) || !safeText(value.description, 600) || !safeText(value.icon, 16)) return false
  if (!safeText(value.educationalTopic, 120)) return false
  if (!['rbc', 'wbc', 'coop'].includes(String(value.primaryCell))) return false
  if (!['assist', 'standard', 'challenge'].includes(String(value.difficulty))) return false
  if (!Array.isArray(value.tags) || value.tags.length > 8 || !value.tags.every(tag => safeText(tag, 24))) return false

  if (!isExactObject(value.vitals, new Set(['oxygen', 'infection', 'tissue']))) return false
  if (!finiteInRange(value.vitals.oxygen, 0, 100) || !finiteInRange(value.vitals.infection, 0, 100) || !finiteInRange(value.vitals.tissue, 0, 100)) return false

  if (!finiteInRange(value.oxygenDecayPerSecond, 0.5, 5)) return false
  if (!finiteInRange(value.infectionGrowthPerSecond, 0.5, 5)) return false
  if (!finiteInRange(value.tissueDecayPerSecond, 0.1, 2)) return false
  if (!finiteInRange(value.stabilitySeconds, 3, 10)) return false

  if (!isExactObject(value.nodeCounts, new Set(['oxygenRoutes', 'infectionSites']))) return false
  if (!Number.isInteger(value.nodeCounts.oxygenRoutes) || !finiteInRange(value.nodeCounts.oxygenRoutes, 0, 3)) return false
  if (!Number.isInteger(value.nodeCounts.infectionSites) || !finiteInRange(value.nodeCounts.infectionSites, 0, 3)) return false

  if (!Array.isArray(value.allowedEvents) || value.allowedEvents.length > 4) return false
  if (!value.allowedEvents.every(event => typeof event === 'string' && EVENT_IDS.has(event))) return false
  return true
}
