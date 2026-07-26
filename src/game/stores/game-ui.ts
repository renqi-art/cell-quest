import { readonly, ref } from 'vue'
import { defineStore } from 'pinia'
import type { GameScreenState, HudSnapshot } from '@/shared/types/game'
import type { EngineFailure } from '@/shared/types/events'

export const useGameUiStore = defineStore('game-ui', () => {
  const screen = ref<GameScreenState>('menu')
  const hud = ref<HudSnapshot | null>(null)
  const failure = ref<EngineFailure | null>(null)

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

  return {
    screen: readonly(screen),
    hud: readonly(hud),
    failure: readonly(failure),
    setScreen,
    updateHud,
    fail,
  }
})
