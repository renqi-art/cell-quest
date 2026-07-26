import type { ClassicWinCondition } from '../types'

export interface ClassicCompletionWorld {
  readonly touchedFinish: boolean
  readonly allEnemiesDefeated: boolean
  readonly allItemsCollected: boolean
  readonly bossAlive: boolean
}

export function canCompleteClassicLevel(
  condition: ClassicWinCondition,
  world: ClassicCompletionWorld,
): boolean {
  if (world.bossAlive) return false
  if (condition === 'reach-finish') return world.touchedFinish
  if (condition === 'kill-all') return world.allEnemiesDefeated
  return world.allItemsCollected
}
