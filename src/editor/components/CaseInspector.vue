<script setup lang="ts">
import type { CaseNode } from '@/shared/types/case'
import { useCaseEditorStore } from '@/editor/stores/case-editor'

const props = defineProps<{
  selectedNode: CaseNode | null
}>()

const store = useCaseEditorStore()

function move(axis: 'x' | 'y', event: Event): void {
  if (!props.selectedNode) return
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isInteger(value) || value < 0) return
  store.executeCommand({
    type: 'move-node',
    id: props.selectedNode.id,
    x: axis === 'x' ? value : props.selectedNode.x,
    y: axis === 'y' ? value : props.selectedNode.y,
  })
}

function remove(): void {
  if (!props.selectedNode) return
  store.executeCommand({ type: 'remove-node', id: props.selectedNode.id })
  store.selectNode(null)
}
</script>

<template>
  <aside
    class="case-inspector"
    aria-label="属性检查器"
  >
    <h3>属性</h3>
    <div v-if="selectedNode">
      <div class="inspector-field">
        <label>类型</label>
        <strong>{{ selectedNode.kind }}</strong>
      </div>
      <div class="inspector-field">
        <label>ID</label>
        <code>{{ selectedNode.id }}</code>
      </div>
      <div class="inspector-field">
        <label for="node-x">X</label>
        <input
          id="node-x"
          data-testid="node-x"
          type="number"
          min="0"
          :value="selectedNode.x"
          @change="move('x', $event)"
        >
      </div>
      <div class="inspector-field">
        <label for="node-y">Y</label>
        <input
          id="node-y"
          data-testid="node-y"
          type="number"
          min="0"
          :value="selectedNode.y"
          @change="move('y', $event)"
        >
      </div>
      <button
        data-testid="remove-node"
        class="danger"
        type="button"
        @click="remove"
      >
        删除节点
      </button>
    </div>
    <p
      v-else
      class="inspector-empty"
    >
      选择一个节点查看属性
    </p>
  </aside>
</template>
