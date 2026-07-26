import type { CaseEvent, CaseSnapshot, PrimaryCell } from '@/shared/types/case'

export interface AllyConfig {
  readonly primaryCell: PrimaryCell
  readonly cooldownMinMs: number
  readonly cooldownMaxMs: number
}

export const ALLY_DEFAULTS: Record<'rbc' | 'wbc', AllyConfig> = {
  rbc: {
    primaryCell: 'rbc',
    cooldownMinMs: 10_000,
    cooldownMaxMs: 14_000,
  },
  wbc: {
    primaryCell: 'wbc',
    cooldownMinMs: 8_000,
    cooldownMaxMs: 12_000,
  },
}

/**
 * ScriptedAllySystem 在单人模式下自动模拟友军行为。
 * WBC 主控 → RBC 友军定时供氧
 * RBC 主控 → WBC 友军定时抑制感染
 * 双人模式自动禁用（由调用方控制 enabled 标志）。
 */
export class ScriptedAllySystem {
  private cooldownRemaining: number
  private readonly cooldownMin: number
  private readonly cooldownMax: number
  private readonly mode: 'rbc_ally' | 'wbc_ally'
  private readonly dispatchFn: (event: CaseEvent) => boolean
  private _enabled: boolean

  constructor(
    config: AllyConfig,
    dispatchFn: (event: CaseEvent) => boolean,
  ) {
    this.mode = config.primaryCell === 'wbc' ? 'rbc_ally' : 'wbc_ally'
    this.cooldownMin = config.cooldownMinMs
    this.cooldownMax = config.cooldownMaxMs
    this.dispatchFn = dispatchFn
    this.cooldownRemaining = this.randomCooldown()
    this._enabled = true
  }

  get enabled(): boolean {
    return this._enabled
  }

  set enabled(value: boolean) {
    this._enabled = value
    if (!value) {
      this.cooldownRemaining = this.randomCooldown()
    }
  }

  /**
   * Called every game tick. dtMs should be the fixed step in milliseconds (~16.67ms at 60Hz).
   * Returns true if an ally action was dispatched this tick.
   */
  update(dtMs: number, _snapshot: CaseSnapshot): boolean {
    if (!this._enabled) return false

    this.cooldownRemaining -= dtMs
    if (this.cooldownRemaining > 0) return false

    // Reset cooldown and dispatch ally action
    this.cooldownRemaining = this.randomCooldown()

    if (this.mode === 'rbc_ally') {
      return this.dispatchFn({
        type: 'oxygenDelivered',
        amount: 6,
        nodeId: '__ally_auto__',
        source: 'ally',
      })
    } else {
      return this.dispatchFn({
        type: 'infectionCleared',
        amount: 3,
        nodeId: '__ally_suppress__',
        source: 'ally',
      })
    }
  }

  private randomCooldown(): number {
    const range = this.cooldownMax - this.cooldownMin
    return this.cooldownMin + Math.random() * range
  }
}
