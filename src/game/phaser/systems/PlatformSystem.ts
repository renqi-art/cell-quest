import Phaser from 'phaser'
import {
  floatingPlatformY,
  stepCrumblePlatform,
  type CrumblePlatformState,
} from '@/shared/classic/simulation/CrumblePlatformState'
import type { ClassicFloatingPlatformDefinition } from '@/shared/classic/types'
import { CLASSIC_TILE_SIZE } from '../config/classic-physics'

interface CrumbleRuntime {
  readonly object: Phaser.GameObjects.GameObject
  state: CrumblePlatformState
}

interface FloatingRuntime {
  readonly object: Phaser.GameObjects.Rectangle
  readonly body: Phaser.Physics.Arcade.Body
  readonly definition: ClassicFloatingPlatformDefinition
}

export class PlatformSystem {
  readonly floatingGroup: Phaser.Physics.Arcade.Group
  private readonly crumble = new Map<Phaser.GameObjects.GameObject, CrumbleRuntime>()
  private readonly floating: FloatingRuntime[] = []

  constructor(
    private readonly scene: Phaser.Scene,
    crumbleGroup: Phaser.Physics.Arcade.StaticGroup,
    definitions: readonly ClassicFloatingPlatformDefinition[],
  ) {
    crumbleGroup.getChildren().forEach((object) => {
      this.crumble.set(object, {
        object,
        state: { phase: 'solid', ticksRemaining: 0 },
      })
    })
    this.floatingGroup = scene.physics.add.group({ allowGravity: false, immovable: true })
    definitions.forEach(definition => this.createFloating(definition))
  }

  contactCrumble(object: Phaser.GameObjects.GameObject): void {
    const runtime = this.crumble.get(object)
    if (!runtime) return
    runtime.state = stepCrumblePlatform(runtime.state, true)
  }

  fixedUpdate(tick: number): void {
    for (const runtime of this.crumble.values()) {
      const previousPhase = runtime.state.phase
      runtime.state = stepCrumblePlatform(runtime.state, false)
      if (runtime.state.phase !== previousPhase) this.applyCrumblePhase(runtime)
    }
    for (const runtime of this.floating) {
      const y = floatingPlatformY({
        baseY: runtime.definition.y,
        range: runtime.definition.range,
        speed: runtime.definition.speed,
        phase: runtime.definition.phase ?? 0,
      }, tick)
      runtime.object.setY(y)
      runtime.body.updateFromGameObject()
      runtime.body.setVelocityY(0)
    }
  }

  private createFloating(definition: ClassicFloatingPlatformDefinition): void {
    const object = this.scene.add.rectangle(
      definition.x,
      definition.y,
      CLASSIC_TILE_SIZE,
      12,
      0x55a6b0,
    )
    object.setName('classic-floating-platform')
    this.floatingGroup.add(object)
    const body = object.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setImmovable(true)
    this.floating.push({ object, body, definition })
  }

  private applyCrumblePhase(runtime: CrumbleRuntime): void {
    const visible = runtime.state.phase !== 'gone'
    const object = runtime.object as unknown as Phaser.GameObjects.Components.Visible & {
      readonly body?: Phaser.Physics.Arcade.StaticBody
      setAlpha(value: number): unknown
    }
    object.setVisible(visible)
    object.setAlpha(runtime.state.phase === 'shaking' ? 0.55 : 1)
    if (object.body) {
      object.body.enable = visible
      if (visible) object.body.updateFromGameObject()
    }
  }
}
