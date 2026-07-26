import { describe, it, expect } from 'vitest'
import { encodeCaseCode, decodeCaseCode, decodeLegacyCQCode } from '@/shared/services/CaseCodec'
import type { CaseDraft } from '@/shared/models/case-draft'
import type { PublishedCase } from '@/shared/services/CaseCodec'

function makeDraft(overrides: Partial<CaseDraft> = {}): CaseDraft {
  return {
    version: 1,
    mode: 'case',
    id: 'draft-test-1',
    revision: 1,
    metadata: {
      title: '测试病例',
      author: '测试',
      difficulty: 'standard',
      tags: ['呼吸', '免疫'],
      icon: '🫁',
    },
    map: [' '.repeat(20), ' '.repeat(20), ' '.repeat(20)],
    nodes: [
      { kind: 'spawn', id: 'spawn_0', x: 1, y: 1, role: 'rbc' },
      { kind: 'oxygen-source', id: 'o2_0', x: 5, y: 1, capacity: 3 },
      { kind: 'target-tissue', id: 'tissue_0', x: 10, y: 1, requiredOxygen: 2 },
    ],
    caseConfig: {
      version: 1,
      primaryCell: 'rbc',
      allyMode: 'scripted',
      vitals: {
        oxygen: 80,
        infection: 20,
        tissue: 70,
        oxygenDecayPerSecond: 2,
        infectionGrowthPerSecond: 1.5,
        tissueDecayPerSecond: 0.5,
      },
      goals: {
        oxygenRoutes: [{ id: 'r0', sourceId: 'o2_0', targetIds: ['tissue_0'], requiredDeliveries: 1 }],
        infection: { nodeIds: [], requiredClears: 0 },
        stabilitySeconds: 5,
      },
      allowedEvents: [],
      briefing: { start: '开始', success: '成功', failure: '失败' },
      education: { topic: '呼吸', sourceIds: [] },
    },
    editorMeta: {
      source: 'manual',
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  }
}

describe('CaseCodec', () => {
  describe('encodeCaseCode', () => {
    it('encodes a valid draft to CQ2! format', () => {
      const result = encodeCaseCode(makeDraft())
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.code.startsWith('CQ2!')).toBe(true)
        expect(result.code.length).toBeGreaterThan(20)
      }
    })

    it('returns error for draft without caseConfig', () => {
      const draft = makeDraft({ caseConfig: null, mode: 'classic' })
      const result = encodeCaseCode(draft)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('caseConfig')
      }
    })
  })

  describe('decodeCaseCode', () => {
    it('round-trips a published case', () => {
      const draft = makeDraft()
      const encoded = encodeCaseCode(draft)
      expect(encoded.ok).toBe(true)
      if (!encoded.ok) return

      const decoded = decodeCaseCode(encoded.code)
      expect(decoded.ok).toBe(true)
      if (decoded.ok) {
        expect(decoded.value.id).toBe(draft.id)
        expect(decoded.value.name).toBe(draft.metadata.title)
        expect(decoded.value.v).toBe(2)
        expect(decoded.value.nodes.length).toBe(draft.nodes.length)
      }
    })

    it('rejects non-CQ2! prefix', () => {
      const result = decodeCaseCode('NOT_CQ2!abc')
      expect(result.ok).toBe(false)
    })

    it('rejects empty payload', () => {
      const result = decodeCaseCode('CQ2!')
      expect(result.ok).toBe(false)
    })

    it('rejects invalid Base64', () => {
      const result = decodeCaseCode('CQ2!!!!invalid!!!')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('Base64')
      }
    })

    it('rejects oversized payload (fuzz test)', () => {
      // Create a 200KiB payload
      const hugeStr = 'x'.repeat(150_000)
      const fake = JSON.stringify({ v: 2, id: 'huge', map: [hugeStr], nodes: [] })
      const code = 'CQ2!' + btoa(fake).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = decodeCaseCode(code)
      expect(result.ok).toBe(false)
    })

    it('rejects unknown top-level keys', () => {
      const fake = JSON.stringify({
        v: 2,
        id: 'test',
        revision: 1,
        name: 'test',
        author: 'test',
        difficulty: 'standard',
        tags: [],
        icon: 'X',
        map: ['a'],
        nodes: [],
        caseConfig: { v: 1 },
        evilKey: 'should not pass',
      })
      const code = 'CQ2!' + btoa(fake).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = decodeCaseCode(code)
      expect(result.ok).toBe(false)
    })

    it('rejects invalid version', () => {
      const fake = JSON.stringify({
        v: 99,
        id: 'test',
        revision: 1,
        name: 'test',
        author: 'test',
        difficulty: 'standard',
        tags: [],
        icon: 'X',
        map: ['a'],
        nodes: [],
        caseConfig: { version: 1 },
      })
      const code = 'CQ2!' + btoa(fake).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = decodeCaseCode(code)
      expect(result.ok).toBe(false)
    })

    it('rejects invalid difficulty', () => {
      const fake = JSON.stringify({
        v: 2,
        id: 'test',
        revision: 1,
        name: 'test',
        author: 'test',
        difficulty: 'impossible',
        tags: [],
        icon: 'X',
        map: ['a'],
        nodes: [],
        caseConfig: { version: 1 },
      })
      const code = 'CQ2!' + btoa(fake).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = decodeCaseCode(code)
      expect(result.ok).toBe(false)
    })

    it('rejects non-uniform map rows', () => {
      const fake = JSON.stringify({
        v: 2,
        id: 'test',
        revision: 1,
        name: 'test',
        author: 'test',
        difficulty: 'standard',
        tags: [],
        icon: 'X',
        map: ['aaa', 'bb'],
        nodes: [],
        caseConfig: { version: 1 },
      })
      const code = 'CQ2!' + btoa(fake).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = decodeCaseCode(code)
      expect(result.ok).toBe(false)
    })

    it('rejects duplicate node IDs', () => {
      const fake = JSON.stringify({
        v: 2,
        id: 'test',
        revision: 1,
        name: 'test',
        author: 'test',
        difficulty: 'standard',
        tags: [],
        icon: 'X',
        map: ['aaa'],
        nodes: [
          { kind: 'spawn', id: 'dup', x: 1, y: 1, role: 'rbc' },
          { kind: 'spawn', id: 'dup', x: 2, y: 2, role: 'wbc' },
        ],
        caseConfig: { version: 1 },
      })
      const code = 'CQ2!' + btoa(fake).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = decodeCaseCode(code)
      expect(result.ok).toBe(false)
    })

    it('rejects missing caseConfig', () => {
      const fake = JSON.stringify({
        v: 2,
        id: 'test',
        revision: 1,
        name: 'test',
        author: 'test',
        difficulty: 'standard',
        tags: [],
        icon: 'X',
        map: ['a'],
        nodes: [],
      })
      const code = 'CQ2!' + btoa(fake).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = decodeCaseCode(code)
      expect(result.ok).toBe(false)
    })

    it('rejects script injection in name', () => {
      const fake = JSON.stringify({
        v: 2,
        id: 'test',
        revision: 1,
        name: '<script>alert(1)</script>',
        author: 'test',
        difficulty: 'standard',
        tags: [],
        icon: 'X',
        map: ['a'],
        nodes: [],
        caseConfig: { version: 1 },
      })
      const code = 'CQ2!' + btoa(fake).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = decodeCaseCode(code)
      // Script tags in string values are rejected by validatePublishedCase
      expect(result.ok).toBe(false)
    })
  })

  describe('decodeLegacyCQCode', () => {
    it('recognizes CQ! prefix', () => {
      const fake = JSON.stringify({ n: 'test', c: [1, 2], m: [] })
      const code = 'CQ!' + btoa(fake).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = decodeLegacyCQCode(code)
      expect(result.ok).toBe(true)
    })

    it('rejects non-CQ! prefix', () => {
      const result = decodeLegacyCQCode('NOT_CQ!abc')
      expect(result.ok).toBe(false)
    })
  })
})
