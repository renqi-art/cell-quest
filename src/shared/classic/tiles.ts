import type { ClassicEnemyKind, ClassicItemKind } from './types'

export type ClassicTileKind =
  | 'empty'
  | 'solid'
  | 'blood-loss'
  | 'spike'
  | 'spring'
  | 'heart-spring'
  | 'pipe'
  | 'crumble'
  | 'decoration'

export interface ClassicTileDefinition {
  readonly kind: ClassicTileKind
  readonly solid: boolean
}

export const CLASSIC_TILE_REGISTRY = Object.freeze({
  ' ': { kind: 'empty', solid: false },
  '#': { kind: 'solid', solid: true },
  '=': { kind: 'solid', solid: true },
  S: { kind: 'solid', solid: true },
  B: { kind: 'blood-loss', solid: true },
  '^': { kind: 'spike', solid: false },
  V: { kind: 'spring', solid: false },
  J: { kind: 'heart-spring', solid: false },
  p: { kind: 'pipe', solid: true },
  _: { kind: 'crumble', solid: true },
  H: { kind: 'decoration', solid: false },
} satisfies Readonly<Record<string, ClassicTileDefinition>>)

export const CLASSIC_ENEMY_CHARACTERS = Object.freeze({
  g: 'staph',
  G: 'staph-large',
  t: 'strep',
} satisfies Readonly<Record<string, ClassicEnemyKind>>)

export const CLASSIC_ITEM_CHARACTERS = Object.freeze({
  D: 'shield',
  O: 'oxygen',
  M: 'complement',
  o: 'coin',
  f: 'food',
  d: 'drink',
  n: 'nutrition',
  a: 'atp',
  '*': 'memory',
} satisfies Readonly<Record<string, ClassicItemKind>>)

export const CLASSIC_ENTITY_CHARACTERS = Object.freeze(
  new Set([
    ...Object.keys(CLASSIC_ENEMY_CHARACTERS),
    ...Object.keys(CLASSIC_ITEM_CHARACTERS),
    'P',
    'C',
    'F',
    '>',
    'b',
    'N',
    '?',
    'X',
  ]),
)

export function isClassicTileCharacter(character: string): character is keyof typeof CLASSIC_TILE_REGISTRY {
  return Object.hasOwn(CLASSIC_TILE_REGISTRY, character)
}
