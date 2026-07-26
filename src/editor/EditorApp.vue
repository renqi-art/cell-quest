<script setup lang="ts">
import { ref } from 'vue'
import { useCaseEditorStore } from './stores/case-editor'
import NewCaseWizard from './components/NewCaseWizard.vue'
import EditorToolbar from './components/EditorToolbar.vue'
import CaseToolPalette from './components/CaseToolPalette.vue'
import CaseInspector from './components/CaseInspector.vue'
import './styles/case-designer.css'
import type { CaseNode } from '@/shared/types/case'

const store = useCaseEditorStore()
const selectedNode = ref<CaseNode | null>(null)
</script>

<template>
  <div class="case-designer-app">
    <template v-if="store.draft">
      <EditorToolbar />
      <div class="editor-workspace">
        <CaseToolPalette :selected-node="selectedNode" />
        <main class="editor-canvas" aria-label="病例画布">
          <div class="canvas-placeholder">
            画布加载中...
          </div>
        </main>
        <CaseInspector :selected-node="selectedNode" />
      </div>
      <footer class="editor-status" aria-live="polite">
        {{ store.dirty ? '未保存' : '已保存' }}
      </footer>
    </template>
    <template v-else>
      <NewCaseWizard />
    </template>
  </div>
</template>
