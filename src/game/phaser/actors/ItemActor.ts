import Phaser from 'phaser'
import type { ClassicRuntimeItem } from '@/shared/classic/simulation/ItemRules'
import type { ClassicItemKind } from '@/shared/classic/types'
import { CLASSIC_TILE_SIZE } from '../config/classic-physics'

const ITEM_COLOR: Readonly<Record<ClassicItemKind, number>> = {
  shield: 0x75c9ff,
  oxygen: 0xeeeeff,
  complement: 0xc76cff,
  coin: 0xffd65a,
  food: 0xe99a5a,
  drink: 0x4faee8,
  nutrition: 0x85d45c,
  atp: 0xffea54,
  memory: 0xc884ff,
}

export class ItemActor {
  readonly shape: Phaser.GameObjects.Arc

  constructor(
    scene: Phaser.Scene,
    readonly item: ClassicRuntimeItem,
    col: number,
    row: number,
  ) {
    const color = item.kind === 'xp' || item.kind === 'equipment'
      ? 0xffd65a
      : ITEM_COLOR[item.kind]
    this.shape = scene.add.circle(
      col * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
      row * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
      8,
      color,
    )
    this.shape.setName(`classic-item-${item.kind}`)
    scene.physics.add.existing(this.shape, true)
  }

  collect(): ClassicRuntimeItem | null {
    if (!this.shape.active) return null
    const body = this.shape.body as Phaser.Physics.Arcade.StaticBody
    body.enable = false
    this.shape.setActive(false).setVisible(false)
    return this.item
  }
}
