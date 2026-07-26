/** Matches the server CaseBlueprint shape */
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

export type AiCaseDesignerErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'INVALID_RESPONSE'
  | 'SERVER_ERROR'
  | 'ABORTED'

const TIMEOUT_MS = 2500

export class AiCaseDesignerClient {
  private fetchImpl: typeof fetch
  private timeoutMs: number

  constructor(opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.timeoutMs = opts.timeoutMs ?? TIMEOUT_MS
  }

  async generate(prompt: string, signal?: AbortSignal): Promise<GenerateResult> {
    const controller = new AbortController()
    const combinedSignal = signal
      ? combineSignals(signal, controller.signal)
      : controller.signal

    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchImpl('/api/generate-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: combinedSignal,
      })

      if (!response.ok) {
        return {
          ok: false,
          error: `Server returned ${response.status}`,
          code: 'SERVER_ERROR',
        }
      }

      const payload: unknown = await response.json()

      if (!isGenerateResponse(payload)) {
        return { ok: false, error: 'Invalid response format', code: 'INVALID_RESPONSE' }
      }

      if (!payload.ok) {
        return { ok: false, error: 'Generation failed', code: 'SERVER_ERROR' }
      }

      if (!isCaseBlueprint(payload.blueprint)) {
        return { ok: false, error: 'Invalid blueprint in response', code: 'INVALID_RESPONSE' }
      }

      return {
        ok: true,
        source: payload.source === 'ai' ? 'ai' : 'local',
        blueprint: payload.blueprint,
      }
    } catch (e: unknown) {
      if (combinedSignal.aborted) {
        if (signal?.aborted) {
          return { ok: false, error: 'Request cancelled', code: 'ABORTED' }
        }
        return { ok: false, error: 'Request timed out', code: 'TIMEOUT' }
      }
      return { ok: false, error: e instanceof Error ? e.message : 'Network error', code: 'NETWORK' }
    } finally {
      clearTimeout(timer)
    }
  }
}

function combineSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted || b.aborted) return AbortSignal.abort()
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  a.addEventListener('abort', onAbort, { once: true })
  b.addEventListener('abort', onAbort, { once: true })
  return controller.signal
}

function isGenerateResponse(value: unknown): value is { ok: boolean; source?: string; blueprint?: unknown } {
  return typeof value === 'object' && value !== null && 'ok' in value
}

function isCaseBlueprint(value: unknown): value is CaseBlueprint {
  if (typeof value !== 'object' || value === null) return false
  const b = value as Record<string, unknown>
  return (
    typeof b.title === 'string' &&
    typeof b.primaryCell === 'string' &&
    typeof b.difficulty === 'string' &&
    Array.isArray(b.tags) &&
    typeof b.icon === 'string' &&
    typeof b.vitals === 'object'
  )
}
