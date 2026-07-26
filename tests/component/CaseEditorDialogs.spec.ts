import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CaseValidationPanel from '@/editor/components/CaseValidationPanel.vue'
import CaseShareDialog from '@/editor/components/CaseShareDialog.vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'

describe('case editor validation and sharing', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows live validation diagnostics and blocks publication on errors', () => {
    const store = useCaseEditorStore()
    store.newDraft('rbc')
    store.addNode('target-tissue', 20, 13)

    const wrapper = mount(CaseValidationPanel)

    expect(wrapper.get('[data-testid="validation-summary"]').text()).toContain('错误')
    expect(wrapper.findAll('[data-diagnostic]').length).toBeGreaterThan(0)
  })

  it('exports and imports CQ2 codes through the active draft', async () => {
    const store = useCaseEditorStore()
    store.newDraft('rbc')
    const wrapper = mount(CaseShareDialog)

    await wrapper.get('[data-testid="export-case"]').trigger('click')
    const textarea = wrapper.get('[data-testid="case-code"]')
    expect((textarea.element as HTMLTextAreaElement).value).toMatch(/^CQ2!/)

    await textarea.setValue('not-a-case')
    await wrapper.get('[data-testid="import-case"]').trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toContain('CQ2')
  })
})
