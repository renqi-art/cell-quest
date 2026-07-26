import type { PlayerActor } from '../actors/PlayerActor'
import type { ClassicItemState } from '@/shared/classic/simulation/ItemRules'
import type { ClassicRunStats } from '@/shared/classic/simulation/ClassicRunStats'
import type { CellType, HudSnapshot } from '@/shared/types/game'

export interface ClassicHudPlayer {
  readonly actor: PlayerActor
  readonly cellType: CellType
  readonly cellName: string
}

export class ClassicHudSystem {
  snapshot(
    players: readonly ClassicHudPlayer[],
    items: ClassicItemState,
    stats: ClassicRunStats,
  ): HudSnapshot {
    const run = stats.snapshot()
    return {
      players: players.map(({ actor, cellType, cellName }) => {
        const state = actor.snapshot()
        return {
          player: actor.playerIndex,
          health: state.health,
          maxHealth: state.maxHealth,
          cellType,
          cellName,
          shieldTicks: state.shieldTicks,
        }
      }),
      energy: items.energy,
      maxEnergy: items.maxEnergy,
      elapsedMs: run.elapsedMs,
      kills: run.kills,
      items: run.items,
      deaths: run.deaths,
      oxygenTicks: items.oxygenTicks,
      complementAmmo: items.complementAmmo,
      xp: items.xp,
      inventoryCount: items.inventory.length,
    }
  }
}
