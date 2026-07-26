<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'
import type { PreviewOptions } from '@/editor/services/EditorPreviewGateway'

const store = useCaseEditorStore()

const showDialog = ref(false)
const selectedRole = ref<'rbc' | 'wbc' | 'coop'>('rbc')
const previewStatus = ref<'idle' | 'starting' | 'running'>('idle')

const availableRoles = computed(() => {
  if (!store.draft) return [] as const
  const pc = store.draft.caseConfig?.primaryCell
  if (pc === 'coop') return ['rbc', 'wbc', 'coop'] as const
  if (pc === 'rbc') return ['rbc'] as const
  if (pc === 'wbc') return ['wbc'] as const
  return ['rbc'] as const
})

const roleLabel = (role: string) => {
  switch (role) {
    case 'rbc': return 'RBC 红细胞'
    case 'wbc': return 'WBC 白细胞'
    case 'coop': return '双人协作'
    default: return role
  }
}

const canPreview = computed(() => {
  return store.draft !== null && store.draft.caseConfig !== null
})

function open() {
  if (!canPreview.value) return
  const firstRole = availableRoles.value[0]
  if (firstRole) selectedRole.value = firstRole
  showDialog.value = true
}

function close() {
  showDialog.value = false
  previewStatus.value = 'idle'
}

async function launchPreview() {
  if (!store.draft) return
  previewStatus.value = 'starting'

  try {
    // Serialize draft to sessionStorage for cross-page transfer
    const previewData = JSON.stringify({
      draft: store.draft,
      options: {
        role: selectedRole.value,
        start: { type: 'full' as const },
        timestamp: Date.now(),
      },
    })

    // Store in sessionStorage so the game page can pick it up
    sessionStorage.setItem('cellQuest_previewDraft', previewData)
    sessionStorage.setItem('cellQuest_previewReturn', window.location.href)

    // Navigate to game page with preview mode
    previewStatus.value = 'running'
    window.open('/?preview=1', '_blank')
  } catch (e) {
    console.error('Preview launch failed:', e)
    previewStatus.value = 'idle'
  }
}
</script>

<template>
  <div class="playtest-panel">
    <button
      class="playtest-trigger"
      :disabled="!canPreview"
      @click="open"
      title="试玩当前病例"
    >
      ▶ 试玩
    </button>

    <!-- Preview Dialog -->
    <div v-if="showDialog" class="playtest-dialog-overlay" @click.self="close">
      <div class="playtest-dialog" role="dialog" aria-label="病例试玩">
        <h3>病例试玩</h3>

        <div class="playtest-roles">
          <span class="role-label">选择角色：</span>
          <label
            v-for="role in availableRoles"
            :key="role"
            class="role-option"
            :class="{ active: selectedRole === role }"
          >
            <input
              type="radio"
              :value="role"
              v-model="selectedRole"
              :disabled="previewStatus !== 'idle'"
            />
            {{ roleLabel(role) }}
          </label>
        </div>

        <div class="playtest-info">
          <template v-if="store.draft?.caseConfig">
            <div class="info-row">
              <span>初始血氧:</span>
              <strong>{{ store.draft.caseConfig.vitals.oxygen }}%</strong>
            </div>
            <div class="info-row">
              <span>感染程度:</span>
              <strong>{{ store.draft.caseConfig.vitals.infection }}%</strong>
            </div>
            <div class="info-row">
              <span>组织健康:</span>
              <strong>{{ store.draft.caseConfig.vitals.tissue }}%</strong>
            </div>
          </template>
        </div>

        <div class="playtest-actions">
          <button
            class="btn-cancel"
            @click="close"
            :disabled="previewStatus === 'running'"
          >
            取消
          </button>
          <button
            class="btn-launch"
            @click="launchPreview"
            :disabled="previewStatus !== 'idle'"
          >
            {{ previewStatus === 'starting' ? '准备中...' : previewStatus === 'running' ? '已在新窗口打开' : '启动试玩' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
