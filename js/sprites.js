/* ====================================================================
 * sprites.js — 角色精灵加载 & 帧配置
 * ==================================================================== */

var DEBUG_SPRITES = false;
function loadSprites(){
  // 预加载游戏场景背景图
  Game.bgImg = new Image();
  Game.bgImg.src = 'images/game-bg.webp?v=1';

  // 关卡平台贴图缓存（按路径懒加载：关卡数据声明的 groundTex 路径 → 这里预加载）
  // 路径相对于 images/ 目录。每个关卡可以挂自己的贴图文件，互不影响。
  Game.texCache = {};
  Game.getTex = function(relPath){
    if (!relPath) return null;
    if (!Game.texCache[relPath]) {
      const img = new Image();
      img.src = 'images/' + relPath;
      Game.texCache[relPath] = img;
    }
    return Game.texCache[relPath];
  };
  // 预热：把所有关卡数据里可能用到的 groundTex 都提前加载好（避免进入关卡时白屏）
  // 注：levels.js 在 sprites.js 之前加载，LEVEL_MAPS 已初始化（const 但 scripts 共用全局作用域）
  if (typeof LEVEL_MAPS !== 'undefined' && LEVEL_MAPS.length) {
    for (const lvl of LEVEL_MAPS) {
      if (lvl && lvl.groundTex) Game.getTex(lvl.groundTex);
    }
  }
  // 兼容旧代码（仍保留 Game.groundTex 指针指向第一关的贴图，备用）
  Game.groundTex = Game.getTex('platform_tile_level1_periodic_organic_512x290.png');

  // ATP 能量图像
  Game.atpImg = new Image();
  Game.atpImg.src = 'images/atp.webp?v=1';

  // ===== WBC 完整动作精灵系统 v3 =====
  Game.wbcActions = new Image();
  Game.wbcActions.src = 'images/sprites/wbc-actions.webp?v=2';
  Game.wbcActions.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 动作精灵(右)加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcActionsLeft = new Image();
  Game.wbcActionsLeft.src = 'images/sprites/wbc-actions-left.webp?v=2';
  Game.wbcActionsLeft.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 动作精灵(左)加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  Game.wbcWalkRight = new Image();
  Game.wbcWalkRight.src = 'images/sprites/wbc-walk-right-v3.webp?v=2';
  Game.wbcWalkRight.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 右走v3加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcWalkLeft = new Image();
  Game.wbcWalkLeft.src = 'images/sprites/wbc-walk-left-v3.webp?v=2';
  Game.wbcWalkLeft.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 左走v3加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  // ★ 奔跑（双击方向键触发）：v2 - 2 帧左右脚相反步态交替循环，去掉站姿过渡帧
  Game.wbcRunRight = new Image();
  Game.wbcRunRight.src = 'images/sprites/wbc-run-right-v2.webp?v=1';
  Game.wbcRunRight.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 右跑v2加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcRunLeft = new Image();
  Game.wbcRunLeft.src = 'images/sprites/wbc-run-left-v2.webp?v=1';
  Game.wbcRunLeft.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 左跑v2加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  Game.wbcIdleRight = new Image();
  Game.wbcIdleRight.src = 'images/sprites/wbc-idle-right.webp?v=1';
  Game.wbcIdleRight.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 右idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcIdleLeft = new Image();
  Game.wbcIdleLeft.src = 'images/sprites/wbc-idle-left.webp?v=1';
  Game.wbcIdleLeft.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 左idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  Game.wbcJump = new Image();
  Game.wbcJump.src = 'images/sprites/wbc-jump.webp?v=4';
  Game.wbcJump.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 跳起加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  Game.wbcCrouch = new Image();
  Game.wbcCrouch.src = 'images/sprites/wbc-crouch.webp?v=2';
  Game.wbcCrouch.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 蹲下加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  Game.wbcAttackRight = new Image();
  Game.wbcAttackRight.src = 'images/sprites/wbc-attack-right.webp?v=2';
  Game.wbcAttackRight.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 右attack加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcAttackLeft = new Image();
  Game.wbcAttackLeft.src = 'images/sprites/wbc-attack-left.webp?v=2';
  Game.wbcAttackLeft.onload = function(){ DEBUG_SPRITES && console.log('[WBC] 左attack加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  // WBC 帧配置
  Game.wbcActionFrameSize = { w: 441, h: 461 };
  Game.wbcWalkFrameSize = { w: 248, h: 372 };
  Game.wbcRunFrameSize  = { w: 248, h: 372 };  // 奔跑：与走路同尺寸（参考 GIF 拆分 6 帧）
  Game.wbcIdleFrameSize = { w: 248, h: 372 };
  Game.wbcJumpFrameSize = { w: 248, h: 372 };
  Game.wbcCrouchFrameSize = { w: 248, h: 372 };
  Game.wbcAttackFrameSize = { w: 435, h: 372 };

  Game.wbcSpriteFrames = {
    idle: [0],
    walk: [0,1,2,3,4,5],
    run:  [0,1,2,3,4,5],   // 奔跑帧序：与走路 6 帧对应，但内容是 GIF 跑酷模组
    jump: [0],
    crouch: [0],
    attack: [0, 0],
    hurt: [11]
  };

  // PLT 血小板精灵
  Game.pltSprite = new Image();
  Game.pltSprite.src = 'images/sprites/v1-plt.webp?v=1';
  Game.pltSprite.onload = function(){ DEBUG_SPRITES && console.log('[PLT] v1精灵加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.pltSpriteFrames = { idle: [0,1], run: [4,5,6,7], jump: [8,9,10,11], attack: [12,13,14,15] };
  Game.pltFrameSize = { w: 256, h: 256 };

  // RBC 红细胞精灵
  Game.rbcSprite = new Image();
  Game.rbcSprite.src = 'images/sprites/v1-rbc.webp?v=1';
  Game.rbcSprite.onload = function(){ DEBUG_SPRITES && console.log('[RBC] v1精灵加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcSpriteFrames = { idle: [0,1], run: [4,5,6,7], jump: [8,9,10,11], attack: [12,13,14,15] };
  Game.rbcFrameSize = { w: 256, h: 256 };

  // RBC 走路
  Game.rbcWalkRight = new Image();
  Game.rbcWalkRight.src = 'images/sprites/rbc-walk-right-v1.webp?v=8';
  Game.rbcWalkRight.onload = function(){ DEBUG_SPRITES && console.log('[RBC] 右走v7加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcWalkLeft = new Image();
  Game.rbcWalkLeft.src = 'images/sprites/rbc-walk-left-v1.webp?v=8';
  Game.rbcWalkLeft.onload = function(){ DEBUG_SPRITES && console.log('[RBC] 左走v7加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcWalkFrameSize = { w: 256, h: 372 };
  Game.rbcWalkSpriteFrames = [0, 1, 2, 3, 4, 5];

  // ★ RBC 奔跑（双击方向键触发）：v1 - 2 帧左右脚相反步态交替循环，参考红细胞奔跑 GIF
  //   与白细胞 v2 手法一致：仅取 GIF 里左右脚相反方向的两帧，6 帧 [A,B,A,B,A,B] 循环
  Game.rbcRunRight = new Image();
  Game.rbcRunRight.src = 'images/sprites/rbc-run-right-v1.webp?v=2';
  Game.rbcRunRight.onload = function(){ DEBUG_SPRITES && console.log('[RBC] 右跑v1加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcRunLeft = new Image();
  Game.rbcRunLeft.src = 'images/sprites/rbc-run-left-v1.webp?v=2';
  Game.rbcRunLeft.onload = function(){ DEBUG_SPRITES && console.log('[RBC] 左跑v1加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcRunFrameSize = { w: 248, h: 372 };
  Game.rbcRunSpriteFrames = [0, 1, 2, 3, 4, 5];  // 6 帧 [A,B,A,B,A,B] 经典 2 帧跑动循环

  // RBC idle
  Game.rbcIdleRight = new Image();
  Game.rbcIdleRight.src = 'images/sprites/rbc-idle-right-v1.webp?v=2';
  Game.rbcIdleRight.onload = function(){ DEBUG_SPRITES && console.log('[RBC] 右idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcIdleLeft = new Image();
  Game.rbcIdleLeft.src = 'images/sprites/rbc-idle-left-v1.webp?v=2';
  Game.rbcIdleLeft.onload = function(){ DEBUG_SPRITES && console.log('[RBC] 左idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcIdleFrameSize = { w: 256, h: 372 };

  // RBC jump
  Game.rbcJump = new Image();
  Game.rbcJump.src = 'images/sprites/rbc-jump-v1.webp?v=1';
  Game.rbcJump.onload = function(){ DEBUG_SPRITES && console.log('[RBC] 跳起加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcJumpFrameSize = { w: 275, h: 372 };

  // RBC crouch
  Game.rbcCrouch = new Image();
  Game.rbcCrouch.src = 'images/sprites/rbc-crouch-v1.webp?v=1';
  Game.rbcCrouch.onload = function(){ DEBUG_SPRITES && console.log('[RBC] 蹲下加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcCrouchFrameSize = { w: 1436, h: 2303 };
}
