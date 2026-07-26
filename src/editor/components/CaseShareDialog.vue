<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'

const emit = defineEmits<{ close: [] }>()
const store = useCaseEditorStore()
const caseCode = ref('')
const message = ref('')
const error = ref('')
const hasErrors = computed(() => store.diagnostics.some(item => item.severity === 'error'))

function exportCode(): void {
  message.value = ''
  error.value = ''
  if (hasErrors.value) {
    error.value = '病例仍有校验错误，修复后才能发布 CQ2 分享码。'
    return
  }
  try {
    caseCode.value = store.exportCaseCode()
    message.value = '已生成 CQ2 分享码。'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '导出失败'
  }
}

function importCode(): void {
  message.value = ''
  error.value = ''
  const result = store.importCaseCode(caseCode.value)
  if (!result.ok) {
    error.value = result.error
    return
  }
  message.value = 'CQ2 病例已导入到当前设计器。'
}
</script>

<template>
  <div
    class="dialog-overlay"
    @click.self="emit('close')"
  >
    <section
      class="share-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="导入或分享病例"
    >
      <h2>导入 / 分享病例</h2>
      <p>只接受经过结构校验的 CQ2 分享码，不执行代码。</p>
      <textarea
        v-model="caseCode"
        data-testid="case-code"
        rows="8"
        spellcheck="false"
        placeholder="在这里粘贴 CQ2! 分享码"
      />
      <p
        v-if="error"
        role="alert"
        class="dialog-error"
      >
        {{ error }}
      </p>
      <p
        v-if="message"
        role="status"
        class="dialog-success"
      >
        {{ message }}
      </p>
      <div class="dialog-actions">
        <button
          type="button"
          @click="emit('close')"
        >
          关闭
        </button>
        <button
          type="button"
          data-testid="import-case"
          @click="importCode"
        >
          导入 CQ2
        </button>
        <button
          type="button"
          data-testid="export-case"
          :disabled="hasErrors"
          @click="exportCode"
        >
          生成分享码
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; background: rgb(0 0 0 / 76%); }
.share-dialog { width: min(640px, 92vw); padding: 22px; border: 1px solid #4a6aaa; border-radius: 12px; background: #111420; }
h2 { margin: 0 0 8px; color: #ffd36a; font-size: 18px; }
p { color: #aab8d8; font-size: 12px; }
textarea { box-sizing: border-box; width: 100%; resize: vertical; padding: 10px; border: 1px solid #3a4b72; border-radius: 6px; background: #090b16; color: #e8edf9; font-family: ui-monospace, monospace; }
.dialog-error { color: #ff8585; }
.dialog-success { color: #7ddc91; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
button { padding: 7px 12px; border: 1px solid #4a6aaa; border-radius: 5px; background: #1a2745; color: #eef4ff; cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .45; }
</style>
