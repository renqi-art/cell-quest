import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCaseEditorStore } from '@/editor/stores/case-editor'

describe('case editor store workflows', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('adds and selects a semantic node through undo and redo', () => {
    const store = useCaseEditorStore()
    store.newDraft('rbc')

    const node = store.addNode('target-tissue', 12, 13)

    expect(node.kind).toBe('target-tissue')
    expect(store.selectedNodeId).toBe(node.id)
    expect(store.draft?.nodes.some(candidate => candidate.id === node.id)).toBe(true)

    store.undo()
    expect(store.draft?.nodes.some(candidate => candidate.id === node.id)).toBe(false)

    store.redo()
    expect(store.draft?.nodes.some(candidate => candidate.id === node.id)).toBe(true)
  })

  it('publishes and imports a CQ2 case through the same draft path', () => {
    const source = useCaseEditorStore()
    source.newDraft('wbc')
    const infection = source.addNode('infection-site', 20, 13)
    const code = source.exportCaseCode()

    setActivePinia(createPinia())
    const target = useCaseEditorStore()
    const imported = target.importCaseCode(code)

    expect(imported.ok).toBe(true)
    expect(target.draft?.id).toBe(source.draft?.id)
    expect(target.draft?.nodes.some(node => node.id === infection.id)).toBe(true)
    expect(target.draft?.editorMeta.source).toBe('import')
  })

  it('exposes validation diagnostics for the active draft', () => {
    const store = useCaseEditorStore()
    store.newDraft('rbc')
    store.addNode('target-tissue', 79, 0)

    expect(store.diagnostics.some(item => item.code === 'REQUIRED_NODE_UNREACHABLE')).toBe(true)
  })

  it('updates case metadata through undoable commands', () => {
    const store = useCaseEditorStore()
    store.newDraft('rbc')
    store.updateMetadata({ title: '新病例', author: '设计者' })
    expect(store.draft?.metadata.title).toBe('新病例')
    store.undo()
    expect(store.draft?.metadata.title).toBe('')
  })


  it('initializes the active slot and opens migrated legacy content', () => {
    localStorage.setItem('cellQuest_currentSlot', '2')
    localStorage.setItem('cellQuest_customLevels_2', JSON.stringify([{
      name: '旧病例',
      map: ['###'],
    }]))
    const store = useCaseEditorStore()

    store.initialize()

    expect(store.currentSlot).toBe(2)
    expect(store.draft?.metadata.title).toBe('旧病例')
    expect(localStorage.getItem('cellQuest_customLevels_2')).toBeNull()
  })

})
