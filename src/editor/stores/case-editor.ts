import { computed, readonly, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CaseDraft } from '@/shared/models/case-draft'
import { CaseHistory } from '@/editor/domain/case-history'
import type { CaseCommand } from '@/editor/domain/case-commands'
import { LocalStorageAdapter } from '@/shared/storage/StorageAdapter'
import { CaseDraftRepository } from '@/shared/services/CaseDraftRepository'
import { createCaseDraft } from '@/shared/services/CaseSchema'
import type { CaseMetadata, CaseNode, PrimaryCell } from '@/shared/types/case'
import { validateCaseDraft } from '@/shared/services/CaseValidationService'
import { decodeCaseCode, encodeCaseCode } from '@/shared/services/CaseCodec'
import type { PublishedCase } from '@/shared/services/CaseCodec'
import { createCaseTemplate, type TemplateId } from '@/shared/models/case-templates'

type SaveState = 'idle' | 'saving' | 'error'
export type EditorNodeKind = CaseNode['kind']

const MOVEMENT_ENVELOPE = {
  version: 1 as const,
  maxGapTiles: 5,
  maxStepUpTiles: 4,
  maxDropTiles: 8,
  playerHeightTiles: 2,
}

let nodeCounter = 0


export const useCaseEditorStore = defineStore('case-editor', () => {
  const storage = new LocalStorageAdapter()
  const repository = new CaseDraftRepository(storage)

  const currentSlot = ref(1)
  const history = ref<CaseHistory | null>(null)
  const draft = ref<CaseDraft | null>(null)
  const dirty = ref(false)
  const saveState = ref<SaveState>('idle')
  const selectedNodeId = ref<string | null>(null)
  const diagnostics = computed(() => draft.value
    ? validateCaseDraft(draft.value, MOVEMENT_ENVELOPE)
    : [])


  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let initialized = false

  function initialize(): void {
    if (initialized) return
    initialized = true
    const storedSlot = Number(storage.get('cellQuest_currentSlot'))
    const slot = Number.isInteger(storedSlot) && storedSlot >= 0 && storedSlot <= 99 ? storedSlot : 0
    currentSlot.value = slot
    repository.migrateLegacySlot(slot)
    const firstDraft = repository.list(slot)[0]
    if (firstDraft) applyNewDraft(firstDraft)
  }

  function newDraft(primaryCell: PrimaryCell): void {
    const created = createCaseDraft({ primaryCell })
    applyNewDraft(created)
  }

  function newTemplate(templateId: TemplateId): void {
    applyNewDraft(createCaseTemplate(templateId))
  }

  function addNode(kind: EditorNodeKind, x: number, y: number): CaseNode {
    nodeCounter += 1
    const id = `${kind}-${Date.now()}-${nodeCounter}`
    const primaryCell = draft.value?.caseConfig?.primaryCell ?? 'rbc'
    const base = { id, x, y }
    let node: CaseNode

    switch (kind) {
      case 'spawn':
        node = { ...base, kind, role: primaryCell }
        break
      case 'oxygen-source':
        node = { ...base, kind, capacity: 3 }
        break
      case 'target-tissue':
        node = { ...base, kind, requiredOxygen: 3 }
        break
      case 'infection-site':
        node = { ...base, kind, severity: 2 }
        break
      case 'checkpoint':
        node = { ...base, kind }
        break
      case 'knowledge':
        node = { ...base, kind, sourceId: '' }
        break
    }

    executeCommand({ type: 'add-node', node })
    selectedNodeId.value = node.id
    return node
  }

  function selectNode(id: string | null): void {
    selectedNodeId.value = id
  }

  function updateMetadata(patch: Partial<CaseMetadata>): void {
    if (!draft.value) return
    executeCommand({
      type: 'replace-metadata',
      metadata: { ...draft.value.metadata, ...patch },
    })
  }

  function exportCaseCode(): string {
    if (!draft.value) throw new Error('No active draft')
    const result = encodeCaseCode(draft.value)
    if (!result.ok) throw new Error(result.error)
    return result.code
  }

  function importCaseCode(code: string): { ok: true } | { ok: false; error: string } {
    const result = decodeCaseCode(code.trim())
    if (!result.ok) return result
    applyNewDraft(publishedToDraft(result.value))
    return { ok: true }
  }

  function publishedToDraft(value: PublishedCase): CaseDraft {
    return {
      version: 1, mode: 'case', id: value.id, revision: value.revision,
      metadata: { title: value.name, author: value.author, difficulty: value.difficulty, tags: value.tags, icon: value.icon },

      map: value.map, nodes: value.nodes, caseConfig: value.caseConfig,
      editorMeta: { source: 'import', updatedAt: new Date().toISOString() },
    }
  }

  function openDraft(slot: number, id: string): void {
    const loaded = repository.load(slot, id)
    if (loaded) {
      currentSlot.value = slot
      applyNewDraft(loaded)
    }
  }

  function executeCommand(command: CaseCommand): void {
    if (!history.value) return
    history.value.execute(command)
    draft.value = history.value.snapshot
    dirty.value = true
    scheduleAutoSave()
  }

  function undo(): void {
    if (!history.value?.canUndo) return
    history.value.undo()
    draft.value = history.value.snapshot
    dirty.value = true
    scheduleAutoSave()
  }

  function redo(): void {
    if (!history.value?.canRedo) return
    history.value.redo()
    draft.value = history.value.snapshot
    dirty.value = true
    scheduleAutoSave()
  }

  function saveNow(): void {
    if (!draft.value) return
    saveState.value = 'saving'
    try {
      repository.saveNamedDraft(currentSlot.value, draft.value)
      dirty.value = false
      saveState.value = 'idle'
    } catch {
      saveState.value = 'error'
    }
  }

  function scheduleAutoSave(): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      saveNow()
    }, 300)
  }

  function applyNewDraft(newDraft: CaseDraft): void {
    history.value = new CaseHistory(newDraft)
    draft.value = newDraft
    dirty.value = false
    saveState.value = 'idle'
    selectedNodeId.value = null
  }

  return {
    currentSlot: readonly(currentSlot),
    history: readonly(history),
    draft: readonly(draft),
    dirty: readonly(dirty),
    saveState: readonly(saveState),
    selectedNodeId: readonly(selectedNodeId),
    diagnostics,
    initialize,
    newDraft,
    newTemplate,
    openDraft,
    executeCommand,
    undo,
    redo,
    saveNow,
    addNode,
    selectNode,
    updateMetadata,
    exportCaseCode,
    importCaseCode,
    repository,
  }
})
