<script setup lang="ts">
import { computed } from 'vue'
import type { DirectorHistoryEntry } from '@/shared/types/director'

const props = defineProps<{ entry: DirectorHistoryEntry }>()
const sourceLabel = computed(() => props.entry.source === 'ai' ? 'AI 导演' : '本地导演')
const eventLabel = computed(() => ({
  ACUTE_HYPOXIA: '急性缺氧',
  INFECTION_REBOUND: '感染反弹',
  TRANSPORT_BLOCKAGE: '运输阻塞',
  ATP_CRISIS: 'ATP 危机',
})[props.entry.plan.eventId])
const goals = computed(() => {
  const values: string[] = []
  const goal = props.entry.plan.goal
  if (goal.oxygenDeliveries) values.push('供氧 ' + goal.oxygenDeliveries + ' 次')
  if (goal.infectionSites) values.push('清除感染 ' + goal.infectionSites + ' 处')
  if (goal.timeLimitSeconds) values.push(goal.timeLimitSeconds + ' 秒')
  return values.join(' · ')
})
</script>

<template>
  <aside
    class="director-card"
    data-testid="director-crisis-card"
    aria-live="polite"
  >
    <header>
      <span class="source">{{ sourceLabel }}</span>
      <span>阶段 {{ entry.phase }}</span>
      <strong>{{ eventLabel }}</strong>
    </header>
    <p>{{ entry.plan.doctorLine }}</p>
    <p class="reason">
      原因：{{ entry.plan.reason }}
    </p>
    <p class="goal">
      目标：{{ goals }}
    </p>
  </aside>
</template>

<style scoped>
.director-card { position: fixed; left: 16px; top: 64px; z-index: 28; width: min(340px, calc(100vw - 32px)); padding: 12px 14px; border: 1px solid #755ee8; border-radius: 10px; background: rgb(12 13 35 / 92%); color: #f4f2ff; box-shadow: 0 10px 32px rgb(0 0 0 / 35%); }
header { display: flex; align-items: center; gap: 8px; font-size: 11px; }
header strong { margin-left: auto; color: #ffd36a; }
.source { padding: 2px 6px; border-radius: 999px; background: #473a95; }
p { margin: 8px 0 0; font-size: 12px; }
.reason { color: #aeb9d8; }
.goal { color: #8de0b0; font-weight: 600; }
</style>
