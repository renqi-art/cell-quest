import type { CaseConfig, CaseSnapshot, CaseEvent, CaseResult } from '@/shared/types/case'

/** 内部可变状态 */
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

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0))
}

function normalizeConfig(config: CaseConfig): CaseConfig {
  if (!config || !config.vitals || !config.goals) {
    throw new TypeError('Invalid CaseConfig')
  }
  return {
    ...config,
    vitals: {
      oxygen: clamp(config.vitals.oxygen),
      infection: clamp(config.vitals.infection),
      tissue: clamp(config.vitals.tissue),
      oxygenDecayPerSecond: config.vitals.oxygenDecayPerSecond,
      infectionGrowthPerSecond: config.vitals.infectionGrowthPerSecond,
      tissueDecayPerSecond: config.vitals.tissueDecayPerSecond,
    },
  }
}

function checkGoalsMet(state: InternalState, config: CaseConfig): boolean {
  const g = config.goals
  // All oxygen route targets must be delivered
  let totalRequiredOxygen = 0
  for (const route of g.oxygenRoutes) {
    totalRequiredOxygen += route.requiredDeliveries
  }
  if (state.oxygenDeliveries < totalRequiredOxygen) return false

  // All infection nodes must be cleared
  if (state.infectionSitesCleared < g.infection.requiredClears) return false

  // Vitals must be within non-critical ranges
  if (state.oxygen < 40 || state.infection > 60 || state.tissue < 30) return false

  return true
}

function buildObjective(state: InternalState, config: CaseConfig): string {
  const parts: string[] = []

  let totalRequiredOxygen = 0
  for (const route of config.goals.oxygenRoutes) {
    totalRequiredOxygen += route.requiredDeliveries
  }
  if (state.oxygenDeliveries < totalRequiredOxygen) {
    parts.push(`供氧 ${state.oxygenDeliveries}/${totalRequiredOxygen}`)
  }

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

  dispatch(event: CaseEvent): boolean {
    if (this.state.status !== 'active') return false

    switch (event.type) {
      case 'oxygenDelivered': {
        this.state.oxygen = clamp(this.state.oxygen + event.amount)
        this.state.oxygenDeliveries += 1
        this.state.stableFor = 0 // reset stability on any event
        return true
      }
      case 'infectionCleared': {
        const dedupKey = `infectionCleared:${event.nodeId}`
        if (this.completedEvents.has(dedupKey)) return false
        this.completedEvents.add(dedupKey)

        this.state.infection = clamp(this.state.infection - event.amount)
        this.state.infectionSitesCleared += 1
        this.state.stableFor = 0
        return true
      }
      case 'playerDied': {
        this.state.oxygen = clamp(this.state.oxygen - 8)
        this.state.infection = clamp(this.state.infection + 6)
        this.state.tissue = clamp(this.state.tissue - 5)
        this.state.deaths += 1
        this.state.stableFor = 0
        if (this.state.tissue <= 0) {
          this.state.status = 'failed'
        }
        return true
      }
      default:
        return false
    }
  }

  update(dtSeconds: number): void {
    if (this.state.status !== 'active') return

    const dt = Math.max(0, dtSeconds)
    this.state.elapsedMs += dt * 1000

    // Oxygen decay: faster when infection is high
    const infectionFactor = 1 + this.state.infection / 100
    this.state.oxygen = clamp(
      this.state.oxygen - this.config.vitals.oxygenDecayPerSecond * infectionFactor * dt
    )

    // Infection growth
    this.state.infection = clamp(
      this.state.infection + this.config.vitals.infectionGrowthPerSecond * dt
    )

    // Tissue degradation when vitals are critical
    if (this.state.oxygen < 35 || this.state.infection > 70) {
      this.state.tissue = clamp(
        this.state.tissue - this.config.vitals.tissueDecayPerSecond * dt
      )
    }

    // Natural tissue regeneration when vitals are good
    if (this.state.oxygen >= 60 && this.state.infection <= 30 && this.state.tissue < 100) {
      this.state.tissue = clamp(this.state.tissue + 0.3 * dt)
    }

    // Check failure first
    if (this.state.tissue <= 0) {
      this.state.tissue = 0
      this.state.status = 'failed'
      return
    }

    this.evaluateStability(dt)
  }

  private evaluateStability(dt: number): void {
    if (checkGoalsMet(this.state, this.config)) {
      this.state.stableFor += dt
      if (this.state.stableFor >= this.config.goals.stabilitySeconds) {
        this.state.status = 'complete'
      }
    } else {
      this.state.stableFor = 0
    }
  }

  getSnapshot(): CaseSnapshot {
    return {
      status: this.state.status,
      vitals: {
        oxygen: this.state.oxygen,
        infection: this.state.infection,
        tissue: this.state.tissue,
      },
      progress: {
        oxygenDeliveries: this.state.oxygenDeliveries,
        infectionSitesCleared: this.state.infectionSitesCleared,
      },
      stableFor: this.state.stableFor,
      currentObjective: buildObjective(this.state, this.config),
      elapsedMs: this.state.elapsedMs,
    }
  }

  isComplete(): boolean {
    return this.state.status === 'complete'
  }

  isFailed(): boolean {
    return this.state.status === 'failed'
  }

  isActive(): boolean {
    return this.state.status === 'active'
  }

  buildResult(): CaseResult {
    return {
      status: this.state.status === 'complete' ? 'complete' : 'failed',
      vitals: {
        oxygen: this.state.oxygen,
        infection: this.state.infection,
        tissue: this.state.tissue,
      },
      progress: {
        oxygenDeliveries: this.state.oxygenDeliveries,
        infectionSitesCleared: this.state.infectionSitesCleared,
      },
      durationMs: this.state.elapsedMs,
      deaths: this.state.deaths,
      atpEfficiency: this.state.atpSpent > 0
        ? Math.round((this.state.oxygenDeliveries + this.state.infectionSitesCleared) / this.state.atpSpent * 100)
        : 100,
    }
  }
}
