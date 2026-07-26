import { readonly, ref } from 'vue'
import { defineStore } from 'pinia'
import type { GameScreenState, HudSnapshot } from '@/shared/types/game'
import type { EngineFailure } from '@/shared/types/events'
import type { CaseSnapshot } from '@/shared/types/case'
import type { DirectorHistoryEntry } from '@/shared/types/director'

export const useGameUiStore = defineStore('game-ui', () => {
  const screen = ref<GameScreenState>('menu')
  const hud = ref<HudSnapshot | null>(null)
  const failure = ref<EngineFailure | null>(null)
  const caseSnapshot = ref<CaseSnapshot | null>(null)
  const directorPending = ref(false)
  const directorHistory = ref<readonly DirectorHistoryEntry[]>([])

  function setScreen(next: GameScreenState): void {
    screen.value = next
    if (next !== 'error') failure.value = null
  }

  function updateHud(snapshot: HudSnapshot): void {
    hud.value = snapshot
  }

  function fail(error: EngineFailure): void {
    failure.value = error
    screen.value = 'error'
  }

  function updateCaseHud(snapshot: CaseSnapshot): void {
    caseSnapshot.value = snapshot
  }

  function setDirectorPending(pending: boolean): void {
    directorPending.value = pending
  }

  function addDirectorDecision(entry: DirectorHistoryEntry): void {
    directorHistory.value = [...directorHistory.value, entry]
  }

  return {
    screen: readonly(screen),
    hud: readonly(hud),
    failure: readonly(failure),
    caseSnapshot: readonly(caseSnapshot),
    directorPending: readonly(directorPending),
    directorHistory: readonly(directorHistory),
    setScreen,
    updateHud,
    fail,
    updateCaseHud,
    setDirectorPending,
    addDirectorDecision,
  }
})
