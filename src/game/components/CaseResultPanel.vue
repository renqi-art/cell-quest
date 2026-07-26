<script setup lang="ts">
import { computed } from 'vue'
import type { CaseResult } from '@/shared/types/case'
import type { CrisisEventId } from '@/shared/types/director'

const props = defineProps<{
  title: string
  result: CaseResult
  directorEvents: readonly CrisisEventId[]
  learningTakeaway: string
}>()

defineEmits<{ replay: []; home: [] }>()

const duration = computed(() => `${(props.result.durationMs / 1000).toFixed(1)} 秒`)
const statusText = computed(() => props.result.status === 'complete' ? '患者指标已稳定' : '患者指标需要重新评估')
</script>

<template>
  <section
    class="result-panel"
    data-testid="case-result-panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="case-result-title"
  >
    <p class="eyebrow">
      PATIENT CASE REPORT
    </p>
    <h2 id="case-result-title">
      {{ title }}
    </h2>
    <p class="status">
      {{ statusText }}
    </p>
    <dl>
      <div><dt>氧供</dt><dd>{{ Math.round(result.vitals.oxygen) }}</dd></div>
      <div><dt>感染</dt><dd>{{ Math.round(result.vitals.infection) }}</dd></div>
      <div><dt>组织</dt><dd>{{ Math.round(result.vitals.tissue) }}</dd></div>
      <div><dt>用时</dt><dd>{{ duration }}</dd></div>
      <div><dt>死亡</dt><dd>{{ result.deaths }}</dd></div>
      <div><dt>ATP 效率</dt><dd>{{ result.atpEfficiency }}%</dd></div>
    </dl>
    <div class="report-block">
      <strong>AI 病情事件</strong>
      <span>{{ directorEvents.length ? directorEvents.join(' · ') : '本局无额外事件' }}</span>
    </div>
    <div class="report-block">
      <strong>知识回顾</strong>
      <span>{{ learningTakeaway }}</span>
    </div>
    <p class="disclaimer">
      仅用于科普，不构成医疗建议。
    </p>
    <div class="actions">
      <button
        type="button"
        data-testid="replay-case"
        @click="$emit('replay')"
      >
        重新挑战
      </button>
      <button
        type="button"
        data-testid="return-to-campaign"
        @click="$emit('home')"
      >
        返回病例中心
      </button>
    </div>
  </section>
</template>

<style scoped>
.result-panel { position: fixed; inset: 50% auto auto 50%; z-index: 80; translate: -50% -50%; width: min(560px, 92vw); padding: 24px; border: 1px solid #5c79bf; border-radius: 20px; color: #edf4ff; background: linear-gradient(145deg, #15213d, #090f1f); box-shadow: 0 24px 80px rgb(0 0 0 / 55%); }
.eyebrow { margin: 0; color: #83adff; font-size: 10px; letter-spacing: .18em; }
h2 { margin: 6px 0 2px; }
.status { color: #9ee6bc; }
dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
dl div { padding: 10px; border: 1px solid #2b3e69; border-radius: 10px; background: #0d162b; }
dt { color: #9baac8; font-size: 11px; } dd { margin: 2px 0 0; font-size: 18px; font-weight: 800; }
.report-block { display: grid; gap: 4px; margin-top: 10px; padding: 10px; border-radius: 10px; background: #111c35; font-size: 12px; }
.disclaimer { color: #b5bfd1; font-size: 10px; }
.actions { display: flex; gap: 8px; justify-content: flex-end; }
button { padding: 8px 14px; border: 1px solid #6185d8; border-radius: 999px; color: white; background: #253b70; cursor: pointer; }
</style>
