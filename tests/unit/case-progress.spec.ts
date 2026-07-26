import { beforeEach, describe, expect, it } from 'vitest'
import { CaseProgressRepository } from '@/game/services/CaseProgressRepository'
import type { CaseResult } from '@/shared/types/case'

const result: CaseResult = {
  status: 'complete',
  vitals: { oxygen: 72, infection: 12, tissue: 80 },
  progress: { oxygenDeliveries: 2, infectionSitesCleared: 1 },
  durationMs: 42_000,
  deaths: 0,
  atpEfficiency: 100,
}

describe('case progress repository', () => {
  beforeEach(() => localStorage.clear())

  it('keeps the best score and records encountered director events', () => {
    const repository = new CaseProgressRepository(localStorage)
    repository.record('case-chapter-1-wound', result, ['ACUTE_HYPOXIA'])
    repository.record('case-chapter-1-wound', { ...result, durationMs: 80_000, deaths: 2 }, ['ATP_CRISIS'])

    const progress = repository.get('case-chapter-1-wound')
    expect(progress?.completed).toBe(true)
    expect(progress?.bestScore).toBeGreaterThan(0)
    expect(progress?.bestDurationMs).toBe(42_000)
    expect(progress?.directorEvents).toEqual(['ACUTE_HYPOXIA', 'ATP_CRISIS'])
  })

  it('ignores malformed persisted data', () => {
    localStorage.setItem('cellQuest_caseProgress_v1', '{"bad":true}')
    expect(new CaseProgressRepository(localStorage).list()).toEqual({})
  })
})
