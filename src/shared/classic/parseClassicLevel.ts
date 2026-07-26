import {
  CLASSIC_ENEMY_CHARACTERS,
  CLASSIC_ENTITY_CHARACTERS,
  CLASSIC_ITEM_CHARACTERS,
  isClassicTileCharacter,
} from './tiles'
import type {
  ClassicEnemyKind,
  ClassicEnemySpawn,
  ClassicGridPosition,
  ClassicItemKind,
  ClassicItemSpawn,
  ClassicLevelDefinition,
  ClassicLevelIssue,
  ClassicQuestionBlockSpawn,
  ParseClassicLevelResult,
} from './types'

const EMPTY_TILE = ' '

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readDefinition(input: unknown): ClassicLevelDefinition | null {
  if (!isRecord(input)) return null
  if (typeof input.id !== 'string' || typeof input.name !== 'string') return null
  if (!Number.isInteger(input.width) || (input.width as number) <= 0) return null
  if (input.cellType !== 1 && input.cellType !== 2 && input.cellType !== 3) return null
  if (input.winCondition !== 'collect-all' && input.winCondition !== 'kill-all' && input.winCondition !== 'reach-finish') return null
  if (!Array.isArray(input.sky) || input.sky.length !== 2 || input.sky.some(value => typeof value !== 'string')) return null
  if (!Array.isArray(input.map) || input.map.some(row => typeof row !== 'string')) return null
  return input as unknown as ClassicLevelDefinition
}

function issue(
  code: ClassicLevelIssue['code'],
  message: string,
  position?: ClassicGridPosition,
): ClassicLevelIssue {
  return position ? { code, message, ...position } : { code, message }
}

function lookupCharacter<T>(registry: Readonly<Record<string, T>>, character: string): T | undefined {
  return Object.hasOwn(registry, character) ? registry[character] : undefined
}

export function parseClassicLevel(input: unknown): ParseClassicLevelResult {
  const definition = readDefinition(input)
  if (!definition) {
    return {
      ok: false,
      errors: [issue('invalid-level', 'Classic level must contain typed id, name, width, cellType, winCondition, sky, and map fields')],
    }
  }
  if (definition.map.length === 0) {
    return { ok: false, errors: [issue('invalid-map', 'Classic level map must contain at least one row')] }
  }

  const warnings: ClassicLevelIssue[] = []
  const errors: ClassicLevelIssue[] = []
  const tiles: string[][] = []
  const enemies: ClassicEnemySpawn[] = []
  const items: ClassicItemSpawn[] = []
  const checkpoints: ClassicGridPosition[] = []
  const bosses: ClassicGridPosition[] = []
  const npcs: ClassicGridPosition[] = []
  const questionBlocks: ClassicQuestionBlockSpawn[] = []
  const playerSpawns: ClassicGridPosition[] = []
  const finishes: ClassicGridPosition[] = []

  definition.map.forEach((sourceRow, row) => {
    const normalizedRow = sourceRow.padEnd(definition.width, EMPTY_TILE).slice(0, definition.width)
    const parsedRow: string[] = []
    Array.from(normalizedRow).forEach((character, col) => {
      const position = { col, row }
      if (isClassicTileCharacter(character)) {
        parsedRow.push(character)
        return
      }

      const enemyKind = lookupCharacter<ClassicEnemyKind>(CLASSIC_ENEMY_CHARACTERS, character)
      if (enemyKind) enemies.push({ kind: enemyKind, ...position })
      const itemKind = lookupCharacter<ClassicItemKind>(CLASSIC_ITEM_CHARACTERS, character)
      if (itemKind) items.push({ kind: itemKind, ...position })

      switch (character) {
        case 'P':
          playerSpawns.push(position)
          break
        case 'C':
          checkpoints.push(position)
          break
        case 'F':
        case '>':
          finishes.push(position)
          break
        case 'b':
          bosses.push(position)
          break
        case 'N':
          npcs.push(position)
          break
        case '?':
          questionBlocks.push({ ...position, hidden: false })
          break
        case 'X':
          questionBlocks.push({ ...position, hidden: true })
          break
        default:
          if (!CLASSIC_ENTITY_CHARACTERS.has(character)) {
            warnings.push(issue('unknown-character', `Unknown classic map character ${JSON.stringify(character)} was replaced with empty space`, position))
          }
      }
      parsedRow.push(EMPTY_TILE)
    })
    tiles.push(parsedRow)
  })

  if (playerSpawns.length === 0) errors.push(issue('missing-player-spawn', 'Classic level requires exactly one player spawn'))
  if (playerSpawns.length > 1) errors.push(issue('duplicate-player-spawn', 'Classic level contains more than one player spawn'))
  if (finishes.length === 0 && definition.winCondition === 'reach-finish') errors.push(issue('missing-finish', 'A reach-finish classic level requires exactly one finish'))
  if (finishes.length > 1) errors.push(issue('duplicate-finish', 'Classic level contains more than one finish'))
  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      definition,
      tiles,
      playerSpawn: playerSpawns[0]!,
      finish: finishes[0] ?? null,
      enemies,
      items,
      checkpoints,
      bosses,
      npcs,
      questionBlocks,
    },
    warnings,
  }
}
