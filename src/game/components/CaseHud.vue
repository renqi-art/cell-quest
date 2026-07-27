<script setup lang="ts">
import { computed } from 'vue'
import type { CaseSnapshot } from '@/shared/types/case'

const props = defineProps<{
  snapshot: CaseSnapshot
}>()

const oxygenPercent = computed(() => `${Math.round(props.snapshot.vitals.oxygen)}%`)
const infectionPercent = computed(() => `${Math.round(props.snapshot.vitals.infection)}%`)
const tissuePercent = computed(() => `${Math.round(props.snapshot.vitals.tissue)}%`)

function barClass(value: number): string {
  if (value <= 20) return 'critical'
  if (value <= 40) return 'warning'
  return 'good'
}

function oxyClass(value: number): string {
  return barClass(value)
}

function infClass(value: number): string {
  // Infection is inverted: lower is better
  if (value >= 80) return 'critical'
  if (value >= 60) return 'warning'
  return 'good'
}

function tisClass(value: number): string {
  return barClass(value)
}

const stabilityDisplay = computed(() => {
  if (props.snapshot.status !== 'active') return ''
  const remain = Math.max(0, (props.snapshot.stableFor || 0))
  return remain > 0 ? `稳定 ${remain.toFixed(1)}s` : ''
})
</script>

<template>
  <div
    class="case-hud"
    aria-label="患者指标"
    role="region"
  >
    <!-- 氧供 -->
    <div class="case-bar-row">
      <label class="case-bar-label">O₂ 氧供</label>
      <div
        class="case-bar-track"
        role="progressbar"
        :aria-valuenow="snapshot.vitals.oxygen"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`氧供 ${snapshot.vitals.oxygen}%`"
      >
        <div
          class="case-bar-fill"
          :class="oxyClass(snapshot.vitals.oxygen)"
          :style="{ width: oxygenPercent }"
        />
      </div>
      <span class="case-bar-value">{{ Math.round(snapshot.vitals.oxygen) }}</span>
    </div>

    <!-- 感染 -->
    <div class="case-bar-row">
      <label class="case-bar-label">🦠 感染</label>
      <div
        class="case-bar-track"
        role="progressbar"
        :aria-valuenow="snapshot.vitals.infection"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`感染 ${snapshot.vitals.infection}%`"
      >
        <div
          class="case-bar-fill"
          :class="infClass(snapshot.vitals.infection)"
          :style="{ width: infectionPercent }"
        />
      </div>
      <span class="case-bar-value">{{ Math.round(snapshot.vitals.infection) }}</span>
    </div>

    <!-- 组织 -->
    <div class="case-bar-row">
      <label class="case-bar-label">🧬 组织</label>
      <div
        class="case-bar-track"
        role="progressbar"
        :aria-valuenow="snapshot.vitals.tissue"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`组织活性 ${snapshot.vitals.tissue}%`"
      >
        <div
          class="case-bar-fill"
          :class="tisClass(snapshot.vitals.tissue)"
          :style="{ width: tissuePercent }"
        />
      </div>
      <span class="case-bar-value">{{ Math.round(snapshot.vitals.tissue) }}</span>
    </div>

    <!-- 当前目标 + 稳定倒计时 -->
    <div class="case-objective-row">
      <span class="case-objective">{{ snapshot.currentObjective }}</span>
      <span
        v-if="stabilityDisplay"
        class="case-stability"
      >{{ stabilityDisplay }}</span>
    </div>
  </div>
</template>

<style scoped>
.case-hud {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 220px;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 10px 12px;
  color: #eee;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  z-index: 20;
  pointer-events: none;
}

.case-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.case-bar-label {
  width: 56px;
  font-size: 11px;
  opacity: 0.85;
  flex-shrink: 0;
}

.case-bar-track {
  flex: 1;
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
}

.case-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.15s ease, background 0.3s ease;
}

.case-bar-fill.good {
  background: #4caf50;
}

.case-bar-fill.warning {
  background: #ff9800;
}

.case-bar-fill.critical {
  background: #f44336;
}

.case-bar-value {
  width: 28px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.case-objective-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.case-objective {
  font-size: 11px;
  opacity: 0.75;
  flex: 1;
}

.case-stability {
  font-size: 11px;
  color: #4caf50;
  font-weight: 600;
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
