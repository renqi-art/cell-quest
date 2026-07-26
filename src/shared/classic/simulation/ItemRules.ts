import type { ClassicEnemyKind, ClassicItemKind } from '../types'

export type ClassicRuntimeItemKind = ClassicItemKind | 'xp' | 'equipment'

export interface ClassicRuntimeItem {
  readonly kind: ClassicRuntimeItemKind
  readonly value?: number
  readonly equipmentId?: string
}

export interface ClassicItemState {
  readonly energy: number
  readonly maxEnergy: number
  readonly shieldTicks: number
  readonly oxygenTicks: number
  readonly complementAmmo: number
  readonly coins: number
  readonly food: number
  readonly drink: number
  readonly nutrition: number
  readonly memory: number
  readonly xp: number
  readonly inventory: readonly string[]
  readonly inventoryLimit: number
}

export interface ClassicItemApplication {
  readonly state: ClassicItemState
  readonly collected: boolean
  readonly reason: 'inventory-full' | null
}

export function createClassicItemState(
  overrides: Partial<ClassicItemState> = {},
): ClassicItemState {
  return {
    energy: 100,
    maxEnergy: 100,
    shieldTicks: 0,
    oxygenTicks: 0,
    complementAmmo: 0,
    coins: 0,
    food: 0,
    drink: 0,
    nutrition: 0,
    memory: 0,
    xp: 0,
    inventory: [],
    inventoryLimit: 20,
    ...overrides,
  }
}

export function applyItem(
  state: ClassicItemState,
  item: ClassicRuntimeItem,
): ClassicItemApplication {
  if (item.kind === 'equipment') {
    if (state.inventory.length >= state.inventoryLimit) {
      return { state, collected: false, reason: 'inventory-full' }
    }
    return {
      state: {
        ...state,
        inventory: [...state.inventory, item.equipmentId ?? 'unknown-equipment'],
      },
      collected: true,
      reason: null,
    }
  }

  const updates: { -readonly [K in keyof ClassicItemState]?: ClassicItemState[K] } = {}
  switch (item.kind) {
    case 'shield': updates.shieldTicks = 600; break
    case 'oxygen': updates.oxygenTicks = 600; break
    case 'complement': updates.complementAmmo = state.complementAmmo + 5; break
    case 'coin': updates.coins = state.coins + 1; break
    case 'food': updates.food = state.food + 1; break
    case 'drink': updates.drink = state.drink + 1; break
    case 'nutrition': updates.nutrition = state.nutrition + 1; break
    case 'atp': updates.energy = Math.min(state.maxEnergy, state.energy + 20); break
    case 'memory': updates.memory = state.memory + 1; break
    case 'xp': updates.xp = state.xp + Math.max(0, item.value ?? 10); break
  }
  return {
    state: { ...state, ...updates },
    collected: true,
    reason: null,
  }
}

export function tickClassicItemState(
  state: ClassicItemState,
  ticks = 1,
): ClassicItemState {
  const elapsed = Math.max(0, ticks)
  return {
    ...state,
    shieldTicks: Math.max(0, state.shieldTicks - elapsed),
    oxygenTicks: Math.max(0, state.oxygenTicks - elapsed),
  }
}

export type QuestionBlockPhase = 'unused' | 'used'

export interface QuestionBlockState {
  readonly phase: QuestionBlockPhase
}

export type QuestionBlockOutput =
  | { readonly kind: 'atp' }
  | { readonly kind: Extract<ClassicEnemyKind, 'strep'> }

export function createQuestionBlockState(used: boolean): QuestionBlockState {
  return { phase: used ? 'used' : 'unused' }
}

export function hitQuestionBlock(
  state: QuestionBlockState,
  roll: number,
): { readonly state: QuestionBlockState; readonly output: QuestionBlockOutput | null } {
  if (state.phase === 'used') return { state, output: null }
  return {
    state: { phase: 'used' },
    output: roll < 0.5 ? { kind: 'atp' } : { kind: 'strep' },
  }
}

export type AbilityCooldowns = Readonly<Record<string, number>>

export function useAbility(
  cooldowns: AbilityCooldowns,
  ability: string,
  cooldownTicks: number,
): { readonly cooldowns: AbilityCooldowns; readonly applied: boolean } {
  if ((cooldowns[ability] ?? 0) > 0) return { cooldowns, applied: false }
  return {
    cooldowns: { ...cooldowns, [ability]: Math.max(0, cooldownTicks) },
    applied: true,
  }
}

export function tickAbilityCooldowns(cooldowns: AbilityCooldowns): AbilityCooldowns {
  return Object.fromEntries(
    Object.entries(cooldowns).map(([ability, ticks]) => [ability, Math.max(0, ticks - 1)]),
  )
}
