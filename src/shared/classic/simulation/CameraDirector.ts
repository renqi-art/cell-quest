export interface CameraPoint {
  readonly x: number
  readonly y: number
}

export interface CameraSize {
  readonly width: number
  readonly height: number
}

export interface CameraShake {
  readonly durationMs: number
  readonly intensity: number
}

export interface CameraDirective {
  readonly centerX: number
  readonly centerY: number
  readonly zoom: number
  readonly shake: CameraShake | null
  readonly snap: boolean
}

export interface CameraRequest {
  readonly paused?: boolean
  readonly snap?: boolean
  readonly reducedMotion?: boolean
  readonly shake?: CameraShake
}

const MIN_ZOOM = 0.65
const MAX_ZOOM = 1
const SMOOTHING = 0.15

export function computeCameraTarget(
  players: readonly CameraPoint[],
  viewport: CameraSize,
  world: CameraSize,
  previous: CameraDirective | null,
  request: CameraRequest = {},
): CameraDirective {
  if (request.paused && previous) return { ...previous, snap: false }

  const points = players.length > 0 ? players : [{ x: viewport.width / 2, y: viewport.height / 2 }]
  const minX = Math.min(...points.map(point => point.x))
  const maxX = Math.max(...points.map(point => point.x))
  const minY = Math.min(...points.map(point => point.y))
  const maxY = Math.max(...points.map(point => point.y))
  const targetX = (minX + maxX) / 2
  const targetY = (minY + maxY) / 2
  const spanX = maxX - minX
  const spanY = maxY - minY
  const zoom = points.length === 1
    ? 1
    : clamp(
        Math.min(
          viewport.width / Math.max(1, spanX + 320),
          viewport.height / Math.max(1, spanY + 220),
        ),
        MIN_ZOOM,
        MAX_ZOOM,
      )
  const snap = request.snap === true || !previous
  const smoothedX = snap ? targetX : lerp(previous.centerX, targetX, SMOOTHING)
  const smoothedY = snap ? targetY : lerp(previous.centerY, targetY, SMOOTHING)
  const halfWidth = viewport.width / (2 * zoom)
  const halfHeight = viewport.height / (2 * zoom)
  const centerX = clampCenter(smoothedX, halfWidth, world.width)
  const centerY = clampCenter(smoothedY, halfHeight, world.height)

  const previousShake = decayShake(previous?.shake ?? null)
  const incomingShake = request.shake
    ? {
        durationMs: request.shake.durationMs,
        intensity: request.shake.intensity * (request.reducedMotion ? 0.2 : 1),
      }
    : null
  const shake = incomingShake && (!previousShake || incomingShake.intensity >= previousShake.intensity)
    ? incomingShake
    : previousShake

  return { centerX, centerY, zoom, shake, snap }
}

function decayShake(shake: CameraShake | null): CameraShake | null {
  if (!shake) return null
  const durationMs = Math.max(0, shake.durationMs - 16)
  const intensity = shake.intensity * 0.85
  return durationMs > 0 && intensity >= 0.0005 ? { durationMs, intensity } : null
}

function clampCenter(value: number, halfExtent: number, worldExtent: number): number {
  if (worldExtent <= halfExtent * 2) return worldExtent / 2
  return clamp(value, halfExtent, worldExtent - halfExtent)
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}
