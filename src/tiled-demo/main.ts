import Phaser from 'phaser'
import { TiledDemoScene } from './TiledDemoScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: 'game-container',
  width: 800,
  height: 608,
  backgroundColor: '#0b1020',
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 600 },
      debug: false,
    },
  },
  scene: [TiledDemoScene],
}

// 启动游戏
new Phaser.Game(config)
