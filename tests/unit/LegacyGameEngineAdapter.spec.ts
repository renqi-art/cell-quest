import { describe, expect, it, vi } from 'vitest'
import { LegacyGameEngineAdapter } from '@/game/bridge/LegacyGameEngineAdapter'
import type { CaseConfig } from '@/shared/types/case'
import type { DirectorContext } from '@/shared/types/director'

describe('LegacyGameEngineAdapter', () => {
  it('routes lifecycle commands through the legacy bridge', async () => {
    const legacy = {
      loadLevel: vi.fn(() => true),
      pause: vi.fn(),
      resume: vi.fn(),
      retry: vi.fn(),
      quitLevel: vi.fn(),
      setTwoPlayer: vi.fn(),
      dispatch: vi.fn(),
    }
    const adapter = new LegacyGameEngineAdapter(legacy)

    await adapter.loadLevel('1', { twoPlayer: false, playerOneCell: 1 })
    adapter.pause()
    adapter.resume()
    adapter.retry()
    adapter.quitLevel()

    expect(legacy.loadLevel).toHaveBeenCalledWith('1', {
      twoPlayer: false,
      playerOneCell: 1,
    })
    expect(legacy.pause).toHaveBeenCalledOnce()
    expect(legacy.resume).toHaveBeenCalledOnce()
    expect(legacy.retry).toHaveBeenCalledOnce()
    expect(legacy.quitLevel).toHaveBeenCalledOnce()
  })

  it('removes all event subscriptions on destroy', () => {
    const adapter = new LegacyGameEngineAdapter({
      loadLevel: () => true,
      pause() {},
      resume() {},
      retry() {},
      quitLevel() {},
      setTwoPlayer() {},
      dispatch() {},
    })
    const listener = vi.fn()
    adapter.subscribe('state-changed', listener)

    adapter.destroy()
    adapter.publish('state-changed', 'playing')

    expect(listener).not.toHaveBeenCalled()
  })

  it('requests at most two director phases and emits both decisions', async () => {
    const legacy: { onTick?: (dtMs: number) => void } & Record<string, unknown> = {
      loadLevel: () => true, pause() {}, resume() {}, retry() {}, quitLevel() {}, setTwoPlayer() {}, dispatch() {},
    }
    const nextPlan = vi.fn(async (context: DirectorContext) => ({
      source: 'local' as const,
      plan: {
        eventId: 'ATP_CRISIS' as const, targetNode: 'tissue_0', severity: 1 as const,
        goal: { oxygenDeliveries: 1, timeLimitSeconds: 40 },
        doctorLine: '能量告急', reason: '测试阶段 ' + context.phase,
      },
    }))
    const adapter = new LegacyGameEngineAdapter(legacy as never, { nextPlan })
    const decisions: number[] = []
    adapter.subscribe('director-decision', entry => decisions.push(entry.phase))
    const config: CaseConfig = {
      version: 1, primaryCell: 'rbc', allyMode: 'scripted',
      vitals: { oxygen: 80, infection: 20, tissue: 70, oxygenDecayPerSecond: 0, infectionGrowthPerSecond: 0, tissueDecayPerSecond: 0 },
      goals: { oxygenRoutes: [{ id: 'route_0', sourceId: 'oxygen_0', targetIds: ['tissue_0'], requiredDeliveries: 99 }], infection: { nodeIds: [], requiredClears: 0 }, stabilitySeconds: 30 },
      allowedEvents: ['ATP_CRISIS'], briefing: { start: '', success: '', failure: '' }, education: { topic: '', sourceIds: [] },
    }

    adapter.setCaseConfig(config)
    await vi.waitFor(() => expect(decisions).toEqual([1]))
    legacy.onTick?.(15_000)
    await vi.waitFor(() => expect(decisions).toEqual([1, 2]))
    legacy.onTick?.(15_000)
    await Promise.resolve()

    expect(nextPlan).toHaveBeenCalledTimes(2)
  })

})
