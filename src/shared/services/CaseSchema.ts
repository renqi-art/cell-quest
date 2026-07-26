import type { CaseDraft } from '@/shared/models/case-draft'
import type { CaseConfig, CaseMetadata, CaseMode, CaseNode, PrimaryCell } from '@/shared/types/case'

export interface CreateCaseDraftOptions {
  readonly primaryCell: PrimaryCell
  readonly mode?: CaseMode
}

const MAP_HEIGHT = 15
const MAP_WIDTH = 80

let draftCounter = 0

function makeId(prefix: string): string {
  draftCounter += 1
  return `${prefix}-${Date.now()}-${draftCounter}`
}

const DEFAULT_VITALS = {
  oxygen: 80,
  infection: 20,
  tissue: 70,
  oxygenDecayPerSecond: 2,
  infectionGrowthPerSecond: 1.5,
  tissueDecayPerSecond: 0.5,
}

const DEFAULT_GOALS = {
  oxygenRoutes: [],
  infection: { nodeIds: [] as readonly string[], requiredClears: 1 },
  stabilitySeconds: 5,
}

function emptyMap(): readonly string[] {
  return [
    ...Array.from({ length: MAP_HEIGHT - 1 }, () => ' '.repeat(MAP_WIDTH)),
    '#'.repeat(MAP_WIDTH),
  ]
}

const KNOWN_TOP_KEYS = new Set([
  'version', 'mode', 'id', 'revision', 'metadata', 'map', 'nodes', 'caseConfig', 'editorMeta',
])

export function createCaseDraft(options: CreateCaseDraftOptions): CaseDraft {
  const mode: CaseMode = options.mode ?? 'case'
  const primaryCell = options.primaryCell

  const config: CaseConfig | null = mode === 'case'
    ? {
        version: 1,
        primaryCell,
        allyMode: 'scripted' as const,
        vitals: { ...DEFAULT_VITALS },
        goals: { ...DEFAULT_GOALS, oxygenRoutes: [], infection: { nodeIds: [], requiredClears: 1 } },
        allowedEvents: [],
        briefing: { start: '', success: '', failure: '' },
        education: { topic: '', sourceIds: [] },
      }
    : null

  const metadata: CaseMetadata = {
    title: '',
    author: '',
    difficulty: 'standard',
    tags: [],
    icon: '🫁',
  }

  const spawnNode: CaseNode = { kind: 'spawn', id: makeId('spawn'), x: 1, y: 13, role: primaryCell }

  const draft: CaseDraft = {
    version: 1,
    mode,
    id: makeId('draft'),
    revision: 1,
    metadata,
    map: emptyMap(),
    nodes: [spawnNode],
    caseConfig: config,
    editorMeta: {
      source: 'manual',
      updatedAt: new Date().toISOString(),
    },
  }

  return Object.freeze(draft) as CaseDraft
}

export interface CaseParseOk {
  readonly ok: true
  readonly value: CaseDraft
}

export interface CaseParseError {
  readonly ok: false
  readonly error: string
}

export type CaseParseResult = CaseParseOk | CaseParseError

export function parseCaseDraft(input: unknown): CaseParseResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Input must be an object' }
  }

  const obj = input as Record<string, unknown>

  const extraKeys = Object.keys(obj).filter(k => !KNOWN_TOP_KEYS.has(k))
  if (extraKeys.length > 0) {
    return { ok: false, error: `Unknown keys: ${extraKeys.join(', ')}` }
  }

  if (obj.version !== 1) {
    return { ok: false, error: 'Unsupported version' }
  }

  if (typeof obj.mode !== 'string' || (obj.mode !== 'case' && obj.mode !== 'classic')) {
    return { ok: false, error: 'Invalid mode' }
  }

  const nodes: CaseNode[] | undefined = Array.isArray(obj.nodes) ? obj.nodes as CaseNode[] : undefined
  if (!nodes) {
    return { ok: false, error: 'nodes must be an array' }
  }

  const nodeIds = new Set<string>()
  for (const node of nodes) {
    if (typeof node.id !== 'string') {
      return { ok: false, error: 'Each node must have a string id' }
    }
    if (nodeIds.has(node.id)) {
      return { ok: false, error: `Duplicate node ID: ${node.id}` }
    }
    nodeIds.add(node.id)
  }

  const validated = { ...obj } as unknown as CaseDraft
  return { ok: true, value: Object.freeze(validated) as CaseDraft }
}
