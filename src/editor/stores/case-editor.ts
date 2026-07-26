import { readonly, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { CaseDraft } from '@/shared/models/case-draft'
import { CaseHistory } from '@/editor/domain/case-history'
import type { CaseCommand } from '@/editor/domain/case-commands'
import { LocalStorageAdapter } from '@/shared/storage/StorageAdapter'
import { CaseDraftRepository } from '@/shared/services/CaseDraftRepository'
import { createCaseDraft } from '@/shared/services/CaseSchema'
import type { PrimaryCell } from '@/shared/types/case'

type SaveState = 'idle' | 'saving' | 'error'

export const useCaseEditorStore = defineStore('case-editor', () => {
  const storage = new LocalStorageAdapter()
  const repository = new CaseDraftRepository(storage)

  const currentSlot = ref(1)
  const history = ref<CaseHistory | null>(null)
  const draft = ref<CaseDraft | null>(null)
  const dirty = ref(false)
  const saveState = ref<SaveState>('idle')

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function newDraft(primaryCell: PrimaryCell): void {
    const created = createCaseDraft({ primaryCell })
    applyNewDraft(created)
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
  }

  return {
    currentSlot: readonly(currentSlot),
    history: readonly(history),
    draft: readonly(draft),
    dirty: readonly(dirty),
    saveState: readonly(saveState),
    newDraft,
    openDraft,
    executeCommand,
    undo,
    redo,
    saveNow,
    repository,
  }
})
