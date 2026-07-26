import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CaseCampaignPanel from '@/game/components/CaseCampaignPanel.vue'

 describe('CaseCampaignPanel', () => {
  it('shows all six chapters and emits the selected official case', async () => {
    const wrapper = mount(CaseCampaignPanel)
    await wrapper.get('[data-testid="open-campaign"]').trigger('click')
    expect(wrapper.findAll('[data-case-chapter]')).toHaveLength(6)
    expect(wrapper.text()).toContain('擦伤')
    expect(wrapper.text()).toContain('康复')
    await wrapper.get('[data-case-chapter="1"] [data-testid="start-official-case"]').trigger('click')
    expect(wrapper.emitted('start')?.[0]?.[0]).toEqual(expect.objectContaining({ id: 'case-chapter-1-wound' }))
  })
})
