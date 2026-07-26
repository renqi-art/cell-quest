export type CellType = 1 | 2 | 3
export type PlayerIndex = 1 | 2
export type PlayerAction =
  | 'left'
  | 'right'
  | 'jump'
  | 'down'
  | 'skill'
  | 'dash'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'skill4'

export type GameScreenState =
  | 'menu'
  | 'hub'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'dead'
  | 'complete'
  | 'error'

export interface LoadLevelOptions {
  readonly playerOneCell?: CellType
  readonly playerTwoCell?: CellType
  readonly twoPlayer: boolean
}

export type GameCommand =
  | { readonly type: 'input'; readonly player: PlayerIndex; readonly action: PlayerAction; readonly pressed: boolean }
  | { readonly type: 'select-cell'; readonly player: PlayerIndex; readonly cell: CellType }
  | { readonly type: 'close-tutorial' }
  | { readonly type: 'close-knowledge-card' }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }

export interface PlayerHudSnapshot {
  readonly player: PlayerIndex
  readonly health: number
  readonly maxHealth: number
  readonly cellType: CellType
  readonly cellName: string
  readonly shieldTicks?: number
}

export interface HudSnapshot {
  readonly players: readonly PlayerHudSnapshot[]
  readonly energy: number
  readonly maxEnergy: number
  readonly elapsedMs: number
  readonly kills: number
  readonly items: number
  readonly deaths?: number
  readonly oxygenTicks?: number
  readonly complementAmmo?: number
  readonly xp?: number
  readonly inventoryCount?: number
  readonly completionPercent?: number
}
