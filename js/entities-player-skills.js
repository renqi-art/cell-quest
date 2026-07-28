/* ====================================================================
 * entities-player-skills.js — Player 战斗技能 (sword + WBC skills 1-4)
 * ==================================================================== */

Player.prototype.swordAttack = function(level) {
    if(this.swordCooldown > 0) return;
    if(Game.globalEnergy < SWORD_COST){ showToast('能量不足！'); return; }
    Game.globalEnergy -= SWORD_COST;
    this.swordTimer = SWORD_DURATION;
    this.swordCooldown = SWORD_COOLDOWN;
    Sfx.dash(); // 复用突进音效
    Sfx.swordHit(); // 新增：挥剑打击音效
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

  // ===== 技能一：吞噬撕咬 (Phagocytic Bite) =====
  // 单体爆发 + 斩杀回血

Player.prototype.phagocyticBite = function(level) {
    if(this.biteCooldown > 0){ showToast('吞噬撕咬冷却中'); return; }
    if(Game.globalEnergy < BITE_COST){ showToast('能量不足！'); return; }
    Game.globalEnergy -= BITE_COST;
    this.biteCooldown = BITE_COOLDOWN;
    Sfx.dash();
    Sfx.swordHit(); // 新增：吞噬撕咬打击音效
    const ax = this.x + this.w/2;
    const ay = this.y + this.h/2;
    // 找最近敌人
    let target = null, targetBoss = null;
    let minDist = BITE_RANGE;
    for(const e of level.enemies){
      if(!e.alive) continue;
      const ex = e.x + e.w/2, ey = e.y + e.h/2;
      const d = Math.hypot(ex - ax, ey - ay);
      if(d < minDist){ minDist = d; target = e; }
    }
    if(Game.boss && Game.boss.alive){
      const bx = Game.boss.x + Game.boss.w/2, by = Game.boss.y + Game.boss.h/2;
      const d = Math.hypot(bx - ax, by - ay);
      if(d < minDist * 2){ targetBoss = Game.boss; } // Boss 攻击范围放宽
    }
    if(!target && !targetBoss){ showToast('未找到目标'); return; }
    // 计算伤害
    const atk = this.atk;
    let killed = false;
    if(target){
      const executeThreshold = target.maxHp * BITE_EXECUTE_PCT;
      const isExecute = target.hp <= executeThreshold;
      const dmg = isExecute ? Math.floor(atk * BITE_MULT * BITE_EXECUTE_MULT) : Math.floor(atk * BITE_MULT);
      target.hp -= dmg;
      spawnParticles(target.x + target.w/2, target.y + target.h/2, isExecute ? '#ff5252' : C.swordGlow, 14, 3);
      DamageNumber && Game.damageNumbers.push(new DamageNumber(target.x + target.w/2, target.y, dmg, isExecute ? '#ff5252' : '#ffdd44'));
      if(target.hp <= 0){
        target.alive = false;
        if(target.isLarge) target.split(level);
        Game.stats.kills++;
        spawnPusIfNeeded(target);
        spawnParticles(target.x + target.w/2, target.y + target.h/2, target.type==='staph'?C.staph:C.strep, 14, 3);
        killed = true;
      }
    }
    if(targetBoss){
      const b = targetBoss;
      const executeThreshold = b.maxHp * BITE_EXECUTE_PCT;
      const isExecute = b.hp <= executeThreshold;
      const dmg = isExecute ? Math.floor(atk * BITE_MULT * BITE_EXECUTE_MULT) : Math.floor(atk * BITE_MULT);
      b.hp -= dmg;
      b.flashTimer = 8;
      spawnParticles(b.x + b.w/2, b.y + b.h/2, isExecute ? '#ff5252' : C.swordGlow, 16, 3.5);
      Game.damageNumbers.push(new DamageNumber(b.x + b.w/2, b.y, dmg, isExecute ? '#ff5252' : '#ffdd44'));
      if(b.hp <= 0){
        b.alive = false;
        Game.stats.kills++;
        spawnParticles(b.x + b.w/2, b.y + b.h/2, C.boss, 30, 5);
        spawnParticles(b.x + b.w/2, b.y + b.h/2, C.bossEye, 20, 4);
        Sfx.complete();
        showToast('Boss 已击杀！');
        killed = true;
      }
    }
    // 击杀回血
    if(killed){
      const heal = Math.ceil(this.maxHealth * BITE_HEAL_PCT);
      this.health = Math.min(this.maxHealth, this.health + heal);
      spawnParticles(this.x + this.w/2, this.y + this.h/2, C.heal || '#66ff66', 16, 2);
      showToast('吞噬撕咬！击杀回血 +' + heal);
    } else {
      showToast(isExecute ? '斩杀！' : '吞噬撕咬！');
    }
    updateHUD();
  }

  // ===== 技能二：活性氧喷吐 (Oxidative Burst Spit) =====
  // 60°扇形 AOE + DOT + 防御降

Player.prototype.oxidativeBurst = function(level) {
    if(this.spitCooldown > 0){ showToast('活性氧喷吐冷却中'); return; }
    if(Game.globalEnergy < SPIT_COST){ showToast('能量不足！'); return; }
    Game.globalEnergy -= SPIT_COST;
    this.spitCooldown = SPIT_COOLDOWN;
    Sfx.shoot();
    const ax = this.x + this.w/2;
    const ay = this.y + this.h/2;
    const dirX = this.facing;
    const halfAngle = (SPIT_RANGE_DEG / 2) * Math.PI / 180;
    const range = SPIT_RANGE_M * METER;
    const atk = this.atk;
    const initialDmg = Math.floor(atk * SPIT_MULT);
    const dotPerFrame = Math.floor(atk * SPIT_DOT_MULT / 60 * 10) / 10; // 每帧伤害（粗略）
    const totalDotPerSec = atk * SPIT_DOT_MULT; // 每秒
    const affected = []; // 记录命中目标，统一加 DOT
    // 敌人
    for(const e of level.enemies){
      if(!e.alive) continue;
      const ex = e.x + e.w/2, ey = e.y + e.h/2;
      const dx = ex - ax, dy = ey - ay;
      const dist = Math.hypot(dx, dy);
      if(dist > range) continue;
      // 朝向必须是前方
      const dot = (dx * dirX) / (dist || 1);
      if(dot < Math.cos(halfAngle)) continue;
      e.hp -= initialDmg;
      spawnParticles(ex, ey, '#ffeb3b', 8, 2);
      Game.damageNumbers.push(new DamageNumber(ex, ey - 8, initialDmg, '#ffeb3b'));
      e.dotTimer = SPIT_DOT_DUR;
      e.dotPerSec = Math.floor(totalDotPerSec);
      e.defDebuff = SPIT_DEF_DEBUFF;
      e.defDebuffTimer = SPIT_DOT_DUR;
      affected.push(e);
      if(e.hp <= 0){
        e.alive = false;
        if(e.isLarge) e.split(level);
        Game.stats.kills++;
        spawnPusIfNeeded(e);
        spawnParticles(ex, ey, '#ffeb3b', 12, 3);
      }
    }
    // Boss
    if(Game.boss && Game.boss.alive){
      const b = Game.boss;
      const bx = b.x + b.w/2, by = b.y + b.h/2;
      const dx = bx - ax, dy = by - ay;
      const dist = Math.hypot(dx, dy);
      if(dist <= range * 1.5){ // Boss 范围放宽
        const dot = (dx * dirX) / (dist || 1);
        if(dot >= Math.cos(halfAngle)){
          b.hp -= initialDmg;
          b.flashTimer = 8;
          spawnParticles(bx, by, '#ffeb3b', 14, 3);
          Game.damageNumbers.push(new DamageNumber(bx, by - 8, initialDmg, '#ffeb3b'));
          b.dotTimer = SPIT_DOT_DUR;
          b.dotPerSec = Math.floor(totalDotPerSec);
          b.defDebuff = SPIT_DEF_DEBUFF;
          b.defDebuffTimer = SPIT_DOT_DUR;
          affected.push(b);
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
    }
    showToast('活性氧喷吐！命中 ' + affected.length + ' 个目标');
    updateHUD();
  }

  // ===== 技能三：弹性蛋白酶贯枪 (Elastase Lance) =====
  // 直线穿透 + 破甲 + 对生物膜/血盾加伤

Player.prototype.elastaseLance = function(level) {
    if(this.lanceCooldown > 0){ showToast('弹性蛋白酶贯枪冷却中'); return; }
    if(Game.globalEnergy < LANCE_COST){ showToast('能量不足！'); return; }
    Game.globalEnergy -= LANCE_COST;
    this.lanceCooldown = LANCE_COOLDOWN;
    Sfx.shoot();
    const ax = this.x + this.w/2;
    const ay = this.y + this.h/2;
    const dirX = this.facing;
    const range = LANCE_RANGE_M * METER;
    const halfWidth = (LANCE_WIDTH_M * METER) / 2;
    const atk = this.atk;
    const baseDmg = Math.floor(atk * LANCE_MULT);
    // 直线矩形范围判定
    const inLance = (tx, ty) => {
      const dx = (tx - ax) * dirX; // 前方距离
      const dy = Math.abs(ty - ay);
      return dx > 0 && dx < range && dy < halfWidth;
    };
    // 敌人
    let hits = 0;
    for(const e of level.enemies){
      if(!e.alive) continue;
      const ex = e.x + e.w/2, ey = e.y + e.h/2;
      if(!inLance(ex, ey)) continue;
      // 加伤判定（Boss 生物膜/血盾；普通敌人也算 +50%）
      const bonusMult = (e.biofilmActive || e.shieldActive) ? LANCE_BONUS_MULT : 1;
      const dmg = Math.floor(baseDmg * bonusMult);
      e.hp -= dmg;
      spawnParticles(ex, ey, '#80deea', 10, 2.5);
      Game.damageNumbers.push(new DamageNumber(ex, ey - 8, dmg, '#80deea'));
      e.defPen = LANCE_DEF_PEN;
      e.defPenTimer = LANCE_DEF_DUR;
      hits++;
      if(e.hp <= 0){
        e.alive = false;
        if(e.isLarge) e.split(level);
        Game.stats.kills++;
        spawnPusIfNeeded(e);
        spawnParticles(ex, ey, '#80deea', 14, 3);
      }
    }
    // Boss
    if(Game.boss && Game.boss.alive){
      const b = Game.boss;
      const bx = b.x + b.w/2, by = b.y + b.h/2;
      if(inLance(bx, by) || inLance(b.x + b.w/4, by) || inLance(b.x + b.w*3/4, by)){
        const bonusMult = (b.biofilmActive || b.shieldActive) ? LANCE_BONUS_MULT : 1;
        const dmg = Math.floor(baseDmg * bonusMult);
        b.hp -= dmg;
        b.flashTimer = 8;
        spawnParticles(bx, by, '#80deea', 16, 3.5);
        Game.damageNumbers.push(new DamageNumber(bx, by - 8, dmg, '#80deea'));
        b.defPen = LANCE_DEF_PEN;
        b.defPenTimer = LANCE_DEF_DUR;
        hits++;
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
    // 视觉：直线特效（粒子轨迹）
    for(let i = 0; i < 12; i++){
      const px = ax + dirX * (range * i / 12);
      spawnParticles(px, ay + (Math.random() - 0.5) * halfWidth, '#80deea', 4, 1.5);
    }
    showToast('弹性蛋白酶贯枪！穿透 ' + hits + ' 个目标' + (hits ? ' + 破甲' : ''));
    updateHUD();
  }

  // ===== 技能四：杀菌渗透·瞬突 (Bactericidal Permeability Dash) =====
  // 突进 + 终点冲击波 + 击退 + 不可选中 + 2层充能

Player.prototype.bactericidalDash = function(level) {
    if(this.pdashCharges <= 0){ showToast('瞬突充能耗尽'); return; }
    if(Game.globalEnergy < PDASH_COST){ showToast('能量不足！'); return; }
    if(this.pdashTimer > 0) return; // 正在突进中
    Game.globalEnergy -= PDASH_COST;
    this.pdashCharges--;
    if(this.pdashCharges === PDASH_CHARGES - 1 || this.pdashCooldown === 0){
      this.pdashCooldown = PDASH_COOLDOWN; // 启动充能恢复计时
    }
    this.pdashTimer = 18; // 0.3秒冲刺
    this.pdashDir = this.facing;
    this.invul = PDASH_INVUL;
    Sfx.dash();
    spawnParticles(this.x + this.w/2, this.y + this.h/2, '#00e5ff', 14, 2);
    showToast('杀菌渗透·瞬突！剩余充能 ' + this.pdashCharges + '/' + PDASH_CHARGES);
    updateHUD();
  }

  // 瞬突终点冲击波

Player.prototype.pdashShockwave = function(level) {
    const ax = this.x + this.w/2;
    const ay = this.y + this.h/2;
    const r = PDASH_SHOCK_R;
    const atk = this.atk;
    const dmg = Math.floor(atk * PDASH_MULT);
    spawnParticles(ax, ay, '#00e5ff', 24, 4);
    Sfx.hit();
    // 敌人
    for(const e of level.enemies){
      if(!e.alive) continue;
      const ex = e.x + e.w/2, ey = e.y + e.h/2;
      const d = Math.hypot(ex - ax, ey - ay);
      if(d > r) continue;
      e.hp -= dmg;
      // 击退
      const kbDir = ex > ax ? 1 : -1;
      e.vx = kbDir * 6;  // 给敌人一个推力
      e.knockbackTimer = 20; // 20帧击退
      spawnParticles(ex, ey, '#00e5ff', 8, 2);
      Game.damageNumbers.push(new DamageNumber(ex, ey - 8, dmg, '#00e5ff'));
      if(e.hp <= 0){
        e.alive = false;
        if(e.isLarge) e.split(level);
        Game.stats.kills++;
        spawnPusIfNeeded(e);
      }
    }
    // Boss
    if(Game.boss && Game.boss.alive){
      const b = Game.boss;
      const bx = b.x + b.w/2, by = b.y + b.h/2;
      const d = Math.hypot(bx - ax, by - ay);
      if(d <= r * 1.3){
        b.hp -= dmg;
        b.flashTimer = 8;
        spawnParticles(bx, by, '#00e5ff', 14, 3.5);
        Game.damageNumbers.push(new DamageNumber(bx, by - 8, dmg, '#00e5ff'));
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

