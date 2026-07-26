<script setup lang="ts">
import { computed } from 'vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'

const store = useCaseEditorStore()
const errorCount = computed(() => store.diagnostics.filter(item => item.severity === 'error').length)
const warningCount = computed(() => store.diagnostics.filter(item => item.severity === 'warning').length)
</script>

<template>
  <section class="case-validation-panel" aria-label="病例校验">
    <h3>病例校验</h3>
    <p data-testid="validation-summary" :class="{ invalid: errorCount > 0 }">
      {{ errorCount }} 个错误 · {{ warningCount }} 个警告
    </p>
    <p v-if="store.diagnostics.length === 0" class="validation-ok">校验通过，可以发布。</p>
    <ul v-else class="diagnostic-list">
      <li
        v-for="diagnostic in store.diagnostics"
        :key="diagnostic.code + diagnostic.nodeIds?.join('-')"
        data-diagnostic
        :class="diagnostic.severity"
      >
        <strong>{{ diagnostic.severity === 'error' ? '错误' : diagnostic.severity === 'warning' ? '警告' : '提示' }}</strong>
        {{ diagnostic.message }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.case-validation-panel { border-top: 1px solid #2a2a4a; margin-top: 16px; padding-top: 8px; }
.case-validation-panel h3 { color: #8fbfff; font-size: 13px; }
.case-validation-panel p { font-size: 12px; color: #7ddc91; }
.case-validation-panel p.invalid, .diagnostic-list .error { color: #ff8585; }
.diagnostic-list { margin: 8px 0 0; padding: 0; list-style: none; }
.diagnostic-list li { font-size: 11px; padding: 5px 0; color: #f5cf71; }
.diagnostic-list strong { margin-right: 4px; }
</style>
