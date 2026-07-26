export type ClassicCellType = 1 | 2 | 3
export type ClassicWinCondition = 'collect-all' | 'kill-all' | 'reach-finish'
export type ClassicEnemyKind = 'staph' | 'staph-large' | 'strep'
export type ClassicItemKind =
  | 'shield'
  | 'oxygen'
  | 'complement'
  | 'coin'
  | 'food'
  | 'drink'
  | 'nutrition'
  | 'atp'
  | 'memory'

export interface ClassicFloatingPlatformDefinition {
  readonly x: number
  readonly y: number
  readonly range: number
  readonly speed: number
  readonly phase?: number
}

export interface ClassicPipeSpawnerDefinition {
  readonly col: number
  readonly row: number
  readonly direction?: 'up' | 'up-jump'
  readonly trigger: 'contact' | 'proximity' | 'timer'
  readonly range?: number
  readonly enemy?: ClassicEnemyKind
  readonly intervalTicks?: number
  readonly maxSpawn?: number
}

export interface ClassicTutorialDefinition {
  readonly x: number
  readonly key?: string
  readonly title: string
  readonly text: string
}

export interface ClassicKnowledgeCardDefinition {
  readonly x: number
  readonly key: string
  readonly title: string
  readonly text: string
}

export interface ClassicLevelDefinition {
  readonly id: string
  readonly name: string
  readonly width: number
  readonly cellType: ClassicCellType
  readonly winCondition: ClassicWinCondition
  readonly sky: readonly [string, string]
  readonly map: readonly string[]
  readonly floatPlatforms?: readonly ClassicFloatingPlatformDefinition[]
  readonly pipeSpawners?: readonly ClassicPipeSpawnerDefinition[]
  readonly tutorials?: readonly ClassicTutorialDefinition[]
  readonly knowledgeCards?: readonly ClassicKnowledgeCardDefinition[]
}

export interface ClassicGridPosition {
  readonly col: number
  readonly row: number
}

export interface ClassicEnemySpawn extends ClassicGridPosition {
  readonly kind: ClassicEnemyKind
}

export interface ClassicItemSpawn extends ClassicGridPosition {
  readonly kind: ClassicItemKind
}

export interface ClassicQuestionBlockSpawn extends ClassicGridPosition {
  readonly hidden: boolean
}

export interface ParsedClassicLevel {
  readonly definition: ClassicLevelDefinition
  readonly tiles: readonly (readonly string[])[]
  readonly playerSpawn: ClassicGridPosition
  readonly finish: ClassicGridPosition
  readonly enemies: readonly ClassicEnemySpawn[]
  readonly items: readonly ClassicItemSpawn[]
  readonly checkpoints: readonly ClassicGridPosition[]
  readonly bosses: readonly ClassicGridPosition[]
  readonly npcs: readonly ClassicGridPosition[]
  readonly questionBlocks: readonly ClassicQuestionBlockSpawn[]
}

export interface ClassicLevelIssue {
  readonly code:
    | 'invalid-level'
    | 'invalid-map'
    | 'invalid-width'
    | 'unknown-character'
    | 'missing-player-spawn'
    | 'duplicate-player-spawn'
    | 'missing-finish'
    | 'duplicate-finish'
  readonly message: string
  readonly col?: number
  readonly row?: number
}

export type ParseClassicLevelResult =
  | {
      readonly ok: true
      readonly value: ParsedClassicLevel
      readonly warnings: readonly ClassicLevelIssue[]
    }
  | {
      readonly ok: false
      readonly errors: readonly ClassicLevelIssue[]
    }
