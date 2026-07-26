import type { GameEngine } from '@/game/bridge/GameEngine'
import type { LoadLevelOptions, CellType } from '@/shared/types/game'
import type { CaseDraft } from '@/shared/models/case-draft'
import type { EditorPreviewGateway, PreviewOptions, PreviewSession, CasePlaytestReport } from './EditorPreviewGateway'

/** Legacy level format that game.js Level constructor understands */
interface LegacyLevelData {
  width?: number
  map: string[]
  _name?: string
  _icon?: string
}

/** Signature of the preview registration hook on window.CellQuestLegacy */
interface PreviewLevelRegistry {
  registerPreviewLevel(level: LegacyLevelData): string
  unregisterPreviewLevel(id: string): void
}

export class LegacyEditorPreviewAdapter implements EditorPreviewGateway {
  private readonly disposers = new Map<string, () => void>()

  constructor(
    private readonly engine: GameEngine & { setCaseConfig?: (cfg: unknown) => void },
    private readonly registry: PreviewLevelRegistry
  ) {}

  async start(draft: CaseDraft, options: PreviewOptions): Promise<PreviewSession> {
    const levelData = this.draftToLevelData(draft)
    const previewId = this.registry.registerPreviewLevel(levelData)

    const cellType: CellType = options.role === 'rbc' ? 1 : options.role === 'wbc' ? 2 : 3
    const loadOptions: LoadLevelOptions = {
      twoPlayer: options.role === 'coop',
      playerOneCell: cellType,
      playerTwoCell: options.role === 'coop' ? 2 : undefined,
    }

    if (draft.caseConfig && this.engine.setCaseConfig) {
      this.engine.setCaseConfig(draft.caseConfig)
    }

    const startTime = Date.now()
    let completed = false
    let failureCode: string | undefined
    let deaths = 0
    let resolved = false

    const unsubscriptions: (() => void)[] = []

    // We need to store the resolve function so event handlers can call it
    const sessionId = `preview-${previewId}-${Date.now()}`
    let pendingResolve: ((report: CasePlaytestReport) => void) | null = null

    const finish = () => {
      if (resolved) return
      resolved = true
      for (const unsub of unsubscriptions) unsub()

      const report: CasePlaytestReport = {
        completed,
        durationMs: Date.now() - startTime,
        deaths,
        failureCode,
        unvisitedNodeIds: [],
        crisisEvents: [],
        heatCells: [],
      }

      if (pendingResolve) {
        pendingResolve(report)
        pendingResolve = null
      }
    }

    // Terminal events → finish()
    unsubscriptions.push(
      this.engine.subscribe('case-completed', () => {
        completed = true
        finish()
      })
    )

    unsubscriptions.push(
      this.engine.subscribe('case-failed', (result) => {
        failureCode = result.status === 'failed' ? 'case-failed' : result.status
        finish()
      })
    )

    unsubscriptions.push(
      this.engine.subscribe('fatal-error', (err) => {
        if (!failureCode) failureCode = err.code
        finish()
      })
    )

    // Non-terminal events → accumulate data
    unsubscriptions.push(
      this.engine.subscribe('player-died', () => {
        deaths++
      })
    )

    unsubscriptions.push(
      this.engine.subscribe('level-completed', () => {
        if (!completed && !failureCode) completed = true
      })
    )

    unsubscriptions.push(
      this.engine.subscribe('state-changed', (state) => {
        if (state === 'hub' || state === 'menu') {
          finish()
        }
      })
    )

    await this.engine.loadLevel(previewId, loadOptions)

    const reportPromise = new Promise<CasePlaytestReport>((resolve) => {
      pendingResolve = resolve
    })

    this.disposers.set(sessionId, finish)

    return {
      sessionId,
      report: reportPromise,
      dispose: () => {
        this.engine.quitLevel()
        this.registry.unregisterPreviewLevel(previewId)
        finish()
      },
    }
  }

  private draftToLevelData(draft: CaseDraft): LegacyLevelData {
    const height = draft.map.length
    const width = draft.map.length > 0 ? draft.map[0]!.length : 80
    const map = draft.map.map((row) => row.split(''))

    for (const node of draft.nodes) {
      if (node.y < 0 || node.y >= height || node.x < 0 || node.x >= width) continue
      const row = map[node.y]
      if (!row) continue
      switch (node.kind) {
        case 'spawn':
          row[node.x] = 'P'
          break
        case 'checkpoint':
          row[node.x] = 'C'
          break
      }
    }

    return {
      width,
      map: map.map((row) => row.join('')),
      _name: draft.metadata.title,
      _icon: draft.metadata.icon,
    }
  }
}
