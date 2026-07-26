<script setup lang="ts">
import { useCaseEditorStore } from '@/editor/stores/case-editor'

const store = useCaseEditorStore()
</script>

<template>
  <header class="editor-toolbar">
    <button :disabled="!store.history?.canUndo" @click="store.undo()">↩ 撤销</button>
    <button :disabled="!store.history?.canRedo" @click="store.redo()">↪ 重做</button>
    <span class="toolbar-sep">|</span>
    <button @click="store.saveNow()">💾 保存</button>
    <span class="toolbar-sep">|</span>
    <span v-if="store.dirty" class="dirty-indicator">● 未保存</span>
    <span v-else class="saved-indicator">已保存</span>
  </header>
</template>
