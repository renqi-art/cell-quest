import { describe, it, expect, vi } from 'vitest'
import { ScriptedAllySystem, ALLY_DEFAULTS } from '@/shared/domain/ScriptedAllySystem'
import type { CaseSnapshot } from '@/shared/types/case'

function emptySnapshot(): CaseSnapshot {
  return {
    status: 'active',
    vitals: { oxygen: 80, infection: 20, tissue: 70 },
    progress: { oxygenDeliveries: 0, infectionSitesCleared: 0 },
    stableFor: 0,
    currentObjective: '',
    elapsedMs: 0,
  }
}

describe('ScriptedAllySystem', () => {
  it('starts enabled', () => {
    const dispatch = vi.fn().mockReturnValue(true)
    const ally = new ScriptedAllySystem(ALLY_DEFAULTS.rbc, dispatch)
    expect(ally.enabled).toBe(true)
  })

  it('does not dispatch immediately (cooldown active)', () => {
    const dispatch = vi.fn().mockReturnValue(true)
    const ally = new ScriptedAllySystem(ALLY_DEFAULTS.rbc, dispatch)
    ally.update(100, emptySnapshot())
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches after cooldown (fast-forward)', () => {
    const dispatch = vi.fn().mockReturnValue(true)
    const ally = new ScriptedAllySystem(ALLY_DEFAULTS.wbc, dispatch)
    // WBC ally: RBC provides oxygen every 10-14s
    ally.update(12_000, emptySnapshot())
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'oxygenDelivered',
      amount: 6,
      nodeId: '__ally_auto__',
      source: 'ally',
    })
  })

  it('RBC ally dispatches infection suppression (WBC ally)', () => {
    const dispatch = vi.fn().mockReturnValue(true)
    const ally = new ScriptedAllySystem(ALLY_DEFAULTS.rbc, dispatch)
    // RBC primary → WBC ally: suppress infection every 10-14s
    ally.update(14_000, emptySnapshot())
    expect(dispatch).toHaveBeenCalledWith({
      type: 'infectionCleared',
      amount: 3,
      nodeId: '__ally_suppress__',
      source: 'ally',
    })
  })

  it('does nothing when disabled', () => {
    const dispatch = vi.fn().mockReturnValue(true)
    const ally = new ScriptedAllySystem(ALLY_DEFAULTS.rbc, dispatch)
    ally.enabled = false
    ally.update(20_000, emptySnapshot())
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('multiple dispatches over time', () => {
    const dispatch = vi.fn().mockReturnValue(true)
    const ally = new ScriptedAllySystem(ALLY_DEFAULTS.wbc, dispatch)
    // Run 30 seconds at 60Hz ticks
    const dt = 1000 / 60
    for (let i = 0; i < 1800; i++) {
      ally.update(dt, emptySnapshot())
    }
    // Should have dispatched 2-3 times (cooldown 10-14s each)
    expect(dispatch.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(dispatch.mock.calls.length).toBeLessThanOrEqual(4)
  })

  it('resets cooldown when re-enabled', () => {
    const dispatch = vi.fn().mockReturnValue(true)
    const ally = new ScriptedAllySystem(ALLY_DEFAULTS.wbc, dispatch)
    // Use up half the cooldown
    ally.update(5_000, emptySnapshot())
    // Disable and re-enable → cooldown resets
    ally.enabled = false
    ally.enabled = true
    // Should not dispatch after just 6 more seconds
    ally.update(6_000, emptySnapshot())
    expect(dispatch).not.toHaveBeenCalled() // cooldown reset, not enough time
  })
})
