export interface ClassicVector {
  readonly x: number
  readonly y: number
}

export type PlayerMotorMode = 'normal' | 'dashing'
export type PlayerBodyMode = 'standing' | 'crouching'

export interface ClassicPlayerTuning {
  readonly gravity: number
  readonly acceleration: number
  readonly maxSpeed: number
  readonly groundFriction: number
  readonly airFriction: number
  readonly jumpVelocity: number
  readonly maxFallSpeed: number
  readonly coyoteTicks: number
  readonly jumpBufferTicks: number
  readonly earlyReleaseVelocity: number
  readonly doubleJumpMultiplier: number
  readonly crouchSpeedMultiplier: number
  readonly dashSpeed: number
  readonly dashTicks: number
  readonly dashCooldownTicks: number
  readonly damageInvincibilityTicks: number
}

export interface PlayerMotorState {
  readonly velocity: ClassicVector
  readonly grounded: boolean
  readonly facing: -1 | 1
  readonly mode: PlayerMotorMode
  readonly body: PlayerBodyMode
  readonly coyoteTicks: number
  readonly jumpBufferTicks: number
  readonly jumpsLeft: number
  readonly dashTicksRemaining: number
  readonly dashCooldownTicks: number
  readonly dashDirection: -1 | 1
  readonly health: number
  readonly maxHealth: number
  readonly invincibleTicks: number
  readonly shieldTicks: number
}

export interface PlayerInputFrame {
  readonly left: boolean
  readonly right: boolean
  readonly down: boolean
  readonly jumpPressed: boolean
  readonly jumpHeld: boolean
  readonly dashPressed: boolean
}

export interface PlayerContacts {
  readonly grounded: boolean
  readonly headClear: boolean
  readonly horizontalBlocked: boolean
}

export type PlayerMotorEvent =
  | { readonly type: 'jumped'; readonly airJump: boolean }
  | { readonly type: 'dashed'; readonly direction: -1 | 1 }
  | { readonly type: 'body-changed'; readonly body: PlayerBodyMode }
  | { readonly type: 'damaged'; readonly amount: number }
  | { readonly type: 'shield-consumed' }
  | { readonly type: 'died' }

export interface PlayerMotorResult {
  readonly state: PlayerMotorState
  readonly requestedBody: PlayerBodyMode
  readonly events: readonly PlayerMotorEvent[]
}
