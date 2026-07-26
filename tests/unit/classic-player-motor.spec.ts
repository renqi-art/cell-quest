import { describe, expect, it } from 'vitest'
import {
  CLASSIC_PLAYER_TUNING,
  PlayerMotor,
  createClassicPlayerMotorState,
} from '@/shared/classic/simulation/PlayerMotor'

const noInput = {
  left: false,
  right: false,
  down: false,
  jumpPressed: false,
  jumpHeld: false,
  dashPressed: false,
} as const

const grounded = { grounded: true, headClear: true, horizontalBlocked: false } as const
const airborne = { grounded: false, headClear: true, horizontalBlocked: false } as const

describe('PlayerMotor', () => {
  it('applies legacy acceleration, friction, and maximum speed', () => {
    const motor = new PlayerMotor(CLASSIC_PLAYER_TUNING)
    let state = createClassicPlayerMotorState()
    for (let tick = 0; tick < 120; tick += 1) {
      state = motor.step(state, { ...noInput, right: true }, grounded).state
    }

    expect(state.velocity.x).toBeCloseTo(
      CLASSIC_PLAYER_TUNING.acceleration * CLASSIC_PLAYER_TUNING.groundFriction
      / (1 - CLASSIC_PLAYER_TUNING.groundFriction),
      5,
    )
    expect(state.velocity.x).toBeLessThanOrEqual(CLASSIC_PLAYER_TUNING.maxSpeed)
    expect(state.facing).toBe(1)
    expect(motor.step(state, noInput, grounded).state.velocity.x).toBeLessThan(state.velocity.x)
  })

  it('supports coyote jump, one air jump, and early-release height control', () => {
    const motor = new PlayerMotor(CLASSIC_PLAYER_TUNING)
    let state = motor.step(createClassicPlayerMotorState(), noInput, grounded).state
    for (let tick = 0; tick < CLASSIC_PLAYER_TUNING.coyoteTicks - 2; tick += 1) {
      state = motor.step(state, noInput, airborne).state
    }

    const coyoteJump = motor.step(state, { ...noInput, jumpPressed: true, jumpHeld: true }, airborne)
    expect(coyoteJump.state.velocity.y).toBe(CLASSIC_PLAYER_TUNING.jumpVelocity + CLASSIC_PLAYER_TUNING.gravity)
    expect(coyoteJump.events).toContainEqual({ type: 'jumped', airJump: false })

    let airReady = coyoteJump.state
    while (airReady.velocity.y <= -8) airReady = motor.step(airReady, { ...noInput, jumpHeld: true }, airborne).state
    const airJump = motor.step(airReady, { ...noInput, jumpPressed: true, jumpHeld: true }, airborne)
    expect(airJump.state.velocity.y).toBeCloseTo(
      CLASSIC_PLAYER_TUNING.jumpVelocity * CLASSIC_PLAYER_TUNING.doubleJumpMultiplier
      + CLASSIC_PLAYER_TUNING.gravity,
    )
    expect(airJump.events).toContainEqual({ type: 'jumped', airJump: true })

    const released = motor.step(airJump.state, noInput, airborne)
    expect(released.state.velocity.y).toBe(CLASSIC_PLAYER_TUNING.earlyReleaseVelocity + CLASSIC_PLAYER_TUNING.gravity)
  })

  it('buffers a jump immediately before landing', () => {
    const motor = new PlayerMotor(CLASSIC_PLAYER_TUNING)
    const falling = {
      ...createClassicPlayerMotorState(),
      grounded: false,
      coyoteTicks: 0,
      velocity: { x: 0, y: 4 },
      jumpsLeft: 0,
    }
    const buffered = motor.step(falling, { ...noInput, jumpPressed: true, jumpHeld: true }, airborne)
    const landed = motor.step(buffered.state, { ...noInput, jumpHeld: true }, grounded)

    expect(landed.state.velocity.y).toBe(CLASSIC_PLAYER_TUNING.jumpVelocity + CLASSIC_PLAYER_TUNING.gravity)
    expect(landed.events).toContainEqual({ type: 'jumped', airJump: false })
  })

  it('crouches only while grounded and stands only with head clearance', () => {
    const motor = new PlayerMotor(CLASSIC_PLAYER_TUNING)
    const crouched = motor.step(createClassicPlayerMotorState(), { ...noInput, down: true }, grounded)

    expect(crouched.state.body).toBe('crouching')
    expect(crouched.requestedBody).toBe('crouching')
    const blocked = motor.step(crouched.state, noInput, { ...grounded, headClear: false })
    expect(blocked.state.body).toBe('crouching')
    expect(motor.step(blocked.state, noInput, grounded).state.body).toBe('standing')
  })

  it('locks velocity during dash and enforces cooldown', () => {
    const motor = new PlayerMotor(CLASSIC_PLAYER_TUNING)
    const started = motor.step(
      createClassicPlayerMotorState(),
      { ...noInput, right: true, dashPressed: true },
      grounded,
    )

    expect(started.state.mode).toBe('dashing')
    expect(started.state.velocity).toEqual({ x: CLASSIC_PLAYER_TUNING.dashSpeed, y: 0 })
    expect(started.events).toContainEqual({ type: 'dashed', direction: 1 })

    let state = started.state
    for (let tick = 1; tick < CLASSIC_PLAYER_TUNING.dashTicks; tick += 1) {
      state = motor.step(state, noInput, airborne).state
      expect(state.velocity.y).toBe(0)
    }
    expect(state.mode).toBe('normal')
    expect(motor.step(state, { ...noInput, dashPressed: true }, grounded).events).not.toContainEqual(
      expect.objectContaining({ type: 'dashed' }),
    )
  })

  it('applies damage once during the invincibility window', () => {
    const motor = new PlayerMotor(CLASSIC_PLAYER_TUNING)
    const initial = createClassicPlayerMotorState()
    const damaged = motor.applyDamage(initial, 5)

    expect(damaged.state.health).toBe(95)
    expect(damaged.state.invincibleTicks).toBe(CLASSIC_PLAYER_TUNING.damageInvincibilityTicks)
    expect(motor.applyDamage(damaged.state, 5).state.health).toBe(95)
  })
})
