import { describe, expect, it, vi } from 'vitest'
import { AiCaseDesignerClient, type CaseBlueprint } from '@/editor/services/AiCaseDesignerClient'

const blueprint: CaseBlueprint = {
  title: '缺氧病例', primaryCell: 'rbc', difficulty: 'standard', tags: ['供氧'], icon: '🫁',
  description: '恢复组织供氧。', vitals: { oxygen: 60, infection: 10, tissue: 70 },
  oxygenDecayPerSecond: 2, infectionGrowthPerSecond: 1, tissueDecayPerSecond: 0.5,
  nodeCounts: { oxygenRoutes: 1, infectionSites: 0 },
  allowedEvents: ['ACUTE_HYPOXIA'], educationalTopic: '氧运输', stabilitySeconds: 5,
}

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('AiCaseDesignerClient', () => {
  it('accepts an exact constrained blueprint', async () => {
    const fetchImpl = vi.fn(async () => response({ ok: true, source: 'ai', blueprint })) as typeof fetch
    const result = await new AiCaseDesignerClient({ fetchImpl }).generate('缺氧')
    expect(result).toEqual({ ok: true, source: 'ai', blueprint })
  })

  it.each([
    { ...blueprint, map: ['malicious'] },
    { ...blueprint, script: 'alert(1)' },
    { ...blueprint, stabilitySeconds: 500 },
    { ...blueprint, primaryCell: 'platelet' },
  ])('rejects unknown or out-of-contract blueprint fields', async invalidBlueprint => {
    const fetchImpl = vi.fn(async () => response({ ok: true, source: 'ai', blueprint: invalidBlueprint })) as typeof fetch
    const result = await new AiCaseDesignerClient({ fetchImpl }).generate('test')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_RESPONSE')
  })
})
