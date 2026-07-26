<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { LegacyGameEngineAdapter } from './bridge/LegacyGameEngineAdapter'
import { useGameUiStore } from './stores/game-ui'
import CaseHud from './components/CaseHud.vue'
import { bindLegacyMotion } from './motion/legacy-motion'
import { observeReducedMotion } from './motion/reduced-motion'
import './styles/motion.css'

const store = useGameUiStore()
const engine = new LegacyGameEngineAdapter(window.CellQuestLegacy)
const unsubscribers: Array<() => void> = []

let motionBinding: ReturnType<typeof bindLegacyMotion> | null = null
let motionPreference: ReturnType<typeof observeReducedMotion> | null = null
let reducedMotion = false

onMounted(async () => {
  const host = document.querySelector<HTMLElement>('#game-container')
  await engine.mount(host ?? document.body)

  unsubscribers.push(
    engine.subscribe('state-changed', store.setScreen),
    engine.subscribe('hud-updated', store.updateHud),
    engine.subscribe('fatal-error', store.fail),
    engine.subscribe('case-updated', store.updateCaseHud),
  )

  // Motion: observe reduced-motion preference + bind legacy adapters
  motionPreference = observeReducedMotion((value) => {
    reducedMotion = value
  })
  motionBinding = bindLegacyMotion(() => reducedMotion)
})

onBeforeUnmount(() => {
  motionBinding?.destroy()
  motionPreference?.destroy()
  motionBinding = null
  motionPreference = null

  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe())
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
