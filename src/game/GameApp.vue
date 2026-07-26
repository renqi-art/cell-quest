<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { LegacyGameEngineAdapter } from './bridge/LegacyGameEngineAdapter'
import { useGameUiStore } from './stores/game-ui'
import CaseHud from './components/CaseHud.vue'

const store = useGameUiStore()
const engine = new LegacyGameEngineAdapter(window.CellQuestLegacy)
const unsubscribers: Array<() => void> = []

onMounted(async () => {
  const host = document.querySelector<HTMLElement>('#game-container')
  await engine.mount(host ?? document.body)
  unsubscribers.push(
    engine.subscribe('state-changed', store.setScreen),
    engine.subscribe('hud-updated', store.updateHud),
    engine.subscribe('fatal-error', store.fail),
    engine.subscribe('case-updated', store.updateCaseHud),
  )
})

onBeforeUnmount(() => {
  unsubscribers.splice(0).forEach(unsubscribe => unsubscribe())
  engine.destroy()
})
</script>

<template>
  <CaseHud
    v-if="store.caseSnapshot"
    :snapshot="store.caseSnapshot"
  />
  <div
    v-else
    class="vue-migration-root"
    aria-hidden="true"
  />
</template>
