<script setup lang="ts">
import type { CaseNode } from '@/shared/types/case'

defineProps<{
  selectedNode: CaseNode | null
}>()
</script>

<template>
  <aside class="case-inspector" aria-label="属性检查器">
    <h3>属性</h3>
    <div v-if="selectedNode">
      <div class="inspector-field">
        <label>类型</label>
        <span>{{ selectedNode.kind }}</span>
      </div>
      <div class="inspector-field">
        <label>ID</label>
        <span>{{ selectedNode.id }}</span>
      </div>
      <div class="inspector-field">
        <label>X</label>
        <span>{{ selectedNode.x }}</span>
      </div>
      <div class="inspector-field">
        <label>Y</label>
        <span>{{ selectedNode.y }}</span>
      </div>
    </div>
    <p v-else class="inspector-empty">选择一个节点查看属性</p>
  </aside>
</template>
