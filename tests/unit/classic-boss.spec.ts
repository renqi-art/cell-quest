import { describe, expect, it } from 'vitest'
import {
  createBossState,
  damageBoss,
  interactNpc,
  stepBoss,
  type BossState,
} from '@/shared/classic/simulation/BossBrain'
import { canCompleteClassicLevel } from '@/shared/classic/simulation/CompletionRules'

const observation = { playerDistance: 100, wasHit: false }

describe('classic boss brain', () => {
  it('does nothing before the encounter gate and starts when a player approaches', () => {
    const idle = stepBoss(createBossState(), { playerDistance: 300, wasHit: false }, () => 0)
    expect(idle.state.encountered).toBe(false)
    expect(idle.effects).toEqual([])
    expect(stepBoss(idle.state, observation, () => 0).state.encountered).toBe(true)
  })

  it('uses health thresholds for all three phases and typed skills', () => {
    const phaseOne = stepBoss({ ...createBossState(), encountered: true, hp: 8 }, observation, () => 0)
    expect(phaseOne.state.phase).toBe(1)
    expect(phaseOne.effects).toContainEqual({ type: 'ring' })
    expect(phaseOne.effects).toContainEqual({ type: 'leukocidin-mark', castTicks: 90 })

    const phaseTwo = stepBoss({
      ...createBossState(),
      encountered: true,
      hp: 7,
      summonTicks: 1,
    }, observation, () => 0)
    expect(phaseTwo.state.phase).toBe(2)
    expect(phaseTwo.effects).toContainEqual(expect.objectContaining({ type: 'shield' }))
    expect(phaseTwo.effects).toContainEqual({ type: 'summon', count: 2 })

    const phaseThree = stepBoss({ ...createBossState(), encountered: true, hp: 3 }, observation, () => 0)
    expect(phaseThree.state.phase).toBe(3)
    expect(phaseThree.state.biofilmActive).toBe(true)
    expect(phaseThree.effects).toContainEqual({ type: 'biofilm-start' })
    expect(phaseThree.effects).toContainEqual({ type: 'shock-charge', castTicks: 180 })
  })

  it('interrupts biofilm healing when hit, regenerates later, and dies cleanly', () => {
    let state: BossState = {
      ...createBossState(),
      encountered: true,
      hp: 3,
      phase: 3 as const,
      biofilmActive: true,
      shockCastTicks: 20,
    }
    const hit = damageBoss(state, 1)
    expect(hit.effects).toContainEqual({ type: 'shock-interrupted' })
    expect(hit.state.ticksSinceHit).toBe(0)
    state = hit.state
    for (let tick = 0; tick < 479; tick += 1) {
      state = stepBoss(state, observation, () => 1).state
    }
    const healed = stepBoss(state, observation, () => 1)
    expect(healed.effects).toContainEqual({ type: 'heal', amount: 1 })

    const dead = damageBoss({ ...healed.state, hp: 1, shieldHp: 0 }, 1)
    expect(dead.state.alive).toBe(false)
    expect(dead.effects).toContainEqual({ type: 'died' })
  })

  it('supports one-shot NPC interaction and locks the finish until Boss death', () => {
    const npc = interactNpc({ interacted: false })
    expect(npc.openDialogue).toBe(true)
    expect(interactNpc(npc.state).openDialogue).toBe(false)
    expect(canCompleteClassicLevel('reach-finish', {
      touchedFinish: true,
      allEnemiesDefeated: true,
      allItemsCollected: true,
      bossAlive: true,
    })).toBe(false)
    expect(canCompleteClassicLevel('reach-finish', {
      touchedFinish: true,
      allEnemiesDefeated: true,
      allItemsCollected: true,
      bossAlive: false,
    })).toBe(true)
  })
})
