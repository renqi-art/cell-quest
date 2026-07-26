import { describe, expect, it } from 'vitest'
import { computeCameraTarget } from '@/shared/classic/simulation/CameraDirector'

const viewport = { width: 800, height: 480 }
const world = { width: 3200, height: 960 }

describe('classic camera director', () => {
  it('smooths one player, clamps to world bounds, and can snap on respawn', () => {
    const previous = {
      centerX: 400,
      centerY: 240,
      zoom: 1,
      shake: null,
      snap: false,
    } as const
    const smooth = computeCameraTarget([{ x: 1200, y: 300 }], viewport, world, previous)
    expect(smooth.centerX).toBeGreaterThan(400)
    expect(smooth.centerX).toBeLessThan(1200)
    const snapped = computeCameraTarget(
      [{ x: 3100, y: 900 }],
      viewport,
      world,
      previous,
      { snap: true },
    )
    expect(snapped.centerX).toBeLessThanOrEqual(2800)
    expect(snapped.centerY).toBeLessThanOrEqual(720)
    expect(snapped.snap).toBe(true)
  })

  it('centers two players and clamps zoom to the supported range', () => {
    const directive = computeCameraTarget(
      [{ x: 400, y: 240 }, { x: 1600, y: 600 }],
      viewport,
      world,
      null,
      { snap: true },
    )
    expect(directive.centerX).toBe(1000)
    expect(directive.centerY).toBe(420)
    expect(directive.zoom).toBeGreaterThanOrEqual(0.65)
    expect(directive.zoom).toBeLessThanOrEqual(1)
  })

  it('freezes while paused and applies shake priority, decay, and reduced motion', () => {
    const shaken = computeCameraTarget(
      [{ x: 600, y: 240 }],
      viewport,
      world,
      null,
      { snap: true, shake: { durationMs: 200, intensity: 0.02 } },
    )
    const lowerPriority = computeCameraTarget(
      [{ x: 900, y: 240 }],
      viewport,
      world,
      shaken,
      { shake: { durationMs: 100, intensity: 0.01 } },
    )
    expect(lowerPriority.shake!.intensity).toBeCloseTo(0.017)
    const frozen = computeCameraTarget(
      [{ x: 1400, y: 240 }],
      viewport,
      world,
      lowerPriority,
      { paused: true },
    )
    expect(frozen.centerX).toBe(lowerPriority.centerX)
    const reduced = computeCameraTarget(
      [{ x: 600, y: 240 }],
      viewport,
      world,
      null,
      { snap: true, reducedMotion: true, shake: { durationMs: 200, intensity: 0.02 } },
    )
    expect(reduced.shake!.intensity).toBe(0.004)
  })
})
