<script setup lang="ts">
import { ref } from 'vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'

const store = useCaseEditorStore()
const step = ref(1)
const selectedCell = ref<'rbc' | 'wbc'>('rbc')

const steps = ['角色选择', '场景主题', '配置', '确认创建']

function next() { if (step.value < 4) step.value++ }
function prev() { if (step.value > 1) step.value-- }
function create() { store.newDraft(selectedCell.value) }
</script>

<template>
  <div class="new-case-wizard">
    <div class="wizard-steps">
      <span v-for="(s, i) in steps" :key="i" :data-step="i + 1" :class="{ active: step === i + 1 }">{{ i + 1 }}. {{ s }}</span>
    </div>
    <div class="wizard-body">
      <div v-if="step === 1">
        <h3>选择主控细胞</h3>
        <label><input type="radio" v-model="selectedCell" value="rbc" /> 红细胞 — 供氧</label>
        <label><input type="radio" v-model="selectedCell" value="wbc" /> 白细胞 — 清除感染</label>
      </div>
      <div v-else-if="step === 2">
        <h3>选择场景主题</h3>
        <p>（后续阶段扩展）</p>
      </div>
      <div v-else-if="step === 3">
        <h3>配置参数</h3>
        <p>难度：{{ selectedCell === 'rbc' ? '标准' : '标准' }}</p>
      </div>
      <div v-else-if="step === 4">
        <h3>确认创建</h3>
        <p>主控：{{ selectedCell === 'rbc' ? '红细胞' : '白细胞' }}</p>
      </div>
    </div>
    <div class="wizard-actions">
      <button v-if="step > 1" @click="prev">上一步</button>
      <button v-if="step < 4" @click="next">下一步</button>
      <button v-if="step === 4" class="primary" @click="create">创建病例</button>
    </div>
  </div>
</template>
