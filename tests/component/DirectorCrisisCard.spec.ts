import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DirectorCrisisCard from '@/game/components/DirectorCrisisCard.vue'

const entry = {
  phase: 1 as const,
  requestedAt: '2026-07-26T00:00:00.000Z',
  source: 'local' as const,
  plan: {
    eventId: 'ACUTE_HYPOXIA' as const,
    targetNode: 'tissue_0',
    severity: 2 as const,
    goal: { oxygenDeliveries: 2, timeLimitSeconds: 40 },
    doctorLine: '血氧骤降。',
    reason: '组织耗氧量上升。',
  },
}

describe('DirectorCrisisCard', () => {
  it('shows the source, phase, medical explanation, and bounded objective', () => {
    const wrapper = mount(DirectorCrisisCard, { props: { entry } })
    expect(wrapper.text()).toContain('本地导演')
    expect(wrapper.text()).toContain('阶段 1')
    expect(wrapper.text()).toContain('血氧骤降')
    expect(wrapper.text()).toContain('供氧 2 次')
    expect(wrapper.text()).toContain('40 秒')
  })
})
