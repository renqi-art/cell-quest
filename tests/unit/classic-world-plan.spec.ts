import { describe, expect, it } from 'vitest'
import { ClassicLevelRepository } from '@/shared/classic/ClassicLevelRepository'
import { OFFICIAL_CLASSIC_LEVELS } from '@/shared/classic/levels/officialLevels'
import { buildClassicWorldPlan } from '@/game/phaser/systems/SpawnSystem'

describe('official classic world plans', () => {
  it('consumes every parsed descriptor in all six official levels', () => {
    const repository = new ClassicLevelRepository(OFFICIAL_CLASSIC_LEVELS)
    for (const definition of OFFICIAL_CLASSIC_LEVELS) {
      const level = repository.get(definition.id)
      expect(buildClassicWorldPlan(level)).toEqual({
        enemyCount: level.enemies.length,
        itemCount: level.items.length,
        bossCount: level.bosses.length,
        npcCount: level.npcs.length,
        questionBlockCount: level.questionBlocks.length,
        pipeSpawnerCount: level.definition.pipeSpawners?.length ?? 0,
      })
    }
  })
})
