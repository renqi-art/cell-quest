import type { ClassicPipeSpawnerDefinition } from '../types'

export interface PipeSpawnerOptions {
  readonly trigger: ClassicPipeSpawnerDefinition['trigger']
  readonly intervalTicks: number
  readonly maxSpawn: number
}

export interface PipeSpawnDecision {
  readonly state: PipeSpawnerState
  readonly spawn: boolean
}

export class PipeSpawnerState {
  private cooldownTicks = 0
  private timerTicks = 0
  private spawned = 0

  constructor(private readonly options: PipeSpawnerOptions) {}

  step(triggered: boolean, activeCount: number): PipeSpawnDecision {
    if (this.cooldownTicks > 0) {
      this.cooldownTicks -= 1
      return { state: this, spawn: false }
    }
    if (this.options.trigger === 'timer') this.timerTicks += 1
    const triggerReady = this.options.trigger === 'timer'
      ? this.timerTicks >= this.options.intervalTicks
      : triggered
    const atLimit = activeCount >= this.options.maxSpawn || this.spawned >= this.options.maxSpawn
    if (!triggerReady || atLimit) return { state: this, spawn: false }
    this.spawned += 1
    this.timerTicks = 0
    this.cooldownTicks = Math.max(0, this.options.intervalTicks)
    return { state: this, spawn: true }
  }
}
