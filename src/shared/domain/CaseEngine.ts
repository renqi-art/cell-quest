import type { CaseConfig, CaseEvent, CaseResult, CaseSnapshot } from '@/shared/types/case'
import type { DirectorPlan } from '@/shared/types/director'

interface InternalState {
  oxygen: number
  infection: number
  tissue: number
  oxygenDeliveries: number
  infectionSitesCleared: number
  stableFor: number
  elapsedMs: number
  status: 'active' | 'complete' | 'failed'
  deaths: number
  atpSpent: number
}
interface ActiveCrisis {
  readonly plan: DirectorPlan
  readonly source: 'ai' | 'local'
  readonly startOxygenDeliveries: number
  readonly startInfectionClears: number
  elapsedSeconds: number
  oxygenDecayMultiplier: number
  infectionGrowthMultiplier: number
  atpCostMultiplier: number
  blockedNodeId: string | null
  activeInfectionNodeId: string | null
}
export interface CrisisSnapshot {
  readonly eventId: DirectorPlan['eventId']
  readonly targetNode: string
  readonly severity: 1 | 2 | 3
  readonly source: 'ai' | 'local'
  readonly elapsedSeconds: number
  readonly atpCostMultiplier: number
  readonly blockedNodeId: string | null
  readonly activeInfectionNodeId: string | null
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
}
function normalizeConfig(config: CaseConfig): CaseConfig {
  if (!config?.vitals || !config.goals) throw new TypeError('Invalid CaseConfig')
  return {
    ...config,
    vitals: {
      ...config.vitals,
      oxygen: clamp(config.vitals.oxygen),
      infection: clamp(config.vitals.infection),
      tissue: clamp(config.vitals.tissue),
    },
  }
}
function totalRequiredOxygen(config: CaseConfig): number {
  return config.goals.oxygenRoutes.reduce((sum, route) => sum + route.requiredDeliveries, 0)
}
function goalsMet(state: InternalState, config: CaseConfig): boolean {
  return state.oxygenDeliveries >= totalRequiredOxygen(config)
    && state.infectionSitesCleared >= config.goals.infection.requiredClears
    && state.oxygen >= 40
    && state.infection <= 60
    && state.tissue >= 30
}
function objective(state: InternalState, config: CaseConfig): string {
  const parts: string[] = []
  const oxygenGoal = totalRequiredOxygen(config)
  if (state.oxygenDeliveries < oxygenGoal) parts.push(`供氧 ${state.oxygenDeliveries}/${oxygenGoal}`)
  if (state.infectionSitesCleared < config.goals.infection.requiredClears) {
    parts.push(`清除感染 ${state.infectionSitesCleared}/${config.goals.infection.requiredClears}`)
  }
  if (state.oxygen < 40) parts.push('提升氧供')
  if (state.infection > 60) parts.push('控制感染')
  if (state.tissue < 30) parts.push('保护组织')
  return parts.length > 0 ? parts.join(' · ') : `保持指标稳定 ${config.goals.stabilitySeconds}s`
}

export class CaseEngine {
  private readonly config: CaseConfig
  private readonly state: InternalState
  private readonly completedEvents = new Set<string>()
  private currentCrisis: ActiveCrisis | null = null

  constructor(config: CaseConfig) {
    this.config = normalizeConfig(config)
    this.state = {
      oxygen: this.config.vitals.oxygen,
      infection: this.config.vitals.infection,
      tissue: this.config.vitals.tissue,
      oxygenDeliveries: 0,
      infectionSitesCleared: 0,
      stableFor: 0,
      elapsedMs: 0,
      status: 'active',
      deaths: 0,
      atpSpent: 0,
    }
  }

  startCrisis(plan: DirectorPlan, source: 'ai' | 'local'): boolean {
    if (this.state.status !== 'active' || this.currentCrisis) return false
    if (!this.config.allowedEvents.includes(plan.eventId)) return false
    if (![1, 2, 3].includes(plan.severity) || !plan.targetNode) return false
    const severity = plan.severity
    this.currentCrisis = {
      plan: structuredClone(plan),
      source,
      startOxygenDeliveries: this.state.oxygenDeliveries,
      startInfectionClears: this.state.infectionSitesCleared,
      elapsedSeconds: 0,
      oxygenDecayMultiplier: plan.eventId === 'ACUTE_HYPOXIA' ? [1, 1.15, 1.3, 1.45][severity]! : 1,
      infectionGrowthMultiplier: plan.eventId === 'INFECTION_REBOUND' ? [1, 1.1, 1.2, 1.3][severity]! : 1,
      atpCostMultiplier: plan.eventId === 'ATP_CRISIS' ? [1, 1.1, 1.2, 1.3][severity]! : 1,
      blockedNodeId: plan.eventId === 'TRANSPORT_BLOCKAGE' ? plan.targetNode : null,
      activeInfectionNodeId: plan.eventId === 'INFECTION_REBOUND' ? plan.targetNode : null,
    }
    if (plan.eventId === 'INFECTION_REBOUND') {
      this.state.infection = clamp(this.state.infection + severity * 4)
    }
    this.state.stableFor = 0
    return true
  }

  completeCurrentCrisis(): boolean {
    if (!this.currentCrisis) return false
    this.currentCrisis = null
    return true
  }

  getCrisisSnapshot(): CrisisSnapshot | null {
    const crisis = this.currentCrisis
    if (!crisis) return null
    return {
      eventId: crisis.plan.eventId,
      targetNode: crisis.plan.targetNode,
      severity: crisis.plan.severity,
      source: crisis.source,
      elapsedSeconds: crisis.elapsedSeconds,
      atpCostMultiplier: crisis.atpCostMultiplier,
      blockedNodeId: crisis.blockedNodeId,
      activeInfectionNodeId: crisis.activeInfectionNodeId,
    }
  }

  dispatch(event: CaseEvent): boolean {
    if (this.state.status !== 'active') return false
    if (event.type === 'oxygenDelivered' && this.currentCrisis?.blockedNodeId === event.nodeId) return false

    switch (event.type) {
      case 'oxygenDelivered':
        this.state.oxygen = clamp(this.state.oxygen + event.amount)
        this.state.oxygenDeliveries += 1
        break
      case 'infectionCleared': {
        const key = 'infectionCleared:' + event.nodeId
        if (this.completedEvents.has(key)) return false
        this.completedEvents.add(key)
        this.state.infection = clamp(this.state.infection - event.amount)
        this.state.infectionSitesCleared += 1
        break
      }
      case 'playerDied':
        this.state.oxygen = clamp(this.state.oxygen - 8)
        this.state.infection = clamp(this.state.infection + 6)
        this.state.tissue = clamp(this.state.tissue - 5)
        this.state.deaths += 1
        if (this.state.tissue <= 0) this.state.status = 'failed'
        break
      default:
        return false
    }
    this.state.stableFor = 0
    this.evaluateCrisisGoal()
    return true
  }

  update(dtSeconds: number): void {
    if (this.state.status !== 'active') return
    const dt = Math.max(0, dtSeconds)
    this.state.elapsedMs += dt * 1000
    if (this.currentCrisis) {
      this.currentCrisis.elapsedSeconds += dt
      const timeLimit = this.currentCrisis.plan.goal.timeLimitSeconds
      if (timeLimit && this.currentCrisis.elapsedSeconds >= timeLimit) {
        this.state.tissue = clamp(this.state.tissue - this.currentCrisis.plan.severity * 5)
        this.completeCurrentCrisis()
      }
    }
    const oxygenMultiplier = this.currentCrisis?.oxygenDecayMultiplier ?? 1
    const infectionMultiplier = this.currentCrisis?.infectionGrowthMultiplier ?? 1
    const infectionFactor = 1 + this.state.infection / 100
    this.state.oxygen = clamp(this.state.oxygen - this.config.vitals.oxygenDecayPerSecond * infectionFactor * oxygenMultiplier * dt)
    this.state.infection = clamp(this.state.infection + this.config.vitals.infectionGrowthPerSecond * infectionMultiplier * dt)
    if (this.state.oxygen < 35 || this.state.infection > 70) {
      this.state.tissue = clamp(this.state.tissue - this.config.vitals.tissueDecayPerSecond * dt)
    }
    if (this.state.oxygen >= 60 && this.state.infection <= 30 && this.state.tissue < 100) {
      this.state.tissue = clamp(this.state.tissue + 0.3 * dt)
    }
    if (this.state.tissue <= 0) {
      this.state.tissue = 0
      this.state.status = 'failed'
      return
    }
    if (goalsMet(this.state, this.config)) {
      this.state.stableFor += dt
      if (this.state.stableFor >= this.config.goals.stabilitySeconds) this.state.status = 'complete'
    } else {
      this.state.stableFor = 0
    }
  }

  private evaluateCrisisGoal(): void {
    const crisis = this.currentCrisis
    if (!crisis) return
    const goal = crisis.plan.goal
    const oxygenProgress = this.state.oxygenDeliveries - crisis.startOxygenDeliveries
    const infectionProgress = this.state.infectionSitesCleared - crisis.startInfectionClears
    const hasProgressGoal = goal.oxygenDeliveries !== undefined || goal.infectionSites !== undefined
    const oxygenMet = goal.oxygenDeliveries === undefined || oxygenProgress >= goal.oxygenDeliveries
    const infectionMet = goal.infectionSites === undefined || infectionProgress >= goal.infectionSites
    if (hasProgressGoal && oxygenMet && infectionMet) this.completeCurrentCrisis()
  }

  getSnapshot(): CaseSnapshot {
    return {
      status: this.state.status,
      vitals: { oxygen: this.state.oxygen, infection: this.state.infection, tissue: this.state.tissue },
      progress: { oxygenDeliveries: this.state.oxygenDeliveries, infectionSitesCleared: this.state.infectionSitesCleared },
      stableFor: this.state.stableFor,
      currentObjective: objective(this.state, this.config),
      elapsedMs: this.state.elapsedMs,
    }
  }
  isComplete(): boolean { return this.state.status === 'complete' }
  isFailed(): boolean { return this.state.status === 'failed' }
  isActive(): boolean { return this.state.status === 'active' }

  buildResult(): CaseResult {
    return {
      status: this.state.status === 'complete' ? 'complete' : 'failed',
      vitals: { oxygen: this.state.oxygen, infection: this.state.infection, tissue: this.state.tissue },
      progress: { oxygenDeliveries: this.state.oxygenDeliveries, infectionSitesCleared: this.state.infectionSitesCleared },
      durationMs: this.state.elapsedMs,
      deaths: this.state.deaths,
      atpEfficiency: this.state.atpSpent > 0
        ? Math.round((this.state.oxygenDeliveries + this.state.infectionSitesCleared) / this.state.atpSpent * 100)
        : 100,
    }
  }
}
