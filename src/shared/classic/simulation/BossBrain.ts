export interface BossState {
  readonly hp: number
  readonly maxHp: number
  readonly alive: boolean
  readonly encountered: boolean
  readonly phase: 1 | 2 | 3
  readonly shieldHp: number
  readonly shieldCooldownTicks: number
  readonly ringCooldownTicks: number
  readonly leukocidinCooldownTicks: number
  readonly leukocidinCastTicks: number
  readonly summonTicks: number
  readonly shockCooldownTicks: number
  readonly shockCastTicks: number
  readonly biofilmActive: boolean
  readonly biofilmRegenTicks: number
  readonly ticksSinceHit: number
}

export type BossEffect =
  | { readonly type: 'phase'; readonly phase: 1 | 2 | 3 }
  | { readonly type: 'shield'; readonly hp: number }
  | { readonly type: 'ring' }
  | { readonly type: 'leukocidin-mark'; readonly castTicks: number }
  | { readonly type: 'leukocidin-hit'; readonly damage: number }
  | { readonly type: 'summon'; readonly count: number }
  | { readonly type: 'shock-charge'; readonly castTicks: number }
  | { readonly type: 'shock-hit'; readonly damage: number }
  | { readonly type: 'shock-interrupted' }
  | { readonly type: 'biofilm-start' }
  | { readonly type: 'heal'; readonly amount: number }
  | { readonly type: 'died' }

export interface BossObservation {
  readonly playerDistance: number
  readonly wasHit: boolean
}

export interface BossDecision {
  readonly state: BossState
  readonly effects: readonly BossEffect[]
}

export type BossRandomSource = () => number

export function createBossState(): BossState {
  return {
    hp: 10,
    maxHp: 10,
    alive: true,
    encountered: false,
    phase: 1,
    shieldHp: 0,
    shieldCooldownTicks: 0,
    ringCooldownTicks: 0,
    leukocidinCooldownTicks: 0,
    leukocidinCastTicks: 0,
    summonTicks: 2700,
    shockCooldownTicks: 0,
    shockCastTicks: 0,
    biofilmActive: false,
    biofilmRegenTicks: 0,
    ticksSinceHit: 0,
  }
}

export function stepBoss(
  state: BossState,
  observation: BossObservation,
  random: BossRandomSource,
): BossDecision {
  if (!state.alive) return { state, effects: [] }
  const encountered = state.encountered || observation.playerDistance <= 180 || observation.wasHit
  if (!encountered) return { state, effects: [] }

  const effects: BossEffect[] = []
  const phase = bossPhase(state.hp, state.maxHp)
  if (phase !== state.phase) effects.push({ type: 'phase', phase })
  let next: BossState = {
    ...state,
    encountered: true,
    phase,
    ticksSinceHit: observation.wasHit ? 0 : state.ticksSinceHit + 1,
    shieldCooldownTicks: dec(state.shieldCooldownTicks),
    ringCooldownTicks: dec(state.ringCooldownTicks),
    leukocidinCooldownTicks: dec(state.leukocidinCooldownTicks),
    summonTicks: dec(state.summonTicks),
    shockCooldownTicks: dec(state.shockCooldownTicks),
  }

  if (phase >= 2 && next.shieldHp <= 0 && next.shieldCooldownTicks === 0) {
    const hp = Math.max(1, Math.ceil(next.maxHp * 0.15))
    next = { ...next, shieldHp: hp, shieldCooldownTicks: 1200 }
    effects.push({ type: 'shield', hp })
  }

  if (next.ringCooldownTicks === 0) {
    next = { ...next, ringCooldownTicks: phase === 3 ? 756 : 1080 }
    effects.push({ type: 'ring' })
  }

  if (next.leukocidinCastTicks > 0) {
    const castTicks = next.leukocidinCastTicks - 1
    next = { ...next, leukocidinCastTicks: castTicks }
    if (castTicks === 0) {
      next = { ...next, leukocidinCooldownTicks: phase === 3 ? 1008 : 1440 }
      effects.push({ type: 'leukocidin-hit', damage: 10 })
    }
  } else if (
    next.leukocidinCooldownTicks === 0
    && (phase === 1 || random() < 0.4)
  ) {
    next = { ...next, leukocidinCastTicks: 90 }
    effects.push({ type: 'leukocidin-mark', castTicks: 90 })
  }

  if (phase >= 2 && next.summonTicks === 0) {
    next = { ...next, summonTicks: phase === 3 ? 1890 : 2700 }
    effects.push({ type: 'summon', count: 2 })
  }

  if (next.shockCastTicks > 0) {
    const castTicks = next.shockCastTicks - 1
    next = { ...next, shockCastTicks: castTicks }
    if (castTicks === 0) effects.push({ type: 'shock-hit', damage: 5 })
  } else if (next.shockCooldownTicks === 0) {
    const cooldown = phase === 3 ? 1485 : 2700
    next = { ...next, shockCastTicks: 180, shockCooldownTicks: cooldown }
    effects.push({ type: 'shock-charge', castTicks: 180 })
  }

  if (phase === 3 && !next.biofilmActive) {
    next = { ...next, biofilmActive: true }
    effects.push({ type: 'biofilm-start' })
  }
  if (next.biofilmActive) {
    const regenTicks = next.ticksSinceHit > 300 ? next.biofilmRegenTicks + 1 : 0
    if (regenTicks >= 180 && next.hp < next.maxHp) {
      next = { ...next, hp: next.hp + 1, biofilmRegenTicks: 0 }
      effects.push({ type: 'heal', amount: 1 })
    } else {
      next = { ...next, biofilmRegenTicks: regenTicks }
    }
  }

  return { state: next, effects }
}

export function damageBoss(state: BossState, damage: number): BossDecision {
  if (!state.alive || damage <= 0) return { state, effects: [] }
  const effects: BossEffect[] = []
  let remaining = state.biofilmActive
    ? Math.max(1, Math.floor(damage * 0.7))
    : damage
  let shieldHp = state.shieldHp
  if (shieldHp > 0) {
    const absorbed = Math.min(shieldHp, remaining)
    shieldHp -= absorbed
    remaining -= absorbed
  }
  const hp = Math.max(0, state.hp - remaining)
  if (state.shockCastTicks > 0) effects.push({ type: 'shock-interrupted' })
  if (hp === 0) effects.push({ type: 'died' })
  return {
    state: {
      ...state,
      hp,
      alive: hp > 0,
      shieldHp,
      shockCastTicks: 0,
      shockCooldownTicks: 2700,
      ticksSinceHit: 0,
      biofilmRegenTicks: 0,
    },
    effects,
  }
}

export interface NpcState {
  readonly interacted: boolean
}

export function interactNpc(
  state: NpcState,
): { readonly state: NpcState; readonly openDialogue: boolean } {
  return state.interacted
    ? { state, openDialogue: false }
    : { state: { interacted: true }, openDialogue: true }
}

function bossPhase(hp: number, maxHp: number): 1 | 2 | 3 {
  const ratio = maxHp > 0 ? hp / maxHp : 0
  if (ratio > 0.7) return 1
  if (ratio > 0.3) return 2
  return 3
}

function dec(value: number): number {
  return Math.max(0, value - 1)
}
