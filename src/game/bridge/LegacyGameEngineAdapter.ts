import type { GameCommand, LoadLevelOptions } from '@/shared/types/game'
import type { GameEngineEventMap } from '@/shared/types/events'
import { GameEngineEvents } from './GameEngineEvents'
import type { GameEngine } from './GameEngine'

export interface LegacyGameBridge {
  loadLevel(levelId: string, options: LoadLevelOptions): boolean
  pause(): void
  resume(): void
  retry(): void
  quitLevel(): void
  setTwoPlayer(enabled: boolean): void
  dispatch(command: GameCommand): void
}

export class LegacyGameEngineAdapter implements GameEngine {
  private readonly events = new GameEngineEvents()

  constructor(private readonly legacy: LegacyGameBridge) {}

  async mount(_host: HTMLElement): Promise<void> {}

  destroy(): void {
    this.events.clear()
  }

  async loadLevel(levelId: string, options: LoadLevelOptions): Promise<void> {
    if (!this.legacy.loadLevel(levelId, options)) {
      throw new Error(`Legacy level ${levelId} could not be loaded`)
    }
  }

  pause(): void {
    this.legacy.pause()
  }

  resume(): void {
    this.legacy.resume()
  }

  retry(): void {
    this.legacy.retry()
  }

  quitLevel(): void {
    this.legacy.quitLevel()
  }

  setTwoPlayer(enabled: boolean): void {
    this.legacy.setTwoPlayer(enabled)
  }

  dispatch(command: GameCommand): void {
    this.legacy.dispatch(command)
  }

  subscribe<K extends keyof GameEngineEventMap>(
    event: K,
    listener: GameEngineEventMap[K]
  ): () => void {
    return this.events.subscribe(event, listener)
  }

  publish<K extends keyof GameEngineEventMap>(
    event: K,
    ...args: Parameters<GameEngineEventMap[K]>
  ): void {
    this.events.emit(event, ...args)
  }
}
