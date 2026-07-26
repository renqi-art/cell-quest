import Phaser from 'phaser'
import type { ParsedClassicLevel, ClassicGridPosition } from '@/shared/classic/types'
import { CLASSIC_TILE_REGISTRY, isClassicTileCharacter } from '@/shared/classic/tiles'
import { CLASSIC_TILE_SIZE } from '../config/classic-physics'

export interface ClassicSpringPosition extends ClassicGridPosition {
  readonly tile: 'V' | 'J'
}

export interface ClassicTerrainPlan {
  readonly solids: readonly ClassicGridPosition[]
  readonly spikes: readonly ClassicGridPosition[]
  readonly springs: readonly ClassicSpringPosition[]
  readonly crumble: readonly ClassicGridPosition[]
  readonly checkpoints: readonly ClassicGridPosition[]
}

export interface ClassicTerrainGroups {
  readonly solids: Phaser.Physics.Arcade.StaticGroup
  readonly spikes: Phaser.Physics.Arcade.StaticGroup
  readonly springs: Phaser.Physics.Arcade.StaticGroup
  readonly crumble: Phaser.Physics.Arcade.StaticGroup
  readonly checkpoints: Phaser.Physics.Arcade.StaticGroup
}

export function buildClassicTerrainPlan(level: ParsedClassicLevel): ClassicTerrainPlan {
  const solids: ClassicGridPosition[] = []
  const spikes: ClassicGridPosition[] = []
  const springs: ClassicSpringPosition[] = []
  const crumble: ClassicGridPosition[] = []
  level.tiles.forEach((row, rowIndex) => row.forEach((tile, colIndex) => {
    const position = { col: colIndex, row: rowIndex }
    if (tile === '^') spikes.push(position)
    else if (tile === 'V' || tile === 'J') springs.push({ ...position, tile })
    else if (tile === '_') crumble.push(position)
    else if (isClassicTileCharacter(tile) && CLASSIC_TILE_REGISTRY[tile].solid) solids.push(position)
  }))
  return { solids, spikes, springs, crumble, checkpoints: level.checkpoints }
}

function addTile(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  position: ClassicGridPosition,
  color: number,
  name: string,
): Phaser.GameObjects.Rectangle {
  const rectangle = scene.add.rectangle(
    position.col * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
    position.row * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
    CLASSIC_TILE_SIZE,
    CLASSIC_TILE_SIZE,
    color,
  )
  rectangle.setName(name)
  group.add(rectangle)
  return rectangle
}

export class TerrainSystem {
  constructor(private readonly scene: Phaser.Scene) {}

  create(level: ParsedClassicLevel): ClassicTerrainGroups {
    const plan = buildClassicTerrainPlan(level)
    const groups: ClassicTerrainGroups = {
      solids: this.scene.physics.add.staticGroup(),
      spikes: this.scene.physics.add.staticGroup(),
      springs: this.scene.physics.add.staticGroup(),
      crumble: this.scene.physics.add.staticGroup(),
      checkpoints: this.scene.physics.add.staticGroup(),
    }
    plan.solids.forEach(position => addTile(this.scene, groups.solids, position, 0x334b69, 'classic-solid'))
    plan.spikes.forEach(position => addTile(this.scene, groups.spikes, position, 0x9999aa, 'classic-spike'))
    plan.springs.forEach(position => addTile(
      this.scene,
      groups.springs,
      position,
      position.tile === 'J' ? 0xff6060 : 0x4acd6a,
      `classic-spring-${position.tile}`,
    ))
    plan.crumble.forEach(position => addTile(this.scene, groups.crumble, position, 0xb67a45, 'classic-crumble'))
    plan.checkpoints.forEach(position => addTile(this.scene, groups.checkpoints, position, 0x9c6ade, 'classic-checkpoint'))
    return groups
  }
}
