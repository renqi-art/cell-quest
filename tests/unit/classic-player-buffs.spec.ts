import { describe, expect, it } from 'vitest'
import {
  CLASSIC_PLAYER_TUNING,
  PlayerMotor,
  createClassicPlayerMotorState,
} from '@/shared/classic/simulation/PlayerMotor'

const idle = {
  left: false,
  right: false,
  down: false,
  jumpPressed: false,
  jumpHeld: false,
  dashPressed: false,
} as const

const grounded = { grounded: true, headClear: true, horizontalBlocked: false } as const

describe('classic player buffs', () => {
  it('expires a shield one fixed tick at a time and still consumes it on damage', () => {
    const motor = new PlayerMotor(CLASSIC_PLAYER_TUNING)
    const shielded = { ...createClassicPlayerMotorState(), shieldTicks: 2 }
    const oneTick = motor.step(shielded, idle, grounded).state
    expect(oneTick.shieldTicks).toBe(1)
    const expired = motor.step(oneTick, idle, grounded).state
    expect(expired.shieldTicks).toBe(0)

    const blocked = motor.applyDamage({ ...shielded, shieldTicks: 20 }, 5)
    expect(blocked.state.health).toBe(100)
    expect(blocked.state.shieldTicks).toBe(0)
  })
})
