<script setup lang="ts">
import type { CaseNode } from '@/shared/types/case'
import type { EditorTool } from '@/editor/types/editor-tools'

defineProps<{
  selectedNode: CaseNode | null
  activeTool: EditorTool
}>()

const emit = defineEmits<{
  'select-tool': [tool: EditorTool]
}>()

const tools: readonly { id: EditorTool; label: string; icon: string }[] = [
  { id: 'paint', label: '画笔', icon: '🖊️' },
  { id: 'erase', label: '橡皮', icon: '🧹' },
  { id: 'select', label: '选择', icon: '👆' },
]

const nodeTools: readonly { id: EditorTool; label: string; icon: string }[] = [
  { id: 'node:spawn', label: '出生点', icon: '📍' },
  { id: 'node:oxygen-source', label: '供氧源', icon: '🫁' },
  { id: 'node:target-tissue', label: '目标组织', icon: '🎯' },
  { id: 'node:infection-site', label: '感染灶', icon: '🦠' },
  { id: 'node:checkpoint', label: '存档点', icon: '⚑' },
  { id: 'node:knowledge', label: '知识点', icon: '📚' },
]
</script>

<template>
  <aside
    class="case-tool-palette"
    aria-label="病例工具"
  >
    <h3>工具</h3>
    <div class="palette-tools">
      <button
        v-for="tool in tools"
        :key="tool.id"
        :data-tool="tool.id"
        :class="{ active: activeTool === tool.id }"
        :title="tool.label"
        type="button"
        @click="emit('select-tool', tool.id)"
      >
        <span aria-hidden="true">{{ tool.icon }}</span>
        <span>{{ tool.label }}</span>
      </button>
    </div>
    <h3>病例节点</h3>
    <div class="palette-nodes">
      <button
        v-for="tool in nodeTools"
        :key="tool.id"
        :data-tool="tool.id"
        :class="{ active: activeTool === tool.id }"
        :title="tool.label"
        type="button"
        @click="emit('select-tool', tool.id)"
      >
        <span aria-hidden="true">{{ tool.icon }}</span>
        <span>{{ tool.label }}</span>
      </button>
    </div>
    <div
      v-if="selectedNode"
      class="palette-node-info"
    >
      <p><strong>{{ selectedNode.kind }}</strong></p>
      <p>ID: {{ selectedNode.id }}</p>
    </div>
  </aside>
</template>
