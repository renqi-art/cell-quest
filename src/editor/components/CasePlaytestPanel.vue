<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'

const store = useCaseEditorStore()
const showDialog = ref(false)
const selectedRole = ref<'rbc' | 'wbc' | 'coop'>('rbc')
const previewStatus = ref<'idle' | 'starting' | 'running' | 'error'>('idle')
const selectedRuntime = ref<'legacy' | 'phaser'>('legacy')
const previewError = ref('')

const availableRoles = computed<readonly ('rbc' | 'wbc' | 'coop')[]>(() => {
  const primaryCell = store.draft?.caseConfig?.primaryCell
  if (primaryCell === 'coop') return ['rbc', 'wbc', 'coop']
  if (primaryCell === 'wbc') return ['wbc']
  return ['rbc']
})
const canPreview = computed(() =>
  Boolean(store.draft?.caseConfig) && !store.diagnostics.some(item => item.severity === 'error'),
)
function roleLabel(role: 'rbc' | 'wbc' | 'coop'): string {
  if (role === 'rbc') return 'RBC 红细胞'
  if (role === 'wbc') return 'WBC 白细胞'
  return '双人协作'
}
function open(): void {
  if (!canPreview.value) return
  selectedRole.value = availableRoles.value[0] ?? 'rbc'
  previewStatus.value = 'idle'
  previewError.value = ''
  showDialog.value = true
}
function close(): void {
  showDialog.value = false
  previewStatus.value = 'idle'
}
function launchPreview(): void {
  if (!store.draft || !canPreview.value) return
  previewStatus.value = 'starting'
  previewError.value = ''
  try {
    sessionStorage.setItem('cellQuest_previewDraft', JSON.stringify({
      draft: store.draft,
      options: { role: selectedRole.value, start: { type: 'full' }, timestamp: Date.now() },
    }))
    sessionStorage.setItem('cellQuest_previewReturn', window.location.href)
    const popup = window.open('/?preview=1&engine=' + selectedRuntime.value, '_blank')
    if (!popup) throw new Error('浏览器阻止了试玩窗口，请允许本站打开新窗口。')
    previewStatus.value = 'running'
  } catch (cause) {
    previewError.value = cause instanceof Error ? cause.message : '试玩启动失败'
    previewStatus.value = 'error'
  }
}
</script>

<template>
  <div class="playtest-panel">
    <button
      type="button"
      class="playtest-trigger"
      data-testid="open-playtest"
      :disabled="!canPreview"
      title="试玩当前病例"
      @click="open"
    >
      ▶ 试玩
    </button>
    <div
      v-if="showDialog"
      class="playtest-dialog-overlay"
      @click.self="close"
    >
      <section
        class="playtest-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="病例试玩"
      >
        <h3>病例试玩</h3>
        <p>试玩使用当前未保存草稿，并通过类型化引擎适配器启动。</p>
        <fieldset>
          <legend>选择角色</legend>
          <label
            v-for="role in availableRoles"
            :key="role"
            class="role-option"
          >
            <input
              v-model="selectedRole"
              type="radio"
              :value="role"
              :disabled="previewStatus !== 'idle'"
            >
            {{ roleLabel(role) }}
          </label>
        </fieldset>
        <fieldset>
          <legend>运行时</legend>
          <label><input
            v-model="selectedRuntime"
            type="radio"
            value="legacy"
          > 兼容运行时</label>
          <label><input
            v-model="selectedRuntime"
            data-testid="runtime-phaser"
            type="radio"
            value="phaser"
          > Phaser 垂直切片</label>
        </fieldset>
        <div
          v-if="store.draft?.caseConfig"
          class="playtest-vitals"
        >
          <span>氧供 {{ store.draft.caseConfig.vitals.oxygen }}%</span>
          <span>感染 {{ store.draft.caseConfig.vitals.infection }}%</span>
          <span>组织 {{ store.draft.caseConfig.vitals.tissue }}%</span>
        </div>
        <p
          v-if="previewError"
          role="alert"
        >
          {{ previewError }}
        </p>
        <div class="playtest-actions">
          <button
            type="button"
            @click="close"
          >
            关闭
          </button>
          <button
            type="button"
            data-testid="launch-playtest"
            :disabled="previewStatus === 'starting' || previewStatus === 'running'"
            @click="launchPreview"
          >
            {{ previewStatus === 'starting' ? '准备中…' : previewStatus === 'running' ? '已在新窗口启动' : '启动试玩' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.playtest-panel { margin-left: auto; }
.playtest-dialog-overlay { position: fixed; inset: 0; z-index: 110; display: grid; place-items: center; background: rgb(0 0 0 / 76%); }
.playtest-dialog { width: min(480px, 90vw); padding: 22px; border: 1px solid #4a6aaa; border-radius: 12px; background: #111420; color: #eef4ff; }
fieldset { display: flex; gap: 12px; margin: 14px 0; border: 0; padding: 0; }
.playtest-vitals { display: flex; gap: 12px; color: #9fb6df; font-size: 12px; }
.playtest-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
button { padding: 6px 12px; border: 1px solid #4a6aaa; border-radius: 5px; background: #1a2745; color: #eef4ff; }
</style>
