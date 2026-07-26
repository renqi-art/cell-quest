<script setup lang="ts">
import type { CaseNode } from '@/shared/types/case'

defineProps<{
  selectedNode: CaseNode | null
}>()
</script>

<template>
  <aside class="case-tool-palette" aria-label="病例工具">
    <h3>工具</h3>
    <div class="palette-tools">
      <button title="画笔">🖊️</button>
      <button title="橡皮">🧹</button>
      <button title="选择">👆</button>
    </div>
    <h3>节点</h3>
    <div class="palette-nodes">
      <button title="出生点">📍</button>
      <button title="供氧源">🫁</button>
      <button title="目标组织">🎯</button>
      <button title="感染灶">🦠</button>
      <button title="存档点">⚑</button>
      <button title="知识点">📚</button>
    </div>
    <div v-if="selectedNode" class="palette-node-info">
      <p><strong>{{ selectedNode.kind }}</strong></p>
      <p>ID: {{ selectedNode.id }}</p>
    </div>
  </aside>
</template>
