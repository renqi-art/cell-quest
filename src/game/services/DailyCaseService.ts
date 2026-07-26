import { OFFICIAL_CASES, type OfficialCaseChapter } from '@/shared/content/official-cases'
import type { CaseDraft } from '@/shared/models/case-draft'
import type { CrisisEventId } from '@/shared/types/director'

export interface DailyCase {
  readonly date: string
  readonly seed: number
  readonly chapter: OfficialCaseChapter
  readonly draft: CaseDraft
  readonly plannedEvents: readonly CrisisEventId[]
}

function hashDate(value: string): number {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function boundedDelta(seed: number, shift: number): number {
  return ((seed >>> shift) % 21) - 10
}

export function createDailyCase(date: string): DailyCase {
  if (!isDateString(date)) throw new TypeError('Daily case date must use YYYY-MM-DD')
  const seed = hashDate(date)
  const chapter = OFFICIAL_CASES[seed % OFFICIAL_CASES.length]!
  const config = chapter.draft.caseConfig!
  const draft: CaseDraft = {
    ...structuredClone(chapter.draft),
    id: `daily-${date}`,
    metadata: {
      ...chapter.draft.metadata,
      title: `每日病例 · ${date} · ${chapter.draft.metadata.title}`,
      tags: [...chapter.draft.metadata.tags.slice(0, 2), '每日病例'],
    },
    caseConfig: {
      ...config,
      vitals: {
        ...config.vitals,
        oxygen: Math.max(30, Math.min(95, config.vitals.oxygen + boundedDelta(seed, 0))),
        infection: Math.max(0, Math.min(70, config.vitals.infection + boundedDelta(seed, 8))),
        tissue: Math.max(30, Math.min(95, config.vitals.tissue + boundedDelta(seed, 16))),
      },
    },
  }
  const allowed = draft.caseConfig?.allowedEvents ?? []
  const plannedEvents = allowed.length > 0
    ? [allowed[seed % allowed.length]!, allowed[(seed + 1) % allowed.length]!]
    : []
  return { date, seed, chapter, draft, plannedEvents }
}

export function localDateString(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
