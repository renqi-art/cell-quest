/* ====================================================================
 * entities.js — 实体类：Player / Enemy / Item / Boss / QBlock / Projectile
 * version: v2-fixed
 * ==================================================================== */

// ===== 玩家 =====
class Player {
  constructor(x, y, playerIndex){
    this.x = x; this.y = y;
    this.w = PLAYER_W; this.h = STAND_H;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.crouching = false;
    this.facing = 1;
    this.cellType = 1;           // 1=WBC 2=PLT 3=RBC
    this.playerIndex = playerIndex || 0; // v3: 0=P1, 1=P2
    // 奔跑模式
    this.sprinting = false;
    this.lastTapDir = 0;         // 上次按下的方向
    this.lastTapTime = 0;        // 上次按下的时间(帧)
    this.sprintDrainTimer = 0;   // 奔跑额外消耗计时
    this._switchCD = 0;          // 细胞切换冷却
    this.health = 100;
    this.maxHealth = 100;
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
    // Boss溶血毒素贫血debuff
    this.anemiaStacks = 0;
    this.anemiaTimer = 0;
    // 杀白细胞素锁定标记
    this.leukocidinMarked = 0;
    // 脓液地块效果
    this.onPus = false;
    // 弹簧冷却
    this.springCooldown = 0;
    // 挥剑
    this.swordTimer = 0;
    this.swordCooldown = 0;
    // ===== 新主动技能（WBC）=====
    this.atk = WBC_BASE_ATK;          // 基础攻击力（装备会加成）
    this.biteCooldown = 0;            // 技能1冷却
    this.spitCooldown = 0;            // 技能2冷却
    this.lanceCooldown = 0;           // 技能3冷却
    this.pdashCharges = PDASH_CHARGES; // 技能4充能数
    this.pdashCooldown = 0;           // 技能4充能恢复计时
    this.pdashTimer = 0;              // 瞬突持续帧
    this.pdashDir = 0;
    this.invul = 0;                   // 不可选中（与 invincible 区分）
  }

  get cell(){ return CELLS[this.cellType]; }

  switchCell(type){
    if(type === this.cellType) return;
    this.cellType = type;
    Sfx.switchCell();
    spawnParticles(this.x + this.w/2, this.y + this.h/2, this.cell.color, 10, 2);
  }

  update(level){
    const k = this.playerIndex === 1 ? Game.keysP2 : Game.keys;
    const pk = this.playerIndex === 1 ? Game.prevKeysP2 : Game.prevKeys;
    // v3: 游戏内切换细胞 (Q键 / P2: Y键)
    if(k.switchCell && !pk.switchCell && !this._switchCD){
      this._switchCD = 60;
      let newType;
      if(this.playerIndex === 0 && Game.party && Game.party.length >= 2){
        // 单玩家：按出战队伍循环切换
        Game.partyIndex = (Game.partyIndex + 1) % Game.party.length;
        newType = Game.party[Game.partyIndex];
      } else {
        // P2 或队伍未就绪：保持原 1↔3 切换
        newType = this.cellType === 1 ? 3 : 1;
      }
      this.cellType = newType;
      this.atk = newType === 1 ? WBC_BASE_ATK + getMemoryBonus(Game.memoryCells).swordDmg : 0;
      Sfx.switchCell();
      spawnParticles(this.x+this.w/2, this.y+this.h/2, CELLS[newType].color, 15, 3);
      showToast('切换为 ' + CELLS[newType].name);
    }
    if(this._switchCD > 0) this._switchCD--;
    const cell = this.cell;
    this.animT++;

    // ===== 血液循环：动脉加速 + 肺泡粒子 =====
    if(this.cellType === 3){
      const alveoliStart = 41*TILE, heartStart = 63*TILE, arteryStart = 76*TILE, tissueEnd = 96*TILE;
      if(this.x >= arteryStart && this.x < tissueEnd && this.onGround && !k.left && !k.right){
        if(this.vx < MOVE_MAX * 0.5) this.vx = MOVE_MAX * 0.5;
      }
      if(this.x >= alveoliStart && this.x < heartStart && Game.frame % 30 === 0){
        spawnParticles(this.x + this.w/2, this.y + this.h/2, '#81d4fa', 3, 1);
        spawnParticles(this.x + this.w/2, this.y + this.h/2, '#aaa', 2, 0.8);
      }
    }

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
      if(this.playerIndex === 1) Game.prevKeysP2 = {...Game.keysP2};
      else Game.prevKeys = {...Game.keys};
      return; // 突进中跳过其他逻辑
    }
    if(this.dashCooldown > 0) this.dashCooldown--;
    if(this.springCooldown > 0) this.springCooldown--;

    // ===== 挥剑计时 =====
    if(this.swordTimer > 0) this.swordTimer--;
    if(this.swordCooldown > 0) this.swordCooldown--;

    // ===== 新技能冷却计时 =====
    if(this.biteCooldown > 0) this.biteCooldown--;
    if(this.spitCooldown > 0) this.spitCooldown--;
    if(this.lanceCooldown > 0) this.lanceCooldown--;
    if(this.pdashCooldown > 0){
      this.pdashCooldown--;
      if(this.pdashCooldown === 0 && this.pdashCharges < PDASH_CHARGES){
        this.pdashCharges++;
        // 如果还有充能待恢复，重置计时器
        if(this.pdashCharges < PDASH_CHARGES) this.pdashCooldown = PDASH_COOLDOWN;
      }
    }
    if(this.pdashTimer > 0){
      this.pdashTimer--;
      // 瞬突中固定 vx
      this.vx = this.pdashDir * 12;
      if(this.pdashTimer === 0){
        // 终点冲击波
        this.pdashShockwave(level);
      }
    }
    if(this.invul > 0) this.invul--;

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
    // v3: 记忆细胞移速加成
    speedMul *= (1 + getMemoryBonus(Game.memoryCells).speedPct / 100);
    if(Game.globalEnergy < LOW_ENERGY) speedMul *= LOW_SPEED_MULT;
    if(this.onBloodLoss) speedMul *= 0.85;
    // 潮涌时额外减速
    if(this.onBloodLoss && level.isTideSurge()) speedMul *= TIDE_SPEED_MULT;
    if(this.crouching && this.onGround) speedMul *= CROUCH_SPEED;
    // 脓液地块减速
    if(this.onPus) speedMul *= PUS_SLOW_MULT;

    // v3: 奔跑模式 — 双击方向键触发(300ms内)
    if(this.onGround && !this.crouching){
      if(k.left && !pk.left && !this.sprinting){
        if(this.lastTapDir === -1 && Game.frame - this.lastTapTime < 18){
          this.sprinting = true; // 双击左→奔跑
        }
        this.lastTapDir = -1; this.lastTapTime = Game.frame;
      }
      if(k.right && !pk.right && !this.sprinting){
        if(this.lastTapDir === 1 && Game.frame - this.lastTapTime < 18){
          this.sprinting = true; // 双击右→奔跑
        }
        this.lastTapDir = 1; this.lastTapTime = Game.frame;
      }
      // 松开方向键停止奔跑
      if(!k.left && !k.right) this.sprinting = false;
      // 跳跃或能量过低时停止奔跑
      if(!this.onGround || Game.globalEnergy < 15) this.sprinting = false;
    } else {
      this.sprinting = false;
    }
    if(this.sprinting){
      speedMul *= 1.5; // 奔跑1.5倍速
      Game._sprintDistance += Math.abs(this.vx); // 成就追踪
      this.sprintDrainTimer++;
      if(this.sprintDrainTimer >= 30){
        this.sprintDrainTimer = 0;
        Game.globalEnergy = Math.max(0, Game.globalEnergy - 1);
      }
      // 奔跑尘土粒子(每4帧)
      if(Game.frame % 4 === 0 && this.onGround){
        spawnParticles(this.x + this.w/2, this.y + this.h - 2, '#c8a860', 1, 0.8);
      }
    }

    if(k.left){ this.vx -= MOVE_ACCEL * speedMul; this.facing = -1; }
    if(k.right){ this.vx += MOVE_ACCEL * speedMul; this.facing = 1; }
    this.vx *= this.onGround ? GROUND_FRICTION : AIR_FRICTION;
    const maxV = MOVE_MAX * speedMul;
    if(this.vx > maxV) this.vx = maxV;
    if(this.vx < -maxV) this.vx = -maxV;
    if(Math.abs(this.vx) < 0.05){ this.vx = 0; this.sprinting = false; }

    // ===== 跳跃（变跳高 + 土狼时间 + 跳跃缓冲 + 二段跳） =====
    if(k.jump && !pk.jump) this.jumpBuffer = JUMP_BUFFER;
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
    const dl = level.height * TILE + 60;
    if(this.y > dl){
      console.error('[DEBUG] FALL DEATH y=' + this.y + ' > ' + dl + ' (levelRows=' + level.height + ')');
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

    // ===== 尖刺检测 =====
    const overlapTiles = level.getOverlapTiles(this);
    for (const t of overlapTiles) {
      if (t.tile === '^') {
        this.takeDamage(level);
        break;
      }
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
    if(k.dash && !pk.dash && this.cellType === 1){
      this.useDash(level);
    }
    if(k.skill && !pk.skill){
      if(this.cellType === 1) this.swordAttack(level);
      else if(this.cellType === 2) this.useBridge(level);
    }
    // ===== WBC 新主动技能 1/2/3/4 =====
    if(this.cellType === 1){
      if(k.skill1 && !pk.skill1) this.phagocyticBite(level);
      if(k.skill2 && !pk.skill2) this.oxidativeBurst(level);
      if(k.skill3 && !pk.skill3) this.elastaseLance(level);
      if(k.skill4 && !pk.skill4) this.bactericidalDash(level);
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
      // 弹簧 V：踩上弹跳 1.8x（含冷却防无限弹跳）
      if(t.tile === 'V' && this.vy >= 0 && this.springCooldown <= 0){
        this.y = t.row * TILE - this.h;
        this.vy = JUMP_VEL * 1.8;
        this.onGround = false;
        this.springCooldown = 10;
      }
      // 心室泵 J：踩上弹跳 2.2x
      if(t.tile === 'J' && this.vy >= 0 && this.springCooldown <= 0){
        this.y = t.row * TILE - this.h;
        this.vy = JUMP_VEL * 2.2;
        this.onGround = false;
        this.springCooldown = 10;
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
    console.warn('[DAMAGE] health=' + this.health + ' inv=' + this.invincible);
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
    this.health -= 5;
    Game.damageNumbers.push(new DamageNumber(this.x+this.w/2,this.y-6,'-5','#ff4444'));
    this.invincible = INVINCIBLE_FRAMES;
    Game.camera.shake = 8;
    Sfx.hit();
    spawnParticles(this.x+this.w/2, this.y+this.h/2, C.damage, 10, 2);
    updateHUD();
    if(this.health <= 0) this.die(level);
  }

  die(level){
    console.warn('[DIE] y=' + this.y + ' health=' + this.health + ' cells=' + Game.cells);
    Sfx.death();
    Game.deathTimer = 30;
    Game.camera.shake = 12;
    spawnParticles(this.x+this.w/2, this.y+this.h/2, C.damage, 20, 3);
    Game.stats.deaths++;

    // 扣减细胞数
    Game.cells--;
    if(Game.cells < 0) Game.cells = 0;

    // v3: 记忆细胞 — 死亡保留部分能量
    const memBonus = getMemoryBonus(Game.memoryCells);
    if(memBonus.deathEnergyKeep > 0){
      const keepAmt = Game.globalEnergy * (memBonus.deathEnergyKeep / 100);
      Game._deathEnergyKeep = Math.round(keepAmt);
    } else {
      Game._deathEnergyKeep = 0;
    }

    // v3: 双人模式 — 两个玩家都重置状态
    for(const pl of Game.players){
      if(!pl) continue;
      pl.vx = 0; pl.vy = 0;
      pl.dashTimer = 0; pl.dashCooldown = 0;
      pl.swordTimer = 0; pl.swordCooldown = 0;
      pl.aoeStomp = 0;
      pl.shield = 0; pl.oxygen = 0; pl.complementAmmo = 0;
      pl.oxyFieldTimer = 0;
      pl.onPus = false;
    }
    Game.oxyField = false;
    Game.pusTiles = [];
    level.respawnEnemies();

    // 显示死亡面板
    Game.deathsThisRun++;    // v3: 自适应难度追踪
    Game.state = 'dead';
    if(Game.mobile){ Game.mobile.input.releaseAll(); Game.mobile.overlay.setDisabled(true); }
    showDeathPanel();
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

}
