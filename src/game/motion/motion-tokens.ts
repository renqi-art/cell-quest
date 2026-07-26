// Unified motion design tokens for Cell Quest
// All UI animations must use these values — no ad-hoc durations in components.

export const motionDuration = {
  /** Button feedback, micro-interactions */
  instant: 0.08,
  /** Control hover/press, small reveals */
  fast: 0.14,
  /** List items, menu stagger */
  normal: 0.22,
  /** Panels, dialogs, overlays */
  panel: 0.3,
  /** Title reveals, level complete fanfare */
  cinematic: 0.48,
} as const

export const motionDistance = {
  /** Button and control micro-movement */
  control: 4,
  /** Panel slide-in distance */
  panel: 16,
  /** Hero/title movement */
  hero: 28,
} as const

export const motionEase = {
  /** Standard entrance easing */
  standard: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** Exit easing */
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
} as const

export const motionSpring = {
  /** Button hover/press */
  control: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 30,
    mass: 0.7,
  },
  /** Panel open/close */
  panel: {
    type: 'spring' as const,
    stiffness: 260,
    damping: 26,
    mass: 0.9,
  },
} as const
