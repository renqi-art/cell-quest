import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LegacyEditorPreviewAdapter } from '@/editor/services/LegacyEditorPreviewAdapter'
import type { EditorPreviewGateway } from '@/editor/services/EditorPreviewGateway'
import type { CaseDraft } from '@/shared/models/case-draft'
import type { GameEngine } from '@/game/bridge/GameEngine'
import type { CaseConfig } from '@/shared/types/case'

function makeMockEngine() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  return {
    listeners,
    mount: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    loadLevel: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    resume: vi.fn(),
    retry: vi.fn(),
    quitLevel: vi.fn(),
    setTwoPlayer: vi.fn(),
    dispatch: vi.fn(),
    setCaseConfig: vi.fn(),
    subscribe(event: string, listener: (...args: unknown[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(listener)
      return () => listeners.get(event)?.delete(listener)
    },
    emit(event: string, ...args: unknown[]) {
      listeners.get(event)?.forEach((fn) => fn(...args))
    },
  }
}

function makeMockRegistry() {
  const levels = new Map<string, unknown>()
  return {
    registerPreviewLevel: vi.fn((data: unknown) => {
      const id = 'preview-test-' + levels.size
      levels.set(id, data)
      return id
    }),
    unregisterPreviewLevel: vi.fn((id: string) => {
      levels.delete(id)
    }),
    _levels: levels,
  }
}

function makeDraft(overrides: Partial<CaseDraft> = {}): CaseDraft {
  return {
    version: 1,
    mode: 'case',
    id: 'draft-test',
    revision: 1,
    metadata: {
      title: '测试病例',
      author: '测试',
      difficulty: 'standard',
      tags: [],
      icon: '🫁',
    },
    map: [
      '################################################',
      '#                                              #',
      '#  P                                           #',
      '#                                              #',
      '################################################',
    ],
    nodes: [
      { kind: 'spawn', id: 'spawn_0', x: 3, y: 2, role: 'rbc' },
    ],
    caseConfig: {
      version: 1,
      primaryCell: 'rbc',
      allyMode: 'scripted',
      vitals: {
        oxygen: 80,
        infection: 20,
        tissue: 70,
        oxygenDecayPerSecond: 2,
        infectionGrowthPerSecond: 1.5,
        tissueDecayPerSecond: 0.5,
      },
      goals: {
        oxygenRoutes: [],
        infection: { nodeIds: [], requiredClears: 0 },
        stabilitySeconds: 5,
      },
      allowedEvents: [],
      briefing: { start: '开始', success: '成功', failure: '失败' },
      education: { topic: '', sourceIds: [] },
    },
    editorMeta: {
      source: 'manual',
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  } as CaseDraft
}

describe('LegacyEditorPreviewAdapter', () => {
  let engine: ReturnType<typeof makeMockEngine>
  let registry: ReturnType<typeof makeMockRegistry>
  let adapter: EditorPreviewGateway

  beforeEach(() => {
    engine = makeMockEngine()
    registry = makeMockRegistry()
    adapter = new LegacyEditorPreviewAdapter(
      engine as unknown as GameEngine & { setCaseConfig: (cfg: CaseConfig) => void },
      registry
    )
  })

  it('registers a preview level and returns a session', async () => {
    const draft = makeDraft()
    const session = await adapter.start(draft, {
      role: 'rbc',
      start: { type: 'full' },
    })

    expect(session.sessionId).toContain('preview')
    expect(registry.registerPreviewLevel).toHaveBeenCalledTimes(1)
    expect(engine.loadLevel).toHaveBeenCalledTimes(1)
    expect(typeof session.dispose).toBe('function')
  })

  it('passes correct cell type for each role', async () => {
    const draft = makeDraft()

    // RBC → cellType 1
    await adapter.start(draft, { role: 'rbc', start: { type: 'full' } })
    expect(engine.loadLevel).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ playerOneCell: 1, twoPlayer: false })
    )

    // WBC → cellType 2
    await adapter.start(draft, { role: 'wbc', start: { type: 'full' } })
    expect(engine.loadLevel).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ playerOneCell: 2, twoPlayer: false })
    )

    // Coop → cellType 3, twoPlayer: true
    await adapter.start(draft, { role: 'coop', start: { type: 'full' } })
    expect(engine.loadLevel).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ playerOneCell: 3, twoPlayer: true })
    )
  })

  it('sets case config on engine when present', async () => {
    const draft = makeDraft()
    await adapter.start(draft, { role: 'rbc', start: { type: 'full' } })
    expect(engine.setCaseConfig).toHaveBeenCalledWith(draft.caseConfig)
  })

  it('does not set case config when draft has no caseConfig', async () => {
    const draft = makeDraft({ caseConfig: null, mode: 'classic' } as Partial<CaseDraft>)
    await adapter.start(draft, { role: 'rbc', start: { type: 'full' } })
    expect(engine.setCaseConfig).not.toHaveBeenCalled()
  })

  it('dispose unregisters the preview level and quits', async () => {
    const draft = makeDraft()
    const session = await adapter.start(draft, {
      role: 'rbc',
      start: { type: 'full' },
    })

    session.dispose()
    expect(engine.quitLevel).toHaveBeenCalled()
    expect(registry.unregisterPreviewLevel).toHaveBeenCalled()
  })

  it('report resolves with completed=true on case-completed', async () => {
    const draft = makeDraft()
    const session = await adapter.start(draft, {
      role: 'rbc',
      start: { type: 'full' },
    })

    // Fire case-completed event
    engine.emit('case-completed', { reason: 'stable' })

    const report = await session.report
    expect(report.completed).toBe(true)
    expect(report.deaths).toBe(0)
  })

  it('report counts deaths from player-died events', async () => {
    const draft = makeDraft()
    const session = await adapter.start(draft, {
      role: 'rbc',
      start: { type: 'full' },
    })

    // Fire multiple player-died events
    engine.emit('player-died', { remainingCells: 5, cellName: 'RBC' })
    engine.emit('player-died', { remainingCells: 4, cellName: 'RBC' })
    engine.emit('player-died', { remainingCells: 3, cellName: 'RBC' })

    // Then complete
    engine.emit('case-completed', { reason: 'stable' })

    const report = await session.report
    expect(report.deaths).toBe(3)
    expect(report.completed).toBe(true)
  })

  it('report has failureCode on case-failed', async () => {
    const draft = makeDraft()
    const session = await adapter.start(draft, {
      role: 'rbc',
      start: { type: 'full' },
    })

    engine.emit('case-failed', { status: 'failed', vitals: { oxygen: 0, infection: 80, tissue: 5 }, progress: { oxygenDeliveries: 0, infectionSitesCleared: 0 }, durationMs: 0, deaths: 0, atpEfficiency: 0 })

    const report = await session.report
    expect(report.completed).toBe(false)
    expect(report.failureCode).toBe('case-failed')
  })

  it('report has failureCode on fatal-error', async () => {
    const draft = makeDraft()
    const session = await adapter.start(draft, {
      role: 'rbc',
      start: { type: 'full' },
    })

    engine.emit('fatal-error', { code: 'ENGINE_CRASH', message: 'Something broke' })

    const report = await session.report
    expect(report.completed).toBe(false)
    expect(report.failureCode).toBe('ENGINE_CRASH')
  })

  it('converts draft map with spawn node placement', async () => {
    const draft = makeDraft()
    await adapter.start(draft, { role: 'rbc', start: { type: 'full' } })

    // Verify the registered level data has P at spawn position
    const callArgs = registry.registerPreviewLevel.mock.calls[0]
    const registeredData = (callArgs?.[0] as Record<string, unknown>) ?? {}
    const map = registeredData.map as string[]
    const row = map[2]
    expect(row).toBeDefined()
    expect(row![3]).toBe('P') // spawn node at x=3, y=2
  })
})
