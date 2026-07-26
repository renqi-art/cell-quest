import { describe, expect, it } from 'vitest'
import { createCaseDraft, parseCaseDraft } from '@/shared/services/CaseSchema'
import type { CaseDraft } from '@/shared/models/case-draft'

describe('case draft creation', () => {
  it('creates a minimal RBC case draft', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc' })
    expect(draft.mode).toBe('case')
    expect(draft.caseConfig?.primaryCell).toBe('rbc')
    expect(draft.nodes.length).toBe(1)
    expect(draft.nodes[0]?.kind).toBe('spawn')
    expect(Object.isFrozen(draft)).toBe(true)
    expect(draft.map.at(-1)).toBe('#'.repeat(80))
  })

  it('creates a WBC case draft', () => {
    const draft = createCaseDraft({ primaryCell: 'wbc' })
    expect(draft.caseConfig?.primaryCell).toBe('wbc')
  })

  it('creates a classic draft with null caseConfig', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc', mode: 'classic' })
    expect(draft.mode).toBe('classic')
    expect(draft.caseConfig).toBeNull()
  })
})

describe('case draft parsing', () => {
  it('parses a valid case draft', () => {
    const result = parseCaseDraft(createCaseDraft({ primaryCell: 'rbc' }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.mode).toBe('case')
      expect(Object.isFrozen(result.value)).toBe(true)
    }
  })

  it('rejects null input', () => {
    const result = parseCaseDraft(null)
    expect(result.ok).toBe(false)
  })

  it('rejects non-object input', () => {
    const result = parseCaseDraft('not-an-object')
    expect(result.ok).toBe(false)
  })

  it('rejects drafts with duplicate node IDs', () => {
    const base = createCaseDraft({ primaryCell: 'rbc' })
    const bad: CaseDraft = {
      ...base,
      nodes: [
        { kind: 'spawn', id: 'dup', x: 1, y: 13, role: 'rbc' },
        { kind: 'spawn', id: 'dup', x: 3, y: 13, role: 'rbc' },
      ],
    }
    const result = parseCaseDraft(bad)
    expect(result.ok).toBe(false)
  })

  it('rejects unknown top-level keys', () => {
    const result = parseCaseDraft({ ...createCaseDraft({ primaryCell: 'rbc' }), unknownField: 42 })
    expect(result.ok).toBe(false)
  })

  it('preserves input immutability (does not modify input)', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc' })
    const draftJson = JSON.stringify(draft)
    parseCaseDraft(draft)
    expect(JSON.stringify(draft)).toBe(draftJson)
  })
})
