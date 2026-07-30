/* ====================================================================
 * entities-world.js — Item / Platform / QBlock / DendriticCell / Utils
 * ==================================================================== */

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

    // ATP 物理：弹出后受重力下落
    if(this.type === 'atp' && (this.vy !== 0 || this.vx !== 0)){
      this.vy += GRAVITY;
      this.y += this.vy;
      this.x += this.vx;
      this.vx *= 0.995;
      const level = Game.level;
      if(level){
        const col = Math.floor((this.x + this.w/2) / TILE);
        const row = Math.floor((this.y + this.h) / TILE);
        if(row >= 0 && row < level.grid.length && level.solidAt(col, row)){
          this.y = row * TILE - this.h;
          this.vy = 0; this.vx = 0;
        }
      }
    }

    if(rectOverlap(this, player)){
      this.alive = false;
      Game.stats.items++;
      // 单位规则：营养/血液物资（食物·营养·饮料·氧气）仅红细胞(cellType===3)可拾取吸收；
      // 白细胞(1)与血小板(2)无法吸收，物品保持原位、不被消耗。
      if((this.type === 'food' || this.type === 'nutrition' || this.type === 'drink' || this.type === 'oxygen') && player.cellType !== 3){
        this.alive = true;
        Game.stats.items--;
        if(!Game._lastPickupDeny || performance.now() - Game._lastPickupDeny > 1500){
          showToast('🚫 白细胞无法吸收营养 / 血液物资');
          Game._lastPickupDeny = performance.now();
        }
        return;
      }
      if(this.type !== 'atp') Game.itemsCollected++;
      if(this.type === 'oxygen' || this.type === 'food' || this.type === 'nutrition' || this.type === 'drink'){
        Sfx.rbcPickup(); // 新增：红细胞专属拾取音效（氧气 / 营养 / 饮水）
      } else {
        Sfx.pickup();
      }
      if(this.type === 'atp'){
        Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + ATP_PICKUP);
        spawnParticles(this.x+this.w/2, this.y+this.h/2, '#ffd700', 10, 2);
      } else if(this.type === 'shield'){
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
        showToast('进食！能量 +' + FOOD_ENERGY);
      } else if(this.type === 'drink'){
        Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + DRINK_ENERGY);
        showToast('喝水！能量 +' + DRINK_ENERGY);
      } else if(this.type === 'memory'){
        Sfx.memory();
        const isNew = collectMemoryCell(Game.levelIndex); // v3: 全局收集
        showMemoryCard();
        if(!isNew){
          showToast('🧬 记忆细胞（已收集过，不重复计入）');
        }
      } else if(this.type === 'nutrition'){
        // 营养包：仅红细胞可收集
        if(player.cellType !== 3){
          // 非红细胞：不可收集，恢复道具
          this.alive = true;
          Game.stats.items--;
          return;
        }
        Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + NUTRITION_ENERGY + getSkillLevel('rbc','nutritionBonus')*10);
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
    if(this.type === 'atp') return '#ffd700';
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
    } else if(this.type === 'atp'){
          // ATP 使用图片
          if(!this._logged){ if(window.CELL_QUEST_DEBUG) console.log('DRAW ATP at', px, py); this._logged = true; }
          const atpImg = Game.atpImg;
          if(atpImg && atpImg.complete && atpImg.naturalWidth > 0){
            ctx.drawImage(atpImg, px + 2, py + 2, 20, 20);
          } else {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.arc(px+8, py+8, 7, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('⚡', px+8, py+12);
          }
        } else {
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

    // 50% 概率：ATP 或 链球菌
    if(Math.random() < 0.5){
      // ATP 从 ? 方块上方弹出，向右弧线落下
      const atp = new Item(this.x + 4, this.y - TILE, 'atp');
      atp.vy = -6;
      atp.vx = 2;
      Game.level.items.push(atp);
      Sfx.coin();
    } else {
      // 链球菌从 ? 方块上方弹出
      const strep = new Enemy(this.x + 4, this.y - TILE, 'strep');
      strep.vy = -5;
      strep.vx = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
      Game.level.enemies.push(strep);
      Sfx.hit();
    }
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

// ===== v3: 树突状细胞 NPC（AI 上下文对话） =====
class DendriticCell {
  constructor(x, y, id){
    this.x = x; this.y = y;
    this.w = 28; this.h = 32;
    this.id = id || 0;
    this.animT = Math.random() * 100;
    this.dialogues = [];       // [{condition, speaker, color, body}]
    this.triggered = false;    // 是否已触发（每次进关卡可触发一次）
    this.range = 100;          // 触发距离(px)
    this.active = true;
  }

  update(player){
    if(!this.active || this.triggered) return;
    if(Game.tutorialPause || Game.memoryCardOpen || Game.paused) return;
    this.animT++;

    const dx = Math.abs(player.x + player.w/2 - (this.x + this.w/2));
    const dy = Math.abs(player.y + player.h/2 - (this.y + this.h/2));
    if(dx < this.range && dy < 60){
      this.triggered = true;
      this.showDialogue(player);
    }
  }

  showDialogue(player){
    const p = player;
    // 根据玩家状态选择对话
    const hpPct = p.health / p.maxHealth;
    const energy = Game.globalEnergy;
    const enemiesLeft = Game.level ? Game.level.enemies.filter(e => e.alive).length : 0;
    const totalEnemies = Game.level ? Game.level.enemies.length : 0;
    const progress = totalEnemies > 0 ? (1 - enemiesLeft / totalEnemies) : 0;
    const isBeforeBoss = Game.boss && Game.boss.alive && !Game.boss.encountered;

    let dialogue = null;

    if(isBeforeBoss){
      dialogue = {
        speaker: '树突状细胞', color: '#ab47bc',
        body: '前方侦测到病原体大本营！我已完成抗原呈递，T细胞正在集结。做好战斗准备！'
      };
    } else if(hpPct < 0.3){
      dialogue = {
        speaker: '树突状细胞', color: '#ab47bc',
        body: '你的细胞膜严重受损（HP<30%）！附近应该有ATP分子可以补充能量。坚持住，不要放弃！'
      };
    } else if(energy < 20){
      dialogue = {
        speaker: '树突状细胞', color: '#ab47bc',
        body: 'ATP储备告急！试试顶开前方的？方块，或者击杀细菌可以获取能量。'
      };
    } else if(progress > 0.7 && enemiesLeft > 0){
      dialogue = {
        speaker: '树突状细胞', color: '#ab47bc',
        body: '太棒了！你已经消灭了大部分细菌（' + Math.round(progress*100) + '%）。还剩' + enemiesLeft + '个，乘胜追击！'
      };
    } else if(progress < 0.2 && enemiesLeft > 3){
      dialogue = {
        speaker: '树突状细胞', color: '#ab47bc',
        body: '我是树突状细胞，免疫系统的侦察兵。这片区域有' + totalEnemies + '个细菌需要清除。踩踏是最基本的攻击方式，试试看！'
      };
    } else if(Game.stats.kills >= 10){
      dialogue = {
        speaker: '树突状细胞', color: '#ab47bc',
        body: '已击杀' + Game.stats.kills + '个细菌！你的战斗力让我想起了记忆中的那次免疫应答。继续前进吧！'
      };
    } else {
      dialogue = {
        speaker: '树突状细胞', color: '#ab47bc',
        body: '你好，免疫战士！我是树突状细胞（DC），负责侦察敌情和呈递抗原。前方有细菌入侵，请小心应对。'
      };
    }

    // 保存上下文供AI使用
    this._context = { hpPct, energy, enemiesLeft, totalEnemies, progress, kills: Game.stats.kills,
      cellName: p.cell.name, levelName: (buildLevelConfigs()[Game.levelIndex]||{}).name || '' };
    this._speaker = dialogue.speaker;
    this._color = dialogue.color;

    showTutorial(dialogue.speaker, dialogue.color, dialogue.body);
    // v3: 注入AI深度分析按钮
    this._injectAIButton();
  }

  _injectAIButton(){
    // 延迟注入，等 showTutorial 渲染完 DOM
    setTimeout(() => {
      const btns = document.querySelector('#dialogue-bubble .bubble-buttons');
      if(!btns) return;
      // 移除旧按钮
      const old = btns.querySelector('.btn-dc-ai');
      if(old) old.remove();
      const btn = document.createElement('button');
      btn.className = 'btn-small btn-dc-ai';
      btn.textContent = 'AI战术分析';
      btn.style.cssText = 'background:#ab47bc;color:#fff;border-color:#ab47bc;margin-left:4px;font-size:11px;';
      btn.onclick = (e) => {
        e.stopPropagation();
        this._callAI();
      };
      btns.appendChild(btn);
    }, 50);
  }

  async _callAI(){
    const bodyEl = document.getElementById('bubble-body');
    if(!bodyEl) return;
    const ctx = this._context;
    const hp = Math.round(ctx.hpPct * 100);
    const progress = Math.round(ctx.progress * 100);

    bodyEl.textContent = '【战术分析】正在分析战场态势...';

    try {
      const resp = await fetch('/api/npc/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'combat',
          context: {
            hpPct: ctx.hpPct,
            energy: ctx.energy,
            kills: ctx.kills,
            totalEnemies: ctx.totalEnemies,
            progress: ctx.progress,
            cellName: ctx.cellName,
            levelName: ctx.levelName,
            isBeforeBoss: Game.boss && Game.boss.alive && !Game.boss.encountered
          }
        })
      });
      const data = await resp.json();
      if(data.ok && data.text){
        bodyEl.textContent = '【' + (data.source === 'ai' ? 'AI战术分析' : '战术分析') + '】' + data.text;
      } else {
        this._localFallback(bodyEl, hp, progress);
      }
    } catch(e){
      this._localFallback(bodyEl, hp, progress);
    }
  }

  _localFallback(bodyEl, hp, progress){
    const ctx = this._context;
    if(hp < 40){
      bodyEl.textContent = '【战术分析】先脱离危险区域，恢复后再推进。';
    }else if(ctx.energy < 25){
      bodyEl.textContent = '【战术分析】ATP偏低，减少无效移动并优先补给。';
    }else{
      bodyEl.textContent = '【战术分析】当前状态稳定，任务进度 ' + progress + '%，继续执行病例目标。';
    }
  }

  draw(ctx, camX){
    if(!this.active) return;
    const px = Math.round(this.x) - Math.round(camX);
    const py = Math.round(this.y);
    const bob = Math.sin(this.animT * 0.05) * 4;

    // 光晕
    ctx.fillStyle = 'rgba(171,71,188,0.15)';
    ctx.beginPath(); ctx.arc(px+this.w/2, py+this.h/2+bob, 24, 0, Math.PI*2); ctx.fill();

    // 树突（分支）
    ctx.strokeStyle = '#9c5ab8';
    ctx.lineWidth = 2;
    const cx = px + this.w/2, cy = py + this.h/2 + bob;
    const branches = [
      {a:-0.6, l:16}, {a:-0.2, l:20}, {a:0.3, l:14}, {a:0.8, l:18},
      {a:-1.2, l:12}, {a:1.5, l:15}, {a:2.2, l:14}, {a:2.8, l:16},
    ];
    for(const b of branches){
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(b.a + this.animT*0.02)*b.l, cy + Math.sin(b.a)*b.l);
      ctx.stroke();
    }

    // 细胞体
    const grad = ctx.createRadialGradient(cx-2, cy-2, 2, cx, cy, 12);
    grad.addColorStop(0, '#e1bee7');
    grad.addColorStop(0.5, '#ab47bc');
    grad.addColorStop(1, '#6a1b9a');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2); ctx.fill();

    // 细胞核
    ctx.fillStyle = '#4a148c';
    ctx.beginPath(); ctx.arc(cx-1, cy-1, 4, 0, Math.PI*2); ctx.fill();

    // "!" 提示（未触发时）
    if(!this.triggered){
      const pulse = Math.sin(this.animT * 0.1) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255,215,0,${pulse})`;
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', cx, py - 14);
    }

    // 标识符
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('DC#' + this.id, cx, py + this.h + 14);
  }
}
