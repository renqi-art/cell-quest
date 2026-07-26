<script setup lang="ts">
import { ref } from 'vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'
import type { TemplateId } from '@/shared/models/case-templates'

const store = useCaseEditorStore()
const step = ref(1)
const selectedCell = ref<'rbc' | 'wbc'>('rbc')
const selectedTemplate = ref<'manual' | TemplateId>('manual')
const steps = ['角色选择', '病例模板', '配置', '确认创建']

function next(): void { if (step.value < 4) step.value += 1 }
function prev(): void { if (step.value > 1) step.value -= 1 }
function chooseTemplate(value: 'manual' | TemplateId): void {
  selectedTemplate.value = value
  if (value === 'rbc-transport') selectedCell.value = 'rbc'
  if (value === 'wbc-infection') selectedCell.value = 'wbc'
}
function create(): void {
  if (selectedTemplate.value === 'manual') store.newDraft(selectedCell.value)
  else store.newTemplate(selectedTemplate.value)
}
</script>

<template>
  <section class="new-case-wizard" aria-labelledby="wizard-title">
    <h1 id="wizard-title">创建病例</h1>
    <div class="wizard-steps" aria-label="创建步骤">
      <span
        v-for="(label, index) in steps"
        :key="label"
        :data-step="index + 1"
        :class="{ active: step === index + 1 }"
      >
        {{ index + 1 }}. {{ label }}
      </span>
    </div>
    <div class="wizard-body">
      <div v-if="step === 1">
        <h3>选择主控细胞</h3>
        <label><input v-model="selectedCell" type="radio" value="rbc"> 红细胞 — 供氧</label>
        <label><input v-model="selectedCell" type="radio" value="wbc"> 白细胞 — 清除感染</label>
      </div>
      <div v-else-if="step === 2" class="template-grid">
        <h3>选择起点</h3>
        <button type="button" data-template="manual" :class="{ active: selectedTemplate === 'manual' }" @click="chooseTemplate('manual')">空白病例</button>
        <button type="button" data-template="rbc-transport" :class="{ active: selectedTemplate === 'rbc-transport' }" @click="chooseTemplate('rbc-transport')">氧气运输模板</button>
        <button type="button" data-template="wbc-infection" :class="{ active: selectedTemplate === 'wbc-infection' }" @click="chooseTemplate('wbc-infection')">感染清除模板</button>
      </div>
      <div v-else-if="step === 3">
        <h3>创建后可继续配置</h3>
        <p>标题、作者、难度、地图节点与目标都可以撤销和重做。</p>
      </div>
      <div v-else>
        <h3>确认创建</h3>
        <p>主控：{{ selectedCell === 'rbc' ? '红细胞' : '白细胞' }}</p>
        <p>起点：{{ selectedTemplate === 'manual' ? '空白病例' : selectedTemplate === 'rbc-transport' ? '氧气运输模板' : '感染清除模板' }}</p>
      </div>
    </div>
    <div class="wizard-actions">
      <button v-if="step > 1" type="button" @click="prev">上一步</button>
      <button v-if="step < 4" type="button" data-testid="wizard-next" @click="next">下一步</button>
      <button v-else type="button" class="primary" data-testid="create-case" @click="create">创建病例</button>
    </div>
  </section>
</template>

<style scoped>
.template-grid { display: grid; gap: 8px; }
.template-grid button { text-align: left; }
.template-grid button.active { border-color: #ffd36a; color: #ffd36a; }
h1 { margin: 0 0 18px; color: #f2f6ff; font-size: 22px; }
</style>
