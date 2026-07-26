import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { observeReducedMotion } from '@/game/motion/reduced-motion'
import { motionDuration, motionEase, motionSpring } from '@/game/motion/motion-tokens'

describe('reduced-motion', () => {
  let listeners: Array<(e: MediaQueryListEvent) => void> = []
  let currentMatches = false
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    listeners = []
    currentMatches = false
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const mql = {
        get matches() { return currentMatches },
        media: query,
        onchange: null,
        addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
          listeners.push(cb)
        },
        removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
          listeners = listeners.filter((l) => l !== cb)
        },
        dispatchEvent: () => true,
        addListener: () => {},
        removeListener: () => {},
      } as unknown as MediaQueryList
      return mql
    })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  function fireChange(matches: boolean) {
    currentMatches = matches
    for (const cb of listeners) {
      cb({ matches } as MediaQueryListEvent)
    }
  }

  it('initial value is false when no preference set', () => {
    const calls: boolean[] = []
    observeReducedMotion((v) => calls.push(v))
    expect(calls[0]).toBe(false)
  })

  it('fires callback on change', () => {
    const calls: boolean[] = []
    const pref = observeReducedMotion((v) => calls.push(v))
    expect(calls).toEqual([false])

    fireChange(true)
    expect(calls).toEqual([false, true])

    pref.destroy()
  })

  it('destroy stops further callbacks', () => {
    const calls: boolean[] = []
    const pref = observeReducedMotion((v) => calls.push(v))
    pref.destroy()

    fireChange(true)
    expect(calls).toEqual([false]) // no further callbacks
  })

  it('reports current reduced state', () => {
    const calls: boolean[] = []
    const pref = observeReducedMotion((v) => calls.push(v))
    expect(pref.current).toBe(false)

    fireChange(true)
    expect(pref.current).toBe(true)
    expect(calls).toEqual([false, true])

    pref.destroy()
  })
})

describe('motion-tokens', () => {
  it('all durations are finite positive numbers', () => {
    for (const value of Object.values(motionDuration)) {
      expect(value).toBeGreaterThan(0)
      expect(Number.isFinite(value)).toBe(true)
    }
  })

  it('panel duration is within budget (< 300ms)', () => {
    expect(motionDuration.panel).toBeLessThanOrEqual(0.3)
  })

  it('cinematic duration is within budget (< 480ms)', () => {
    expect(motionDuration.cinematic).toBeLessThanOrEqual(0.48)
  })

  it('easing values are valid cubic-bezier arrays', () => {
    for (const ease of Object.values(motionEase)) {
      expect(ease).toHaveLength(4)
      for (const v of ease) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('spring configs have positive stiffness and damping', () => {
    for (const spring of Object.values(motionSpring)) {
      expect(spring.stiffness).toBeGreaterThan(0)
      expect(spring.damping).toBeGreaterThan(0)
      expect(spring.mass).toBeGreaterThan(0)
    }
  })
})
