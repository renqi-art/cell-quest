import { describe, expect, it, vi } from 'vitest'

vi.mock('phaser', () => {
  class Scene {}
  class Game {}
  return {
    default: {
      Scene,
      Game,
      CANVAS: 1,
      Scale: { FIT: 1, CENTER_BOTH: 1 },
      Input: { Keyboard: { JustDown: () => false } },
    },
  }
})
import type Phaser from 'phaser'
import { PhaserGameEngineAdapter } from '@/game/phaser/PhaserGameEngineAdapter'

function fakeGame(): Phaser.Game {
  return {
    destroy: vi.fn(),
    scene: {
      pause: vi.fn(),
      resume: vi.fn(),
      getScene: vi.fn(() => null),
    },
    canvas: document.createElement('canvas'),
  } as unknown as Phaser.Game
}

describe('PhaserGameEngineAdapter classic routing', () => {
  it('routes loadLevel to a classic Scene without requiring a case draft', async () => {
    const game = fakeGame()
    const gameFactory = vi.fn<(config: Phaser.Types.Core.GameConfig) => Phaser.Game>(() => game)
    const adapter = new PhaserGameEngineAdapter(undefined, { gameFactory })
    await adapter.mount(document.createElement('div'))

    await adapter.loadLevel('0', { twoPlayer: false, playerOneCell: 3 })

    expect(gameFactory).toHaveBeenCalledOnce()
    expect(gameFactory.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      parent: expect.any(HTMLElement),
      scene: [expect.any(Function)],
    }))
  })

  it('retries and pauses the active classic Scene key', async () => {
    const first = fakeGame()
    const second = fakeGame()
    const gameFactory = vi.fn<(config: Phaser.Types.Core.GameConfig) => Phaser.Game>()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
    const adapter = new PhaserGameEngineAdapter(undefined, { gameFactory })
    await adapter.mount(document.createElement('div'))
    await adapter.loadLevel('0', { twoPlayer: false, playerOneCell: 3 })

    adapter.pause()
    adapter.resume()
    adapter.retry()
    await Promise.resolve()

    expect(first.scene.pause).toHaveBeenCalledWith('classic-runtime')
    expect(first.scene.resume).toHaveBeenCalledWith('classic-runtime')
    expect(first.destroy).toHaveBeenCalledWith(true)
    expect(gameFactory).toHaveBeenCalledTimes(2)
  })
})
