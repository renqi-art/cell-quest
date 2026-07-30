import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadLegacyObject } from './legacy-mobile-test-utils'
import capabilitySource from '../../js/mobile/capability.js?raw'
import indexHtml from '../../index.html?raw'

type Capability = {
  viewportWidth: number
  viewportHeight: number
  isPortrait: boolean
  isLandscape: boolean
  refresh: () => void
}

describe('mobile capability', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 390)
    vi.stubGlobal('innerHeight', 844)
  })

  it('uses visualViewport as the effective viewport when browser chrome changes', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { width: 780, height: 360 },
    })
    const capability = loadLegacyObject<Capability>(capabilitySource, 'MobileCapability')

    capability.refresh()

    expect(capability.viewportWidth).toBe(780)
    expect(capability.viewportHeight).toBe(360)
    expect(capability.isPortrait).toBe(false)
    expect(capability.isLandscape).toBe(true)
  })

  it('falls back to the layout viewport when visualViewport is unavailable', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined,
    })
    const capability = loadLegacyObject<Capability>(capabilitySource, 'MobileCapability')

    capability.refresh()

    expect(capability.viewportWidth).toBe(390)
    expect(capability.viewportHeight).toBe(844)
    expect(capability.isPortrait).toBe(true)
  })

  it('opts into CSS safe-area insets through viewport-fit cover', () => {
    expect(indexHtml).toMatch(/name="viewport"[^>]*content="[^"]*viewport-fit=cover/)
  })
})
