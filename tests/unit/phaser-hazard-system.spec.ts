import { describe, expect, it, vi } from 'vitest'
import { HazardSystem, type HazardActorPort } from '@/game/phaser/systems/HazardSystem'

function actor(): HazardActorPort {
  return {
    applyDamage: vi.fn(() => true),
    launch: vi.fn(),
    activateCheckpoint: vi.fn(() => true),
  }
}

describe('HazardSystem collision seam', () => {
  it('routes spike damage and respects actor invincibility rejection', () => {
    const player = actor()
    const system = new HazardSystem()

    expect(system.applyTile(player, '^')).toBe('damage')
    expect(player.applyDamage).toHaveBeenCalledWith(5)
    vi.mocked(player.applyDamage).mockReturnValue(false)
    expect(system.applyTile(player, '^')).toBeNull()
  })

  it('launches both spring variants', () => {
    const player = actor()
    const system = new HazardSystem()

    expect(system.applyTile(player, 'V')).toBe('launch')
    expect(system.applyTile(player, 'J')).toBe('launch')
    expect(player.launch).toHaveBeenNthCalledWith(1, -14)
    expect(player.launch).toHaveBeenNthCalledWith(2, -16)
  })

  it('activates a checkpoint only when the actor accepts it', () => {
    const player = actor()
    const system = new HazardSystem()

    expect(system.activateCheckpoint(player, { col: 7, row: 4 })).toBe(true)
    vi.mocked(player.activateCheckpoint).mockReturnValue(false)
    expect(system.activateCheckpoint(player, { col: 7, row: 4 })).toBe(false)
  })
})
