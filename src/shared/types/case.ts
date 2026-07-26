export type CaseMode = 'case' | 'classic'
export type PrimaryCell = 'rbc' | 'wbc' | 'coop'
export type DraftSource = 'manual' | 'template' | 'ai' | 'import'

export type CaseNode =
  | { readonly kind: 'spawn'; readonly id: string; readonly x: number; readonly y: number; readonly role: PrimaryCell }
  | { readonly kind: 'oxygen-source'; readonly id: string; readonly x: number; readonly y: number; readonly capacity: number }
  | { readonly kind: 'target-tissue'; readonly id: string; readonly x: number; readonly y: number; readonly requiredOxygen: number }
  | { readonly kind: 'infection-site'; readonly id: string; readonly x: number; readonly y: number; readonly severity: 1 | 2 | 3 }
  | { readonly kind: 'checkpoint'; readonly id: string; readonly x: number; readonly y: number }
  | { readonly kind: 'knowledge'; readonly id: string; readonly x: number; readonly y: number; readonly sourceId: string }

export interface CaseVitals {
  readonly oxygen: number
  readonly infection: number
  readonly tissue: number
  readonly oxygenDecayPerSecond: number
  readonly infectionGrowthPerSecond: number
  readonly tissueDecayPerSecond: number
}

export interface OxygenRoute {
  readonly id: string
  readonly sourceId: string
  readonly targetIds: readonly string[]
  readonly requiredDeliveries: number
}

export interface InfectionGoal {
  readonly nodeIds: readonly string[]
  readonly requiredClears: number
}

export interface CaseGoals {
  readonly oxygenRoutes: readonly OxygenRoute[]
  readonly infection: InfectionGoal
  readonly stabilitySeconds: number
}

export interface CaseConfig {
  readonly version: 1
  readonly primaryCell: PrimaryCell
  readonly allyMode: 'scripted' | 'second-player'
  readonly vitals: CaseVitals
  readonly goals: CaseGoals
  readonly allowedEvents: readonly ('ACUTE_HYPOXIA' | 'INFECTION_REBOUND' | 'TRANSPORT_BLOCKAGE' | 'ATP_CRISIS')[]
  readonly briefing: { readonly start: string; readonly success: string; readonly failure: string }
  readonly education: { readonly topic: string; readonly sourceIds: readonly string[] }
}

export interface CaseMetadata {
  readonly title: string
  readonly author: string
  readonly difficulty: 'assist' | 'standard' | 'challenge'
  readonly tags: readonly string[]
  readonly icon: string
}

/** 不可变的病例快照，由 CaseEngine.getSnapshot() 产出，Vue HUD 只读 */
export interface CaseSnapshot {
  readonly status: 'active' | 'complete' | 'failed'
  readonly vitals: {
    readonly oxygen: number
    readonly infection: number
    readonly tissue: number
  }
  readonly progress: {
    readonly oxygenDeliveries: number
    readonly infectionSitesCleared: number
  }
  readonly stableFor: number
  readonly currentObjective: string
  readonly elapsedMs: number
}

/** 病例事件载荷，从运行时送入 CaseEngine.dispatch() */
export type CaseEvent =
  | { readonly type: 'oxygenDelivered'; readonly amount: number; readonly nodeId: string; readonly source?: 'ally' | 'player' }
  | { readonly type: 'infectionCleared'; readonly amount: number; readonly nodeId: string; readonly source?: 'ally' | 'player' }
  | { readonly type: 'playerDied'; readonly playerIndex: 1 | 2 }

/** 病例结束时的完整报告 */
export interface CaseResult {
  readonly status: 'complete' | 'failed'
  readonly vitals: { readonly oxygen: number; readonly infection: number; readonly tissue: number }
  readonly progress: { readonly oxygenDeliveries: number; readonly infectionSitesCleared: number }
  readonly durationMs: number
  readonly deaths: number
  readonly atpEfficiency: number
}
