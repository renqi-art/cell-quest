import type { GameCommand, LoadLevelOptions } from '@/shared/types/game'
import type { GameEngineEventMap } from '@/shared/types/events'
import { GameEngineEvents } from './GameEngineEvents'
import type { GameEngine } from './GameEngine'
import { CaseEngine } from '@/shared/domain/CaseEngine'
import { ScriptedAllySystem, ALLY_DEFAULTS, type AllyConfig } from '@/shared/domain/ScriptedAllySystem'
import type { CaseConfig } from '@/shared/types/case'
import { CaseDirectorClient } from '@/game/services/CaseDirectorClient'
import type { DirectorContext } from '@/shared/types/director'

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
  private allySystem: ScriptedAllySystem | null = null
  private tickDisposer: (() => void) | null = null
  private directorPhase: 0 | 1 | 2 = 0
  private directorPending = false
  private directorRunId = ''

  constructor(
    private readonly legacy: LegacyGameBridge,
    private readonly directorClient: Pick<CaseDirectorClient, 'nextPlan'> = new CaseDirectorClient(),
  ) {}

  async mount(_host: HTMLElement): Promise<void> {}

  destroy(): void {
    this.caseEngine = null
    this.allySystem = null
    this.directorPhase = 0
    this.directorPending = false
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
    if (this.allySystem) {
      this.allySystem.enabled = !enabled
    }
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
    this.directorPhase = 0
    this.directorPending = false
    this.directorRunId = 'run-' + Date.now().toString(36)

    // Create scripted ally for single-player mode
    if (config.allyMode === 'scripted') {
      const allyConfig: AllyConfig = config.primaryCell === 'coop'
        ? ALLY_DEFAULTS.rbc
        : ALLY_DEFAULTS[config.primaryCell === 'wbc' ? 'rbc' : 'wbc']
      // Note: when primaryCell is 'wbc', the ally is RBC, and vice versa.
      this.allySystem = new ScriptedAllySystem(
        allyConfig,
        (event) => this.caseEngine?.dispatch(event) ?? false,
      )
    } else {
      this.allySystem = null
    }

    // Register tick callback on the legacy bridge
    this.legacy.onTick = (dtMs: number) => {
      if (!this.caseEngine || !this.caseEngine.isActive()) return

      const crisisBefore = this.caseEngine.getCrisisSnapshot()
      if (this.allySystem) this.allySystem.update(dtMs, this.caseEngine.getSnapshot())
      this.caseEngine.update(dtMs / 1000)
      const crisisAfter = this.caseEngine.getCrisisSnapshot()
      if (crisisBefore && !crisisAfter && this.directorPhase === 1 && !this.directorPending) {
        void this.requestDirector(config, 2)
      }
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

    if (config.allowedEvents.length > 0) void this.requestDirector(config, 1)
  }

  private async requestDirector(config: CaseConfig, phase: 1 | 2): Promise<void> {
    if (!this.caseEngine || this.directorPending || this.directorPhase >= phase) return
    const targetNodes = Array.from(new Set([
      ...config.goals.oxygenRoutes.flatMap(route => route.targetIds),
      ...config.goals.infection.nodeIds,
    ]))
    if (config.allowedEvents.length === 0 || targetNodes.length === 0) return
    const engineAtRequest = this.caseEngine
    const snapshot = engineAtRequest.getSnapshot()
    const context: DirectorContext = {
      schemaVersion: 1,
      levelId: 'case_runtime',
      mode: config.primaryCell === 'coop' ? 'coop' : 'single',
      primaryCell: config.primaryCell === 'wbc' ? 'wbc' : 'rbc',
      phase,
      runId: this.directorRunId,
      vitals: snapshot.vitals,
      performance: { deaths: 0, elapsedMs: snapshot.elapsedMs },
      allowedEvents: config.allowedEvents,
      validTargetNodes: targetNodes,
    }
    this.directorPending = true
    this.events.emit('director-pending', true)
    try {
      const decision = await this.directorClient.nextPlan(context)
      if (this.caseEngine !== engineAtRequest || !engineAtRequest.startCrisis(decision.plan, decision.source)) return
      this.directorPhase = phase
      this.events.emit('director-decision', {
        ...decision,
        phase,
        requestedAt: new Date().toISOString(),
      })
    } finally {
      this.directorPending = false
      this.events.emit('director-pending', false)
    }
  }
}
