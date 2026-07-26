<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { LegacyGameEngineAdapter } from './bridge/LegacyGameEngineAdapter'
import type { PhaserGameEngineAdapter } from './phaser/PhaserGameEngineAdapter'
import type { GameEngine } from './bridge/GameEngine'
import { LegacyEditorPreviewAdapter, type PreviewLevelRegistry } from '@/editor/services/LegacyEditorPreviewAdapter'
import type { PreviewSession } from '@/editor/services/EditorPreviewGateway'
import { parsePreviewPayload } from './services/PreviewBootstrap'
import { useGameUiStore } from './stores/game-ui'
import CaseHud from './components/CaseHud.vue'
import DirectorCrisisCard from './components/DirectorCrisisCard.vue'
import CaseCampaignPanel from './components/CaseCampaignPanel.vue'
import CaseResultPanel from './components/CaseResultPanel.vue'
import OnboardingPanel from './components/OnboardingPanel.vue'
import { OFFICIAL_CASES, type OfficialCaseChapter } from '@/shared/content/official-cases'
import type { DailyCase } from './services/DailyCaseService'
import { CaseProgressRepository } from './services/CaseProgressRepository'
import type { CaseDraft } from '@/shared/models/case-draft'
import type { CaseResult } from '@/shared/types/case'
import { bindLegacyMotion } from './motion/legacy-motion'
import { observeReducedMotion } from './motion/reduced-motion'
import './styles/motion.css'

const store = useGameUiStore()
const query = new URLSearchParams(window.location.search)
const isPreviewMode = query.get('preview') === '1'
const usePhaserRuntime = query.get('engine') === 'phaser'
const unsubscribers: Array<() => void> = []
const previewTitle = ref('')
const previewError = ref('')
const caseResult = ref<CaseResult | null>(null)
const currentDraft = ref<CaseDraft | null>(null)
const showOnboarding = ref(!isPreviewMode && localStorage.getItem('cellQuest_onboardingVersion') !== '1')
let engine: GameEngine | null = null
let previewSession: PreviewSession | null = null
let motionBinding: ReturnType<typeof bindLegacyMotion> | null = null
let motionPreference: ReturnType<typeof observeReducedMotion> | null = null
let reducedMotion = false

function waitForWindowLoad(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise(resolve => window.addEventListener('load', () => resolve(), { once: true }))
}

async function startPreviewIfRequested(): Promise<void> {
  if (!isPreviewMode || !engine) return
  const parsed = parsePreviewPayload(sessionStorage.getItem('cellQuest_previewDraft'))
  if (!parsed.ok) {
    previewError.value = parsed.error
    return
  }
  currentDraft.value = parsed.value.draft
  previewTitle.value = parsed.value.draft.metadata.title || '未命名病例'
  try {
    if (usePhaserRuntime) {
      const phaserEngine = engine as PhaserGameEngineAdapter
      await phaserEngine.loadCaseDraft(parsed.value.draft, {
        twoPlayer: parsed.value.options.role === 'coop',
        playerOneCell: parsed.value.options.role === 'wbc' ? 2 : 1,
        playerTwoCell: parsed.value.options.role === 'coop' ? 2 : undefined,
      })
    } else {
      const gateway = new LegacyEditorPreviewAdapter(
        engine as LegacyGameEngineAdapter,
        window.CellQuestLegacy as typeof window.CellQuestLegacy & PreviewLevelRegistry,
      )
      previewSession = await gateway.start(parsed.value.draft, parsed.value.options)
    }
    sessionStorage.removeItem('cellQuest_previewDraft')
  } catch (cause) {
    previewError.value = cause instanceof Error ? cause.message : '病例试玩启动失败'
  }
}

function openDraftInPhaser(draft: CaseDraft): void {
  const primaryCell = draft.caseConfig?.primaryCell ?? 'rbc'
  sessionStorage.setItem('cellQuest_previewDraft', JSON.stringify({
    draft,
    options: { role: primaryCell, start: { type: 'full' }, timestamp: Date.now() },
  }))
  window.location.assign('/?preview=1&engine=phaser')
}

function startOfficialCase(officialCase: OfficialCaseChapter): void {
  openDraftInPhaser(officialCase.draft)
}

function startDailyCase(dailyCase: DailyCase): void {
  openDraftInPhaser(dailyCase.draft)
}

function completeOnboarding(): void {
  localStorage.setItem('cellQuest_onboardingVersion', '1')
  showOnboarding.value = false
  startOfficialCase(OFFICIAL_CASES[0]!)
}

function finishCase(result: CaseResult): void {
  caseResult.value = result
  if (!currentDraft.value) return
  const events = store.directorHistory.map(entry => entry.plan.eventId)
  new CaseProgressRepository(localStorage).record(currentDraft.value.id, result, events)
}

function replayCase(): void {
  caseResult.value = null
  engine?.retry()
}

function returnToCampaign(): void {
  window.location.assign('/')
}

onMounted(async () => {
  if (usePhaserRuntime) {
    const module = await import('./phaser/PhaserGameEngineAdapter')
    engine = new module.PhaserGameEngineAdapter()
  } else {
    engine = new LegacyGameEngineAdapter(window.CellQuestLegacy)
  }
  const host = document.querySelector<HTMLElement>(usePhaserRuntime ? '#phaser-case-runtime' : '#game-container')
  await engine.mount(host ?? document.body)
  unsubscribers.push(
    engine.subscribe('state-changed', store.setScreen),
    engine.subscribe('hud-updated', store.updateHud),
    engine.subscribe('fatal-error', store.fail),
    engine.subscribe('case-updated', store.updateCaseHud),
    engine.subscribe('director-pending', store.setDirectorPending),
    engine.subscribe('director-decision', store.addDirectorDecision),
    engine.subscribe('case-completed', finishCase),
    engine.subscribe('case-failed', finishCase),
  )
  if (!usePhaserRuntime) {
    motionPreference = observeReducedMotion(value => { reducedMotion = value })
    motionBinding = bindLegacyMotion(() => reducedMotion)
  }
  await waitForWindowLoad()
  await startPreviewIfRequested()
})

onBeforeUnmount(() => {
  previewSession?.dispose()
  previewSession = null
  motionBinding?.destroy()
  motionPreference?.destroy()
  unsubscribers.splice(0).forEach(unsubscribe => unsubscribe())
  engine?.destroy()
  engine = null
})
</script>

<template>
  <CaseCampaignPanel
    v-if="!isPreviewMode"
    @start="startOfficialCase"
    @daily="startDailyCase"
  />
  <OnboardingPanel
    v-if="showOnboarding"
    @complete="completeOnboarding"
  />
  <div
    v-if="usePhaserRuntime"
    id="phaser-case-runtime"
    data-testid="phaser-case-runtime"
  />
  <div
    v-if="previewTitle"
    class="case-preview-banner"
    data-testid="case-preview-banner"
  >
    正在试玩：{{ previewTitle }}
  </div>
  <div
    v-if="previewError"
    class="case-preview-error"
    role="alert"
  >
    {{ previewError }}
  </div>
  <DirectorCrisisCard
    v-if="store.directorHistory.length"
    :entry="store.directorHistory[store.directorHistory.length - 1]!"
  />
  <CaseHud
    v-if="store.caseSnapshot"
    :snapshot="store.caseSnapshot"
  />
  <CaseResultPanel
    v-if="caseResult && currentDraft"
    :title="currentDraft.metadata.title"
    :result="caseResult"
    :director-events="store.directorHistory.map(entry => entry.plan.eventId)"
    :learning-takeaway="currentDraft.caseConfig?.education.topic ?? '维持患者指标稳定需要运输与防御协作。'"
    @replay="replayCase"
    @home="returnToCampaign"
  />
  <div
    v-else-if="!store.caseSnapshot"
    class="vue-migration-root"
    aria-hidden="true"
  />
</template>

<style scoped>
#phaser-case-runtime { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; background: #07101f; }
.case-preview-banner, .case-preview-error { position: fixed; top: 8px; left: 50%; z-index: 30; translate: -50% 0; padding: 7px 14px; border-radius: 999px; background: rgb(8 14 30 / 88%); color: #eaf3ff; font-size: 12px; }
.case-preview-error { color: #ffaaaa; border: 1px solid #b54b4b; }
</style>
