<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCaseEditorStore } from './stores/case-editor'
import NewCaseWizard from './components/NewCaseWizard.vue'
import EditorToolbar from './components/EditorToolbar.vue'
import CaseToolPalette from './components/CaseToolPalette.vue'
import CaseInspector from './components/CaseInspector.vue'
import CaseMapCanvas from './components/CaseMapCanvas.vue'
import CasePlaytestPanel from './components/CasePlaytestPanel.vue'
import CaseValidationPanel from './components/CaseValidationPanel.vue'
import CaseSettingsPanel from './components/CaseSettingsPanel.vue'
import CaseShareDialog from './components/CaseShareDialog.vue'
import AiCaseGeneratorDialog from './components/AiCaseGeneratorDialog.vue'
import './styles/case-designer.css'
import type { EditorTool } from '@/editor/types/editor-tools'

const store = useCaseEditorStore()
store.initialize()
const activeTool = ref<EditorTool>('select')
const showShareDialog = ref(false)
const showAiDialog = ref(false)
const selectedNode = computed(() =>
  store.draft?.nodes.find(node => node.id === store.selectedNodeId) ?? null,
)
</script>

<template>
  <div
    class="case-designer-app"
    data-testid="case-designer"
  >
    <template v-if="store.draft">
      <EditorToolbar
        @open-ai="showAiDialog = true"
        @open-share="showShareDialog = true"
      />
      <div class="editor-workspace">
        <CaseToolPalette
          :selected-node="selectedNode"
          :active-tool="activeTool"
          @select-tool="activeTool = $event"
        />
        <main
          class="editor-canvas"
          aria-label="病例画布"
        >
          <CaseMapCanvas :active-tool="activeTool" />
        </main>
        <aside
          class="editor-sidebar"
          aria-label="属性与校验"
        >
          <CaseSettingsPanel />
          <CaseInspector :selected-node="selectedNode" />
          <CaseValidationPanel />
        </aside>
      </div>
      <footer
        class="editor-status"
        aria-live="polite"
      >
        {{ store.dirty ? '未保存' : '已保存' }}
        <CasePlaytestPanel />
      </footer>
      <CaseShareDialog
        v-if="showShareDialog"
        @close="showShareDialog = false"
      />
      <AiCaseGeneratorDialog
        v-if="showAiDialog"
        @close="showAiDialog = false"
      />
    </template>
    <template v-else>
      <NewCaseWizard />
    </template>
  </div>
</template>
