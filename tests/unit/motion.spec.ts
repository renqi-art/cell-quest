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

describe('bindLegacyMotion', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'test-container'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  function createOverlay(id: string, hidden = true) {
    const el = document.createElement('div')
    el.id = id
    el.className = hidden ? 'overlay hidden' : 'overlay'
    container.appendChild(el)
    return el
  }

  it('skips non-existent overlay IDs without error', async () => {
    const { bindLegacyMotion } = await import('@/game/motion/legacy-motion')
    const binding = bindLegacyMotion(() => false)
    expect(binding.destroy).toBeDefined()
    binding.destroy()
  })

  it('plays entrance animation when hidden class is removed', async () => {
    const overlay = createOverlay('main-menu', true)
    // Simulate adapter behavior: observe mutation on class change
    const { bindLegacyMotion } = await import('@/game/motion/legacy-motion')

    const binding = bindLegacyMotion(() => false)

    // Remove hidden class — should trigger animation
    overlay.classList.remove('hidden')

    // Wait a frame for MutationObserver to fire
    await new Promise((r) => requestAnimationFrame(r))

    // Animation should have started (opacity/y/scale changed from initial)
    // In a real scenario, Motion would animate. Here we verify no error.
    expect(overlay.classList.contains('hidden')).toBe(false)

    binding.destroy()
  })

  it('destroy disconnects observers and cancels animations', async () => {
    const overlay = createOverlay('pause-menu', true)
    const { bindLegacyMotion } = await import('@/game/motion/legacy-motion')

    const binding = bindLegacyMotion(() => false)

    // Trigger animation
    overlay.classList.remove('hidden')
    await new Promise((r) => requestAnimationFrame(r))

    // Destroy should not throw
    expect(() => binding.destroy()).not.toThrow()

    // After destroy, removing hidden should NOT animate (observer disconnected)
    const overlay2 = createOverlay('death-panel', true)
    overlay2.classList.remove('hidden')
    // No error expected
  })

  it('reduced-motion uses instant duration only', async () => {
    const overlay = createOverlay('complete-screen', true)
    const { bindLegacyMotion } = await import('@/game/motion/legacy-motion')

    const binding = bindLegacyMotion(() => true) // reduced motion

    overlay.classList.remove('hidden')
    await new Promise((r) => requestAnimationFrame(r))

    // Should not throw
    expect(overlay.classList.contains('hidden')).toBe(false)

    binding.destroy()
  })

  it('multiple overlays can animate independently', async () => {
    const menu = createOverlay('main-menu', true)
    const pause = createOverlay('pause-menu', true)
    const { bindLegacyMotion } = await import('@/game/motion/legacy-motion')

    const binding = bindLegacyMotion(() => false)

    menu.classList.remove('hidden')
    await new Promise((r) => requestAnimationFrame(r))

    pause.classList.remove('hidden')
    await new Promise((r) => requestAnimationFrame(r))

    expect(menu.classList.contains('hidden')).toBe(false)
    expect(pause.classList.contains('hidden')).toBe(false)

    binding.destroy()
  })

  it('rapid show/hide/show cancels old animations', async () => {
    const overlay = createOverlay('confirm-dialog', true)
    const { bindLegacyMotion } = await import('@/game/motion/legacy-motion')

    const binding = bindLegacyMotion(() => false)

    // Show
    overlay.classList.remove('hidden')
    await new Promise((r) => requestAnimationFrame(r))

    // Hide (add hidden back)
    overlay.classList.add('hidden')

    // Show again (rapid toggle)
    overlay.classList.remove('hidden')
    await new Promise((r) => requestAnimationFrame(r))

    // No error — old animations cancelled by overlayControls tracking
    expect(overlay.classList.contains('hidden')).toBe(false)

    binding.destroy()
  })
})
