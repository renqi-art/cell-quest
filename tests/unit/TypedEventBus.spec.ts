import { describe, expect, it, vi } from 'vitest'
import { TypedEventBus } from '@/shared/utils/TypedEventBus'

interface TestEvents {
  ready: () => void
  score: (value: number) => void
}

describe('TypedEventBus', () => {
  it('publishes typed payloads and supports unsubscribe', () => {
    const bus = new TypedEventBus<TestEvents>()
    const listener = vi.fn()
    const unsubscribe = bus.subscribe('score', listener)

    bus.emit('score', 7)
    unsubscribe()
    bus.emit('score', 9)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(7)
  })

  it('clears all listeners', () => {
    const bus = new TypedEventBus<TestEvents>()
    const listener = vi.fn()
    bus.subscribe('ready', listener)

    bus.clear()
    bus.emit('ready')

    expect(listener).not.toHaveBeenCalled()
  })
})
