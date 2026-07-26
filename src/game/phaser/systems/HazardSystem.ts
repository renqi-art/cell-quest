import { resolveHazardContact } from '@/shared/classic/simulation/HazardRules'
import type { ClassicGridPosition } from '@/shared/classic/types'

export interface HazardActorPort {
  applyDamage(amount: number): boolean
  launch(velocityY: number): void
  activateCheckpoint(position: ClassicGridPosition): boolean
}

export type HazardApplication = 'damage' | 'launch'

export class HazardSystem {
  applyTile(actor: HazardActorPort, tile: string): HazardApplication | null {
    const result = resolveHazardContact(tile)
    if (!result) return null
    if (result.type === 'damage') {
      return actor.applyDamage(result.amount) ? 'damage' : null
    }
    actor.launch(result.velocityY)
    return 'launch'
  }

  activateCheckpoint(actor: HazardActorPort, position: ClassicGridPosition): boolean {
    return actor.activateCheckpoint(position)
  }
}
