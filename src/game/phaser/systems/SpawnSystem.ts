import type {
  ClassicEnemyKind,
  ClassicPipeSpawnerDefinition,
  ParsedClassicLevel,
} from '@/shared/classic/types'
import { PipeSpawnerState } from '@/shared/classic/simulation/PipeSpawnerState'
import { CLASSIC_TILE_SIZE } from '../config/classic-physics'

interface SpawnRuntime {
  readonly definition: ClassicPipeSpawnerDefinition
  readonly state: PipeSpawnerState
}

export interface SpawnPlayerPosition {
  readonly x: number
  readonly y: number
}

export interface ClassicEnemySpawnRequest {
  readonly kind: ClassicEnemyKind
  readonly col: number
  readonly row: number
}

export interface ClassicWorldPlan {
  readonly enemyCount: number
  readonly itemCount: number
  readonly bossCount: number
  readonly npcCount: number
  readonly questionBlockCount: number
  readonly pipeSpawnerCount: number
}

export function buildClassicWorldPlan(level: ParsedClassicLevel): ClassicWorldPlan {
  return {
    enemyCount: level.enemies.length,
    itemCount: level.items.length,
    bossCount: level.bosses.length,
    npcCount: level.npcs.length,
    questionBlockCount: level.questionBlocks.length,
    pipeSpawnerCount: level.definition.pipeSpawners?.length ?? 0,
  }
}

export class SpawnSystem {
  private readonly runtimes: SpawnRuntime[]

  constructor(definitions: readonly ClassicPipeSpawnerDefinition[]) {
    this.runtimes = definitions.map(definition => ({
      definition,
      state: new PipeSpawnerState({
        trigger: definition.trigger,
        intervalTicks: definition.intervalTicks ?? 180,
        maxSpawn: definition.maxSpawn ?? 3,
      }),
    }))
  }

  step(
    players: readonly SpawnPlayerPosition[],
    _activeEnemyCount: number,
  ): readonly ClassicEnemySpawnRequest[] {
    const requests: ClassicEnemySpawnRequest[] = []
    for (const runtime of this.runtimes) {
      const x = runtime.definition.col * CLASSIC_TILE_SIZE
      const y = runtime.definition.row * CLASSIC_TILE_SIZE
      const range = runtime.definition.trigger === 'contact'
        ? CLASSIC_TILE_SIZE
        : runtime.definition.range ?? 160
      const triggered = players.some(player =>
        Math.abs(player.x - x) <= range && Math.abs(player.y - y) <= Math.max(64, range),
      )
      const decision = runtime.state.step(triggered, 0)
      if (decision.spawn) {
        requests.push({
          kind: runtime.definition.enemy ?? 'staph',
          col: runtime.definition.col,
          row: runtime.definition.row,
        })
      }
    }
    return requests
  }
}
