import Phaser from 'phaser'
import {
  createProjectileState,
  stepProjectile,
  type ClassicProjectileState,
} from '@/shared/classic/simulation/ProjectileRules'

export class ProjectileActor {
  readonly shape: Phaser.GameObjects.Arc
  readonly body: Phaser.Physics.Arcade.Body
  private state: ClassicProjectileState | null = null

  constructor(scene: Phaser.Scene) {
    this.shape = scene.add.circle(-100, -100, 5, 0xffe66d)
    this.shape.setName('classic-projectile').setActive(false).setVisible(false)
    scene.physics.add.existing(this.shape)
    this.body = this.shape.body as Phaser.Physics.Arcade.Body
    this.body.setAllowGravity(false)
    this.body.enable = false
  }

  fire(x: number, y: number, direction: -1 | 1): void {
    this.state = createProjectileState({
      x,
      y,
      velocityX: direction * 6,
      velocityY: 0,
    })
    this.shape.setPosition(x, y).setActive(true).setVisible(true)
    this.body.enable = true
  }

  step(): void {
    if (!this.state?.active) return
    const result = stepProjectile(this.state, 'none')
    this.state = result.state
    this.shape.setPosition(result.state.x, result.state.y)
    this.body.updateFromGameObject()
    if (!result.state.active) this.deactivate()
  }

  hitTerrain(): boolean {
    return this.collide('terrain')
  }

  hitEnemy(): boolean {
    return this.collide('enemy')
  }

  isActive(): boolean {
    return this.state?.active === true
  }

  private collide(collision: 'terrain' | 'enemy'): boolean {
    if (!this.state?.active) return false
    const result = stepProjectile(this.state, collision)
    this.state = result.state
    this.deactivate()
    return true
  }

  private deactivate(): void {
    this.body.enable = false
    this.body.stop()
    this.shape.setActive(false).setVisible(false)
  }
}
