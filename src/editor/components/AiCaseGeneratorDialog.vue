<script setup lang="ts">
import { ref } from 'vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'
import { compileCaseBlueprint } from '@/shared/services/CaseCompiler'
import { AiCaseDesignerClient, type CaseBlueprint } from '@/editor/services/AiCaseDesignerClient'

const emit = defineEmits<{
  close: []
}>()

const store = useCaseEditorStore()
const client = new AiCaseDesignerClient()

const prompt = ref('')
const loading = ref(false)
const error = ref('')
const source = ref<'ai' | 'local'>('local')
const blueprint = ref<CaseBlueprint | null>(null)
const applied = ref(false)

async function generate() {
  if (!prompt.value.trim()) return
  loading.value = true
  error.value = ''
  blueprint.value = null

  const result = await client.generate(prompt.value.trim())
  loading.value = false

  if (result.ok) {
    blueprint.value = result.blueprint
    source.value = result.source
  } else {
    error.value = result.error
  }
}

function applyBlueprint() {
  if (!blueprint.value) return
  const draft = compileCaseBlueprint(blueprint.value, {
    seed: prompt.value.trim() || blueprint.value.title,
    source: source.value === 'ai' ? 'ai' : 'template',
  })
  store.executeCommand({ type: 'replace-draft', draft, reason: 'template' })
  applied.value = true
}
function close() {
  emit('close')
}
</script>

<template>
  <div
    class="ai-generator-dialog-overlay"
    @click.self="close"
  >
    <div
      class="ai-generator-dialog"
      role="dialog"
      aria-label="AI病例生成"
    >
      <h3>🤖 AI 生成病例</h3>

      <template v-if="!blueprint">
        <div class="prompt-section">
          <label for="ai-prompt">描述你想创建的病例场景：</label>
          <textarea
            id="ai-prompt"
            v-model="prompt"
            placeholder="例如：一个关于过敏性哮喘的病例，涉及肥大细胞和嗜酸性粒细胞..."
            :disabled="loading"
            rows="4"
          />
        </div>

        <div
          v-if="error"
          class="ai-error"
        >
          {{ error }}
        </div>

        <div class="ai-actions">
          <button
            class="btn-secondary"
            :disabled="loading"
            @click="close"
          >
            取消
          </button>
          <button
            class="btn-primary"
            :disabled="loading || !prompt.trim()"
            @click="generate"
          >
            {{ loading ? '生成中...' : '生成病例' }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="blueprint-preview">
          <div class="bp-header">
            <span class="bp-icon">{{ blueprint.icon }}</span>
            <span class="bp-title">{{ blueprint.title }}</span>
            <span
              class="bp-source"
              :class="source"
            >
              {{ source === 'ai' ? 'AI生成' : '本地模板' }}
            </span>
          </div>

          <p class="bp-desc">
            {{ blueprint.description }}
          </p>

          <div class="bp-tags">
            <span
              v-for="tag in blueprint.tags"
              :key="tag"
              class="bp-tag"
            >{{ tag }}</span>
          </div>

          <div class="bp-stats">
            <div class="bp-stat">
              <span>主细胞</span>
              <strong>{{ blueprint.primaryCell === 'rbc' ? '红细胞' : blueprint.primaryCell === 'wbc' ? '白细胞' : '协作' }}</strong>
            </div>
            <div class="bp-stat">
              <span>难度</span>
              <strong>{{ blueprint.difficulty === 'assist' ? '辅助' : blueprint.difficulty === 'standard' ? '标准' : '挑战' }}</strong>
            </div>
            <div class="bp-stat">
              <span>初始血氧</span>
              <strong>{{ blueprint.vitals.oxygen }}%</strong>
            </div>
            <div class="bp-stat">
              <span>感染程度</span>
              <strong>{{ blueprint.vitals.infection }}%</strong>
            </div>
            <div class="bp-stat">
              <span>组织健康</span>
              <strong>{{ blueprint.vitals.tissue }}%</strong>
            </div>
            <div class="bp-stat">
              <span>稳定要求</span>
              <strong>{{ blueprint.stabilitySeconds }}s</strong>
            </div>
          </div>

          <div
            v-if="blueprint.allowedEvents.length > 0"
            class="bp-events"
          >
            <span class="bp-events-label">允许事件：</span>
            <span
              v-for="ev in blueprint.allowedEvents"
              :key="ev"
              class="bp-event-tag"
            >{{ ev }}</span>
          </div>
        </div>

        <div class="ai-actions">
          <button
            class="btn-secondary"
            @click="close"
          >
            取消
          </button>
          <button
            class="btn-secondary"
            @click="blueprint = null; error = ''"
          >
            重新生成
          </button>
          <button
            class="btn-primary"
            :disabled="applied"
            @click="applyBlueprint"
          >
            {{ applied ? '已应用' : '应用此病例' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ai-generator-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-generator-dialog {
  background: #111420;
  border: 1px solid #4a6aaa;
  border-radius: 12px;
  padding: 24px;
  max-width: 520px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}
h3 { font-size: 16px; color: #ffd700; margin-bottom: 16px; }
.prompt-section { margin-bottom: 12px; }
.prompt-section label { font-size: 12px; color: #7ac; display: block; margin-bottom: 6px; }
.prompt-section textarea {
  width: 100%;
  background: #0a0a18;
  border: 1px solid #3a3a5a;
  color: #aac;
  font-family: monospace;
  font-size: 12px;
  padding: 10px;
  border-radius: 6px;
  resize: vertical;
}
.ai-error { color: #f66; font-size: 12px; margin: 8px 0; padding: 6px; background: rgba(255,0,0,0.1); border-radius: 4px; }
.ai-actions { display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; }
.btn-primary, .btn-secondary { padding: 8px 16px; border-radius: 6px; border: 1px solid #3a3a5a; cursor: pointer; font-size: 12px; }
.btn-primary { background: #4a6aaa; color: #fff; border-color: #6a8acc; }
.btn-primary:hover { background: #5a7aba; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #1a1a2e; color: #aaa; }
.btn-secondary:hover { background: #2a2a4e; }

.blueprint-preview { margin-bottom: 16px; }
.bp-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.bp-icon { font-size: 28px; }
.bp-title { font-size: 16px; font-weight: bold; color: #fff; }
.bp-source { font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.bp-source.ai { background: #2a3a4a; color: #8ac; }
.bp-source.local { background: #3a2a2a; color: #ca8; }
.bp-desc { font-size: 12px; color: #aaa; margin: 8px 0; line-height: 1.4; }
.bp-tags { display: flex; gap: 4px; flex-wrap: wrap; margin: 8px 0; }
.bp-tag { font-size: 10px; padding: 2px 6px; border-radius: 3px; background: #2a3a2a; color: #7ac; }
.bp-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 12px 0; }
.bp-stat { font-size: 11px; color: #aaa; }
.bp-stat strong { display: block; color: #fff; margin-top: 2px; }
.bp-events { margin: 8px 0; font-size: 11px; }
.bp-events-label { color: #7ac; }
.bp-event-tag { padding: 1px 4px; margin: 0 2px; border-radius: 3px; background: #2a4a2a; color: #7cf; font-size: 10px; }
</style>
