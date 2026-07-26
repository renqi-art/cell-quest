<script setup lang="ts">
import { useCaseEditorStore } from '@/editor/stores/case-editor'

const emit = defineEmits<{
  openAi: []
  openShare: []
}>()
const store = useCaseEditorStore()
</script>

<template>
  <header class="editor-toolbar">
    <button type="button" :disabled="!store.history?.canUndo" @click="store.undo()">↶ 撤销</button>
    <button type="button" :disabled="!store.history?.canRedo" @click="store.redo()">↷ 重做</button>
    <span class="toolbar-sep">|</span>
    <button type="button" @click="store.saveNow()">保存</button>
    <button type="button" data-testid="open-ai" @click="emit('openAi')">AI 生成病例</button>
    <button type="button" data-testid="open-share" @click="emit('openShare')">导入 / 分享</button>
    <span class="toolbar-spacer" />
    <span v-if="store.dirty" class="dirty-indicator">● 未保存</span>
    <span v-else class="saved-indicator">已保存</span>
  </header>
</template>

<style scoped>
.toolbar-spacer { flex: 1; }
</style>
