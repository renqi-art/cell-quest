import Phaser from 'phaser'
import {
  computeCameraTarget,
  type CameraDirective,
} from '@/shared/classic/simulation/CameraDirector'

export interface CameraSystemPlayer {
  readonly x: number
  readonly y: number
}

export class CameraSystem {
  private directive: CameraDirective | null = null

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly world: { readonly width: number; readonly height: number },
  ) {}

  step(
    players: readonly CameraSystemPlayer[],
    options: { readonly snap?: boolean; readonly paused?: boolean } = {},
  ): CameraDirective {
    const next = computeCameraTarget(
      players,
      { width: this.camera.width, height: this.camera.height },
      this.world,
      this.directive,
      options,
    )
    this.directive = next
    this.camera.setZoom(next.zoom)
    this.camera.centerOn(next.centerX, next.centerY)
    if (next.shake) this.camera.shake(next.shake.durationMs, next.shake.intensity)
    return next
  }

  requestShake(durationMs: number, intensity: number, reducedMotion = false): void {
    this.directive = computeCameraTarget(
      this.directive ? [{ x: this.directive.centerX, y: this.directive.centerY }] : [],
      { width: this.camera.width, height: this.camera.height },
      this.world,
      this.directive,
      { snap: true, reducedMotion, shake: { durationMs, intensity } },
    )
  }
}
