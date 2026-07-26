import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NewCaseWizard from '@/editor/components/NewCaseWizard.vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'

describe('NewCaseWizard', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders four step indicators', () => {
    const wrapper = mount(NewCaseWizard)
    const steps = wrapper.findAll('[data-step]')
    expect(steps.length).toBe(4)
  })

  it('defaults to RBC role', () => {
    const wrapper = mount(NewCaseWizard)
    expect(wrapper.text()).toContain('红细胞')
  })

  it('creates an official oxygen transport template through the wizard', async () => {
    const wrapper = mount(NewCaseWizard)
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-template="rbc-transport"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-testid="create-case"]').trigger('click')

    const store = useCaseEditorStore()
    expect(store.draft?.metadata.title).toBe('氧气运输')
    expect(store.diagnostics.filter(item => item.severity === 'error')).toEqual([])
  })

})
