<script setup lang="ts">
import { computed, ref } from 'vue'

defineEmits<{ complete: [] }>()

const step = ref(0)
const panels = [
  { label: '患者指标', body: '先观察氧供、感染和组织活性，它们共同决定患者是否稳定。' },
  { label: '细胞职责', body: '红细胞负责运输氧气，白细胞负责清除感染，协作病例需要彼此配合。' },
  { label: 'AI 病情卡', body: 'AI 导演只从安全白名单中选择危机；卡片会标明在线 AI 或本地导演。' },
  { label: '稳定通关', body: '完成目标后继续维持指标稳定，倒计时结束才算病例完成。' },
] as const

const panel = computed(() => panels[step.value]!)
</script>

<template>
  <section class="onboarding" data-testid="onboarding-panel" aria-live="polite" aria-labelledby="onboarding-title">
    <p class="step">首次引导 {{ step + 1 }} / {{ panels.length }}</p>
    <h2 id="onboarding-title">{{ panel.label }}</h2>
    <p>{{ panel.body }}</p>
    <button
      v-if="step < panels.length - 1"
      type="button"
      data-testid="onboarding-next"
      @click="step += 1"
    >
      下一步
    </button>
    <button
      v-else
      type="button"
      data-testid="onboarding-start"
      @click="$emit('complete')"
    >
      开始第一章
    </button>
  </section>
</template>

<style scoped>
.onboarding { position: fixed; left: 18px; bottom: 18px; z-index: 130; width: min(360px, calc(100vw - 36px)); padding: 18px; border: 1px solid #5d7cc2; border-radius: 16px; color: #f4f7ff; background: rgb(10 18 37 / 96%); box-shadow: 0 16px 48px rgb(0 0 0 / 45%); pointer-events: none; }
.step { margin: 0; color: #82a8ff; font-size: 10px; letter-spacing: .1em; }
h2 { margin: 4px 0; font-size: 20px; }
p { color: #c6d0e6; font-size: 13px; line-height: 1.6; }
button { padding: 8px 14px; border: 1px solid #7397e8; border-radius: 999px; color: white; background: #294476; cursor: pointer; pointer-events: auto; }
</style>
