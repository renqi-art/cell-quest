import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CaseSettingsPanel from '@/editor/components/CaseSettingsPanel.vue'
import { useCaseEditorStore } from '@/editor/stores/case-editor'

describe('CaseSettingsPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('edits the title and difficulty through the case editor store', async () => {
    const store = useCaseEditorStore()
    store.newDraft('rbc')
    const wrapper = mount(CaseSettingsPanel)

    await wrapper.get('[data-testid="case-title"]').setValue('氧运输训练')
    await wrapper.get('[data-testid="case-title"]').trigger('change')
    await wrapper.get('[data-testid="case-difficulty"]').setValue('challenge')

    expect(store.draft?.metadata.title).toBe('氧运输训练')
    expect(store.draft?.metadata.difficulty).toBe('challenge')
  })
})
