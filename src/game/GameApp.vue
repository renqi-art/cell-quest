<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { LegacyGameEngineAdapter } from './bridge/LegacyGameEngineAdapter'
import type { GameEngine } from './bridge/GameEngine'
import { useGameUiStore } from './stores/game-ui'
import CaseHud from './components/CaseHud.vue'
import DirectorCrisisCard from './components/DirectorCrisisCard.vue'
import { bindLegacyMotion } from './motion/legacy-motion'
import { observeReducedMotion } from './motion/reduced-motion'
import { audio } from './audio/AudioManager'
import './styles/motion.css'

const store = useGameUiStore()

// —— 背景音乐开关按钮（仅控制 BGM，不动任何动作音效）——
const bgmIsMuted = ref(audio.isMuted) // true=静音
function toggleBgm(): void {
  const m = audio.toggleMuted()
  bgmIsMuted.value = m
  console.log(m ? 'BGM状态：关闭' : 'BGM状态：开启')
}

const unsubscribers: Array<() => void> = []
let engine: GameEngine | null = null
let motionBinding: ReturnType<typeof bindLegacyMotion> | null = null
let motionPreference: ReturnType<typeof observeReducedMotion> | null = null
let reducedMotion = false

onMounted(async () => {
  engine = new LegacyGameEngineAdapter(window.CellQuestLegacy)
  const host = document.querySelector<HTMLElement>('#game-container')
  await engine.mount(host ?? document.body)
  audio.startBgm() // 页面加载完成：循环播放背景音乐（首次手势兜底）
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
  <!-- 右上角 BGM 开关：仅控制背景音乐，不影响任何动作音效 -->
  <button
    class="bgm-toggle"
    type="button"
    :aria-pressed="bgmIsMuted"
    :title="bgmIsMuted ? '背景音乐：关闭（点击开启）' : '背景音乐：开启（点击关闭）'"
    @click="toggleBgm"
  >
    <!-- 有声音：扬声器 + 声波 -->
    <svg v-if="!bgmIsMuted" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      <path d="M16 8c1.5 1.2 1.5 6.8 0 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <path d="M18.6 5.4c2.8 2.3 2.8 10.9 0 13.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>
    <!-- 静音：扬声器 + 叉 -->
    <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      <line x1="16" y1="9" x2="21" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <line x1="21" y1="9" x2="16" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>
  </button>

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

/* ===== 右上角 BGM 开关按钮 ===== */
.bgm-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);   /* 半透明深色圆形 */
  color: #fff;                          /* 白色图标 */
  cursor: pointer;
  z-index: 9999;                        /* 始终在游戏画布上方 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}
.bgm-toggle:hover {
  transform: scale(1.12);              /* 悬停轻微放大 */
  background: rgba(0, 0, 0, 0.72);   /* 悬停高亮 */
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
}
.bgm-toggle:active {
  transform: scale(0.96);
}
.bgm-toggle svg {
  display: block;
}
</style>
