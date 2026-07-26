import { describe, expect, it } from 'vitest'
import {
  applyItem,
  createClassicItemState,
  createQuestionBlockState,
  hitQuestionBlock,
  tickAbilityCooldowns,
  useAbility,
} from '@/shared/classic/simulation/ItemRules'

describe('classic item rules', () => {
  it.each([
    ['shield', 'shieldTicks', 600],
    ['oxygen', 'oxygenTicks', 600],
    ['complement', 'complementAmmo', 5],
    ['coin', 'coins', 1],
    ['food', 'food', 1],
    ['drink', 'drink', 1],
    ['nutrition', 'nutrition', 1],
    ['atp', 'energy', 70],
    ['memory', 'memory', 1],
  ] as const)('applies %s to %s', (kind, field, expected) => {
    const result = applyItem(createClassicItemState({ energy: 50 }), { kind })
    expect(result.collected).toBe(true)
    expect(result.state[field]).toBe(expected)
  })

  it('applies XP and equipment while rejecting a full inventory', () => {
    const xp = applyItem(createClassicItemState(), { kind: 'xp', value: 30 })
    expect(xp.state.xp).toBe(30)

    const equipment = applyItem(xp.state, { kind: 'equipment', equipmentId: 'enzyme-blade' })
    expect(equipment.state.inventory).toEqual(['enzyme-blade'])

    const full = createClassicItemState({ inventory: ['a', 'b'], inventoryLimit: 2 })
    const rejected = applyItem(full, { kind: 'equipment', equipmentId: 'c' })
    expect(rejected.collected).toBe(false)
    expect(rejected.reason).toBe('inventory-full')
  })

  it('allows a question block to produce exactly one deterministic output', () => {
    const first = hitQuestionBlock(createQuestionBlockState(false), 0.49)
    expect(first.output).toEqual({ kind: 'atp' })
    expect(first.state.phase).toBe('used')
    expect(hitQuestionBlock(first.state, 0.9).output).toBeNull()
    expect(hitQuestionBlock(createQuestionBlockState(true), 0.1).output).toBeNull()
    expect(hitQuestionBlock(createQuestionBlockState(false), 0.5).output).toEqual({ kind: 'strep' })
  })

  it('enforces and advances ability cooldowns', () => {
    const used = useAbility({}, 'dash', 30)
    expect(used.applied).toBe(true)
    expect(useAbility(used.cooldowns, 'dash', 30).applied).toBe(false)
    let cooldowns = used.cooldowns
    for (let tick = 0; tick < 30; tick += 1) cooldowns = tickAbilityCooldowns(cooldowns)
    expect(useAbility(cooldowns, 'dash', 30).applied).toBe(true)
  })
})
