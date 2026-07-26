import { describe, expect, it } from 'vitest'
import { ClassicLevelRepository } from '@/shared/classic/ClassicLevelRepository'
import { OFFICIAL_CLASSIC_LEVELS } from '@/shared/classic/levels/officialLevels'
import expectedSummaries from '../fixtures/classic/official-level-summaries.json'

const LEGACY_CQ_CODE = 'CQ!eyJuYW1lIjoi5pen6Ieq5a6a5LmJIiwid2lkdGgiOjUsImNlbGxUeXBlIjozLCJ3aW5Db25kaXRpb24iOiJjb2xsZWN0QWxsIiwic2t5IjpbIiMxMTEiLCIjMjIyIl0sIm1hcCI6WyJQIG8gRiIsIiMjIyMjIl0sImZsb2F0UGxhdGZvcm1zIjpbXSwicGlwZVNwYXduZXJzIjpbXSwidHV0b3JpYWxzIjpbXSwia25vd2xlZGdlQ2FyZHMiOltdfQ'

function summarize(repository: ClassicLevelRepository, id: string) {
  const parsed = repository.get(id)
  return {
    id: parsed.definition.id,
    name: parsed.definition.name,
    width: parsed.definition.width,
    rows: parsed.tiles.length,
    cellType: parsed.definition.cellType,
    winCondition: parsed.definition.winCondition,
    enemies: parsed.enemies.length,
    bosses: parsed.bosses.length,
    items: parsed.items.length,
    checkpoints: parsed.checkpoints.length,
    questionBlocks: parsed.questionBlocks.length,
    npcs: parsed.npcs.length,
    pipeSpawners: parsed.definition.pipeSpawners?.length ?? 0,
    finish: parsed.finish !== null,
  }
}

describe('ClassicLevelRepository', () => {
  it('loads all six official levels with frozen legacy content summaries', () => {
    const repository = new ClassicLevelRepository(OFFICIAL_CLASSIC_LEVELS)

    expect(expectedSummaries.map(expected => summarize(repository, expected.id))).toEqual(expectedSummaries)
  })

  it('normalizes a legacy custom level without changing its map or add-on arrays', () => {
    const legacy = {
      name: '本地旧关卡',
      width: 5,
      cellType: 3,
      winCondition: 'collectAll',
      sky: ['#111', '#222'],
      map: ['P o F', '#####'],
      floatPlatforms: [{ x: 32, y: 64, range: 16, speed: 0.02, phase: 1 }],
      pipeSpawners: [{ col: 2, row: 0, dir: 'up_jump', trigger: 'proximity', range: 3 }],
      tutorials: [],
      knowledgeCards: [],
    }
    const repository = new ClassicLevelRepository(OFFICIAL_CLASSIC_LEVELS, () => [legacy])

    const parsed = repository.get('7')
    expect(parsed.definition).toEqual(expect.objectContaining({
      id: '7',
      name: '本地旧关卡',
      winCondition: 'collect-all',
      map: legacy.map,
      floatPlatforms: legacy.floatPlatforms,
    }))
    expect(parsed.definition.pipeSpawners).toEqual([
      expect.objectContaining({ direction: 'up-jump', trigger: 'proximity', range: 3 }),
    ])
  })

  it('imports a fixed CQ! sample through the same safe parser', () => {
    const repository = new ClassicLevelRepository(OFFICIAL_CLASSIC_LEVELS)

    const parsed = repository.importLegacyShareCode(LEGACY_CQ_CODE)
    expect(parsed.definition).toEqual(expect.objectContaining({
      name: '旧自定义',
      width: 5,
      cellType: 3,
      winCondition: 'collect-all',
      map: ['P o F', '#####'],
    }))
    expect(parsed.items).toEqual([{ kind: 'coin', col: 2, row: 0 }])
  })

  it('rejects ambiguous and unknown ids instead of guessing a menu offset', () => {
    const repository = new ClassicLevelRepository(OFFICIAL_CLASSIC_LEVELS)

    expect(() => repository.get('6')).toThrow('Classic level 6 was not found')
    expect(() => repository.get('01')).toThrow('Classic level 01 was not found')
  })

  it('rejects an unsupported legacy win condition instead of changing its meaning', () => {
    const repository = new ClassicLevelRepository(OFFICIAL_CLASSIC_LEVELS, () => [{
      name: 'invalid legacy level',
      width: 5,
      cellType: 3,
      winCondition: 'runArbitraryRule',
      sky: ['#111', '#222'],
      map: ['P   F', '#####'],
    }])

    expect(() => repository.get('7')).toThrow('unsupported win condition')
  })
})
