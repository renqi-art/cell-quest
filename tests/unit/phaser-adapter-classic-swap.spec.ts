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

describe('PhaserGameEngineAdapter classic role swap', () => {
  it('delegates a co-op role swap to the active classic Scene', async () => {
    const controller = { swapPlayerRoles: vi.fn() }
    const game = {
      destroy: vi.fn(),
      scene: {
        getScene: vi.fn(() => controller),
        pause: vi.fn(),
        resume: vi.fn(),
      },
      canvas: document.createElement('canvas'),
    } as unknown as Phaser.Game
    const adapter = new PhaserGameEngineAdapter(undefined, { gameFactory: () => game })
    await adapter.mount(document.createElement('div'))
    await adapter.loadLevel('0', {
      twoPlayer: true,
      playerOneCell: 1,
      playerTwoCell: 3,
    })

    adapter.swapPlayerRoles()

    expect(controller.swapPlayerRoles).toHaveBeenCalledOnce()
    expect(game.scene.getScene).toHaveBeenCalledWith('classic-runtime')
  })
})
