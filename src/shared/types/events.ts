import type { GameScreenState, HudSnapshot } from './game'

export interface TutorialViewModel {
  readonly speaker: string
  readonly color: string
  readonly body: string
}

export interface KnowledgeCardViewModel {
  readonly title: string
  readonly body: string
}

export interface LevelResult {
  readonly levelId: string
  readonly stars: 1 | 2 | 3
  readonly elapsedMs: number
  readonly completionPercent: number
}

export interface DeathResult {
  readonly remainingCells: number
  readonly cellName: string
}

export interface ToastViewModel {
  readonly message: string
  readonly durationMs: number
}

export interface EngineFailure {
  readonly code: string
  readonly message: string
  readonly cause?: unknown
}

export interface GameEngineEventMap {
  'state-changed': (state: GameScreenState) => void
  'hud-updated': (snapshot: HudSnapshot) => void
  'tutorial-opened': (tutorial: TutorialViewModel) => void
  'knowledge-opened': (card: KnowledgeCardViewModel) => void
  'level-completed': (result: LevelResult) => void
  'player-died': (result: DeathResult) => void
  'toast-requested': (toast: ToastViewModel) => void
  'fatal-error': (error: EngineFailure) => void
}
