<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { LegacyGameEngineAdapter } from './bridge/LegacyGameEngineAdapter'
import type { GameEngine } from './bridge/GameEngine'
import { useGameUiStore } from './stores/game-ui'
import CaseHud from './components/CaseHud.vue'
import DirectorCrisisCard from './components/DirectorCrisisCard.vue'
import { bindLegacyMotion } from './motion/legacy-motion'
import { observeReducedMotion } from './motion/reduced-motion'
import './styles/motion.css'

const store = useGameUiStore()
const unsubscribers: Array<() => void> = []
let engine: GameEngine | null = null
let motionBinding: ReturnType<typeof bindLegacyMotion> | null = null
let motionPreference: ReturnType<typeof observeReducedMotion> | null = null
let reducedMotion = false

onMounted(async () => {
  engine = new LegacyGameEngineAdapter(window.CellQuestLegacy)
  const host = document.querySelector<HTMLElement>('#game-container')
  await engine.mount(host ?? document.body)
  unsubscribers.push(
    engine.subscribe('state-changed', store.setScreen),
    engine.subscribe('hud-updated', store.updateHud),
    engine.subscribe('fatal-error', store.fail),
    engine.subscribe('case-updated', store.updateCaseHud),
    engine.subscribe('director-pending', store.setDirectorPending),
    engine.subscribe('director-decision', store.addDirectorDecision),
  )
  motionPreference = observeReducedMotion(value => { reducedMotion = value })
  motionBinding = bindLegacyMotion(() => reducedMotion)
})

onBeforeUnmount(() => {
  motionBinding?.destroy()
  motionPreference?.destroy()
  unsubscribers.splice(0).forEach(unsubscribe => unsubscribe())
  engine?.destroy()
  engine = null
})
</script>

<template>
  <DirectorCrisisCard
    v-if="store.directorHistory.length"
    :entry="store.directorHistory[store.directorHistory.length - 1]!"
  />
  <CaseHud
    v-if="store.caseSnapshot"
    :snapshot="store.caseSnapshot"
  />
  <div
    v-else-if="!store.caseSnapshot"
    class="vue-migration-root"
    aria-hidden="true"
  />
</template>

<style scoped>
:global(body.phaser-runtime-active #game-container) { visibility: hidden; pointer-events: none; }
</style>
