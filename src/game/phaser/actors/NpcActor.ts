import Phaser from 'phaser'
import { interactNpc, type NpcState } from '@/shared/classic/simulation/BossBrain'
import { CLASSIC_TILE_SIZE } from '../config/classic-physics'

export class NpcActor {
  readonly shape: Phaser.GameObjects.Arc
  private state: NpcState = { interacted: false }

  constructor(scene: Phaser.Scene, col: number, row: number) {
    this.shape = scene.add.circle(
      col * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
      row * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
      13,
      0x79d7c5,
    )
    this.shape.setName('classic-npc')
    scene.physics.add.existing(this.shape, true)
  }

  interact(): boolean {
    const result = interactNpc(this.state)
    this.state = result.state
    return result.openDialogue
  }
}
