import { describe, expect, it, vi } from 'vitest'
import { LegacyGameEngineAdapter } from '@/game/bridge/LegacyGameEngineAdapter'

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
})
