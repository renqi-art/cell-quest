<script setup lang="ts">
import { useCaseEditorStore } from '@/editor/stores/case-editor'
import type { CaseMetadata } from '@/shared/types/case'

const store = useCaseEditorStore()

function updateText(field: 'title' | 'author', event: Event): void {
  store.updateMetadata({ [field]: (event.target as HTMLInputElement).value })
}
function updateDifficulty(event: Event): void {
  store.updateMetadata({ difficulty: (event.target as HTMLSelectElement).value as CaseMetadata['difficulty'] })
}
</script>

<template>
  <section v-if="store.draft" class="case-settings-panel" aria-label="病例基本信息">
    <h3>病例信息</h3>
    <label for="case-title">标题</label>
    <input
      id="case-title"
      data-testid="case-title"
      :value="store.draft.metadata.title"
      maxlength="80"
      @change="updateText('title', $event)"
    >
    <label for="case-author">作者</label>
    <input
      id="case-author"
      data-testid="case-author"
      :value="store.draft.metadata.author"
      maxlength="80"
      @change="updateText('author', $event)"
    >
    <label for="case-difficulty">难度</label>
    <select
      id="case-difficulty"
      data-testid="case-difficulty"
      :value="store.draft.metadata.difficulty"
      @change="updateDifficulty"
    >
      <option value="assist">辅助</option>
      <option value="standard">标准</option>
      <option value="challenge">挑战</option>
    </select>
  </section>
</template>

<style scoped>
.case-settings-panel { display: grid; gap: 5px; }
h3 { margin: 4px 0; color: #8fbfff; font-size: 13px; }
label { color: #8fa1c6; font-size: 11px; }
input, select { box-sizing: border-box; width: 100%; padding: 6px; border: 1px solid #354263; border-radius: 4px; background: #090b16; color: #eef4ff; }
</style>
