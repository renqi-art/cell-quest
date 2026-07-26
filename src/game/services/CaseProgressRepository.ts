import type { CaseResult } from '@/shared/types/case'
import type { CrisisEventId } from '@/shared/types/director'

const STORAGE_KEY = 'cellQuest_caseProgress_v1'

export interface CaseProgress {
  readonly completed: boolean
  readonly bestScore: number
  readonly bestDurationMs: number
  readonly attempts: number
  readonly directorEvents: readonly CrisisEventId[]
  readonly lastPlayedAt: string
}

export type CaseProgressMap = Readonly<Record<string, CaseProgress>>

function calculateScore(result: CaseResult): number {
  const vitals = (result.vitals.oxygen + (100 - result.vitals.infection) + result.vitals.tissue) / 3
  const timePenalty = Math.min(20, result.durationMs / 60_000 * 4)
  return Math.max(0, Math.min(100, Math.round(vitals - result.deaths * 8 - timePenalty)))
}

function validProgress(value: unknown): value is CaseProgress {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<CaseProgress>
  return typeof item.completed === 'boolean'
    && Number.isFinite(item.bestScore)
    && Number.isFinite(item.bestDurationMs)
    && Number.isInteger(item.attempts)
    && Array.isArray(item.directorEvents)
    && item.directorEvents.every(event => typeof event === 'string')
    && typeof item.lastPlayedAt === 'string'
}

export class CaseProgressRepository {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'>) {}

  list(): CaseProgressMap {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
      const entries = Object.entries(parsed).filter(
        (entry): entry is [string, CaseProgress] => entry[0].length > 0 && validProgress(entry[1]),
      )
      if (entries.length !== Object.keys(parsed).length) return {}
      return Object.fromEntries(entries)
    } catch {
      return {}
    }
  }

  get(caseId: string): CaseProgress | undefined {
    return this.list()[caseId]
  }

  record(caseId: string, result: CaseResult, directorEvents: readonly CrisisEventId[]): CaseProgress {
    const all = { ...this.list() }
    const previous = all[caseId]
    const score = calculateScore(result)
    const completed = previous?.completed === true || result.status === 'complete'
    const bestDurationMs = result.status === 'complete'
      ? Math.min(previous?.bestDurationMs ?? Number.POSITIVE_INFINITY, result.durationMs)
      : previous?.bestDurationMs ?? 0
    const record: CaseProgress = {
      completed,
      bestScore: Math.max(previous?.bestScore ?? 0, score),
      bestDurationMs: Number.isFinite(bestDurationMs) ? bestDurationMs : 0,
      attempts: (previous?.attempts ?? 0) + 1,
      directorEvents: [...new Set([...(previous?.directorEvents ?? []), ...directorEvents])],
      lastPlayedAt: new Date().toISOString(),
    }
    all[caseId] = record
    this.storage.setItem(STORAGE_KEY, JSON.stringify(all))
    return record
  }
}
