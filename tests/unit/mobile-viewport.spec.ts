import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadLegacyObject } from './legacy-mobile-test-utils'
import viewportSource from '../../js/mobile/viewport-coordinator.js?raw'

type Coordinator = {
  init: () => void
  requestBattleStart: (onReady?: () => void) => boolean
  clearBattleGate: () => void
  onViewportChange: () => void
}

describe('mobile viewport coordinator', () => {
  let capability: {
    hasTouch: boolean
    isPortrait: boolean
    viewportWidth: number
    viewportHeight: number
    safeAreaTop: number
    safeAreaBottom: number
    safeAreaLeft: number
    safeAreaRight: number
    refresh: ReturnType<typeof vi.fn>
    onFullscreenChange: ReturnType<typeof vi.fn>
    isFullscreen: ReturnType<typeof vi.fn>
  }
  let forceReleaseAll: ReturnType<typeof vi.fn>

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="game-container">
        <div id="mobile-portrait-overlay"></div>
        <div id="mobile-landscape-controls"></div>
        <button id="btn-mobile-fullscreen"></button>
      </div>`
    capability = {
      hasTouch: true,
      isPortrait: true,
      viewportWidth: 390,
      viewportHeight: 844,
      safeAreaTop: 0,
      safeAreaBottom: 0,
      safeAreaLeft: 0,
      safeAreaRight: 0,
      refresh: vi.fn(),
      onFullscreenChange: vi.fn(),
      isFullscreen: vi.fn(() => false),
    }
    forceReleaseAll = vi.fn()
    vi.stubGlobal('MobileCapability', capability)
    vi.stubGlobal('MobileControlsOverlay', { forceReleaseAll })
    vi.stubGlobal('Game', { state: 'hub' })
  })

  function loadCoordinator() {
    return loadLegacyObject<Coordinator>(
      viewportSource,
      'MobileViewportCoordinator',
    )
  }

  it('resumes one deferred battle after rotating to landscape', () => {
    const coordinator = loadCoordinator()
    const resume = vi.fn()
    coordinator.init()

    expect(coordinator.requestBattleStart(resume)).toBe(false)

    capability.isPortrait = false
    capability.viewportWidth = 844
    capability.viewportHeight = 390
    coordinator.onViewportChange()
    coordinator.onViewportChange()

    expect(resume).toHaveBeenCalledTimes(1)
    expect(forceReleaseAll).toHaveBeenCalled()
  })

  it('cancels a deferred battle when the gate is explicitly cleared', () => {
    const coordinator = loadCoordinator()
    const resume = vi.fn()
    coordinator.init()
    coordinator.requestBattleStart(resume)

    coordinator.clearBattleGate()
    capability.isPortrait = false
    coordinator.onViewportChange()

    expect(resume).not.toHaveBeenCalled()
  })
})
