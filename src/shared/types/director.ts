import type { CaseVitals } from './case'

export type CrisisEventId = 'ACUTE_HYPOXIA' | 'INFECTION_REBOUND' | 'TRANSPORT_BLOCKAGE' | 'ATP_CRISIS'
export interface DirectorGoal {
  readonly oxygenDeliveries?: number
  readonly infectionSites?: number
  readonly timeLimitSeconds?: number
}
export interface DirectorPlan {
  readonly eventId: CrisisEventId
  readonly targetNode: string
  readonly severity: 1 | 2 | 3
  readonly goal: DirectorGoal
  readonly doctorLine: string
  readonly reason: string
}
export interface DirectorContext {
  readonly schemaVersion: 1
  readonly levelId: string
  readonly mode: 'single' | 'coop'
  readonly primaryCell: 'rbc' | 'wbc'
  readonly phase: 1 | 2
  readonly runId: string
  readonly vitals: Pick<CaseVitals, 'oxygen' | 'infection' | 'tissue'>
  readonly performance: { readonly deaths: number; readonly elapsedMs: number }
  readonly allowedEvents: readonly CrisisEventId[]
  readonly validTargetNodes: readonly string[]
}
export interface DirectorDecision {
  readonly source: 'ai' | 'local'
  readonly plan: DirectorPlan
}
export interface DirectorHistoryEntry extends DirectorDecision {
  readonly phase: 1 | 2
  readonly requestedAt: string
}
