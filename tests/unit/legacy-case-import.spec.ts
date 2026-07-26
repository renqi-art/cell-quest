import { describe, it, expect } from 'vitest'
import { importLegacyLevel } from '@/editor/services/LegacyCaseImportService'
import type { LegacyLevelData } from '@/editor/services/LegacyCaseImportService'

describe('LegacyCaseImportService', () => {
  it('rejects empty map', () => {
    const result = importLegacyLevel({ map: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('map')
    }
  })

  it('rejects missing map', () => {
    const result = importLegacyLevel({})
    expect(result.ok).toBe(false)
  })

  it('converts a basic legacy level to case draft', () => {
    const data: LegacyLevelData = {
      name: 'Test Level',
      icon: '🧪',
      map: [
        '########################################',
        '#                       P              #',
        '#                                      #',
        '#   C                                  #',
        '########################################',
      ],
    }

    const result = importLegacyLevel(data)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.draft.metadata.title).toBe('Test Level')
      expect(result.draft.metadata.icon).toBe('🧪')
      expect(result.draft.nodes.some((n) => n.kind === 'spawn')).toBe(true)
      expect(result.draft.nodes.some((n) => n.kind === 'checkpoint')).toBe(true)
      expect(result.warnings).toBeDefined()
    }
  })

  it('retires non-case tiles and reports them', () => {
    const data: LegacyLevelData = {
      map: [
        '#######F##',
        '#  P  o ? #',
        '#  g  p D #',
        '##########',
      ],
    }

    const result = importLegacyLevel(data)
    expect(result.ok).toBe(true)
    if (result.ok) {
      // Check that retired items are reported
      expect(result.retiredItems.length).toBeGreaterThan(0)
      const retiredStr = result.retiredItems.join(', ')
      expect(retiredStr).toContain('金币')
      expect(retiredStr).toContain('?方块')
      expect(retiredStr).toContain('终点门')
      expect(retiredStr).toContain('管道')
      expect(retiredStr).toContain('护盾')

      // Verify map has those tiles removed
      const mapStr = result.draft.map.join('\n')
      expect(mapStr).not.toContain('F')
      expect(mapStr).not.toContain('o')
      expect(mapStr).not.toContain('?')
      expect(mapStr).not.toContain('p')
      expect(mapStr).not.toContain('D')
    }
  })

  it('preserves case-mode tiles in the map', () => {
    const data: LegacyLevelData = {
      map: [
        '#####H#^##B###',
        '#  P C g G t #',
        '# =  S  V  J #',
        '##############',
      ],
    }

    const result = importLegacyLevel(data)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const mapStr = result.draft.map.join('\n')
      expect(mapStr).toContain('#')
      expect(mapStr).toContain('=')
      expect(mapStr).toContain('^')
      expect(mapStr).toContain('S')
      expect(mapStr).toContain('B')
      expect(mapStr).toContain('V')
      expect(mapStr).toContain('J')
    }
  })

  it('warns when no spawn point found', () => {
    const data: LegacyLevelData = {
      map: [
        '########',
        '#      #',
        '#   C  #',
        '########',
      ],
    }

    const result = importLegacyLevel(data)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.warnings.some((w) => w.includes('spawn'))).toBe(true)
      expect(result.draft.nodes.length).toBeGreaterThan(0) // checkpoint
    }
  })

  it('handles multi-spawn and multi-checkpoint', () => {
    const data: LegacyLevelData = {
      map: [
        '########################################',
        '# P              P                     #',
        '#                                      #',
        '# C              C              C       #',
        '########################################',
      ],
    }

    const result = importLegacyLevel(data)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const spawns = result.draft.nodes.filter((n) => n.kind === 'spawn')
      const cps = result.draft.nodes.filter((n) => n.kind === 'checkpoint')
      expect(spawns.length).toBe(2)
      expect(cps.length).toBe(3)
    }
  })

  it('creates caseConfig with sensible defaults', () => {
    const data: LegacyLevelData = {
      name: 'Circulation Demo',
      map: ['####', '#P #', '####'],
    }

    const result = importLegacyLevel(data)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.draft.mode).toBe('case')
      expect(result.draft.caseConfig).toBeNull() // incomplete — user must configure
      expect(result.draft.editorMeta.source).toBe('manual')
    }
  })
})
