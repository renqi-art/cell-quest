import { describe, expect, it } from 'vitest'
import { createDailyCase } from '@/game/services/DailyCaseService'

describe('daily case service', () => {
  it('is deterministic for one date and varies between dates', () => {
    expect(createDailyCase('2026-07-26')).toEqual(createDailyCase('2026-07-26'))
    expect(createDailyCase('2026-07-27')).not.toEqual(createDailyCase('2026-07-26'))
  })

  it('rejects malformed dates', () => {
    expect(() => createDailyCase('26-07-2026')).toThrow(/date/i)
  })
})
