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
