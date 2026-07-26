export interface ClassicRunStatsOptions {
  readonly totalEnemies: number
  readonly totalItems: number
}

export type ClassicRunEvent =
  | { readonly type: 'tick'; readonly elapsedMs: number }
  | { readonly type: 'kill'; readonly count?: number }
  | { readonly type: 'item'; readonly count?: number }
  | { readonly type: 'death'; readonly count?: number }

export interface ClassicRunStatsSnapshot {
  readonly elapsedMs: number
  readonly kills: number
  readonly items: number
  readonly deaths: number
  readonly totalEnemies: number
  readonly totalItems: number
}

export interface ClassicRunResult extends ClassicRunStatsSnapshot {
  readonly completionPercent: number
  readonly stars: 1 | 2 | 3
  readonly perfect: boolean
}

export class ClassicRunStats {
  constructor(
    private readonly options: ClassicRunStatsOptions,
    private readonly values: Pick<ClassicRunStatsSnapshot, 'elapsedMs' | 'kills' | 'items' | 'deaths'> = {
      elapsedMs: 0,
      kills: 0,
      items: 0,
      deaths: 0,
    },
  ) {}

  record(event: ClassicRunEvent): ClassicRunStats {
    const count = event.type === 'tick' ? 0 : Math.max(0, event.count ?? 1)
    const values = { ...this.values }
    if (event.type === 'tick') values.elapsedMs += Math.max(0, event.elapsedMs)
    if (event.type === 'kill') values.kills += count
    if (event.type === 'item') values.items += count
    if (event.type === 'death') values.deaths += count
    return new ClassicRunStats(this.options, values)
  }

  snapshot(): ClassicRunStatsSnapshot {
    return {
      ...this.values,
      totalEnemies: this.options.totalEnemies,
      totalItems: this.options.totalItems,
    }
  }

  result(): ClassicRunResult {
    const snapshot = this.snapshot()
    const killRatio = ratio(snapshot.kills, snapshot.totalEnemies)
    const itemRatio = ratio(snapshot.items, snapshot.totalItems)
    const completionPercent = Math.round(((killRatio + itemRatio) / 2) * 100)
    let stars: 1 | 2 | 3 = 1
    if (killRatio >= 0.6 && itemRatio >= 0.6) stars = 2
    if (killRatio >= 1 && itemRatio >= 1 && snapshot.deaths === 0) stars = 3
    return {
      ...snapshot,
      completionPercent,
      stars,
      perfect: completionPercent >= 100 && snapshot.deaths === 0,
    }
  }
}

function ratio(value: number, total: number): number {
  return total > 0 ? Math.min(1, value / total) : 1
}
