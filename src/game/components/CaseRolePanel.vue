<script setup lang="ts">
defineProps<{ swapped: boolean }>()
defineEmits<{ swap: [] }>()
</script>

<template>
  <aside
    class="role-panel"
    data-testid="case-role-panel"
    aria-label="双人病例职责"
  >
    <strong>{{ swapped ? 'P1 白细胞 · 清除感染' : 'P1 红细胞 · 运输氧气' }}</strong>
    <strong>{{ swapped ? 'P2 红细胞 · 运输氧气' : 'P2 白细胞 · 清除感染' }}</strong>
    <button
      type="button"
      data-testid="swap-player-roles"
      @click="$emit('swap')"
    >
      交换职责
    </button>
  </aside>
</template>

<style scoped>
.role-panel { position: fixed; left: 14px; top: 48px; z-index: 32; display: grid; gap: 5px; padding: 10px; border: 1px solid #4569aa; border-radius: 12px; color: #eef4ff; background: rgb(8 17 36 / 90%); font-size: 11px; }
button { margin-top: 3px; padding: 6px 10px; border: 1px solid #7195df; border-radius: 999px; color: white; background: #243f73; cursor: pointer; }
</style>
