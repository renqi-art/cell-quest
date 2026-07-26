import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NewCaseWizard from '@/editor/components/NewCaseWizard.vue'

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
})
