import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OnboardingPanel from '@/game/components/OnboardingPanel.vue'

describe('OnboardingPanel', () => {
  it('teaches four concepts then launches the first case', async () => {
    const wrapper = mount(OnboardingPanel)
    expect(wrapper.text()).toContain('患者指标')
    await wrapper.get('[data-testid="onboarding-next"]').trigger('click')
    expect(wrapper.text()).toContain('细胞职责')
    await wrapper.get('[data-testid="onboarding-next"]').trigger('click')
    expect(wrapper.text()).toContain('AI 病情卡')
    await wrapper.get('[data-testid="onboarding-next"]').trigger('click')
    expect(wrapper.text()).toContain('稳定')
    await wrapper.get('[data-testid="onboarding-start"]').trigger('click')
    expect(wrapper.emitted('complete')).toHaveLength(1)
  })
})
