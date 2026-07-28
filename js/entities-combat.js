/* ====================================================================
 * entities-combat.js — Enemy / Boss / Projectile / Particle / DamageNumber
 * ==================================================================== */

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
    // ===== WBC 新技能附加状态 =====
    this.dotTimer = 0;       // DOT 剩余帧
    this.dotPerSec = 0;      // 每秒伤害
    this.defDebuff = 0;      // 防御降低比例
    this.defDebuffTimer = 0;
    this.defPen = 0;         // 破甲比例
    this.defPenTimer = 0;
    this.knockbackTimer = 0; // 击退强制 vx 帧数

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
    } else if(type === 'salmonella'){ // 沙门氏菌：杆状、可自主巡逻移动
      this.w = 28; this.h = 16;
      this.hp = 1;
      this.vx = -0.45;
      this.isBacteria = true;
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
    } else if(this.type === 'salmonella'){
      this.hp = 1; this.vx = -0.45;
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

    // ===== WBC 技能附加状态 tick =====
    if(this.dotTimer > 0){
      this.dotTimer--;
      // 每秒扣血（60帧/秒）
      if(this.dotTimer % 60 === 0 && this.dotPerSec > 0){
        this.hp -= this.dotPerSec;
        spawnParticles(this.x + this.w/2, this.y + this.h/2, '#ffeb3b', 4, 1);
        if(this.hp <= 0){
          this.alive = false;
          if(this.isLarge) this.split(level);
          Game.stats.kills++;
          spawnPusIfNeeded(this);
        }
      }
    }
    if(this.defDebuffTimer > 0) this.defDebuffTimer--;
    else this.defDebuff = 0;
    if(this.defPenTimer > 0) this.defPenTimer--;
    else this.defPen = 0;
    if(this.knockbackTimer > 0) this.knockbackTimer--;

    if(this.type === 'staph' || this.type === 'salmonella'){
      // 葡萄球菌 / 沙门氏菌：仅在落地后巡逻
      if(!this.onGround){
        this.vx = 0;
      } else {
        const baseSpeed = this.isLarge ? 0.3 : (this.isMini ? 0.6 : 0.4);
        this.vx = this.dir * baseSpeed;
        this.x += this.vx;
        const frontCol = Math.floor((this.dir > 0 ? this.x + this.w : this.x) / TILE);
        const checkRow = Math.floor((this.y + this.h + 2) / TILE);
        // 地图边缘强制转向（避免在无墙的开放地形中走出边界、无法击杀）
        if(frontCol <= 0 || frontCol >= level.width - 1){
          this.dir *= -1;
        } else if(level.solidAt(frontCol, Math.floor(this.y / TILE))){
          this.dir *= -1;
        } else if(!level.solidAt(frontCol, checkRow) && this.onGround){
          this.dir *= -1;
        }
        // 巡逻范围限制（Boss召唤的小怪不会跑太远）
        if(this.patrolRange && Math.abs(this.x - this.spawnX) > this.patrolRange){
          this.dir = this.x > this.spawnX ? -1 : 1;
        }
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
        // 撞到实心方块则停止冲刺
        const dashCol = Math.floor((this.chargeDir > 0 ? this.x + this.w - 1 : this.x) / TILE);
        const dashRow = Math.floor((this.y + this.h/2) / TILE);
        if(level.solidAt(dashCol, dashRow) || level.solidAt(dashCol, Math.floor(this.y / TILE))){
          this.x = this.chargeDir > 0 ? dashCol * TILE - this.w : (dashCol + 1) * TILE;
          this.state = 'cooldown';
          this.stateTimer = CHARGE_COOLDOWN;
          this.dir = this.chargeDir;
          spawnParticles(this.x+this.w/2, this.y+this.h/2, C.chargeWarn, 8, 2);
        }
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
      const stomp = player.vy > 0 && (player.y + player.h - this.y) < 28;
      if(stomp){
        // 踩踏
        if(player.cellType === 1){
          // 白细胞：唯一能击杀敌人的细胞
          player.stompEnemy(this, level);
          this.hp--;
          if(Game.oxyField) this.hp -= OXY_FIELD_STOMP_BONUS; // 氧气领域加成
          spawnParticles(this.x+this.w/2, this.y, this.type==='salmonella'?C.salmonella:(this.type==='staph'?C.staph:C.strep), 8, 2);
          if(this.hp <= 0){
            this.alive = false;
            if(this.isLarge) this.split(level);
            Game.stats.kills++;
            spawnPusIfNeeded(this);
            spawnParticles(this.x+this.w/2, this.y, this.type==='salmonella'?C.salmonella:(this.type==='staph'?C.staph:C.strep), 14, 3);
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
    } else if(this.type === 'salmonella'){
      // 沙门氏菌：杆状菌体 + 鞭毛，黄绿色调
      const c = C.salmonella, cd = C.salmonellaDark;
      const bob = Math.sin(this.animT * 0.15) * 1.5;
      ctx.save();
      ctx.translate(px + this.w/2, py + this.h/2 + bob);
      ctx.scale(this.dir, 1);
      // 鞭毛（拖尾摆动）
      ctx.strokeStyle = cd;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-this.w/2, 0);
      for(let i = -this.w/2; i >= -this.w/2 - 9; i -= 2){
        ctx.lineTo(i, Math.sin(this.animT * 0.3 + i * 0.5) * 3);
      }
      ctx.stroke();
      // 菌体（胶囊形）
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, Math.PI*2);
      ctx.fill();
      // 内部核点缀
      ctx.fillStyle = cd;
      ctx.beginPath(); ctx.arc(-3, -1, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, 2, 1.6, 0, Math.PI*2); ctx.fill();
      ctx.restore();
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

// ===== Boss（金黄色葡萄球菌，6技能） =====
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
    this.spawnX = x; this.spawnY = y;
    // ===== WBC 新技能附加状态 =====
    this.dotTimer = 0;
    this.dotPerSec = 0;
    this.defDebuff = 0;
    this.defDebuffTimer = 0;
    this.defPen = 0;
    this.defPenTimer = 0;
    // 技能一：血盾
    this.shieldHP = 0; this.shieldMaxHP = 0;
    this.shieldActive = false;
    this.shieldCooldown = 0;
    this.stunTimer = 0;         // 破盾僵直
    // 技能二：溶血环
    this.ringWaves = [];        // [{x, y, r, maxR, active}]
    this.ringCooldown = 0;
    // 技能三：杀白细胞素
    this.leukocidinCooldown = 0;
    this.leukocidinCast = 0;    // 读条剩余帧
    // 技能四：增殖
    this.spawnTimer = 0;
    // 技能五：毒休克
    this.shockCooldown = 0;
    this.shockCast = 0;         // 读条剩余帧
    // 技能六：生物膜
    this.biofilmActive = false;
    this.biofilmRegenTimer = 0;
    this.biofilmLastHit = 0;    // 上次被攻击的帧
    // 遭遇触发
    this.encountered = false;
    // ===== v3: Boss AI 三阶段系统 =====
    this.currentPhase = 1;      // 1/2/3
    this.phaseTransition = 0;   // 阶段切换动画帧数
    this.phaseLabel = '';       // 当前阶段名称
  }

  // 获取当前阶段
  getPhase(){
    const pct = this.hp / this.maxHp;
    if(pct > 0.70) return 1;
    if(pct > 0.30) return 2;
    return 3;
  }

  // 阶段切换检测
  checkPhaseTransition(){
    const newPhase = this.getPhase();
    if(newPhase !== this.currentPhase){
      const oldPhase = this.currentPhase;
      this.currentPhase = newPhase;
      this.phaseTransition = 60; // 1秒过渡动画
      Game.camera.shake = 8;
      const labels = {1:'远程压制', 2:'防守反击', 3:'狂暴模式'};
      this.phaseLabel = labels[newPhase];
      const colors = {1:'#4fc3f7', 2:'#ffd740', 3:'#ff3030'};
      spawnParticles(this.x+this.w/2, this.y+this.h/2, colors[newPhase], 25, 4);
      showToast('⚠ Boss 进入阶段 ' + newPhase + '：' + this.phaseLabel + '！');
      // 阶段3自动激活生物膜
      if(newPhase === 3 && !this.biofilmActive){
        this.biofilmActive = true;
        showToast('⚠ Boss 分泌生物膜！防御提升，持续近身攻击阻止回血');
      }
    }
  }

  reset(){
    this.x = this.spawnX; this.y = this.spawnY;
    this.hp = this.maxHp; this.alive = true;
    this.flashTimer = 0;
    this.shieldHP = 0; this.shieldMaxHP = 0; this.shieldActive = false;
    this.shieldCooldown = 0; this.stunTimer = 0;
    this.ringWaves = []; this.ringCooldown = 0;
    this.leukocidinCooldown = 0; this.leukocidinCast = 0;
    this.spawnTimer = 0;
    this.shockCooldown = 0; this.shockCast = 0;
    this.biofilmActive = false; this.biofilmRegenTimer = 0; this.biofilmLastHit = 0;
    this.encountered = false;
    this.vx = 0; this.vy = 0;
    // v3: 阶段重置
    this.currentPhase = 1;
    this.phaseTransition = 0;
    this.phaseLabel = '';
  }

  update(level, player){
    if(!this.alive) return;
    this.animT++;
    if(this.flashTimer > 0) this.flashTimer--;
    if(this.phaseTransition > 0) this.phaseTransition--;

    // v3: 阶段切换检测
    if(this.encountered) this.checkPhaseTransition();

    // ===== WBC 技能附加状态 tick =====
    if(this.dotTimer > 0){
      this.dotTimer--;
      if(this.dotTimer % 60 === 0 && this.dotPerSec > 0){
        this.hp -= this.dotPerSec;
        spawnParticles(this.x + this.w/2, this.y + this.h/2, '#ffeb3b', 6, 1.5);
        if(this.hp <= 0){
          this.alive = false;
          Game.stats.kills++;
          spawnParticles(this.x + this.w/2, this.y + this.h/2, C.boss, 30, 5);
          spawnParticles(this.x + this.w/2, this.y + this.h/2, C.bossEye, 20, 4);
          Sfx.complete();
          showToast('Boss 已击杀！');
        }
      }
    }
    if(this.defDebuffTimer > 0) this.defDebuffTimer--;
    else this.defDebuff = 0;
    if(this.defPenTimer > 0) this.defPenTimer--;
    else this.defPen = 0;

    // 第一次被击打后才激活技能（由 takeDamage 触发 encounter）

    // 破盾僵直：不移动
    if(this.stunTimer > 0){
      this.stunTimer--;
      // 僵直期间毒休克读条被打断
      if(this.shockCast > 0){
        this.shockCast = 0;
        this.shockCooldown = BOSS_CD_SHOCK;
      }
      this.updateSkills(level, player);
      this.checkPlayerCollision(level, player);
      return;
    }

    // 阶段化移速
    const moveSpeed = this.currentPhase === 3 ? 0.75 : 0.4;
    this.vx = this.dir * moveSpeed;
    this.x += this.vx;
    const frontCol = Math.floor((this.dir > 0 ? this.x + this.w : this.x) / TILE);
    if(level.solidAt(frontCol, Math.floor(this.y / TILE))) this.dir *= -1;
    const checkRow = Math.floor((this.y + this.h + 2) / TILE);
    if(!level.solidAt(frontCol, checkRow) && this.onGround) this.dir *= -1;

    // 重力
    this.vy += GRAVITY;
    if(this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.y += this.vy;
    this.onGround = false;
    const tiles = level.getOverlapTiles(this);
    for(const t of tiles){
      if(level.solidTile(t.tile) && this.vy > 0){
        this.y = t.row * TILE - this.h;
        this.vy = 0; this.onGround = true;
      }
    }

    this.checkPlayerCollision(level, player);
    this.updateSkills(level, player);

    // 溶血环扩散
    for(const w of this.ringWaves){
      if(!w.active) continue;
      w.r += BOSS_RING_SPEED;
      if(w.r >= w.maxR){ w.active = false; continue; }
      // 命中玩家
      const dx = player.x + player.w/2 - w.x;
      const dy = player.y + player.h/2 - w.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(Math.abs(dist - w.r) < 16){
        player.takeDamage(level);
        // 叠加贫血
        if(player.anemiaStacks < 5){
          player.anemiaStacks++;
          player.anemiaTimer = 600; // 10s
        }
        w.active = false;
      }
    }

    // 生物膜回血检测
    if(this.biofilmActive){
      this.biofilmRegenTimer++;
      if(this.animT - this.biofilmLastHit > 300){ // 5s未受攻击
        if(this.biofilmRegenTimer >= 180){ // 每3s回1血
          this.biofilmRegenTimer = 0;
          this.hp = Math.min(this.maxHp, this.hp + 1);
          spawnParticles(this.x+this.w/2, this.y+this.h/2, '#7ac', 6, 1);
        }
      } else {
        this.biofilmRegenTimer = 0;
      }
    }
  }

  // === v3: 三阶段技能系统 ===
  updateSkills(level, player){
    // 未遭遇前不激活任何技能
    if(!this.encountered) return;

    const phase = this.currentPhase;
    // 阶段化CD倍率
    const cdMult = phase === 3 ? 0.7 : 1.0;

    // ========== 技能一：血盾（仅阶段二、三可用） ==========
    if(phase >= 2){
      if(this.shieldCooldown > 0){
        this.shieldCooldown--;
      } else if(!this.shieldActive && this.stunTimer <= 0){
        this.activateShield();
      }
    }

    // ========== 技能二：溶血环（全阶段可用，CD随阶段变化） ==========
    if(this.ringCooldown > 0){
      this.ringCooldown--;
    } else {
      this.activateRing();
    }

    // ========== 技能三：杀白细胞素（阶段一优先，阶段二、三可用但CD更长） ==========
    if(this.leukocidinCooldown > 0) this.leukocidinCooldown--;
    if(this.leukocidinCast > 0){
      this.leukocidinCast--;
      if(this.leukocidinCast === 0){
        player.takeDamage(level);
        player.takeDamage(level);
        player.leukocidinMarked = 0;
        this.leukocidinCooldown = Math.floor(BOSS_CD_LEUKOCIDIN * cdMult);
        Game.camera.shake = 6;
        spawnParticles(player.x+player.w/2, player.y+player.h/2, '#ff4444', 15, 3);
      }
    } else if(this.leukocidinCooldown <= 0 && this.leukocidinCast <= 0){
      // 阶段一：优先使用，CD更短
      if(phase === 1){
        this.activateLeukocidin(player);
        this.leukocidinCooldown = 0; // activateLeukocidin内会设置，这里覆盖
      } else if(phase >= 2 && Math.random() < 0.4){
        // 阶段二、三：40%概率使用
        this.activateLeukocidin(player);
      }
    }

    // ========== 技能四：增殖（仅阶段二、三可用） ==========
    if(phase >= 2){
      this.spawnTimer++;
      const spawnCD = phase === 3 ? Math.floor(BOSS_CD_SPAWN * 0.7) : BOSS_CD_SPAWN;
      if(this.spawnTimer >= spawnCD){
        this.spawnTimer = 0;
        this.activateProliferation(level);
      }
    }

    // ========== 技能五：毒休克（全阶段可用，阶段三CD缩短） ==========
    if(this.shockCooldown > 0) this.shockCooldown--;
    if(this.shockCast > 0){
      this.shockCast--;
      if(this.shockCast === 0){
        this.executeShock(player);
      }
    } else if(this.shockCooldown <= 0 && this.stunTimer <= 0){
      const shockCD = phase === 3 ? Math.floor(BOSS_CD_SHOCK * 0.55) : BOSS_CD_SHOCK;
      this.shockCast = 180;
      this.shockCooldown = shockCD;
    }

    // ========== 技能六：生物膜（阶段三自动激活，阶段一不可用） ==========
    if(phase === 3 && !this.biofilmActive){
      this.biofilmActive = true;
      showToast('⚠ Boss 分泌生物膜！防御提升 30%');
    }
    // 阶段一：生物膜不可用（被动阻止）
    // 阶段二：40%血量自动激活（保留原逻辑但已被phase覆盖）
    if(phase === 1 && this.biofilmActive){
      this.biofilmActive = false; // 阶段一强制关闭
    }

    // 玩家贫血计时
    if(player.anemiaTimer > 0){
      player.anemiaTimer--;
      if(player.anemiaTimer === 0) player.anemiaStacks = 0;
    }
    // 杀白细胞素标记计时
    if(player.leukocidinMarked > 0) player.leukocidinMarked--;
  }

  activateShield(){
    this.shieldMaxHP = Math.ceil(this.maxHp * BOSS_SHIELD_PCT) || 1;
    this.shieldHP = this.shieldMaxHP;
    this.shieldActive = true;
    spawnParticles(this.x+this.w/2, this.y+this.h/2, '#8b0000', 12, 2);
  }

  activateRing(){
    this.ringWaves.push({
      x: this.x + this.w/2, y: this.y + this.h/2,
      r: 10, maxR: BOSS_RING_MAX_R, active: true
    });
    this.ringCooldown = BOSS_CD_RING;
  }

  activateLeukocidin(player){
    this.leukocidinCast = 90; // 1.5s读条
    player.leukocidinMarked = 90;
    this.leukocidinCooldown = BOSS_CD_LEUKOCIDIN;
  }

  activateProliferation(level){
    const bx = this.x + this.w/2;
    const by = this.y + this.h;
    for(let i = 0; i < 2; i++){
      const ox = (Math.random() - 0.5) * 100;
      const mini = new Enemy(bx + ox, by - 20, 'staph');
      mini.makeMini();
      mini.spawnX = mini.x; mini.spawnY = mini.y;
      mini.lifeTimer = 0;      // 存活计时（用于分裂）
      mini.patrolRange = 130;  // 限定在Boss附近巡逻（约4格）
      level.enemies.push(mini);
      spawnParticles(mini.x + 12, mini.y + 10, C.staph, 6, 1.5);
    }
  }

  executeShock(player){
    // 全屏震荡
    Game.camera.shake = 20;
    player.takeDamage(Game.level);
    // 清除所有正面buff
    player.shield = 0;
    player.oxygen = 0;
    player.complementAmmo = 0;
    player.aoeStomp = 0;
    player.oxyFieldTimer = 0;
    Game.oxyField = false;
    Game.tidePaused = 0;
    // 视觉效果
    for(let i = 0; i < 30; i++){
      spawnParticles(
        Math.random() * 800, Math.random() * 480,
        '#ffd700', 4, 2 + Math.random() * 3
      );
    }
    showToast('⚠ 毒性休克风暴！所有增益已被清除');
  }

  // === 玩家碰撞 ===
  checkPlayerCollision(level, player){
    if(!rectOverlap(this, player)) return;
    const stomp = player.vy > 0 && (player.y + player.h - this.y) < 24;
    if(stomp){
      if(player.cellType === 1){
        player.stompEnemy(this, level);
        this.takeDamage(1, player);
      } else {
        player.vy = JUMP_VEL * 0.5;
        player.jumpsLeft = 1;
      }
    } else {
      player.takeDamage(level);
    }
  }

  takeDamage(dmg, player){
    // 第一次被击打：激活技能系统
    if(!this.encountered){
      this.encountered = true;
      showToast('⚠ 金黄色葡萄球菌被激怒！开始增殖...');
      spawnParticles(this.x+this.w/2, this.y+this.h/2, C.boss, 20, 3);
      Game.camera.shake = 4;
    }

    // 生物膜防御
    let effectiveDmg = dmg;
    if(this.biofilmActive) effectiveDmg = Math.max(1, dmg - Math.ceil(dmg * 0.3));
    // 血盾吸收
    if(this.shieldActive && this.shieldHP > 0){
      this.shieldHP -= effectiveDmg;
      this.flashTimer = 8;
      spawnParticles(this.x+this.w/2, this.y+this.h/2, '#ff4444', 8, 1.5);
      if(this.shieldHP <= 0){
        // 破盾！僵直3s
        this.shieldActive = false;
        this.shieldHP = 0;
        this.stunTimer = 180;
        this.shieldCooldown = BOSS_CD_SHIELD;
        Game.camera.shake = 8;
        spawnParticles(this.x+this.w/2, this.y+this.h/2, '#ffd700', 20, 3);
        showToast('🔓 血盾破裂！Boss陷入僵直 3 秒');
      }
    } else {
      this.hp -= effectiveDmg;
      this.flashTimer = 8;
      this.biofilmLastHit = this.animT; // 生物膜受击计时
      if(this.hp <= 0){
        this.alive = false;
        Game.stats.kills++;
        spawnParticles(this.x+this.w/2, this.y+this.h/2, C.boss, 40, 6);
        spawnParticles(this.x+this.w/2, this.y+this.h/2, C.bossEye, 25, 5);
        Sfx.complete();
        showToast('🎉 Boss 已击杀！');
      }
    }
  }

  draw(ctx, camX){
    if(!this.alive) return;
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y);

    // 生物膜粘液光晕
    if(this.biofilmActive){
      ctx.fillStyle = 'rgba(100,200,150,0.08)';
      ctx.beginPath(); ctx.arc(px+this.w/2, py+this.h/2, 60, 0, Math.PI*2); ctx.fill();
    }

    // 血盾视觉效果
    const shieldAlpha = this.shieldActive ? 0.35 + Math.sin(this.animT * 0.1) * 0.15 : 0;
    if(shieldAlpha > 0){
      ctx.strokeStyle = `rgba(180,30,30,${shieldAlpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(px+this.w/2, py+this.h/2, this.w/2+4, this.h/2+4, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // 毒休克读条金光
    if(this.shockCast > 0){
      const glowAlpha = 0.15 + Math.sin(this.animT * 0.3) * 0.1;
      ctx.fillStyle = `rgba(255,200,50,${glowAlpha})`;
      ctx.beginPath(); ctx.arc(px+this.w/2, py+this.h/2, 50 + Math.sin(this.animT*0.2)*8, 0, Math.PI*2); ctx.fill();
    }

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

    // 血条背景
    const barW = this.w + 10;
    const barX = px - 5;
    const barY = py - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, 7);
    // 血盾条（暗红色）
    if(this.shieldActive && this.shieldHP > 0){
      ctx.fillStyle = '#8b0000';
      ctx.fillRect(barX, barY, barW * (this.shieldHP / this.shieldMaxHP), 3);
    }
    // v3: HP条颜色随阶段变化
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, 7);

    // 技能名 + HP数字 + v3阶段标签
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    let label = `HP:${this.hp}/${this.maxHp}`;
    if(this.stunTimer > 0) label = 'STUN!';
    else if(this.shockCast > 0) label = `💀毒休克 ${Math.ceil(this.shockCast/60)}s`;
    else if(this.leukocidinCast > 0) label = `🎯点名 ${Math.ceil(this.leukocidinCast/60)}s`;
    else if(this.shieldActive) label = `🛡️盾 ${this.shieldHP}/${this.shieldMaxHP}`;
    // v3: 阶段标签 + 阶段指示条
    const phaseColors = {1:'#4fc3f7', 2:'#ffd740', 3:'#ff3030'};
    const phaseNames = {1:'P1·远程压制', 2:'P2·防守反击', 3:'P3·狂暴'};
    const pc = phaseColors[this.currentPhase];
    ctx.fillStyle = pc;
    ctx.fillText(phaseNames[this.currentPhase], px + this.w/2, barY - 14);
    // HP条颜色随阶段变化
    ctx.fillStyle = pc;
    const hpPct2 = Math.max(0, this.hp / this.maxHp);
    ctx.fillRect(barX, barY + (this.shieldActive ? 3 : 0), barW * hpPct2, this.shieldActive ? 4 : 7);
    // 阶段切换闪光
    if(this.phaseTransition > 0 && Math.floor(this.phaseTransition/3)%2===0){
      ctx.fillStyle = `rgba(${this.currentPhase===3?'255,48,48':this.currentPhase===2?'255,215,64':'79,195,247'},0.4)`;
      ctx.fillRect(px-10, py-10, this.w+20, this.h+20);
    }

    // 溶血环绘制
    for(const w of this.ringWaves){
      if(!w.active) continue;
      const alpha = 1 - (w.r / w.maxR);
      ctx.strokeStyle = `rgba(255,200,50,${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(w.x - Math.round(camX), w.y, w.r, 0, Math.PI*2); ctx.stroke();
      ctx.lineWidth = 1;
    }
    // 清理已失效环
    this.ringWaves = this.ringWaves.filter(w => w.active);

    // 杀白细胞素玩家头顶标记
    if(Game.player && Game.player.leukocidinMarked > 0){
      const pl = Game.player;
      const pp = { x: Math.round(pl.x) - Math.round(camX), y: Math.round(pl.y) };
      const warnPulse = Math.sin(this.animT * 0.5) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(255,50,50,${0.5 + warnPulse * 0.5})`;
      ctx.lineWidth = 2;
      const mx = pp.x + pl.w/2, my = pp.y - 10;
      ctx.beginPath(); ctx.arc(mx, my, 8, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx-12, my-12); ctx.lineTo(mx-6, my-6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx+12, my-12); ctx.lineTo(mx+6, my-6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx-12, my+12); ctx.lineTo(mx-6, my+6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx+12, my+12); ctx.lineTo(mx+6, my+6); ctx.stroke();
      ctx.lineWidth = 1;
    }

    // 僵直特效
    if(this.stunTimer > 0){
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
      ctx.fillText('💫', px+this.w/2, py-24);
    }
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

function rewardKill(enemy,level,dmg){if(dmg)Game.damageNumbers.push(new DamageNumber(enemy.x+enemy.w/2,enemy.y-6,'-'+dmg,enemy.type==='staph'?'#ffd700':C.strep));const xpT=enemy.isMini?'staphMini':(enemy.isLarge?'staphLarge':enemy.type);level.items.push(new Item(enemy.x+enemy.w/2-8,enemy.y+enemy.h/2-8,'xp',XP_PER_KILL[xpT]||10));tryDropEquip(enemy,level);}
function tryDropEquip(enemy,level){const dk=enemy.isMini?null:(enemy.type==='boss'?'boss':(enemy.isLarge?'staphLarge':enemy.type));if(!dk)return;const p=EQUIPMENT_DROPS[dk];if(!p)return;if(Math.random()<(dk==='boss'?1:(enemy.isLarge?0.18:0.06))){const eid=p[Math.floor(Math.random()*p.length)];level.items.push(new Item(enemy.x+enemy.w/2-8,enemy.y+enemy.h/2-8,'equipment',eid));const eq=findEquip(eid);if(eq)spawnParticles(enemy.x+enemy.w/2,enemy.y,eq.color,10,2);}}
function rewardBossKill(boss,dmg){if(dmg)Game.damageNumbers.push(new DamageNumber(boss.x+boss.w/2,boss.y-10,'-'+dmg,C.bossBar));Game.level.items.push(new Item(boss.x+boss.w/2-8,boss.y+boss.h/2-8,'xp',XP_PER_KILL.boss));tryDropEquip({type:'boss'},Game.level);}

