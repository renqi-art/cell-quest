import type {
  ClassicPlayerTuning,
  PlayerBodyMode,
  PlayerContacts,
  PlayerInputFrame,
  PlayerMotorEvent,
  PlayerMotorResult,
  PlayerMotorState,
} from './player-types'

export type {
  ClassicPlayerTuning,
  PlayerContacts,
  PlayerInputFrame,
  PlayerMotorEvent,
  PlayerMotorResult,
  PlayerMotorState,
} from './player-types'

export const CLASSIC_PLAYER_TUNING = Object.freeze({
  gravity: 0.6,
  acceleration: 0.5,
  maxSpeed: 2.8,
  groundFriction: 0.82,
  airFriction: 0.92,
  jumpVelocity: -12.5,
  maxFallSpeed: 10,
  coyoteTicks: 6,
  jumpBufferTicks: 6,
  earlyReleaseVelocity: -3,
  doubleJumpMultiplier: 0.85,
  crouchSpeedMultiplier: 0.7,
  dashSpeed: 7,
  dashTicks: 8,
  dashCooldownTicks: 30,
  damageInvincibilityTicks: 90,
} satisfies ClassicPlayerTuning)

export function createClassicPlayerMotorState(): PlayerMotorState {
  return {
    velocity: { x: 0, y: 0 },
    grounded: true,
    facing: 1,
    mode: 'normal',
    body: 'standing',
    coyoteTicks: CLASSIC_PLAYER_TUNING.coyoteTicks,
    jumpBufferTicks: 0,
    jumpsLeft: 1,
    dashTicksRemaining: 0,
    dashCooldownTicks: 0,
    dashDirection: 1,
    health: 100,
    maxHealth: 100,
    invincibleTicks: 0,
    shieldTicks: 0,
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

export class PlayerMotor {
  constructor(private readonly tuning: ClassicPlayerTuning) {}

  step(state: PlayerMotorState, input: PlayerInputFrame, contacts: PlayerContacts): PlayerMotorResult {
    const events: PlayerMotorEvent[] = []
    let body: PlayerBodyMode = state.body
    let facing = state.facing
    let velocityX = state.velocity.x
    let velocityY = state.velocity.y
    let grounded = contacts.grounded
    let coyoteTicks = contacts.grounded
      ? this.tuning.coyoteTicks
      : Math.max(0, state.coyoteTicks - 1)
    let jumpBufferTicks = input.jumpPressed
      ? this.tuning.jumpBufferTicks
      : Math.max(0, state.jumpBufferTicks - 1)
    let jumpsLeft = contacts.grounded ? 1 : state.jumpsLeft
    const dashCooldownTicks = Math.max(0, state.dashCooldownTicks - 1)
    const invincibleTicks = Math.max(0, state.invincibleTicks - 1)
    const shieldTicks = Math.max(0, state.shieldTicks - 1)

    if (state.mode === 'dashing' && state.dashTicksRemaining > 0) {
      const dashTicksRemaining = state.dashTicksRemaining - 1
      return {
        state: {
          ...state,
          velocity: contacts.horizontalBlocked
            ? { x: 0, y: 0 }
            : { x: state.dashDirection * this.tuning.dashSpeed, y: 0 },
          grounded,
          mode: dashTicksRemaining > 0 ? 'dashing' : 'normal',
          dashTicksRemaining,
          dashCooldownTicks,
          invincibleTicks,
          shieldTicks,
        },
        requestedBody: body,
        events,
      }
    }

    if (input.dashPressed && dashCooldownTicks === 0) {
      const direction = input.left ? -1 : input.right ? 1 : facing
      events.push({ type: 'dashed', direction })
      return {
        state: {
          ...state,
          velocity: { x: direction * this.tuning.dashSpeed, y: 0 },
          grounded,
          facing: direction,
          mode: 'dashing',
          dashDirection: direction,
          dashTicksRemaining: this.tuning.dashTicks - 1,
          dashCooldownTicks: this.tuning.dashCooldownTicks,
          invincibleTicks,
          shieldTicks,
        },
        requestedBody: body,
        events,
      }
    }

    const nextBody = input.down && contacts.grounded
      ? 'crouching'
      : body === 'crouching' && !contacts.headClear
        ? 'crouching'
        : 'standing'
    if (nextBody !== body) {
      body = nextBody
      events.push({ type: 'body-changed', body })
    }

    const direction = Number(input.right) - Number(input.left)
    if (direction !== 0) {
      facing = direction as -1 | 1
      const crouchMultiplier = body === 'crouching' && contacts.grounded
        ? this.tuning.crouchSpeedMultiplier
        : 1
      velocityX += direction * this.tuning.acceleration * crouchMultiplier
    }
    velocityX *= contacts.grounded ? this.tuning.groundFriction : this.tuning.airFriction
    velocityX = clamp(velocityX, -this.tuning.maxSpeed, this.tuning.maxSpeed)
    if (Math.abs(velocityX) < 0.05) velocityX = 0

    if (jumpBufferTicks > 0 && coyoteTicks > 0) {
      velocityY = this.tuning.jumpVelocity
      grounded = false
      coyoteTicks = 0
      jumpBufferTicks = 0
      jumpsLeft = 1
      events.push({ type: 'jumped', airJump: false })
    } else if (input.jumpPressed && jumpsLeft > 0 && !contacts.grounded && velocityY > -8) {
      velocityY = this.tuning.jumpVelocity * this.tuning.doubleJumpMultiplier
      jumpBufferTicks = 0
      jumpsLeft = 0
      events.push({ type: 'jumped', airJump: true })
    }

    if (!input.jumpHeld && velocityY < this.tuning.earlyReleaseVelocity) {
      velocityY = this.tuning.earlyReleaseVelocity
    }
    if (!grounded) velocityY = Math.min(this.tuning.maxFallSpeed, velocityY + this.tuning.gravity)
    else if (velocityY > 0) velocityY = 0

    return {
      state: {
        ...state,
        velocity: { x: velocityX, y: velocityY },
        grounded,
        facing,
        mode: 'normal',
        body,
        coyoteTicks,
        jumpBufferTicks,
        jumpsLeft,
        dashTicksRemaining: 0,
        dashCooldownTicks,
        invincibleTicks,
        shieldTicks,
      },
      requestedBody: body,
      events,
    }
  }

  applyDamage(state: PlayerMotorState, amount: number): PlayerMotorResult {
    if (amount <= 0 || state.invincibleTicks > 0) {
      return { state, requestedBody: state.body, events: [] }
    }
    if (state.shieldTicks > 0) {
      return {
        state: { ...state, shieldTicks: 0, invincibleTicks: 30 },
        requestedBody: state.body,
        events: [{ type: 'shield-consumed' }],
      }
    }
    const health = Math.max(0, state.health - amount)
    const events: PlayerMotorEvent[] = [{ type: 'damaged', amount }]
    if (health === 0) events.push({ type: 'died' })
    return {
      state: {
        ...state,
        health,
        invincibleTicks: this.tuning.damageInvincibilityTicks,
      },
      requestedBody: state.body,
      events,
    }
  }
}
