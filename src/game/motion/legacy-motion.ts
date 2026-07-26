import { animate, stagger } from 'motion'
import { motionDistance, motionDuration, motionEase } from './motion-tokens'

/**
 * Stable overlay IDs that the legacy adapter observes.
 * Only these DOM nodes are watched for class changes.
 */
const overlayIds = [
  'main-menu',
  'hub-screen',
  'pedia-screen',
  'char-detail-screen',
  'pause-menu',
  'complete-screen',
  'death-panel',
  'memory-card',
  'confirm-dialog',
  'skill-tree-screen',
  'equipment-screen',
] as const

/** Child elements inside overlays that get staggered entrance */
const itemSelector = [
  'h1',
  'h2',
  'h3',
  '.btn',
  '.btn-small',
  '.level-card',
  '.stats',
].join(',')

type MotionControl = ReturnType<typeof animate>

function playOverlayEntrance(
  overlay: HTMLElement,
  reducedMotion: boolean,
): MotionControl[] {
  if (reducedMotion) {
    return [
      animate(
        overlay,
        { opacity: [0, 1] },
        { duration: motionDuration.instant },
      ),
    ]
  }

  const controls: MotionControl[] = [
    animate(
      overlay,
      {
        opacity: [0, 1],
        y: [motionDistance.panel, 0],
        scale: [0.985, 1],
      },
      {
        duration: motionDuration.panel,
        ease: motionEase.standard,
      },
    ),
  ]

  const items = overlay.querySelectorAll<HTMLElement>(itemSelector)
  if (items.length > 0) {
    controls.push(
      animate(
        items,
        {
          opacity: [0, 1],
          y: [motionDistance.control, 0],
        },
        {
          duration: motionDuration.normal,
          delay: stagger(0.035, { startDelay: 0.04 }),
          ease: motionEase.standard,
        },
      ),
    )
  }

  return controls
}

export interface LegacyMotionBinding {
  destroy(): void
}

/**
 * Bind Motion entrance animations to legacy DOM overlays.
 * Observes `hidden` class changes on stable overlay IDs.
 *
 * @param reducedMotion — a function returning the current reduced-motion preference
 */
export function bindLegacyMotion(
  reducedMotion: () => boolean,
): LegacyMotionBinding {
  const observers: MutationObserver[] = []
  const activeControls = new Set<MotionControl>()
  const overlayControls = new Map<string, MotionControl[]>()

  const play = (overlay: HTMLElement): void => {
    // Cancel any existing animations for this overlay (prevents rapid show/hide stacking)
    const existing = overlayControls.get(overlay.id)
    if (existing) {
      for (const control of existing) {
        control.cancel()
        activeControls.delete(control)
      }
    }

    const controls = playOverlayEntrance(overlay, reducedMotion())
    overlayControls.set(overlay.id, controls)

    for (const control of controls) {
      activeControls.add(control)
      void control.then(
        () => {
          activeControls.delete(control)
          // Remove from overlay tracking once done
          const tracked = overlayControls.get(overlay.id)
          if (tracked) {
            const idx = tracked.indexOf(control)
            if (idx >= 0) tracked.splice(idx, 1)
            if (tracked.length === 0) overlayControls.delete(overlay.id)
          }
        },
        () => {
          activeControls.delete(control)
          const tracked = overlayControls.get(overlay.id)
          if (tracked) {
            const idx = tracked.indexOf(control)
            if (idx >= 0) tracked.splice(idx, 1)
            if (tracked.length === 0) overlayControls.delete(overlay.id)
          }
        },
      )
    }
  }

  for (const id of overlayIds) {
    const overlay = document.getElementById(id)
    if (!overlay) continue

    const observer = new MutationObserver(() => {
      if (!overlay.classList.contains('hidden')) play(overlay)
    })

    observer.observe(overlay, {
      attributes: true,
      attributeFilter: ['class'],
    })
    observers.push(observer)

    if (!overlay.classList.contains('hidden')) play(overlay)
  }

  return {
    destroy() {
      observers.forEach((observer) => observer.disconnect())
      activeControls.forEach((control) => control.cancel())
      activeControls.clear()
      overlayControls.clear()
    },
  }
}
