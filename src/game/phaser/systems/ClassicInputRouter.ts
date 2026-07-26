import type {
  CellType,
  PlayerAction,
  PlayerIndex,
} from '@/shared/types/game'
import type { PlayerInputFrame } from '@/shared/classic/simulation/PlayerMotor'

export interface ClassicKeyboardSource {
  isDown(player: PlayerIndex, action: PlayerAction): boolean
}

const MOTOR_ACTIONS = ['left', 'right', 'down', 'jump', 'dash'] as const

export class ClassicInputRouter {
  private readonly previous = new Map<PlayerIndex, Set<PlayerAction>>()
  private stopped = false

  constructor(
    private readonly external: ReadonlyMap<PlayerIndex, Set<PlayerAction>>,
    private readonly keyboard?: ClassicKeyboardSource,
    private readonly cleanup?: () => void,
  ) {}

  isDown(player: PlayerIndex, action: PlayerAction): boolean {
    if (this.stopped) return false
    return Boolean(this.external.get(player)?.has(action) || this.keyboard?.isDown(player, action))
  }

  frame(player: PlayerIndex): PlayerInputFrame {
    if (this.stopped) return neutralFrame()
    const before = this.previous.get(player) ?? new Set<PlayerAction>()
    const current = new Set<PlayerAction>()
    for (const action of MOTOR_ACTIONS) {
      if (this.isDown(player, action)) {
        current.add(action)
      }
    }
    this.previous.set(player, current)
    return {
      left: current.has('left'),
      right: current.has('right'),
      down: current.has('down'),
      jumpPressed: current.has('jump') && !before.has('jump'),
      jumpHeld: current.has('jump'),
      dashPressed: current.has('dash') && !before.has('dash'),
    }
  }

  shutdown(): void {
    if (this.stopped) return
    this.stopped = true
    this.previous.clear()
    this.cleanup?.()
  }
}

export function swapPlayerRoles(
  roles: ReadonlyMap<number, number>,
): Map<1 | 2, CellType> {
  const first = normalizeCell(roles.get(1), 1)
  const second = normalizeCell(roles.get(2), 2)
  return new Map([[1, second], [2, first]])
}

function normalizeCell(value: number | undefined, fallback: CellType): CellType {
  return value === 1 || value === 2 || value === 3 ? value : fallback
}

function neutralFrame(): PlayerInputFrame {
  return {
    left: false,
    right: false,
    down: false,
    jumpPressed: false,
    jumpHeld: false,
    dashPressed: false,
  }
}
