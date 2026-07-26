import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameUiStore } from '@/game/stores/game-ui'

describe('game UI store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('moves through menu, hub, playing, paused, and error states', () => {
    const store = useGameUiStore()

    expect(store.screen).toBe('menu')
    store.setScreen('hub')
    store.setScreen('playing')
    store.setScreen('paused')
    store.fail({ code: 'TEST', message: 'failure' })

    expect(store.screen).toBe('error')
    expect(store.failure).toEqual({ code: 'TEST', message: 'failure' })
  })
})
