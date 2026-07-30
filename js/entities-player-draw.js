/* ====================================================================
 * entities-player-draw.js — Player.prototype.draw() 角色绘制
 * ==================================================================== */

Player.prototype.draw = function(ctx, camX) {
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y);
    const cell = this.cell;
    // 输入状态引用（与 update() 保持一致；draw() 内不能访问 update 的局部 k）
    const k = this.playerIndex === 1 ? Game.keysP2 : Game.keys;

    // 无敌闪烁
    if(this.invincible>0){const r=this.invincible>30?4:Math.max(1,Math.floor(this.invincible/8));if(Math.floor(this.invincible/r)%2===0)return;}

    // AoE buff光环
    if(this.aoeStomp > 0){
      ctx.save();
      const pulse = 0.2 + Math.sin(this.animT * 0.2) * 0.1;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = C.aoeBuff;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px + this.w/2, py + this.h/2, AOE_RADIUS * 0.4, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    // 护盾光环
    if(this.shield > 0){
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(this.animT * 0.2) * 0.15;
      ctx.fillStyle = C.shield;
      ctx.beginPath();
      ctx.arc(px + this.w/2, py + this.h/2, this.w * 0.9, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // 氧气光环
    if(this.oxygen > 0){
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = C.oxygen;
      ctx.beginPath();
      ctx.arc(px + this.w/2, py + this.h/2, this.w + 4, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // 氧气压制领域（大范围淡蓝光晕）
    if(Game.oxyField){
      const fcx = px + this.w/2, fcy = py + this.h/2;
      ctx.save();
      ctx.globalAlpha = 0.06 + Math.sin(this.animT * 0.08) * 0.03;
      ctx.fillStyle = C.oxyField;
      ctx.beginPath(); ctx.arc(fcx, fcy, 80, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.2 + Math.sin(this.animT * 0.12) * 0.08;
      ctx.strokeStyle = C.oxyFieldGlow;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fcx, fcy, 78 + Math.sin(this.animT * 0.15) * 4, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // 突进残影
    if(this.dashTimer > 0){
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = cell.color;
      ctx.fillRect(px - this.dashDir * 8, py, this.w, this.h);
      ctx.fillRect(px - this.dashDir * 16, py, this.w, this.h);
      ctx.restore();
    }

    // 挥剑特效
    if(this.swordTimer > 0){
      const t = 1 - this.swordTimer / SWORD_DURATION;
      ctx.save();
      ctx.translate(px + this.w/2, py + this.h/2);
      ctx.scale(this.facing, 1);
      const angle = -Math.PI/3 + t * Math.PI * 0.8;
      ctx.rotate(angle);
      ctx.globalAlpha = (1 - t) * 0.9;
      // 剑刃
      ctx.fillStyle = C.sword;
      ctx.beginPath();
      ctx.moveTo(10, -3);
      ctx.lineTo(SWORD_RANGE, -1);
      ctx.lineTo(SWORD_RANGE + 4, 0);
      ctx.lineTo(SWORD_RANGE, 1);
      ctx.lineTo(10, 3);
      ctx.closePath();
      ctx.fill();
      // 剑光
      ctx.globalAlpha = (1 - t) * 0.4;
      ctx.fillStyle = C.swordGlow;
      ctx.fillRect(10, -6, SWORD_RANGE, 12);
      ctx.restore();
    }

    // 细胞身体
    const cx = px + this.w/2;
    const cy = py + this.h/2;
    const r = this.w / 2;

    if(this.cellType === 1){
      // ===== WBC 完整动作系统 v3 =====
      // 状态判断
      let actionState = 'idle';
      if(this.swordTimer > 0) {
        actionState = 'attack';
      } else if(!this.onGround) {
        actionState = 'jump';
      } else if(this.crouching) {
        actionState = 'crouch';
      } else if(this.sprinting && (k.left || k.right || Math.abs(this.vx) > 0.3)) {
        // ★ 奔跑：双击方向键触发的奔跑模组，与走路完全不同
        //    只要 sprinting 为真且角色仍在移动（按键或仍有速度），就稳定保持大步奔跑，
        //    降低 vx 阈值避免起步/收尾微抖时闪回走路，全关卡表现一致。
        actionState = 'run';
      } else if(k.left || k.right || Math.abs(this.vx) > 1.2) {
        actionState = 'walk';
      }

      // 通用绘制：以 (px+w/2, py+h) 为脚底锚点，按朝向翻转
      const drawAt = (sprite, fw, fh, dispH, offsetY=0) => {
        const dispW = Math.floor(dispH * (fw / fh));
        ctx.save();
        const ax = Math.floor(px + this.w / 2);
        const ay = Math.floor(py + this.h) + offsetY;
        ctx.translate(ax, ay);
        // idle 用左右独立精灵图，不再翻转
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, 0, 0, fw, fh, Math.round(-dispW/2), Math.round(-dispH), dispW, dispH);
        ctx.restore();
      };

      const drawPlaceholder = () => {
        ctx.fillStyle = cell.color;
        ctx.beginPath();
        for(let i=0;i<8;i++){
          const a = (i/8)*Math.PI*2;
          const rr = r + Math.sin(this.animT*0.1+i)*1.5;
          const x = cx + Math.cos(a)*rr;
          const y = cy + Math.sin(a)*rr;
          if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = cell.nucleus;
        ctx.beginPath(); ctx.arc(cx, cy, r*0.4, 0, Math.PI*2); ctx.fill();
      };

      const TARGET_H = 80;

      // ★ 待机：专用 idle 精灵表（按朝向选 left/right）
      if(actionState === 'idle'){
        const idleL = Game.wbcIdleLeft, idleR = Game.wbcIdleRight;
        const useLeft = (this.facing === -1) && idleL && idleL.complete && idleL.naturalWidth > 0;
        const useRight = idleR && idleR.complete && idleR.naturalWidth > 0;
        if(useLeft){
          // 呼吸：每 90 帧上浮 1px
          const breath = (Math.floor(this.animT/90) % 2) ? -1 : 0;
          drawAt(idleL, Game.wbcIdleFrameSize.w, Game.wbcIdleFrameSize.h, TARGET_H, breath);
        } else if(useRight){
          const breath = (Math.floor(this.animT/90) % 2) ? -1 : 0;
          drawAt(idleR, Game.wbcIdleFrameSize.w, Game.wbcIdleFrameSize.h, TARGET_H, breath);
        } else {
          drawPlaceholder();
        }
      }
      // ★ 蹲下：专用 crouch 精灵表
      else if(actionState === 'crouch' && Game.wbcCrouch && Game.wbcCrouch.complete && Game.wbcCrouch.naturalWidth > 0){
        drawAt(Game.wbcCrouch, Game.wbcCrouchFrameSize.w, Game.wbcCrouchFrameSize.h, TARGET_H);
      }
      // ★ 跳起：专用 jump 精灵表
      else if(actionState === 'jump' && Game.wbcJump && Game.wbcJump.complete && Game.wbcJump.naturalWidth > 0){
        drawAt(Game.wbcJump, Game.wbcJumpFrameSize.w, Game.wbcJumpFrameSize.h, TARGET_H);
      }
      // ★ 攻击：专用 attack 精灵表（按 facing 选 left/right）
      else if(actionState === 'attack' && ((Game.wbcAttackRight && Game.wbcAttackRight.complete) || (Game.wbcAttackLeft && Game.wbcAttackLeft.complete))){
        const useLeft = (this.facing === -1) && Game.wbcAttackLeft && Game.wbcAttackLeft.complete && Game.wbcAttackLeft.naturalWidth > 0;
        const useRight = Game.wbcAttackRight && Game.wbcAttackRight.complete && Game.wbcAttackRight.naturalWidth > 0;
        const atkSprite = useLeft ? Game.wbcAttackLeft : (useRight ? Game.wbcAttackRight : Game.wbcAttackLeft);
        const atkFW = Game.wbcAttackFrameSize.w;
        const atkFH = Game.wbcAttackFrameSize.h;
        // sprite 435x372，人物身体大致在 sprite 中心，整体居中绘制（剑自然伸向前方）
        ctx.save();
        const ax = Math.floor(px + this.w / 2);
        const ay = Math.floor(py + this.h);
        ctx.translate(ax, ay);
        ctx.imageSmoothingEnabled = false;
        const dispH = TARGET_H;
        const dispW = Math.floor(dispH * (atkFW / atkFH));
        ctx.drawImage(atkSprite, 0, 0, atkFW, atkFH, Math.round(-dispW/2), Math.round(-dispH), dispW, dispH);
        ctx.restore();
      }
      // ★ 奔跑（双击方向键触发）：参考 GIF 的跑酷奔跑模组，6 帧循环
      //    与走路完全不同的步态：摆臂/大步/披风飘动；速度比走路更快（每 2 帧切一帧）
      else if(actionState === 'run' && Game.wbcRunRight && Game.wbcRunRight.complete && Game.wbcRunRight.naturalWidth > 0){
        const frames = Game.wbcSpriteFrames.run;
        const fidx = Math.floor(this.animT / 2) % frames.length;
        const col = frames[fidx];
        const fw = Game.wbcRunFrameSize.w;
        const fh = Game.wbcRunFrameSize.h;
        const dispH = TARGET_H;
        const dispW = Math.floor(dispH * (fw / fh));
        ctx.save();
        const ax = Math.floor(px + this.w / 2);
        const ay = Math.floor(py + this.h);
        ctx.translate(ax, ay);
        if(this.facing === -1) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(Game.wbcRunRight, col*fw, 0, fw, fh, Math.round(-dispW/2), Math.round(-dispH), dispW, dispH);
        ctx.restore();
      }
      // ★ 走路：6 帧 walk 精灵表循环
      else if(actionState === 'walk' && Game.wbcWalkRight && Game.wbcWalkRight.complete && Game.wbcWalkRight.naturalWidth > 0){
        const frames = Game.wbcSpriteFrames.walk;
        const fidx = Math.floor(this.animT / 3) % frames.length;
        const col = frames[fidx];
        const fw = Game.wbcWalkFrameSize.w;
        const fh = Game.wbcWalkFrameSize.h;
        const dispH = TARGET_H;
        const dispW = Math.floor(dispH * (fw / fh));
        ctx.save();
        const ax = Math.floor(px + this.w / 2);
        const ay = Math.floor(py + this.h);
        ctx.translate(ax, ay);
        if(this.facing === -1) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(Game.wbcWalkRight, col*fw, 0, fw, fh, Math.round(-dispW/2), Math.round(-dispH), dispW, dispH);
        ctx.restore();
      }
      // ★ 攻击/jump/crouch(无 fallback)/hurt：用 12 帧动作精灵表
      else if(Game.wbcActions && Game.wbcActions.complete && Game.wbcActions.naturalWidth > 0){
        const frames = Game.wbcSpriteFrames;
        const frameList = frames[actionState] || frames.idle;
        const tickDiv = (actionState === 'attack') ? 6 : 8;
        const fidx = Math.floor(this.animT / tickDiv) % frameList.length;
        const col = frameList[fidx];
        const fw = Game.wbcActionFrameSize.w;
        const fh = Game.wbcActionFrameSize.h;
        const dispH = TARGET_H;
        const dispW = Math.floor(dispH * (fw / fh));
        const offsetY = 0;
        ctx.save();
        const ax = Math.floor(px + this.w / 2);
        const ay = Math.floor(py + this.h) + offsetY;
        ctx.translate(ax, ay);
        if(this.facing === -1) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(Game.wbcActions, col*fw, 0, fw, fh, Math.round(-dispW/2), Math.round(-dispH), dispW, dispH);
        ctx.restore();
      }
      // 兜底圆形
      else {
        drawPlaceholder();
      }
    } else if(this.cellType === 2){
      // 血小板 - 使用 Aetherion 像素精灵图
      if(Game.pltSprite && Game.pltSprite.complete && Game.pltSprite.naturalWidth > 0){
        const sprite = Game.pltSprite;
        const fw = sprite.naturalWidth / 4;
        const fh = sprite.naturalHeight / 4;

        // 动画帧选择
        const frames = Game.pltSpriteFrames;
        let frameList = frames.idle;
        if(!this.onGround) frameList = frames.jump;
        else if(Math.abs(this.vx) > 0.5) frameList = frames.run;
        const fidx = Math.floor(this.animT / 6) % frameList.length;
        const frameNum = frameList[fidx];
        const col = frameNum % 4;
        const row = Math.floor(frameNum / 4);

        ctx.save();
        ctx.translate(px + this.w/2, py + this.h);
        ctx.scale(this.facing, 1);
        const drawW = this.w * 2.2;
        const drawH = this.h * 2.2;
        ctx.drawImage(
          sprite,
          col*fw, row*fh, fw, fh,
          -drawW/2, -drawH, drawW, drawH
        );
        ctx.restore();
      } else {
        // 精灵未加载时兜底：画原来的六边形
        ctx.fillStyle = cell.color;
        ctx.beginPath();
        for(let i=0;i<6;i++){
          const a = (i/6)*Math.PI*2;
          const rr = r + Math.sin(this.animT*0.15+i)*2;
          const x = cx + Math.cos(a)*rr;
          const y = cy + Math.sin(a)*rr;
          if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = cell.nucleus;
        ctx.beginPath(); ctx.arc(cx, cy, r*0.25, 0, Math.PI*2); ctx.fill();
      }
    } else {
      // 红细胞 - 使用 R-07 像素精灵图
      // ★ 蹲下：优先于走路判断
      if(this.crouching && this.onGround && Game.rbcCrouch && Game.rbcCrouch.complete && Game.rbcCrouch.naturalWidth > 0){
        const cfw = Game.rbcCrouchFrameSize.w;
        const cfh = Game.rbcCrouchFrameSize.h;
        const cdispH = 74;
        const cdispW = Math.floor(cdispH * (cfw / cfh));
        ctx.save();
        const cax = Math.floor(px + this.w / 2);
        const cay = Math.floor(py + this.h);
        ctx.translate(cax, cay);
        if(this.facing === 1) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(Game.rbcCrouch, 0, 0, cfw, cfh, Math.round(-cdispW/2), Math.round(-cdispH), cdispW, cdispH);
        ctx.restore();
      }
      // ★ 奔跑（双击方向键触发）：参考红细胞奔跑 GIF 的跑酷模组，6 帧 [A,B,A,B,A,B] 循环
      //    优先级在走路之前；与 WBC run 共享同一套状态机（sprinting），动画/步态与走路完全不同
      else if(this.sprinting && this.onGround && ((this.playerIndex===1?Game.keysP2:Game.keys).left || (this.playerIndex===1?Game.keysP2:Game.keys).right || Math.abs(this.vx) > 0.3) && Game.rbcRunRight && Game.rbcRunRight.complete && Game.rbcRunRight.naturalWidth > 0){
        const fw = Game.rbcRunFrameSize.w;
        const fh = Game.rbcRunFrameSize.h;
        const frames = Game.rbcRunSpriteFrames;
        const fidx = Math.floor(this.animT / 2) % frames.length;  // 每 2 帧切一帧，比 walk(/4)更快
        const col = frames[fidx];
        const dispH = 80;
        const dispW = Math.floor(dispH * (fw / fh));
        ctx.save();
        const ax = Math.floor(px + this.w / 2);
        const ay = Math.floor(py + this.h);
        ctx.translate(ax, ay);
        // 与 WBC 奔跑分支完全同构：底图为右朝向，向左跑时水平翻转
        if(this.facing === -1) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        // 精灵表已 bbox 裁切 + 底对齐，直接画即可
        ctx.drawImage(Game.rbcRunRight, col*fw, 0, fw, fh, Math.round(-dispW/2), Math.round(-dispH), dispW, dispH);
        ctx.restore();
      }
      // ★ 走路用 v1 6 帧 walk 精灵表循环（视频提取）
      else if(this.onGround && ((this.playerIndex===1?Game.keysP2:Game.keys).left || (this.playerIndex===1?Game.keysP2:Game.keys).right || Math.abs(this.vx) > 0.5) && Game.rbcWalkLeft && Game.rbcWalkLeft.complete && Game.rbcWalkLeft.naturalWidth > 0){
        // 逐帧角色bbox数据（在256x372源帧内），用于对齐消除抖动 + 脚贴地
        // [cx, bottom] — cx: 角色质心X, bottom: 角色bbox底部Y
        const RBC_D = [[94.5,345],[105.0,340],[119.0,344],[131.0,343],[144.5,340],[156.5,344]];
        const fw = Game.rbcWalkFrameSize.w;
        const fh = Game.rbcWalkFrameSize.h;
        const frames = Game.rbcWalkSpriteFrames;
        const fidx = Math.floor(this.animT / 4) % frames.length;
        const col = frames[fidx];
        const dispH = 80;
        const dispW = Math.floor(dispH * (fw / fh));
        const scale = dispH / fh;
        const d = RBC_D[fidx];
        // 水平对齐：角色质心对齐锚点
        const alignX = Math.round((fw/2 - d[0]) * (dispW / fw));
        // 垂直对齐：角色脚底贴地（补偿帧底部空白）
        const alignY = Math.round((fh - d[1]) * scale);
        ctx.save();
        const ax = Math.floor(px + this.w / 2);
        const ay = Math.floor(py + this.h);
        ctx.translate(ax, ay);
        // 左走精灵图：面朝左。往右走时水平翻转
        if(this.facing === 1) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(Game.rbcWalkLeft, col*fw, 0, fw, fh, Math.round(-dispW/2) + alignX, Math.round(-dispH) + alignY, dispW, dispH);
        ctx.restore();
      } else if(Game.rbcIdleRight && Game.rbcIdleRight.complete && Game.rbcIdleRight.naturalWidth > 0 && this.onGround && Math.abs(this.vx) <= 0.5){
        // ★ 用户提供的 idle 待机图（带左右朝向，呼吸效果）
        const idleL = Game.rbcIdleLeft, idleR = Game.rbcIdleRight;
        const useLeft = (this.facing === -1) && idleL && idleL.complete && idleL.naturalWidth > 0;
        const idleSprite = useLeft ? idleL : idleR;
        const ifw = Game.rbcIdleFrameSize.w;
        const ifh = Game.rbcIdleFrameSize.h;
        const idispH = 80;
        const idispW = Math.floor(idispH * (ifw / ifh));
        const breath = (Math.floor(this.animT/90) % 2) ? -1 : 0;
        // 角色bbox底部在源帧y=342，帧高372 → 补偿30px空白让脚贴地
        const idleFootY = Math.round((ifh - 342) * (idispH / ifh));
        ctx.save();
        const iax = Math.floor(px + this.w / 2);
        const iay = Math.floor(py + this.h) + breath;
        ctx.translate(iax, iay);
        // idle 用左右独立精灵图，不再翻转
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(idleSprite, 0, 0, ifw, ifh, Math.round(-idispW/2), Math.round(-idispH) + idleFootY, idispW, idispH);
        ctx.restore();
      } else if(!this.onGround && Game.rbcJump && Game.rbcJump.complete && Game.rbcJump.naturalWidth > 0){
        // ★ 用户提供的跳起精灵图（单帧，已缩放到与walk同等像素密度，372px高含上下留白）
        const jfw = Game.rbcJumpFrameSize.w;
        const jfh = Game.rbcJumpFrameSize.h;
        const jdispH = 80;
        const jdispW = Math.floor(jdispH * (jfw / jfh));
        ctx.save();
        // 空中状态：居中对齐碰撞盒，避免锚在脚底导致的视觉抖动
        const jax = Math.floor(px + this.w / 2);
        const jay = Math.floor(py + this.h / 2);
        ctx.translate(jax, jay);
        if(this.facing === 1) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(Game.rbcJump, 0, 0, jfw, jfh, Math.round(-jdispW/2), Math.round(-jdispH/2), jdispW, jdispH);
        ctx.restore();
      } else if(Game.rbcSprite && Game.rbcSprite.complete && Game.rbcSprite.naturalWidth > 0){
        const sprite = Game.rbcSprite;
        const fw = sprite.naturalWidth / 4;
        const fh = sprite.naturalHeight / 4;

        // 动画帧选择
        const frames = Game.rbcSpriteFrames;
        let frameList = frames.idle;
        if(!this.onGround) frameList = frames.jump;
        // 在地面且不移动 = idle；走路已用 v1 精灵表
        const fidx = Math.floor(this.animT / 6) % frameList.length;
        const frameNum = frameList[fidx];
        const col = frameNum % 4;
        const row = Math.floor(frameNum / 4);

        ctx.save();
        ctx.translate(px + this.w/2, py + this.h);
        ctx.scale(this.facing, 1);
        const drawW = this.w * 2.2;
        const drawH = this.h * 2.2;
        ctx.drawImage(
          sprite,
          col*fw, row*fh, fw, fh,
          -drawW/2, -drawH, drawW, drawH
        );
        ctx.restore();
      } else {
        // 精灵未加载时兜底：画原来的圆形
        ctx.fillStyle = cell.color;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = cell.nucleus;
        ctx.beginPath(); ctx.arc(cx, cy, r*0.4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = cell.color;
        ctx.beginPath(); ctx.arc(cx, cy, r*0.2, 0, Math.PI*2); ctx.fill();
      }
    }

    // 眼睛（仅精灵未加载或无精灵的细胞需要画眼睛）
    const spriteLoaded = (
      (this.cellType === 1 && ((Game.wbcActions && Game.wbcActions.complete && Game.wbcActions.naturalWidth > 0) ||
                                (Game.wbcWalkRight && Game.wbcWalkRight.complete && Game.wbcWalkRight.naturalWidth > 0) ||
                                (Game.wbcIdleRight && Game.wbcIdleRight.complete && Game.wbcIdleRight.naturalWidth > 0))) ||
      (this.cellType === 2 && Game.pltSprite && Game.pltSprite.complete && Game.pltSprite.naturalWidth > 0) ||
      (this.cellType === 3 && Game.rbcSprite && Game.rbcSprite.complete && Game.rbcSprite.naturalWidth > 0)
    );
    if(!spriteLoaded){
      ctx.fillStyle = '#222';
      const ex = cx + this.facing * 3;
      ctx.fillRect(ex-2, py + this.h*0.35, 3, 3);
      ctx.fillRect(ex+3, py + this.h*0.35, 3, 3);
    }

    // 二段跳指示
    if(!this.onGround && this.jumpsLeft > 0){
      ctx.save();
      const pulse = 0.4 + Math.sin(this.animT * 0.3) * 0.2;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = cell.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, py + this.h + 4, 8 + Math.sin(this.animT * 0.3) * 2, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    // 突进冷却指示
    if(this.dashCooldown > 0 && this.cellType === 1){
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = C.dim;
      ctx.fillRect(px, py - 6, this.w * (1 - this.dashCooldown / DASH_COOLDOWN), 2);
      ctx.restore();
    }
};

