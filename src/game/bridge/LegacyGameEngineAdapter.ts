import type { GameCommand, LoadLevelOptions } from '@/shared/types/game'
import type { GameEngineEventMap } from '@/shared/types/events'
import { GameEngineEvents } from './GameEngineEvents'
import type { GameEngine } from './GameEngine'
import { CaseEngine } from '@/shared/domain/CaseEngine'
import type { CaseConfig } from '@/shared/types/case'

export interface LegacyGameBridge {
  loadLevel(levelId: string, options: LoadLevelOptions): boolean
  pause(): void
  resume(): void
  retry(): void
  quitLevel(): void
  setTwoPlayer(enabled: boolean): void
  dispatch(command: GameCommand): void
  onTick?: (dtMs: number) => void
}

export class LegacyGameEngineAdapter implements GameEngine {
  private readonly events = new GameEngineEvents()
  private caseEngine: CaseEngine | null = null
  private tickDisposer: (() => void) | null = null

  constructor(private readonly legacy: LegacyGameBridge) {}

  async mount(_host: HTMLElement): Promise<void> {}

  destroy(): void {
    this.caseEngine = null
    if (this.tickDisposer) {
      this.tickDisposer()
      this.tickDisposer = null
    }
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

  /** Attach a CaseEngine to the tick loop. Called when loading a case level. */
  setCaseConfig(config: CaseConfig): void {
    // Remove previous tick listener
    if (this.tickDisposer) {
      this.tickDisposer()
      this.tickDisposer = null
    }

    this.caseEngine = new CaseEngine(config)

    // Register tick callback on the legacy bridge
    this.legacy.onTick = (dtMs: number) => {
      if (!this.caseEngine || !this.caseEngine.isActive()) return

      this.caseEngine.update(dtMs / 1000)
      const snap = this.caseEngine.getSnapshot()

      // Notify case HUD
      this.events.emit('case-updated', snap)

      // Handle terminal state (one-shot)
      if (snap.status === 'complete' && this.caseEngine.isComplete()) {
        this.events.emit('case-completed', this.caseEngine.buildResult())
        this.legacy.onTick = undefined
      }
      if (snap.status === 'failed' && this.caseEngine.isFailed()) {
        this.events.emit('case-failed', this.caseEngine.buildResult())
        this.legacy.onTick = undefined
      }
    }

    this.tickDisposer = () => {
      this.legacy.onTick = undefined
    }
  }
}
