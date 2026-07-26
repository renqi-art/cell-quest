import { describe, expect, it, vi } from 'vitest'
import { CaseDirectorClient } from '@/game/services/CaseDirectorClient'
import { LocalCaseDirector } from '@/game/services/LocalCaseDirector'
import type { DirectorContext, DirectorPlan } from '@/shared/types/director'

const context: DirectorContext = {
  schemaVersion: 1,
  levelId: 'case_1',
  mode: 'single',
  primaryCell: 'rbc',
  phase: 1,
  runId: 'fixed-run',
  vitals: { oxygen: 60, infection: 30, tissue: 70 },
  performance: { deaths: 0, elapsedMs: 12000 },
  allowedEvents: ['ACUTE_HYPOXIA', 'INFECTION_REBOUND'],
  validTargetNodes: ['tissue_0', 'infection_0'],
}
const plan: DirectorPlan = {
  eventId: 'ACUTE_HYPOXIA', targetNode: 'tissue_0', severity: 2,
  goal: { oxygenDeliveries: 2, timeLimitSeconds: 40 },
  doctorLine: '组织氧供下降。', reason: '患者需要更多氧气。',
}

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('CaseDirectorClient', () => {
  it('accepts a valid server AI plan', async () => {
    const fetchImpl = vi.fn(async () => response({ ok: true, source: 'ai', plan })) as typeof fetch
    const decision = await new CaseDirectorClient({ fetchImpl }).nextPlan(context)
    expect(decision).toEqual({ source: 'ai', plan })
  })

  it('uses the deterministic local director on network failure', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline') }) as typeof fetch
    const decision = await new CaseDirectorClient({ fetchImpl }).nextPlan(context)
    expect(decision.source).toBe('local')
    expect(decision.plan).toEqual(LocalCaseDirector.nextPlan(context))
  })

  it('rejects plans with unknown fields and falls back locally', async () => {
    const fetchImpl = vi.fn(async () => response({ ok: true, source: 'ai', plan: { ...plan, script: 'alert(1)' } })) as typeof fetch
    const decision = await new CaseDirectorClient({ fetchImpl }).nextPlan(context)
    expect(decision.source).toBe('local')
    expect(decision.plan).toEqual(LocalCaseDirector.nextPlan(context))
  })

  it('produces stable local decisions for the same run and phase', () => {
    expect(LocalCaseDirector.nextPlan(context)).toEqual(LocalCaseDirector.nextPlan(context))
    expect(LocalCaseDirector.nextPlan(context).targetNode).toMatch(/^(tissue|infection)_0$/)
  })
})
