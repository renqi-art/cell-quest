import Phaser from 'phaser'
import { TideState, type TideResult } from '@/shared/classic/simulation/TideState'

export class TideSystem {
  private state = new TideState()
  private readonly overlay: Phaser.GameObjects.Rectangle | null

  constructor(scene: Phaser.Scene, enabled: boolean) {
    this.overlay = enabled
      ? scene.add.rectangle(400, 240, 800, 480, 0xd42642, 0).setScrollFactor(0).setDepth(50)
      : null
  }

  step(paused: boolean, healingProgress: number): TideResult | null {
    if (!this.overlay) return null
    this.state = new TideState(this.state.tick, healingProgress)
    const result = this.state.step(paused)
    this.state = result.state
    this.overlay.setAlpha(result.phase === 'surge' ? 0.08 : result.phase === 'warning' ? 0.035 : 0)
    return result
  }
}
