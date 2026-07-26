import { describe, expect, it, vi } from 'vitest'
import {
  ClassicInputRouter,
  swapPlayerRoles,
  type ClassicKeyboardSource,
} from '@/game/phaser/systems/ClassicInputRouter'
import type { PlayerAction } from '@/shared/types/game'

describe('ClassicInputRouter', () => {
  it('keeps P1/P2 independent and merges keyboard with dispatched commands', () => {
    const external = new Map<1 | 2, Set<PlayerAction>>([
      [1, new Set(['left'])],
      [2, new Set()],
    ])
    const keyboard: ClassicKeyboardSource = {
      isDown: (player, action) => player === 2 && action === 'jump',
    }
    const router = new ClassicInputRouter(external, keyboard)

    expect(router.frame(1)).toMatchObject({ left: true, right: false, jumpPressed: false })
    expect(router.frame(2)).toMatchObject({ left: false, jumpPressed: true, jumpHeld: true })
    expect(router.frame(2).jumpPressed).toBe(false)
  })

  it('emits dash/jump edges once and releases them independently', () => {
    const external = new Map<1 | 2, Set<PlayerAction>>([
      [1, new Set(['jump', 'dash'])],
      [2, new Set()],
    ])
    const router = new ClassicInputRouter(external)
    expect(router.frame(1)).toMatchObject({ jumpPressed: true, dashPressed: true })
    expect(router.frame(1)).toMatchObject({ jumpPressed: false, dashPressed: false })
    external.get(1)!.clear()
    router.frame(1)
    external.get(1)!.add('jump')
    expect(router.frame(1).jumpPressed).toBe(true)
  })

  it('preserves player indexes while swapping role assignments and cleans up once', () => {
    expect(swapPlayerRoles(new Map([[1, 1], [2, 2]]))).toEqual(new Map([[1, 2], [2, 1]]))
    const cleanup = vi.fn()
    const router = new ClassicInputRouter(new Map(), undefined, cleanup)
    router.shutdown()
    router.shutdown()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(router.frame(1)).toMatchObject({
      left: false,
      right: false,
      jumpPressed: false,
      dashPressed: false,
    })
  })
})
