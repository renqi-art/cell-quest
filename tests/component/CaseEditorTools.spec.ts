import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CaseToolPalette from '@/editor/components/CaseToolPalette.vue'
import CaseInspector from '@/editor/components/CaseInspector.vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'

describe('case editor semantic tools', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('emits a semantic node tool instead of a raw map character', async () => {
    const wrapper = mount(CaseToolPalette, {
      props: { selectedNode: null, activeTool: 'select' },
    })

    await wrapper.get('[data-tool="node:target-tissue"]').trigger('click')

    expect(wrapper.emitted('select-tool')?.[0]).toEqual(['node:target-tissue'])
  })

  it('moves and removes the selected node transactionally', async () => {
    const store = useCaseEditorStore()
    store.newDraft('rbc')
    const node = store.addNode('target-tissue', 12, 13)
    const wrapper = mount(CaseInspector, {
      props: { selectedNode: node },
    })

    await wrapper.get('[data-testid="node-x"]').setValue('18')
    await wrapper.get('[data-testid="node-x"]').trigger('change')

    expect(store.draft?.nodes.find(item => item.id === node.id)?.x).toBe(18)

    await wrapper.get('[data-testid="remove-node"]').trigger('click')
    expect(store.draft?.nodes.some(item => item.id === node.id)).toBe(false)

    store.undo()
    expect(store.draft?.nodes.some(item => item.id === node.id)).toBe(true)
  })
})
