/* ====================================================================
 * entities.js — 玩家、敌人、道具、子弹、粒子、临时平台、浮动平台
 * ==================================================================== */

// ===== 玩家 =====
class Player {
  constructor(x, y){
    this.x = x; this.y = y;
    this.w = PLAYER_W; this.h = STAND_H;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.crouching = false;
    this.facing = 1;
    this.cellType = 1;           // 1=WBC 2=PLT 3=RBC
    this.health = 3;
    this.maxHealth = 3;
    this.invincible = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpsLeft = 1;          // 二段跳：空中还可跳1次
    this.shield = 0;             // 护盾剩余帧
    this.oxygen = 0;             // 氧气回血剩余帧
    this.complementAmmo = 0;     // 补体弹药
    this.onBloodLoss = false;
    this.spawnX = x; this.spawnY = y;
    this.checkpointX = x; this.checkpointY = y;
    this.animT = 0;
    // 突进
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDir = 0;
    // AoE踩踏buff
    this.aoeStomp = 0;
    // 氧气领域计时
    this.oxyFieldTimer = 0;
    // 脓液地块效果
    this.onPus = false;
    // 挥剑
    this.swordTimer = 0;
    this.swordCooldown = 0;
  }

  get cell(){ return CELLS[this.cellType]; }

  switchCell(type){
    if(type === this.cellType) return;
    this.cellType = type;
    Sfx.switchCell();
    spawnParticles(this.x + this.w/2, this.y + this.h/2, this.cell.color, 10, 2);
  }

  update(level){
    const k = Game.keys;
    const cell = this.cell;
    this.animT++;

    // ===== 突进状态 =====
    if(this.dashTimer > 0){
      this.dashTimer--;
      this.vx = this.dashDir * DASH_SPEED;
      this.vy = 0; // 突进时不受重力
      // 突进中碰撞
      this.x += this.vx;
      this.collideX(level);
      // 突进踩踏
      for(const e of level.enemies){
        if(!e.alive) continue;
        if(rectOverlap(this, e)){
          if(e.type === 'staph' || e.type === 'strep'){
            e.hp = 0; e.alive = false;
            if(e.isLarge) e.split(level);
            spawnParticles(e.x+e.w/2, e.y, e.type==='staph'?C.staph:C.strep, 14, 3);
            Game.stats.kills++;
            spawnPusIfNeeded(e);
          }
        }
      }
      // 突进对Boss造成伤害
      if(Game.boss && Game.boss.alive && rectOverlap(this, Game.boss)){
        Game.boss.hp -= 2;
        Game.boss.flashTimer = 8;
        spawnParticles(Game.boss.x+Game.boss.w/2, Game.boss.y+Game.boss.h/2, C.swordGlow, 12, 3);
        if(Game.boss.hp <= 0){
          Game.boss.alive = false;
          Game.stats.kills++;
          spawnParticles(Game.boss.x+Game.boss.w/2, Game.boss.y+Game.boss.h/2, C.boss, 30, 5);
          Sfx.complete();
          showToast('Boss 已击杀！');
        }
      }
      if(this.dashTimer <= 0) this.vx *= 0.3;
      Game.prevKeys = {...Game.keys};
      return; // 突进中跳过其他逻辑
    }
    if(this.dashCooldown > 0) this.dashCooldown--;

    // ===== 挥剑计时 =====
    if(this.swordTimer > 0) this.swordTimer--;
    if(this.swordCooldown > 0) this.swordCooldown--;

    // ===== AoE踩踏buff计时 =====
    if(this.aoeStomp > 0) this.aoeStomp--;

    // ===== 蹲下判定 =====
    const grounded = this.onGround || this.coyote > 0;
    if(k.down && grounded && !this.crouching){
      this.crouching = true;
      this.h = CROUCH_H;
      this.y += STAND_H - CROUCH_H;
      const feetRow = Math.floor((this.y + this.h) / TILE);
      const c1 = Math.floor(this.x / TILE);
      const c2 = Math.floor((this.x + this.w - 1) / TILE);
      for(let c = c1; c <= c2; c++){
        if(level.solidAt(c, feetRow)){
          this.y = feetRow * TILE - this.h;
          break;
        }
      }
    }
    if(!k.down && this.crouching){
      if(!level.solidAtPX(this.x, this.y - (STAND_H - CROUCH_H), this.w, STAND_H)){
        this.y -= STAND_H - CROUCH_H;
        this.h = STAND_H;
        this.crouching = false;
      }
    }

    // ===== 水平移动 =====
    let speedMul = cell.speedMul;
    if(Game.globalEnergy < LOW_ENERGY) speedMul *= LOW_SPEED_MULT;
    if(this.onBloodLoss) speedMul *= 0.85;
    // 潮涌时额外减速
    if(this.onBloodLoss && level.isTideSurge()) speedMul *= TIDE_SPEED_MULT;
    if(this.crouching && this.onGround) speedMul *= CROUCH_SPEED;
    // 脓液地块减速
    if(this.onPus) speedMul *= PUS_SLOW_MULT;

    if(k.left){ this.vx -= MOVE_ACCEL * speedMul; this.facing = -1; }
    if(k.right){ this.vx += MOVE_ACCEL * speedMul; this.facing = 1; }
    this.vx *= this.onGround ? GROUND_FRICTION : AIR_FRICTION;
    const maxV = MOVE_MAX * speedMul;
    if(this.vx > maxV) this.vx = maxV;
    if(this.vx < -maxV) this.vx = -maxV;
    if(Math.abs(this.vx) < 0.05) this.vx = 0;

    // ===== 跳跃（变跳高 + 土狼时间 + 跳跃缓冲 + 二段跳） =====
    if(k.jump && !Game.prevKeys.jump) this.jumpBuffer = JUMP_BUFFER;
    if(this.jumpBuffer > 0) this.jumpBuffer--;
    if(this.coyote > 0) this.coyote--;

    if(this.jumpBuffer > 0 && this.coyote > 0){
      this.vy = JUMP_VEL * cell.jumpMul;
      this.onGround = false;
      this.coyote = 0; this.jumpBuffer = 0;
      this.jumpsLeft = 1;
      Sfx.jump();
      if(this.crouching){
        if(!level.solidAtPX(this.x, this.y - (STAND_H - CROUCH_H), this.w, STAND_H)){
          this.y -= STAND_H - CROUCH_H;
          this.h = STAND_H; this.crouching = false;
        }
      }
    } else if(this.jumpBuffer > 0 && this.jumpsLeft > 0 && !this.onGround && this.vy > -8){
      this.vy = JUMP_VEL * cell.jumpMul * DOUBLE_JUMP_MUL;
      this.jumpBuffer = 0;
      this.jumpsLeft = 0;
      Sfx.doubleJump();
      spawnParticles(this.x + this.w/2, this.y + this.h, cell.color, 12, 2.5);
    }
    if(!k.jump && this.vy < -3) this.vy = -3;

    // ===== 重力 =====
    this.vy += GRAVITY;
    if(this.vy > MAX_FALL) this.vy = MAX_FALL;

    // ===== 碰撞移动 =====
    this.x += this.vx;
    this.collideX(level);
    this.y += this.vy;
    const wasGround = this.onGround;
    this.onGround = false;
    this.collideY(level);
    // 浮动平台碰撞
    this.collideFloatPlatforms(level);
    if(this.onGround && !wasGround){
      this.coyote = COYOTE_FRAMES;
      this.jumpsLeft = 1;
    }
    if(this.onGround) this.coyote = COYOTE_FRAMES;

    // ===== 掉落虚空死亡 =====
    if(this.y > CH + 60){
      this.die(level);
      return;
    }

    // ===== 无敌帧 =====
    if(this.invincible > 0) this.invincible--;

    // ===== Buff 计时 =====
    if(this.shield > 0) this.shield--;
    if(this.oxygen > 0){
      this.oxygen--;
      if(this.oxygen % 120 === 0 && this.health < this.maxHealth){
        this.health++;
        spawnParticles(this.x+this.w/2, this.y, C.heal, 8, 1.5);
        Sfx.coin();
        updateHUD();
      }
    }

    // ===== 失血区域检测 =====
    this.onBloodLoss = false;
    const feetTile = level.tileAt(this.x + this.w/2, this.y + this.h + 1);
    if(feetTile === 'B'){
      this.onBloodLoss = true;
      let drain = BLOOD_LOSS_DRAIN;
      if(this.cellType === 3) drain *= 0.4; // 红细胞减缓缓血
      if(level.isTideSurge()){
        drain *= TIDE_DRAIN_MULT;
        drain *= (1 - Game.healingProgress * 0.5); // 愈合衰减降低潮涌强度
        if(Game.oxyField) drain *= OXY_FIELD_TIDE_REDUCTION; // 氧气领域减半
      }
      drain *= Game.gapBloodMult; // 未止血创面倍率
      Game.globalEnergy -= drain;
      if(Game.globalEnergy < 0) Game.globalEnergy = 0;
    }

    // ===== 脓液地块检测 =====
    this.onPus = false;
    for(const pt of Game.pusTiles){
      if(pt.expired) continue;
      if(this.x + this.w > pt.x && this.x < pt.x + pt.w &&
         Math.abs((this.y + this.h) - pt.y) < 6){
        this.onPus = true;
        Game.globalEnergy -= PUS_DRAIN * Game.gapBloodMult;
        if(Game.globalEnergy < 0) Game.globalEnergy = 0;
        break;
      }
    }

    // ===== 红细胞氧气压制领域（被动） =====
    if(this.cellType === 3 && this.onBloodLoss && Game.globalEnergy >= 20){
      this.oxyFieldTimer++;
      if(this.oxyFieldTimer >= OXY_FIELD_TRIGGER && !Game.oxyField){
        Game.oxyField = true;
        Sfx.oxyField();
        showToast('氧气压制领域激活！\n潮涌减半 · 抑菌 · 消退脓液');
        spawnParticles(this.x+this.w/2, this.y+this.h/2, C.oxyField, 20, 3);
      }
    } else {
      this.oxyFieldTimer = 0;
      if(Game.oxyField){
        Game.oxyField = false;
      }
    }
    if(Game.oxyField){
      Game.globalEnergy -= OXY_FIELD_DRAIN;
      if(Game.globalEnergy < 0) Game.globalEnergy = 0;
    }

    // ===== 技能：突进 / 搭桥 / 挥剑 =====
    if(k.dash && !Game.prevKeys.dash && this.cellType === 1){
      this.useDash(level);
    }
    if(k.skill && !Game.prevKeys.skill){
      if(this.cellType === 1) this.swordAttack(level);
      else if(this.cellType === 2) this.useBridge(level);
    }
  }

  useDash(level){
    if(this.dashCooldown > 0) return;
    if(Game.globalEnergy < DASH_COST){ showToast('能量不足！'); return; }
    Game.globalEnergy -= DASH_COST;
    this.dashTimer = DASH_FRAMES;
    this.dashCooldown = DASH_COOLDOWN;
    this.dashDir = this.facing;
    Sfx.dash();
    spawnParticles(this.x + this.w/2, this.y + this.h/2, C.wbc, 10, 2);
    updateHUD();
  }

  useBridge(level){
    // 低能量禁用搭桥
    if(Game.globalEnergy < LOW_ENERGY){
      showToast('能量过低，无法搭桥！'); return;
    }
    // 计算实际消耗（氧气联动减半）
    let cost = BRIDGE_COST;
    let duration = BRIDGE_DURATION;
    if(this.oxygen > 0){
      cost = Math.round(cost * OXY_BRIDGE_COST_MULT);
      duration = Math.round(duration * OXY_BRIDGE_DUR_MULT);
    }
    if(Game.globalEnergy < cost){ showToast('能量不足！'); return; }
    if(!this.onGround){ showToast('需要在地面使用！'); return; }

    const col = Math.floor((this.x + this.w/2 + this.facing * TILE) / TILE);
    let row = Math.floor((this.y + this.h) / TILE);
    while(row < 15 && level.solidAt(col, row)) row++;
    if(row >= 15){ showToast('无法放置'); return; }
    for(const tp of Game.tempPlatforms){
      if(!tp.expired && tp.x === col*TILE && tp.y === row*TILE){
        showToast('已有平台'); return;
      }
    }
    if(Math.abs(row * TILE - (this.y + this.h)) > TILE * 3){
      showToast('距离太远'); return;
    }
    Game.globalEnergy -= cost;
    Game.tempPlatforms.push(new TempPlatform(col * TILE, row * TILE, duration));
    Sfx.bridge();
    spawnParticles(col*TILE + TILE/2, row*TILE, C.platelet, 12, 2);
    // 止血：标记缺口已封堵
    if(col >= 25 && col <= 31){
      Game.bridgeUsedInGap = true;
    }
    // 血小板凝血止血：暂停炎症潮汐2秒
    Game.tidePaused = BRIDGE_TIDE_PAUSE;
    Sfx.tidePause();
    if(this.oxygen > 0) showToast('氧气联动！能耗减半\n凝血止血！潮汐暂停2秒');
    else showToast('凝血止血！炎症潮汐暂停2秒');
    updateHUD();
  }

  shoot(){
    this.complementAmmo--;
    Game.projectiles.push(new Projectile(
      this.x + this.w/2, this.y + this.h/2, this.facing * 5, 0
    ));
    Sfx.shoot();
    updateHUD();
  }

  swordAttack(level){
    if(this.swordCooldown > 0) return;
    if(Game.globalEnergy < SWORD_COST){ showToast('能量不足！'); return; }
    Game.globalEnergy -= SWORD_COST;
    this.swordTimer = SWORD_DURATION;
    this.swordCooldown = SWORD_COOLDOWN;
    Sfx.dash(); // 复用突进音效
    spawnParticles(this.x + this.w/2 + this.facing * 30, this.y + this.h/2, C.sword, 8, 2);
    // 对范围内敌人造成伤害
    const reach = SWORD_RANGE;
    const ax = this.x + this.w/2;
    const ay = this.y + this.h/2;
    for(const e of level.enemies){
      if(!e.alive) continue;
      const ex = e.x + e.w/2, ey = e.y + e.h/2;
      const dx = (ex - ax) * this.facing; // 只打前方
      const dy = Math.abs(ey - ay);
      if(dx > 0 && dx < reach && dy < 40){
        e.hp -= SWORD_DAMAGE;
        spawnParticles(ex, ey, C.swordGlow, 10, 2.5);
        if(e.hp <= 0){
          e.alive = false;
          if(e.isLarge) e.split(level);
          Game.stats.kills++;
          spawnPusIfNeeded(e);
          spawnParticles(ex, ey, e.type==='staph'?C.staph:C.strep, 14, 3);
        }
      }
    }
    // 对Boss造成伤害
    if(Game.boss && Game.boss.alive){
      const b = Game.boss;
      const bx = b.x + b.w/2, by = b.y + b.h/2;
      const dx = (bx - ax) * this.facing;
      const dy = Math.abs(by - ay);
      if(dx > -20 && dx < reach + 20 && dy < 50){
        b.hp -= SWORD_DAMAGE;
        b.flashTimer = 8;
        spawnParticles(bx, by, C.swordGlow, 12, 3);
        Sfx.hit();
        if(b.hp <= 0){
          b.alive = false;
          Game.stats.kills++;
          spawnParticles(bx, by, C.boss, 30, 5);
          spawnParticles(bx, by, C.bossEye, 20, 4);
          Sfx.complete();
          showToast('Boss 已击杀！');
        }
      }
    }
    updateHUD();
  }

  collideX(level){
    const tiles = level.getOverlapTiles(this);
    for(const t of tiles){
      if(level.solidTile(t.tile)){
        if(this.vx > 0) this.x = t.col * TILE - this.w;
        else if(this.vx < 0) this.x = (t.col + 1) * TILE;
        this.vx = 0;
      }
    }
  }

  collideY(level){
    const tiles = level.getOverlapTiles(this);
    for(const t of tiles){
      if(level.solidTile(t.tile)){
        if(this.vy > 0){
          this.y = t.row * TILE - this.h;
          this.vy = 0; this.onGround = true;
        } else if(this.vy < 0){
          this.y = (t.row + 1) * TILE;
          this.vy = 0;
        }
      }
    }
    // 补充地面检测（脚底在瓦片边界时getOverlapTiles可能漏掉）
    if(!this.onGround&&this.vy>=0){const fr=Math.floor((this.y+this.h)/32);const fc1=Math.floor(this.x/32),fc2=Math.floor((this.x+this.w-1)/32);for(let c=fc1;c<=fc2;c++){if(level.solidAt(c,fr)){this.y=fr*32-this.h;this.vy=0;this.onGround=true;break;}}}
    // ? 方块顶击检测
    if(this.vy < 0 && Game.qBlocks){
      for(const qb of Game.qBlocks){
        if(qb.used) continue;
        if(this.x + this.w > qb.x + 2 && this.x < qb.x + qb.w - 2 &&
           this.y < qb.y + qb.h && this.y + this.h > qb.y){
          qb.hit();
          this.vy = 0;
          break;
        }
      }
    }
    // 临时平台碰撞
    for(const tp of Game.tempPlatforms){
      if(tp.expired) continue;
      if(this.x + this.w > tp.x && this.x < tp.x + TILE &&
         this.y + this.h > tp.y && this.y < tp.y + TILE){
        if(this.vy > 0){
          this.y = tp.y - this.h;
          this.vy = 0; this.onGround = true;
        }
      }
    }
  }

  collideFloatPlatforms(level){
    if(!Game.floatPlatforms) return;
    for(const fp of Game.floatPlatforms){
      if(this.x + this.w > fp.x && this.x < fp.x + TILE &&
         this.y + this.h > fp.y && this.y < fp.y + TILE){
        if(this.vy > 0){
          this.y = fp.y - this.h;
          this.vy = 0; this.onGround = true;
        }
      }
    }
  }

  takeDamage(level){
    if(this.invincible > 0) return;
    if(this.shield > 0){
      this.shield = 0;
      this.invincible = 30;
      spawnParticles(this.x+this.w/2, this.y+this.h/2, C.shield, 12, 2);
      Sfx.hit();
      showToast('护盾抵消！');
      updateHUD();
      return;
    }
    this.health--;
    Game.damageNumbers.push(new DamageNumber(this.x+this.w/2,this.y-6,'-1❤','#ff4444'));
    this.invincible = INVINCIBLE_FRAMES;
    Game.camera.shake = 8;
    Sfx.hit();
    spawnParticles(this.x+this.w/2, this.y+this.h/2, C.damage, 10, 2);
    updateHUD();
    if(this.health <= 0) this.die(level);
  }

  die(level){
    Sfx.death();
    Game.deathTimer = 30;
    Game.camera.shake = 12;
    spawnParticles(this.x+this.w/2, this.y+this.h/2, C.damage, 20, 3);
    Game.stats.deaths++;
    this.x = this.checkpointX; this.y = this.checkpointY;
    this.vx = 0; this.vy = 0;
    this.health = this.maxHealth;
    this.invincible = 60;
    this.jumpsLeft = 1;
    this.dashTimer = 0; this.dashCooldown = 0;
    this.swordTimer = 0; this.swordCooldown = 0;
    this.aoeStomp = 0;
    this.shield = 0; this.oxygen = 0; this.complementAmmo = 0;
    this.oxyFieldTimer = 0;
    this.onPus = false;
    Game.oxyField = false;
    Game.pusTiles = [];
    level.respawnEnemies();
    updateHUD();
  }

  stompEnemy(e, level){
    this.vy = JUMP_VEL * 0.7;
    this.jumpsLeft = 1;
    Sfx.stomp();
    Game.camera.shake = 4;
    // kills 在 Enemy.update 死亡判定时计数

    // 检查是否站在临时平台上 → 触发AoE踩踏buff
    let onTemp = false;
    for(const tp of Game.tempPlatforms){
      if(!tp.expired && Math.abs((tp.y) - (this.y + this.h)) < 4 &&
         this.x + this.w > tp.x && this.x < tp.x + TILE){
        onTemp = true; break;
      }
    }
    if(onTemp){
      this.aoeStomp = AOE_DURATION;
      Sfx.aoeStomp();
      spawnParticles(this.x+this.w/2, this.y+this.h, C.aoeBuff, 20, 3);
      showToast('范围清怪buff激活！');
      // 立即对范围内敌人造成伤害
      for(const en of level.enemies){
        if(!en.alive || en === e) continue;
        const dx = (en.x + en.w/2) - (this.x + this.w/2);
        const dy = (en.y + en.h/2) - (this.y + this.h/2);
        if(Math.sqrt(dx*dx + dy*dy) < AOE_RADIUS){
          en.hp--;
          spawnParticles(en.x+en.w/2, en.y, C.aoeBuff, 8, 2);
          if(en.hp <= 0){
            en.alive = false;
            if(en.isLarge) en.split(level);
            Game.stats.kills++;
            spawnParticles(en.x+en.w/2, en.y, en.type==='staph'?C.staph:C.strep, 14, 3);
          }
        }
      }
    }
  }

  draw(ctx, camX){
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y);
    const cell = this.cell;

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
      } else if(Game.keys.left || Game.keys.right || Math.abs(this.vx) > 1.2) {
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
      // ★ 走路用 v1 6 帧 walk 精灵表循环（视频提取）
      else if(this.onGround && (Game.keys.left || Game.keys.right || Math.abs(this.vx) > 0.5) && Game.rbcWalkLeft && Game.rbcWalkLeft.complete && Game.rbcWalkLeft.naturalWidth > 0){
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
  }
}

// ===== 敌人 =====
class Enemy {
  constructor(x, y, type, isLarge=false){
    this.x = x; this.y = y;
    this.type = type;       // 'staph' | 'strep'
    this.isLarge = isLarge;
    this.isMini = false;
    this.vx = 0; this.vy = 0;
    this.dir = -1;
    this.onGround = false;
    this.alive = true;
    this.animT = Math.random() * 100;
    this.spawnX = x; this.spawnY = y;

    if(type === 'staph'){
      if(isLarge){
        this.w = 36; this.h = 30;
        this.hp = STAPH_LARGE_HP;
        this.vx = -0.3;
      } else {
        this.w = 24; this.h = 20;
        this.hp = 1;
        this.vx = -0.4;
      }
    } else { // strep
      this.w = 24; this.h = 20;
      this.hp = 2;
      this.vx = 0;
      // 冲刺状态机
      this.state = 'idle';    // idle | windup | dash | cooldown
      this.stateTimer = 0;
      this.chargeDir = 0;
    }
    this.maxHp = this.hp;
  }

  makeMini(){
    this.isMini = true;
    this.isLarge = false;
    this.w = 16; this.h = 14;
    this.hp = 1; this.maxHp = 1;
    this.vx = (Math.random() < 0.5 ? -1 : 1) * 0.6;
    this.dir = this.vx > 0 ? 1 : -1;
  }

  reset(){
    this.x = this.spawnX; this.y = this.spawnY;
    this.alive = true; this.dir = -1;
    this.state = 'idle'; this.stateTimer = 0; this.chargeDir = 0;
    if(this.type === 'staph'){
      this.hp = this.isLarge ? STAPH_LARGE_HP : 1;
      this.vx = this.isLarge ? -0.3 : (this.isMini ? -0.6 : -0.4);
    } else {
      this.hp = 2; this.vx = 0;
    }
    this.maxHp = this.hp;
  }

  split(level){
    Sfx.split();
    for(let i=0;i<SPLIT_COUNT;i++){
      const mini = new Enemy(this.x + i*20 - 10, this.y, 'staph');
      mini.makeMini();
      mini.dir = i===0 ? -1 : 1;
      mini.vx = mini.dir * 0.6;
      level.enemies.push(mini);
    }
    spawnParticles(this.x+this.w/2, this.y+this.h/2, C.staph, 16, 3);
  }

  update(level, player){
    if(!this.alive) return;
    this.animT++;

    if(this.type === 'staph'){
      // 葡萄球菌：巡逻
      const baseSpeed = this.isLarge ? 0.3 : (this.isMini ? 0.6 : 0.4);
      this.vx = this.dir * baseSpeed;
      this.x += this.vx;
      const frontCol = Math.floor((this.dir > 0 ? this.x + this.w : this.x) / TILE);
      const checkRow = Math.floor((this.y + this.h + 2) / TILE);
      if(level.solidAt(frontCol, Math.floor(this.y / TILE))){
        this.dir *= -1;
      } else if(!level.solidAt(frontCol, checkRow) && this.onGround){
        this.dir *= -1;
      }
    } else {
      // 链球菌：游荡 + 冲刺
      const dx = player.x - this.x;
      const dy = Math.abs(player.y - this.y);

      if(this.state === 'idle'){
        // 非追踪游荡
        this.vx = this.dir * 0.3;
        this.x += this.vx;
        // 碰墙转向
        if(level.solidAt(Math.floor((this.dir > 0 ? this.x + this.w : this.x) / TILE), Math.floor(this.y / TILE))){
          this.dir *= -1;
        }
        // 检测是否进入冲刺范围（仅炎症高潮区启动蓄力）
        if(this.x > INFLAMMATION_X && Math.abs(dx) < CHARGE_RANGE && dy < 40){
          this.state = 'windup';
          this.stateTimer = CHARGE_WINDUP;
          this.chargeDir = Math.sign(dx) || 1;
          Sfx.charge();
        }
      } else if(this.state === 'windup'){
        // 预警不动
        this.vx = 0;
        this.stateTimer--;
        if(this.stateTimer <= 0){
          this.state = 'dash';
          this.stateTimer = CHARGE_FRAMES;
        }
      } else if(this.state === 'dash'){
        // 高速直线冲刺
        this.vx = this.chargeDir * CHARGE_SPEED;
        this.x += this.vx;
        this.stateTimer--;
        if(this.stateTimer <= 0){
          this.state = 'cooldown';
          this.stateTimer = CHARGE_COOLDOWN;
          this.dir = this.chargeDir;
        }
      } else if(this.state === 'cooldown'){
        this.vx *= 0.8;
        this.x += this.vx;
        this.stateTimer--;
        if(this.stateTimer <= 0){
          this.state = 'idle';
        }
      }
    }

    // 重力
    this.vy += GRAVITY;
    if(this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.y += this.vy;
    this.onGround = false;

    // 碰撞
    const tiles = level.getOverlapTiles(this);
    for(const t of tiles){
      if(level.solidTile(t.tile)){
        if(this.vy > 0){
          this.y = t.row * TILE - this.h;
          this.vy = 0; this.onGround = true;
        }
      }
    }

    // 玩家碰撞
    if(rectOverlap(this, player)){
      const stomp = player.vy > 0 && (player.y + player.h - this.y) < 16;
      if(stomp){
        // 踩踏
        if(player.cellType === 1){
          // 白细胞：唯一能击杀敌人的细胞
          player.stompEnemy(this, level);
          this.hp--;
          if(Game.oxyField) this.hp -= OXY_FIELD_STOMP_BONUS; // 氧气领域加成
          spawnParticles(this.x+this.w/2, this.y, this.type==='staph'?C.staph:C.strep, 8, 2);
          if(this.hp <= 0){
            this.alive = false;
            if(this.isLarge) this.split(level);
            Game.stats.kills++;
            spawnPusIfNeeded(this);
            spawnParticles(this.x+this.w/2, this.y, this.type==='staph'?C.staph:C.strep, 14, 3);
          }
        } else {
          // 非白细胞：仅弹跳，无法造成任何伤害
          player.vy = JUMP_VEL * 0.5;
          player.jumpsLeft = 1;
        }
      } else if(this.state === 'dash' && player.crouching){
        // 冲刺时蹲下可躲避
        // 不造成伤害
      } else {
        player.takeDamage(level);
      }
    }
  }

  draw(ctx, camX){
    if(!this.alive) return;
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y);

    // 冲刺预警闪烁
    if(this.type === 'strep' && this.state === 'windup'){
      const flash = Math.floor(this.stateTimer / 4) % 2 === 0;
      if(flash){
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = C.chargeWarn;
        ctx.fillRect(px-2, py-2, this.w+4, this.h+4);
        ctx.restore();
      }
    }

    if(this.type === 'staph'){
      const isLarge = this.isLarge;
      const isMini = this.isMini;
      const c = isLarge ? C.staphLarge : (isMini ? C.miniStaph : C.staph);
      const cd = isLarge ? C.staphLargeDark : (isMini ? C.miniStaphDark : C.staphDark);
      const s = isLarge ? 1.5 : (isMini ? 0.65 : 1.0);

      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(px+8*s, py+10*s, 8*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px+16*s, py+12*s, 7*s, 0, Math.PI*2); ctx.fill();
      if(isLarge) ctx.beginPath(); ctx.arc(px+24*s, py+10*s, 7*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px+12*s, py+6*s, 6*s, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cd;
      ctx.beginPath(); ctx.arc(px+6*s, py+8*s, 2*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px+14*s, py+14*s, 2*s, 0, Math.PI*2); ctx.fill();

      if(isLarge){
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText(this.hp + '/' + this.maxHp, px+this.w/2, py-3);
      }
    } else {
      // 链球菌
      const charging = this.state === 'windup' || this.state === 'dash';
      const c = charging ? C.chargeWarn : C.strep;
      const cd = charging ? '#aa1010' : C.strepDark;

      ctx.fillStyle = c;
      for(let i=0;i<4;i++){
        const ox = px + i*6 + (this.dir > 0 ? 2 : 0);
        const oy = py + 10 + Math.sin(this.animT*0.1 + i)*2;
        ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = cd;
      ctx.beginPath(); ctx.arc(px+8, py+10, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px+16, py+10, 1.5, 0, Math.PI*2); ctx.fill();

      // 冲刺预警指示线
      if(this.state === 'windup'){
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(this.animT*0.5)*0.2;
        ctx.strokeStyle = C.chargeWarn;
        ctx.lineWidth = 2;
        ctx.setLineDash([4,4]);
        ctx.beginPath();
        ctx.moveTo(px + this.w/2, py + this.h/2);
        ctx.lineTo(px + this.w/2 + this.chargeDir * 120, py + this.h/2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillText(this.hp + '/' + this.maxHp, px+12, py-2);
    }
  }
}

// ===== Boss（终点大细菌） =====
class Boss {
  constructor(x, y){
    this.x = x; this.y = y;
    this.w = BOSS_W; this.h = BOSS_H;
    this.hp = BOSS_HP; this.maxHp = BOSS_HP;
    this.alive = true;
    this.animT = 0;
    this.dir = -1;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.flashTimer = 0;
    this.spawnTimer = 0;
    this.spawnX = x; this.spawnY = y;
  }

  reset(){
    this.x = this.spawnX; this.y = this.spawnY;
    this.hp = this.maxHp; this.alive = true;
    this.flashTimer = 0; this.spawnTimer = 0;
    this.vx = 0; this.vy = 0;
  }

  update(level, player){
    if(!this.alive) return;
    this.animT++;
    if(this.flashTimer > 0) this.flashTimer--;

    // 缓慢巡逻
    const speed = 0.4;
    this.vx = this.dir * speed;
    this.x += this.vx;
    // 碰墙转向
    const frontCol = Math.floor((this.dir > 0 ? this.x + this.w : this.x) / TILE);
    if(level.solidAt(frontCol, Math.floor(this.y / TILE))){
      this.dir *= -1;
    }
    // 边缘转向
    const checkRow = Math.floor((this.y + this.h + 2) / TILE);
    if(!level.solidAt(frontCol, checkRow) && this.onGround){
      this.dir *= -1;
    }

    // 重力
    this.vy += GRAVITY;
    if(this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.y += this.vy;
    this.onGround = false;
    const tiles = level.getOverlapTiles(this);
    for(const t of tiles){
      if(level.solidTile(t.tile)){
        if(this.vy > 0){
          this.y = t.row * TILE - this.h;
          this.vy = 0; this.onGround = true;
        }
      }
    }

    // WBC踩踏判定
    if(rectOverlap(this, player)){
      const stomp = player.vy > 0 && (player.y + player.h - this.y) < 20;
      if(stomp){
        if(player.cellType === 1){
          // 白细胞踩踏：1点伤害
          player.stompEnemy(this, level);
          this.hp--;
          this.flashTimer = 8;
          if(this.hp <= 0){
            this.alive = false;
            Game.stats.kills++;
            spawnParticles(this.x+this.w/2, this.y+this.h/2, C.boss, 30, 5);
            spawnParticles(this.x+this.w/2, this.y+this.h/2, C.bossEye, 20, 4);
            Sfx.complete();
            showToast('Boss 已击杀！');
          }
        } else {
          // 非白细胞：仅弹跳
          player.vy = JUMP_VEL * 0.5;
          player.jumpsLeft = 1;
        }
      } else {
        player.takeDamage(level);
      }
    }
  }

  draw(ctx, camX){
    if(!this.alive) return;
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y);

    // 受击闪烁
    const flash = this.flashTimer > 0 && Math.floor(this.flashTimer / 2) % 2 === 0;

    // 身体（大葡萄球菌集群）
    ctx.fillStyle = flash ? '#fff' : C.boss;
    ctx.beginPath(); ctx.arc(px+18, py+20, 18, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+40, py+16, 20, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+56, py+24, 16, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+30, py+36, 16, 0, Math.PI*2); ctx.fill();

    // 暗部
    ctx.fillStyle = flash ? '#ccc' : C.bossDark;
    ctx.beginPath(); ctx.arc(px+14, py+16, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+44, py+12, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+52, py+30, 4, 0, Math.PI*2); ctx.fill();

    // 眼睛
    ctx.fillStyle = C.bossEye;
    const eyeBob = Math.sin(this.animT * 0.08) * 2;
    ctx.beginPath(); ctx.arc(px+24, py+18 + eyeBob, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+44, py+18 + eyeBob, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(px+25, py+17 + eyeBob, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+45, py+17 + eyeBob, 1.5, 0, Math.PI*2); ctx.fill();

    // 血条
    const barW = this.w + 10;
    const barX = px - 5;
    const barY = py - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, 6);
    ctx.fillStyle = C.bossBar;
    const hpPct = Math.max(0, this.hp / this.maxHp);
    ctx.fillRect(barX, barY, barW * hpPct, 6);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, 6);
    // HP数字
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillText(this.hp + '/' + this.maxHp, px + this.w/2, barY - 2);
  }
}

// ===== 道具 =====
class Item {
  constructor(x, y, type, extra){
    this.x = x; this.y = y; this.w = 16; this.h = 16;
    this.type = type; this.alive = true; this.animT = 0;
    this.xpValue = (type==='xp')?(extra||10):0;
    this.equipId = (type==='equipment')?(extra||''):'';
  }

  update(player){
    this.animT++;
    if(!this.alive) return;
    if(rectOverlap(this, player)){
      this.alive = false;
      Game.stats.items++;
      Sfx.pickup();
      if(this.type === 'shield'){
        player.shield = SHIELD_DURATION;
        showToast('血小板护盾激活！');
      } else if(this.type === 'oxygen'){
        player.oxygen = OXYGEN_DURATION;
        showToast('氧气回血激活！');
      } else if(this.type === 'complement'){
        player.complementAmmo += COMPLEMENT_AMMO;
        showToast('补体弹药 +' + COMPLEMENT_AMMO);
      } else if(this.type === 'coin'){
        Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + COIN_ENERGY);
        Sfx.coin();
      } else if(this.type === 'food'){
        Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + FOOD_ENERGY);
        Sfx.pickup();
        showToast('进食！能量 +' + FOOD_ENERGY);
      } else if(this.type === 'drink'){
        Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + DRINK_ENERGY);
        Sfx.coin();
        showToast('喝水！能量 +' + DRINK_ENERGY);
      } else if(this.type === 'memory'){
        Game.stats.foundMemory = true;
        Sfx.memory();
        showToast('★ 发现记忆细胞！\n免疫记忆已记录');
        showMemoryCard();
      } else if(this.type === 'nutrition'){
        // 营养包：仅红细胞可收集
        if(player.cellType !== 3){
          // 非红细胞：不可收集，恢复道具
          this.alive = true;
          Game.stats.items--;
          return;
        }
        Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + NUTRITION_ENERGY + getSkillLevel('rbc','nutritionBonus')*10);
        Sfx.pickup();
        showToast('营养包！能量 +' + (NUTRITION_ENERGY+getSkillLevel('rbc','nutritionBonus')*10));
      } else if(this.type==='xp'){Game.xp+=this.xpValue;Sfx.coin();spawnParticles(this.x+this.w/2,this.y+this.h/2,'#ffd700',8,1.5);while(Game.playerLevel<MAX_LEVEL&&Game.xp>=xpForLevel(Game.playerLevel+1)){Game.playerLevel++;Game.skillPoints+=SKILL_POINTS_PER_LEVEL;Game.globalEnergy=getMaxEnergy();const effHp=player.maxHealth+getEquipStat('maxHp');if(player.health<effHp)player.health=effHp;Sfx.complete();spawnParticles(player.x+player.w/2,player.y+player.h/2,'#ffd700',24,3);showToast('⚡ LEVEL UP! Lv.'+Game.playerLevel+'\n获得'+SKILL_POINTS_PER_LEVEL+'技能点！');}updateHUD();saveGame();return;}else if(this.type==='equipment'){if(Game.inventory.length>=20){showToast('背包已满！');this.alive=true;Game.stats.items--;return;}Game.inventory.push(this.equipId);const eq=findEquip(this.equipId);showToast('获得装备！\n'+(eq?eq.name:this.equipId)+' ['+(eq?RARITY_NAMES[eq.rarity]:'')+']');saveGame();}
      spawnParticles(this.x+this.w/2, this.y+this.h/2, this.color(), 16, 2.5);
      updateHUD();
    }
  }

  color(){
    if(this.type === 'shield') return C.shield;
    if(this.type === 'oxygen') return C.oxygen;
    if(this.type === 'coin') return '#ffd700';
    if(this.type === 'food') return C.food;
    if(this.type === 'drink') return C.drink;
    if(this.type === 'memory') return C.memory;
    if(this.type === 'xp') return '#ffaa00';
    if(this.type === 'equipment'){const eq=findEquip(this.equipId);return eq?eq.color:'#ffd700';}
    if(this.type === 'nutrition') return C.nutrition;
    return C.complement;
  }

  draw(ctx, camX){
    if(!this.alive) return;
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y + Math.sin(this.animT*0.08)*3);
    const bob = Math.sin(this.animT * 0.1) * 0.3 + 0.7;

    ctx.save();
    ctx.globalAlpha = bob;
    // 光晕
    ctx.fillStyle = this.color();
    ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.arc(px+8, py+8, 12, 0, Math.PI*2); ctx.fill();
    // 主体
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color();
    if(this.type === 'shield'){
      ctx.beginPath();
      ctx.moveTo(px+8, py+1); ctx.lineTo(px+15, py+5);
      ctx.lineTo(px+15, py+10); ctx.lineTo(px+8, py+15);
      ctx.lineTo(px+1, py+10); ctx.lineTo(px+1, py+5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign='center';
      ctx.fillText('S', px+8, py+11);
    } else if(this.type === 'oxygen'){
      ctx.beginPath(); ctx.arc(px+8, py+8, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign='center';
      ctx.fillText('O₂', px+8, py+11);
    } else if(this.type === 'coin'){
      const s = Math.abs(Math.sin(this.animT * 0.1));
      const w = Math.max(3, Math.round(10 * s));
      ctx.fillRect(px + 8 - w/2, py + 2, w, 12);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(px + 8 - w/2 + 1, py + 3, Math.max(1, w-2), 10);
    } else if(this.type === 'food'){
      // 食物：橙色圆球 + 热气
      ctx.beginPath(); ctx.arc(px+8, py+9, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = C.foodGlow;
      ctx.beginPath(); ctx.arc(px+6, py+7, 2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign='center';
      ctx.fillText('食', px+8, py+12);
    } else if(this.type === 'drink'){
      // 饮料：蓝色水滴
      ctx.beginPath();
      ctx.moveTo(px+8, py+1);
      ctx.quadraticCurveTo(px+14, py+8, px+12, py+12);
      ctx.quadraticCurveTo(px+8, py+16, px+4, py+12);
      ctx.quadraticCurveTo(px+2, py+8, px+8, py+1);
      ctx.fill();
      ctx.fillStyle = C.drinkGlow;
      ctx.beginPath(); ctx.arc(px+6, py+9, 2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign='center';
      ctx.fillText('水', px+8, py+12);
    } else if(this.type === 'memory'){
      // 记忆细胞：紫色脉冲球
      const pulse = Math.sin(this.animT * 0.12) * 2;
      ctx.beginPath(); ctx.arc(px+8, py+8, 7+pulse, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = C.memoryGlow;
      ctx.beginPath(); ctx.arc(px+8, py+8, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign='center';
      ctx.fillText('M', px+8, py+11);
    } else if(this.type === 'nutrition'){
      // 营养包：粉色圆球 + 十字标记
      const pulse = Math.sin(this.animT * 0.1) * 1.5;
      ctx.beginPath(); ctx.arc(px+8, py+8, 7+pulse, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = C.nutritionGlow;
      ctx.beginPath(); ctx.arc(px+6, py+6, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign='center';
      ctx.fillText('营', px+8, py+11);
    } else if(this.type==='xp'){const p=Math.sin(this.animT*0.15)*2;ctx.beginPath();ctx.arc(px+8,py+8,7+p,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffdd44';ctx.beginPath();ctx.arc(px+8,py+8,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 6px sans-serif';ctx.textAlign='center';ctx.fillText('XP',px+8,py+11);}else if(this.type==='equipment'){const eq=findEquip(this.equipId);const rc=eq?RARITY_COLORS[eq.rarity]:'#fff';ctx.fillStyle=this.color();ctx.beginPath();ctx.moveTo(px+8,py+1);ctx.lineTo(px+15,py+8);ctx.lineTo(px+8,py+15);ctx.lineTo(px+1,py+8);ctx.closePath();ctx.fill();ctx.strokeStyle=rc;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 6px sans-serif';ctx.textAlign='center';ctx.fillText('装',px+8,py+11);} else {
      // 补体：星形
      ctx.beginPath();
      for(let i=0;i<10;i++){
        const a = (i/10)*Math.PI*2 - Math.PI/2;
        const r = i%2===0 ? 8 : 3;
        const x = px+8 + Math.cos(a)*r;
        const y = py+8 + Math.sin(a)*r;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

// ===== 子弹（补体射击） =====
class Projectile {
  constructor(x, y, vx, vy){
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.w = 8; this.h = 8;
    this.alive = true;
    this.life = 120;
  }
  update(level, enemies){
    this.x += this.vx; this.y += this.vy;
    this.life--;
    if(this.life <= 0) this.alive = false;
    const col = Math.floor((this.x+this.w/2)/TILE);
    const row = Math.floor((this.y+this.h/2)/TILE);
    if(level.solidAt(col, row)) this.alive = false;
    for(const e of enemies){
      if(!e.alive) continue;
      if(rectOverlap(this, e)){
        e.hp--;
        this.alive = false;
        spawnParticles(e.x+e.w/2, e.y, C.complement, 8, 2);
        if(e.hp <= 0){
          e.alive = false;
          if(e.isLarge) e.split(level);
          Game.stats.kills++;
          spawnPusIfNeeded(e);
          spawnParticles(e.x+e.w/2, e.y, e.type==='staph'?C.staph:C.strep, 14, 3);
        }
        break;
      }
    }
  }
  draw(ctx, camX){
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = C.complement;
    ctx.beginPath(); ctx.arc(px+4, py+4, 8, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.complement;
    ctx.beginPath(); ctx.arc(px+4, py+4, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(px+4, py+4, 2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ===== 粒子 =====
class Particle {
  constructor(x, y, color, vx, vy, life){
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life; this.maxLife = life;
    this.size = 2 + Math.random() * 2;
  }
  update(){
    this.x += this.vx; this.y += this.vy;
    this.vy += 0.15;
    this.vx *= 0.96;
    this.life--;
  }
  draw(ctx, camX){
    const a = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    const s = this.size * a;
    ctx.fillRect(Math.round(this.x - camX - s/2), Math.round(this.y - s/2), s, s);
    ctx.restore();
  }
}

// ===== 伤害数字 =====
class DamageNumber{constructor(x,y,v,c='#ffdd44'){this.x=x;this.y=y;this.value=v;this.color=c;this.life=35;this.maxLife=35;this.vy=-1.5;}update(){this.y+=this.vy;this.life--;}draw(ctx,cX){const a=Math.min(1,this.life/15);ctx.save();ctx.globalAlpha=a;ctx.fillStyle=this.color;ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(String(this.value),Math.round(this.x-cX),Math.round(this.y));ctx.restore();}}

// ===== 临时平台（血小板凝血） =====
class TempPlatform {
  constructor(x, y, duration){
    this.x = x; this.y = y;
    this.life = duration || BRIDGE_DURATION;
    this.maxLife = this.life;
    this.expired = false;
    this.appearT = 0;
  }
  update(){
    this.appearT++;
    // 凝血平台永久存在，不再消失
  }
  draw(ctx, camX){
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y);
    const a = this.life > 60 ? 1 : (this.life / 60) * (Math.floor(this.life/6)%2===0 ? 1 : 0.3);
    const scale = Math.min(1, this.appearT / 10);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = C.scab;
    ctx.fillRect(px + (1-scale)*16, py + (1-scale)*16, TILE*scale, TILE*scale);
    ctx.fillStyle = C.scabTop;
    ctx.fillRect(px + (1-scale)*16, py + (1-scale)*16, TILE*scale, 4*scale);
    ctx.fillStyle = C.scabDark;
    ctx.fillRect(px + (1-scale)*16, py + TILE - 4*scale + (1-scale)*16, TILE*scale, 4*scale);
    ctx.fillStyle = C.platelet;
    ctx.globalAlpha = a * 0.5;
    ctx.fillRect(px+6, py+10, 3, 3);
    ctx.fillRect(px+18, py+14, 3, 3);
    ctx.fillRect(px+12, py+20, 2, 2);
    ctx.restore();
  }
}

// ===== 浮动毛细血管平台 =====
class FloatingPlatform {
  constructor(x, baseY, range, speed, phase){
    this.x = x;
    this.baseY = baseY;
    this.y = baseY;
    this.range = range;
    this.speed = speed;
    this.phase = phase || 0;
    this.w = TILE; this.h = 12;
  }
  update(){
    this.y = this.baseY + Math.sin(Game.frame * this.speed + this.phase) * this.range;
  }
  draw(ctx, camX){
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y);
    ctx.save();
    // 基础色块
    ctx.fillStyle = C.floatPlat;
    ctx.fillRect(px, py, TILE, this.h);
    ctx.fillStyle = C.floatPlatTop;
    ctx.fillRect(px, py, TILE, 3);
    ctx.fillStyle = C.floatPlatDark;
    ctx.fillRect(px, py+this.h-2, TILE, 2);
    // 毛细血管纹理
    ctx.fillStyle = C.floatPlatTop;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(px+4, py+5, 6, 2);
    ctx.fillRect(px+16, py+7, 8, 2);
    ctx.restore();
  }
}

// ===== 脓液地块（细菌死亡残留） =====
class PusTile {
  constructor(x, y){
    this.x = x; this.y = y;
    this.w = TILE; this.h = TILE;
    this.life = PUS_DURATION;
    this.maxLife = PUS_DURATION;
    this.expired = false;
    this.appearT = 0;
  }
  update(){
    this.appearT++;
    this.life--;
    // 氧气领域加速消退
    if(Game.oxyField) this.life -= OXY_FIELD_PUS_FADE;
    if(this.life <= 0) this.expired = true;
  }
  draw(ctx, camX){
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y);
    const a = this.life > 60 ? 0.45 : (this.life / 60) * 0.45 * (Math.floor(this.life/6)%2===0 ? 1 : 0.4);
    const scale = Math.min(1, this.appearT / 8);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = C.pus;
    ctx.fillRect(px + (1-scale)*16, py + (1-scale)*16, TILE*scale, TILE*scale);
    ctx.fillStyle = C.pusDark;
    ctx.fillRect(px + 4, py + 4, TILE - 8, 4);
    ctx.fillRect(px + 4, py + TILE - 8, TILE - 8, 4);
    ctx.fillStyle = C.pusGlow;
    ctx.globalAlpha = a * 0.5;
    ctx.fillRect(px + 8, py + 10, 4, 4);
    ctx.fillRect(px + 18, py + 14, 3, 3);
    ctx.restore();
  }
}

// ===== 辅助函数 =====
function rectOverlap(a, b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnParticles(x, y, color, count, spread){
  for(let i=0;i<count;i++){
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * spread + 0.5;
    Game.particles.push(new Particle(
      x, y, color,
      Math.cos(a) * s, Math.sin(a) * s - 1,
      20 + Math.random() * 20
    ));
  }
}

// 敌人击杀奖励
function rewardKill(enemy,level,dmg){if(dmg)Game.damageNumbers.push(new DamageNumber(enemy.x+enemy.w/2,enemy.y-6,'-'+dmg,enemy.type==='staph'?'#ffd700':C.strep));const xpT=enemy.isMini?'staphMini':(enemy.isLarge?'staphLarge':enemy.type);level.items.push(new Item(enemy.x+enemy.w/2-8,enemy.y+enemy.h/2-8,'xp',XP_PER_KILL[xpT]||10));tryDropEquip(enemy,level);}
function tryDropEquip(enemy,level){const dk=enemy.isMini?null:(enemy.type==='boss'?'boss':(enemy.isLarge?'staphLarge':enemy.type));if(!dk)return;const p=EQUIPMENT_DROPS[dk];if(!p)return;if(Math.random()<(dk==='boss'?1:(enemy.isLarge?0.18:0.06))){const eid=p[Math.floor(Math.random()*p.length)];level.items.push(new Item(enemy.x+enemy.w/2-8,enemy.y+enemy.h/2-8,'equipment',eid));const eq=findEquip(eid);if(eq)spawnParticles(enemy.x+enemy.w/2,enemy.y,eq.color,10,2);}}
function rewardBossKill(boss,dmg){if(dmg)Game.damageNumbers.push(new DamageNumber(boss.x+boss.w/2,boss.y-10,'-'+dmg,C.bossBar));Game.level.items.push(new Item(boss.x+boss.w/2-8,boss.y+boss.h/2-8,'xp',XP_PER_KILL.boss));tryDropEquip({type:'boss'},Game.level);}

// 炎症区内细菌死亡 → 生成脓液地块
function spawnPusIfNeeded(enemy){
  if(enemy.x <= INFLAMMATION_X) return;
  if(enemy.isMini) return; // 迷你菌不生成脓液
  const pusCol = Math.floor((enemy.x + enemy.w/2) / TILE);
  const pusRow = Math.floor((enemy.y + enemy.h - 1) / TILE);
  // 避免重复
  const exists = Game.pusTiles.some(pt => !pt.expired &&
    Math.floor(pt.x / TILE) === pusCol && Math.floor(pt.y / TILE) === pusRow);
  if(!exists){
    Game.pusTiles.push(new PusTile(pusCol * TILE, pusRow * TILE));
    Sfx.pus();
  }
}

// ===== ? 隐藏方块 =====
class QBlock {
  constructor(x, y, used=false){
    this.x = x; this.y = y;
    this.w = TILE; this.h = TILE;
    this.used = used;
    this.bounceY = 0;
    this.bounceTimer = 0;
  }

  hit(){
    if(this.used) return;
    this.used = true;
    this.bounceTimer = QBLOCK_BOUNCE_FRAMES;
    // ATP 从 ? 方块上方弹出，向右弧线落下
    const atp = new Item(this.x + 4, this.y - TILE, 'atp');
    atp.vy = -6;
    atp.vx = 2;
    Game.level.items.push(atp);
    Sfx.coin();
    spawnParticles(this.x + TILE/2, this.y - 4, C.qBlock, 10, 2);
  }

  update(){
    if(this.bounceTimer > 0){
      this.bounceTimer--;
      this.bounceY = -Math.sin(this.bounceTimer / QBLOCK_BOUNCE_FRAMES * Math.PI) * QBLOCK_BOUNCE_AMT;
    } else {
      this.bounceY = 0;
    }
  }

  draw(ctx, camX){
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y + this.bounceY);
    if(this.used){
      ctx.fillStyle = C.qBlockEmpty;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = '#888';
      ctx.strokeRect(x+1, y+1, TILE-2, TILE-2);
    } else {
      const pulse = 1 + Math.sin(Game.frame * 0.06) * 0.1;
      ctx.fillStyle = C.qBlock;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = '#b8960c';
      ctx.lineWidth = 2;
      ctx.strokeRect(x+1, y+1, TILE-2, TILE-2);
      ctx.fillStyle = '#000';
      ctx.font = `bold ${Math.round(20 * pulse)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('?', x + TILE/2, y + TILE/2 + 7);
    }
  }
}
