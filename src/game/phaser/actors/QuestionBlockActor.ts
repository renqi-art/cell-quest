import Phaser from 'phaser'
import {
  createQuestionBlockState,
  hitQuestionBlock,
  type QuestionBlockOutput,
  type QuestionBlockState,
} from '@/shared/classic/simulation/ItemRules'
import { CLASSIC_TILE_SIZE } from '../config/classic-physics'

export class QuestionBlockActor {
  readonly shape: Phaser.GameObjects.Rectangle
  private state: QuestionBlockState = createQuestionBlockState(false)

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    hidden: boolean,
  ) {
    this.shape = scene.add.rectangle(
      col * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
      row * CLASSIC_TILE_SIZE + CLASSIC_TILE_SIZE / 2,
      CLASSIC_TILE_SIZE,
      CLASSIC_TILE_SIZE,
      0xe8b84e,
    )
    this.shape.setName('classic-question-block')
    this.shape.setAlpha(hidden ? 0 : 1)
    scene.physics.add.existing(this.shape, true)
  }

  hit(roll: number): QuestionBlockOutput | null {
    const result = hitQuestionBlock(this.state, roll)
    if (!result.output) return null
    this.state = result.state
    this.shape.setAlpha(0.45).setFillStyle(0x746f67)
    return result.output
  }

  snapshot(): QuestionBlockState {
    return this.state
  }
}
