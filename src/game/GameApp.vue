<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { LegacyGameEngineAdapter } from './bridge/LegacyGameEngineAdapter'
import { LegacyEditorPreviewAdapter, type PreviewLevelRegistry } from '@/editor/services/LegacyEditorPreviewAdapter'
import type { PreviewSession } from '@/editor/services/EditorPreviewGateway'
import { parsePreviewPayload } from './services/PreviewBootstrap'
import { useGameUiStore } from './stores/game-ui'
import CaseHud from './components/CaseHud.vue'
import { bindLegacyMotion } from './motion/legacy-motion'
import { observeReducedMotion } from './motion/reduced-motion'
import './styles/motion.css'

const store = useGameUiStore()
const engine = new LegacyGameEngineAdapter(window.CellQuestLegacy)
const unsubscribers: Array<() => void> = []
const previewTitle = ref('')
const previewError = ref('')
let previewSession: PreviewSession | null = null
let motionBinding: ReturnType<typeof bindLegacyMotion> | null = null
let motionPreference: ReturnType<typeof observeReducedMotion> | null = null
let reducedMotion = false

function waitForWindowLoad(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise(resolve => window.addEventListener('load', () => resolve(), { once: true }))
}

async function startPreviewIfRequested(): Promise<void> {
  if (new URLSearchParams(window.location.search).get('preview') !== '1') return
  const parsed = parsePreviewPayload(sessionStorage.getItem('cellQuest_previewDraft'))
  if (!parsed.ok) {
    previewError.value = parsed.error
    return
  }
  previewTitle.value = parsed.value.draft.metadata.title || '未命名病例'
  try {
    const gateway = new LegacyEditorPreviewAdapter(
      engine,
      window.CellQuestLegacy as typeof window.CellQuestLegacy & PreviewLevelRegistry,
    )
    previewSession = await gateway.start(parsed.value.draft, parsed.value.options)
    sessionStorage.removeItem('cellQuest_previewDraft')
  } catch (cause) {
    previewError.value = cause instanceof Error ? cause.message : '病例试玩启动失败'
  }
}

onMounted(async () => {
  const host = document.querySelector<HTMLElement>('#game-container')
  await engine.mount(host ?? document.body)
  unsubscribers.push(
    engine.subscribe('state-changed', store.setScreen),
    engine.subscribe('hud-updated', store.updateHud),
    engine.subscribe('fatal-error', store.fail),
    engine.subscribe('case-updated', store.updateCaseHud),
  )
  motionPreference = observeReducedMotion(value => { reducedMotion = value })
  motionBinding = bindLegacyMotion(() => reducedMotion)
  await waitForWindowLoad()
  await startPreviewIfRequested()
})

onBeforeUnmount(() => {
  previewSession?.dispose()
  previewSession = null
  motionBinding?.destroy()
  motionPreference?.destroy()
  motionBinding = null
  motionPreference = null
  unsubscribers.splice(0).forEach(unsubscribe => unsubscribe())
  engine.destroy()
})
</script>

<template>
  <div v-if="previewTitle" class="case-preview-banner" data-testid="case-preview-banner">
    正在试玩：{{ previewTitle }}
  </div>
  <div v-if="previewError" class="case-preview-error" role="alert">{{ previewError }}</div>
  <CaseHud v-if="store.caseSnapshot" :snapshot="store.caseSnapshot" />
  <div v-else class="vue-migration-root" aria-hidden="true" />
</template>

<style scoped>
.case-preview-banner, .case-preview-error { position: fixed; top: 8px; left: 50%; z-index: 30; translate: -50% 0; padding: 7px 14px; border-radius: 999px; background: rgb(8 14 30 / 88%); color: #eaf3ff; font-size: 12px; }
.case-preview-error { color: #ffaaaa; border: 1px solid #b54b4b; }
</style>
