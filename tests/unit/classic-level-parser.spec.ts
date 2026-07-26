import { describe, expect, it } from 'vitest'
import { parseClassicLevel } from '@/shared/classic/parseClassicLevel'
import { MINIMAL_CLASSIC_LEVEL } from '../fixtures/classic/minimal-level'

describe('parseClassicLevel', () => {
  it('separates terrain and spawn descriptors without executing input', () => {
    const result = parseClassicLevel(MINIMAL_CLASSIC_LEVEL)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.playerSpawn).toEqual({ col: 0, row: 1 })
    expect(result.value.finish).toEqual({ col: 4, row: 1 })
    expect(result.value.enemies).toEqual([{ kind: 'staph', col: 2, row: 1 }])
    expect(result.value.tiles[2]).toEqual(['#', '#', '#', '#', '#'])
  })

  it('downgrades an unknown character to empty and reports its location', () => {
    const result = parseClassicLevel({
      ...MINIMAL_CLASSIC_LEVEL,
      map: ['P! F', '####'],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.tiles[0]?.[1]).toBe(' ')
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'unknown-character', col: 1, row: 0 }),
    ])
  })

  it('collects missing spawn and finish errors in one pass', () => {
    const result = parseClassicLevel({
      ...MINIMAL_CLASSIC_LEVEL,
      map: ['   ', '###'],
    })

    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: 'missing-player-spawn' }),
        expect.objectContaining({ code: 'missing-finish' }),
      ]),
    })
  })
})
