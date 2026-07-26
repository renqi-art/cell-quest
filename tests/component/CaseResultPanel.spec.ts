import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CaseResultPanel from '@/game/components/CaseResultPanel.vue'

describe('CaseResultPanel', () => {
  it('renders a bounded patient report and emits replay/home actions', async () => {
    const wrapper = mount(CaseResultPanel, {
      props: {
        title: '缺氧警报',
        result: {
          status: 'complete',
          vitals: { oxygen: 72, infection: 12, tissue: 80 },
          progress: { oxygenDeliveries: 2, infectionSitesCleared: 1 },
          durationMs: 42_000,
          deaths: 0,
          atpEfficiency: 100,
        },
        directorEvents: ['ACUTE_HYPOXIA'],
        learningTakeaway: '红细胞运输氧气支持组织恢复。',
      },
    })

    expect(wrapper.get('[data-testid="case-result-panel"]').text()).toContain('缺氧警报')
    expect(wrapper.text()).toContain('72')
    expect(wrapper.text()).toContain('ACUTE_HYPOXIA')
    await wrapper.get('[data-testid="replay-case"]').trigger('click')
    await wrapper.get('[data-testid="return-to-campaign"]').trigger('click')
    expect(wrapper.emitted('replay')).toHaveLength(1)
    expect(wrapper.emitted('home')).toHaveLength(1)
  })
})
