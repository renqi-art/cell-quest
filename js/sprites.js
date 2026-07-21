/* ====================================================================
 * sprites.js — 角色精灵加载 & 帧配置
 * ==================================================================== */

function loadSprites(){
  // 预加载游戏场景背景图
  Game.bgImg = new Image();
  Game.bgImg.src = 'images/game-bg.png';

  // ATP 能量图像
  Game.atpImg = new Image();
  Game.atpImg.src = 'images/atp.png';

  // ===== WBC 完整动作精灵系统 v3 =====
  Game.wbcActions = new Image();
  Game.wbcActions.src = 'images/sprites/wbc-actions.png?v=2';
  Game.wbcActions.onload = function(){ console.log('[WBC] 动作精灵(右)加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcActionsLeft = new Image();
  Game.wbcActionsLeft.src = 'images/sprites/wbc-actions-left.png?v=2';
  Game.wbcActionsLeft.onload = function(){ console.log('[WBC] 动作精灵(左)加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  Game.wbcWalkRight = new Image();
  Game.wbcWalkRight.src = 'images/sprites/wbc-walk-right-v3.png?v=2';
  Game.wbcWalkRight.onload = function(){ console.log('[WBC] 右走v3加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcWalkLeft = new Image();
  Game.wbcWalkLeft.src = 'images/sprites/wbc-walk-left-v3.png?v=2';
  Game.wbcWalkLeft.onload = function(){ console.log('[WBC] 左走v3加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  Game.wbcIdleRight = new Image();
  Game.wbcIdleRight.src = 'images/sprites/wbc-idle-right.png?v=1';
  Game.wbcIdleRight.onload = function(){ console.log('[WBC] 右idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcIdleLeft = new Image();
  Game.wbcIdleLeft.src = 'images/sprites/wbc-idle-left.png?v=1';
  Game.wbcIdleLeft.onload = function(){ console.log('[WBC] 左idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  Game.wbcJump = new Image();
  Game.wbcJump.src = 'images/sprites/wbc-jump.png?v=4';
  Game.wbcJump.onload = function(){ console.log('[WBC] 跳起加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  Game.wbcCrouch = new Image();
  Game.wbcCrouch.src = 'images/sprites/wbc-crouch.png?v=2';
  Game.wbcCrouch.onload = function(){ console.log('[WBC] 蹲下加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  Game.wbcAttackRight = new Image();
  Game.wbcAttackRight.src = 'images/sprites/wbc-attack-right.png?v=2';
  Game.wbcAttackRight.onload = function(){ console.log('[WBC] 右attack加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcAttackLeft = new Image();
  Game.wbcAttackLeft.src = 'images/sprites/wbc-attack-left.png?v=2';
  Game.wbcAttackLeft.onload = function(){ console.log('[WBC] 左attack加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  // WBC 帧配置
  Game.wbcActionFrameSize = { w: 441, h: 461 };
  Game.wbcWalkFrameSize = { w: 248, h: 372 };
  Game.wbcIdleFrameSize = { w: 248, h: 372 };
  Game.wbcJumpFrameSize = { w: 248, h: 372 };
  Game.wbcCrouchFrameSize = { w: 248, h: 372 };
  Game.wbcAttackFrameSize = { w: 435, h: 372 };

  Game.wbcSpriteFrames = {
    idle: [0],
    walk: [0,1,2,3,4,5],
    jump: [0],
    crouch: [0],
    attack: [0, 0],
    hurt: [11]
  };

  // PLT 血小板精灵
  Game.pltSprite = new Image();
  Game.pltSprite.src = 'images/sprites/v1-plt.png?v=1';
  Game.pltSprite.onload = function(){ console.log('[PLT] v1精灵加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.pltSpriteFrames = { idle: [0,1], run: [4,5,6,7], jump: [8,9,10,11], attack: [12,13,14,15] };
  Game.pltFrameSize = { w: 256, h: 256 };

  // RBC 红细胞精灵
  Game.rbcSprite = new Image();
  Game.rbcSprite.src = 'images/sprites/v1-rbc.png?v=1';
  Game.rbcSprite.onload = function(){ console.log('[RBC] v1精灵加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcSpriteFrames = { idle: [0,1], run: [4,5,6,7], jump: [8,9,10,11], attack: [12,13,14,15] };
  Game.rbcFrameSize = { w: 256, h: 256 };

  // RBC 走路
  Game.rbcWalkRight = new Image();
  Game.rbcWalkRight.src = 'images/sprites/rbc-walk-right-v1.png?v=8';
  Game.rbcWalkRight.onload = function(){ console.log('[RBC] 右走v7加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcWalkLeft = new Image();
  Game.rbcWalkLeft.src = 'images/sprites/rbc-walk-left-v1.png?v=8';
  Game.rbcWalkLeft.onload = function(){ console.log('[RBC] 左走v7加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcWalkFrameSize = { w: 256, h: 372 };
  Game.rbcWalkSpriteFrames = [0, 1, 2, 3, 4, 5];

  // RBC idle
  Game.rbcIdleRight = new Image();
  Game.rbcIdleRight.src = 'images/sprites/rbc-idle-right-v1.png?v=2';
  Game.rbcIdleRight.onload = function(){ console.log('[RBC] 右idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcIdleLeft = new Image();
  Game.rbcIdleLeft.src = 'images/sprites/rbc-idle-left-v1.png?v=2';
  Game.rbcIdleLeft.onload = function(){ console.log('[RBC] 左idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcIdleFrameSize = { w: 256, h: 372 };

  // RBC jump
  Game.rbcJump = new Image();
  Game.rbcJump.src = 'images/sprites/rbc-jump-v1.png?v=1';
  Game.rbcJump.onload = function(){ console.log('[RBC] 跳起加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcJumpFrameSize = { w: 275, h: 372 };

  // RBC crouch
  Game.rbcCrouch = new Image();
  Game.rbcCrouch.src = 'images/sprites/rbc-crouch-v1.png?v=1';
  Game.rbcCrouch.onload = function(){ console.log('[RBC] 蹲下加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcCrouchFrameSize = { w: 1436, h: 2303 };
}
