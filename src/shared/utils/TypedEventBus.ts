type EventMapShape<TEvents> = {
  [K in keyof TEvents]: (...args: never[]) => void
}

type ErasedListener = (...args: never[]) => void

export class TypedEventBus<TEvents extends EventMapShape<TEvents>> {
  private readonly listeners = new Map<keyof TEvents, Set<ErasedListener>>()

  subscribe<K extends keyof TEvents>(event: K, listener: TEvents[K]): () => void {
    const listeners = this.listeners.get(event) ?? new Set<ErasedListener>()
    const erasedListener = listener as ErasedListener
    listeners.add(erasedListener)
    this.listeners.set(event, listeners)
    return () => listeners.delete(erasedListener)
  }

  emit<K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): void {
    const listeners = this.listeners.get(event)
    if (!listeners) return
    for (const listener of listeners) {
      const typedListener = listener as (...listenerArgs: Parameters<TEvents[K]>) => void
      typedListener(...args)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
