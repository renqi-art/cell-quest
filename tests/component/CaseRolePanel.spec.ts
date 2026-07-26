import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CaseRolePanel from '@/game/components/CaseRolePanel.vue'

describe('CaseRolePanel', () => {
  it('shows both responsibilities and emits a role swap', async () => {
    const wrapper = mount(CaseRolePanel, { props: { swapped: false } })
    expect(wrapper.text()).toContain('P1 红细胞')
    expect(wrapper.text()).toContain('P2 白细胞')
    await wrapper.get('[data-testid="swap-player-roles"]').trigger('click')
    expect(wrapper.emitted('swap')).toHaveLength(1)
    await wrapper.setProps({ swapped: true })
    expect(wrapper.text()).toContain('P1 白细胞')
    expect(wrapper.text()).toContain('P2 红细胞')
  })
})
