import Phaser from 'phaser'

/**
 * Tiled 地图加载演示场景
 * - preload：加载 Tiled 导出的 JSON 地图与瓦片集图片
 * - create：创建 Ground 地面层与 Collision 碰撞层，碰撞层开启碰撞，玩家绑定碰撞
 * 图层名称严格使用英文：Ground（地面层）、Collision（碰撞层）
 */
export class TiledDemoScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private statusText!: Phaser.GameObjects.Text

  constructor() {
    super('TiledDemoScene')
  }

  preload(): void {
    // 1) Tiled 导出的 JSON 地图（CSV 编码、瓦片集内嵌于地图）
    this.load.tilemapTiledJSON('level1', 'assets/maps/level1.json')
    // 2) 瓦片集图片（key 与地图 JSON 中 tileset.name 保持一致）
    this.load.image('tiles', 'assets/maps/tileset.png')

    // 玩家贴图在代码内生成，避免额外资源请求导致 404
    const g = this.add.graphics()
    g.fillStyle(0xffd23f, 1)
    g.fillRoundedRect(0, 0, 24, 30, 6)
    g.fillStyle(0x1b1b1b, 1)
    g.fillRect(6, 9, 4, 4)
    g.fillRect(14, 9, 4, 4)
    g.generateTexture('player', 24, 30)
    g.destroy()
  }

  create(): void {
    // 解析地图
    const map = this.make.tilemap({ key: 'level1' })
    const tileset = map.addTilesetImage('tiles', 'tiles')
    if (!tileset) {
      throw new Error('瓦片集加载失败：请确认 assets/maps/tileset.png 可访问')
    }

    // Ground 地面层（可见）
    const ground = map.createLayer('Ground', tileset)
    if (!ground) throw new Error('未找到 Ground 图层')

    // Collision 碰撞层（不可见，仅用于碰撞检测）
    const collision = map.createLayer('Collision', tileset)
    if (!collision) throw new Error('未找到 Collision 图层')
    collision.setVisible(false)
    // 开启碰撞：除空白(-1)外的所有瓦片均参与碰撞
    collision.setCollisionByExclusion([-1])

    // 世界与相机边界对齐地图像素尺寸
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    // 玩家角色
    this.player = this.physics.add.sprite(80, 64, 'player')
    this.player.setCollideWorldBounds(true)
    // 给玩家绑定碰撞检测
    this.physics.add.collider(this.player, collision)

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    this.cursors = this.input.keyboard!.createCursorKeys()

    this.statusText = this.add.text(8, 8,
      'Tiled 地图已加载 · 方向键 ← → 移动 · 图层: Ground / Collision',
      { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(1000)

    console.log('[TiledDemo] 地图加载完成：', {
      width: map.width, height: map.height,
      tileWidth: map.tileWidth, tileHeight: map.tileHeight,
      layers: map.layers.map(l => l.name),
    })
  }

  override update(): void {
    const speed = 140
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed)
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed)
    } else {
      this.player.setVelocityX(0)
    }
  }
}
