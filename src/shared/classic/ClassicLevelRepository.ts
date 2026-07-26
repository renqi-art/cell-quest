import { decodeLegacyCQCode } from '@/shared/services/CaseCodec'
import { parseClassicLevel } from './parseClassicLevel'
import type {
  ClassicCellType,
  ClassicEnemyKind,
  ClassicFloatingPlatformDefinition,
  ClassicKnowledgeCardDefinition,
  ClassicLevelDefinition,
  ClassicLevelIssue,
  ClassicPipeSpawnerDefinition,
  ClassicTutorialDefinition,
  ClassicWinCondition,
  ParsedClassicLevel,
} from './types'

export class ClassicLevelValidationError extends Error {
  constructor(
    readonly levelId: string,
    readonly issues: readonly ClassicLevelIssue[],
  ) {
    super(`Classic level ${levelId} is invalid: ${issues.map(issue => issue.message).join('; ')}`)
    this.name = 'ClassicLevelValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeCellType(value: unknown): ClassicCellType {
  return value === 1 || value === 2 || value === 3 ? value : 3
}

function normalizeWinCondition(value: unknown): ClassicWinCondition {
  if (value === undefined || value === null || value === 'collectAll' || value === 'collect-all') return 'collect-all'
  if (value === 'killAll' || value === 'kill-all') return 'kill-all'
  if (value === 'reachFinish' || value === 'reach-finish') return 'reach-finish'
  throw new Error(`Legacy classic level has unsupported win condition ${JSON.stringify(value)}`)
}

function normalizeSky(value: unknown): readonly [string, string] {
  if (Array.isArray(value) && value.length === 2 && value.every(entry => typeof entry === 'string')) {
    return [value[0] as string, value[1] as string]
  }
  return ['#3d1a2e', '#7a2a3e']
}

function normalizeMap(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return value.filter((row): row is string => typeof row === 'string')
}

function normalizeFloatingPlatforms(value: unknown): readonly ClassicFloatingPlatformDefinition[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const { x, y, range, speed, phase } = entry
    if (![x, y, range, speed].every(Number.isFinite)) return []
    return [{
      x: x as number,
      y: y as number,
      range: range as number,
      speed: speed as number,
      ...(Number.isFinite(phase) ? { phase: phase as number } : {}),
    }]
  })
}

function normalizeEnemyKind(value: unknown): ClassicEnemyKind | undefined {
  if (value === 'staph') return 'staph'
  if (value === 'staphLarge' || value === 'staph-large') return 'staph-large'
  if (value === 'strep') return 'strep'
  return undefined
}

function normalizePipeSpawners(value: unknown): readonly ClassicPipeSpawnerDefinition[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !Number.isInteger(entry.col) || !Number.isInteger(entry.row)) return []
    if (entry.trigger !== 'contact' && entry.trigger !== 'proximity' && entry.trigger !== 'timer') return []
    const direction = entry.direction === 'up-jump' || entry.dir === 'up_jump'
      ? 'up-jump'
      : entry.direction === 'up' || entry.dir === 'up'
        ? 'up'
        : undefined
    const enemy = normalizeEnemyKind(entry.enemy ?? entry.type)
    return [{
      col: entry.col as number,
      row: entry.row as number,
      trigger: entry.trigger,
      ...(direction ? { direction } : {}),
      ...(Number.isFinite(entry.range) ? { range: entry.range as number } : {}),
      ...(enemy ? { enemy } : {}),
      ...(Number.isInteger(entry.intervalTicks ?? entry.interval)
        ? { intervalTicks: (entry.intervalTicks ?? entry.interval) as number }
        : {}),
      ...(Number.isInteger(entry.maxSpawn) ? { maxSpawn: entry.maxSpawn as number } : {}),
    }]
  })
}

function normalizeTutorials(value: unknown): readonly ClassicTutorialDefinition[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !Number.isFinite(entry.x)) return []
    const body = typeof entry.body === 'string' ? entry.body : undefined
    const text = typeof entry.text === 'string' ? entry.text : undefined
    if (!body && !text) return []
    return [{
      x: entry.x as number,
      ...(typeof entry.key === 'string' ? { key: entry.key } : {}),
      ...(typeof entry.title === 'string' ? { title: entry.title } : {}),
      ...(text ? { text } : {}),
      ...(body ? { body } : {}),
      ...(typeof entry.useCurrent === 'boolean' ? { useCurrent: entry.useCurrent } : {}),
    }]
  })
}

function normalizeKnowledgeCards(value: unknown): readonly ClassicKnowledgeCardDefinition[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (
      !isRecord(entry)
      || !Number.isFinite(entry.x)
      || typeof entry.key !== 'string'
      || typeof entry.title !== 'string'
      || typeof entry.text !== 'string'
    ) return []
    return [{
      x: entry.x as number,
      key: entry.key,
      title: entry.title,
      text: entry.text,
    }]
  })
}

export function normalizeLegacyClassicLevel(input: unknown, id: string): ClassicLevelDefinition {
  const value = isRecord(input) ? input : {}
  const map = normalizeMap(value.map)
  const inferredWidth = map.reduce((width, row) => Math.max(width, row.length), 0)
  const width = Number.isInteger(value.width) && (value.width as number) > 0
    ? value.width as number
    : inferredWidth
  return {
    id,
    name: typeof value.name === 'string' && value.name.trim() ? value.name : `自定义关卡 ${id}`,
    width,
    cellType: normalizeCellType(value.cellType),
    winCondition: normalizeWinCondition(value.winCondition),
    sky: normalizeSky(value.sky),
    map,
    floatPlatforms: normalizeFloatingPlatforms(value.floatPlatforms),
    pipeSpawners: normalizePipeSpawners(value.pipeSpawners),
    tutorials: normalizeTutorials(value.tutorials),
    knowledgeCards: normalizeKnowledgeCards(value.knowledgeCards),
  }
}

export class ClassicLevelRepository {
  constructor(
    private readonly builtIns: readonly ClassicLevelDefinition[],
    private readonly customSource: () => readonly unknown[] = () => [],
  ) {}

  get(levelId: string): ParsedClassicLevel {
    const builtIn = this.builtIns.find(level => level.id === levelId)
    if (builtIn) return this.parse(levelId, builtIn)

    const customMatch = /^(?:[7-9]|[1-9]\d+)$/.exec(levelId)
    if (customMatch) {
      const custom = this.customSource()[Number(levelId) - 7]
      if (custom !== undefined) return this.parse(levelId, normalizeLegacyClassicLevel(custom, levelId))
    }
    throw new Error(`Classic level ${levelId} was not found`)
  }

  importLegacyShareCode(code: string): ParsedClassicLevel {
    const decoded = decodeLegacyCQCode(code)
    if (!decoded.ok) throw new Error(decoded.error)
    return this.parse('legacy-share', normalizeLegacyClassicLevel(decoded.value, 'legacy-share'))
  }

  private parse(levelId: string, definition: ClassicLevelDefinition): ParsedClassicLevel {
    const result = parseClassicLevel(definition)
    if (!result.ok) throw new ClassicLevelValidationError(levelId, result.errors)
    return result.value
  }
}
