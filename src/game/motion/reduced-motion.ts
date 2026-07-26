/**
 * Observes the user's prefers-reduced-motion preference.
 * Returns initial value + subscription + cleanup.
 */
export interface ReducedMotionPreference {
  readonly current: boolean
  destroy(): void
}

export function observeReducedMotion(
  onChange: (reduced: boolean) => void,
): ReducedMotionPreference {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')

  const notify = (): void => onChange(query.matches)

  query.addEventListener('change', notify)
  notify()

  return {
    get current() {
      return query.matches
    },
    destroy() {
      query.removeEventListener('change', notify)
    },
  }
}
