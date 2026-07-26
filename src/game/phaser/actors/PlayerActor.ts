import Phaser from 'phaser'
import type { ClassicGridPosition } from '@/shared/classic/types'
import {
  CLASSIC_PLAYER_TUNING,
  PlayerMotor,
  createClassicPlayerMotorState,
  type PlayerContacts,
  type PlayerInputFrame,
  type PlayerMotorEvent,
  type PlayerMotorState,
} from '@/shared/classic/simulation/PlayerMotor'
import {
  CLASSIC_PLAYER_CROUCHING_HEIGHT,
  CLASSIC_PLAYER_STANDING_HEIGHT,
  CLASSIC_PLAYER_WIDTH,
  CLASSIC_SIMULATION_HZ,
  CLASSIC_TILE_SIZE,
} from '../config/classic-physics'

export class PlayerActor {
  readonly shape: Phaser.GameObjects.Rectangle
  readonly body: Phaser.Physics.Arcade.Body
  private readonly motor = new PlayerMotor(CLASSIC_PLAYER_TUNING)
  private motorState = createClassicPlayerMotorState()
  private checkpoint: ClassicGridPosition

  constructor(
    scene: Phaser.Scene,
    readonly playerIndex: 1 | 2,
    col: number,
    row: number,
    color: number,
  ) {
    this.checkpoint = { col, row }
    this.shape = scene.add.rectangle(
      col * CLASSIC_TILE_SIZE + CLASSIC_PLAYER_WIDTH / 2,
      row * CLASSIC_TILE_SIZE + CLASSIC_PLAYER_STANDING_HEIGHT / 2,
      CLASSIC_PLAYER_WIDTH,
      CLASSIC_PLAYER_STANDING_HEIGHT,
      color,
    )
    this.shape.setName(`classic-player-${playerIndex}`)
    scene.physics.add.existing(this.shape)
    this.body = this.shape.body as Phaser.Physics.Arcade.Body
    this.body.setAllowGravity(false)
    this.body.setCollideWorldBounds(true)
  }

  step(input: PlayerInputFrame, contacts: PlayerContacts): readonly PlayerMotorEvent[] {
    const result = this.motor.step(this.motorState, input, contacts)
    this.motorState = result.state
    const height = result.requestedBody === 'crouching'
      ? CLASSIC_PLAYER_CROUCHING_HEIGHT
      : CLASSIC_PLAYER_STANDING_HEIGHT
    this.body.setSize(CLASSIC_PLAYER_WIDTH, height)
    this.shape.setDisplaySize(CLASSIC_PLAYER_WIDTH, height)
    this.body.setVelocity(
      result.state.velocity.x * CLASSIC_SIMULATION_HZ,
      result.state.velocity.y * CLASSIC_SIMULATION_HZ,
    )
    return result.events
  }

  snapshot(): PlayerMotorState {
    return this.motorState
  }

  applyDamage(amount: number): boolean {
    const result = this.motor.applyDamage(this.motorState, amount)
    if (result.state === this.motorState) return false
    this.motorState = result.state
    return true
  }

  launch(velocityY: number): void {
    this.motorState = {
      ...this.motorState,
      grounded: false,
      velocity: { ...this.motorState.velocity, y: velocityY },
    }
    this.body.setVelocityY(velocityY * CLASSIC_SIMULATION_HZ)
  }

  activateCheckpoint(position: ClassicGridPosition): boolean {
    if (this.checkpoint.col === position.col && this.checkpoint.row === position.row) return false
    this.checkpoint = position
    return true
  }

  respawn(): void {
    this.shape.setPosition(
      this.checkpoint.col * CLASSIC_TILE_SIZE + CLASSIC_PLAYER_WIDTH / 2,
      this.checkpoint.row * CLASSIC_TILE_SIZE + CLASSIC_PLAYER_STANDING_HEIGHT / 2,
    )
    this.body.setVelocity(0, 0)
    this.motorState = createClassicPlayerMotorState()
  }
}
