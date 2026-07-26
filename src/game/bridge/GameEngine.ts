import type { GameCommand, LoadLevelOptions } from '@/shared/types/game'
import type { GameEngineEventMap } from '@/shared/types/events'

export interface GameEngine {
  mount(host: HTMLElement): Promise<void>
  destroy(): void
  loadLevel(levelId: string, options: LoadLevelOptions): Promise<void>
  pause(): void
  resume(): void
  retry(): void
  quitLevel(): void
  setTwoPlayer(enabled: boolean): void
  dispatch(command: GameCommand): void
  subscribe<K extends keyof GameEngineEventMap>(
    event: K,
    listener: GameEngineEventMap[K]
  ): () => void
}
