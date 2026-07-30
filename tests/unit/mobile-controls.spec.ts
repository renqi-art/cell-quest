import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadLegacyObject } from './legacy-mobile-test-utils'
import inputSource from '../../js/mobile/input-controller.js?raw'
import controlsSource from '../../js/mobile/controls-overlay.js?raw'

type Input = {
  init: () => void
  getActions: () => Record<string, boolean>
}

type Overlay = {
  init: () => void
  setDisabled: (disabled: boolean) => void
}

describe('mobile controls overlay', () => {
  let input: Input

  beforeEach(() => {
    document.body.innerHTML = '<div id="game-container"></div>'
    vi.stubGlobal('MobileCapability', { hasTouch: true })
    input = loadLegacyObject<Input>(inputSource, 'MobileInputController')
    input.init()
    vi.stubGlobal('MobileInputController', input)
  })

  it('fully releases pointer state and visuals when controls are disabled', () => {
    const releasePointerCapture = vi.fn()
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = releasePointerCapture
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => true)
    const overlay = loadLegacyObject<Overlay>(
      controlsSource,
      'MobileControlsOverlay',
    )
    overlay.init()
    const skillButton = document.getElementById('mb-skill')!
    skillButton.dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: 9,
      bubbles: true,
    }))

    overlay.setDisabled(true)

    expect(skillButton.classList.contains('pressed')).toBe(false)
    expect(releasePointerCapture).toHaveBeenCalledWith(9)
    expect(Object.values(input.getActions()).every((pressed) => !pressed)).toBe(true)
  })

  it('provides touch pause and landscape fullscreen controls', () => {
    const overlay = loadLegacyObject<Overlay>(
      controlsSource,
      'MobileControlsOverlay',
    )
    overlay.init()

    expect(document.getElementById('btn-mobile-pause')).not.toBeNull()
    expect(document.getElementById('btn-mobile-fullscreen-landscape')).not.toBeNull()
    expect(document.getElementById('mobile-fullscreen-status')?.getAttribute('aria-live')).toBe('polite')
  })
})
