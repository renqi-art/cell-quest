/* ====================================================================
 * game-render.js — render() + updateHUD() + avatar helpers
 * ==================================================================== */

// ===== 渲染 =====
function render(){
  const ctx = Game.ctx;
  ctx.clearRect(0,0,CW,CH);

  if(Game.state === 'menu' || Game.state === 'hub'){
    const t = Game.frame * 0.01;
    const grad = ctx.createLinearGradient(0,0,0,CH);
    grad.addColorStop(0, '#0a0a18');
    grad.addColorStop(1, '#1a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,CW,CH);
    ctx.save();
    ctx.globalAlpha = 0.15;
    for(let i=0;i<8;i++){
      const x = (i*120 + Math.sin(t+i)*30) % CW;
      const y = 60 + (i%3)*120 + Math.cos(t+i)*20;
      ctx.fillStyle = ['#e94560','#ff6b6b','#4fc3f7','#ab47bc'][i%4];
      ctx.beginPath(); ctx.arc(x, y, 25+Math.sin(t*2+i)*8, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    return;
  }

  if(Game.state !== 'playing' && Game.state !== 'paused') return;

  const lvl = Game.level;
  // v3: 双人模式 — 摄像机跟随中点并缩放
  let camX, zoomScale = 1;
  if(Game.twoPlayer && Game.players.length >= 2){
    const p1 = Game.players[0], p2 = Game.players[1];
    const midX = (p1.x + p2.x) / 2;
    const dist = Math.abs(p1.x - p2.x);
    // 如果两人距离超过屏幕一半，则 zoom out
    if(dist > CW * 0.6){
      zoomScale = Math.max(0.65, 1 - (dist - CW * 0.6) / CW * 0.5);
    }
    camX = midX - (CW * zoomScale) / 2;
  } else {
    const p=Game.player;const ex=p.x+p.vx*Game.renderAlpha;
    camX=ex-CW/2+p.w/2;
  }
  camX=Math.max(0,Math.min(camX,lvl.width*TILE-CW*zoomScale));
  // Y camera: follow player vertically
  let camY = 0;
  if(!Game.twoPlayer){
    const py = Game.player.y;
    camY = py - CH/2 + Game.player.h/2;
    camY = Math.max(0, Math.min(camY, lvl.height*TILE - CH));
  }
  const shakeX=Game.camera.shake>0?Math.sin(Game.frame*1.7)*Game.camera.shake*0.7:0;
  const shakeY=Game.camera.shake>0?Math.cos(Game.frame*2.3)*Game.camera.shake*0.7:0;

  ctx.save();
  if(zoomScale < 1){
    ctx.scale(1/zoomScale, 1/zoomScale);
    ctx.translate(-camX*(1-zoomScale), -camY*(1-zoomScale));
  }
  ctx.translate(shakeX, shakeY);

  drawBackground(ctx, camX, lvl.bg);

  // Vertical camera: shift game world up by camY
  ctx.translate(0, -camY);

  lvl.draw(ctx, camX);
  for(const tp of Game.tempPlatforms) tp.draw(ctx, camX);
  for(const pt of Game.pusTiles) pt.draw(ctx, camX);
  for(const fp of Game.floatPlatforms) fp.draw(ctx, camX);
  for(const it of lvl.items) it.draw(ctx, camX);
  for(const e of lvl.enemies) e.draw(ctx, camX);
  if(Game.boss) Game.boss.draw(ctx, camX);
  // v3: DC NPC 绘制
  for(const dc of Game.dcNPCs) dc.draw(ctx, camX);
  for(const pr of Game.projectiles) pr.draw(ctx, camX);
  // v3: 绘制所有玩家
  for(const player of Game.players){
    if(player) player.draw(ctx, camX);
  }
  for(const pa of Game.particles) pa.draw(ctx, camX);
  for(const dn of Game.damageNumbers) dn.draw(ctx, camX);
  for(const qb of Game.qBlocks) qb.draw(ctx, camX);
  ctx.restore();

  // 潮汐状态指示器 (屏幕顶部)
  if(Game.tidePaused > 0){
    // 止血暂停：绿色平静指示
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(Game.frame*0.2)*0.1;
    ctx.fillStyle = C.heal;
    ctx.fillRect(0, 0, CW, 3);
    ctx.restore();
  } else if(lvl.isTideSurge()){
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.sin(Game.frame*0.1)*0.05;
    ctx.fillStyle = C.tideSurge;
    ctx.fillRect(0, 0, CW, 3);
    ctx.restore();
  } else if(lvl.isTideWarn()){
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(Game.frame*0.3)*0.15;
    ctx.fillStyle = C.tideWarn;
    ctx.fillRect(0, 0, CW, 3);
    ctx.restore();
  }

  // 开局出血期红色覆盖
  if(Game.bleedingTimer < BLEEDING_PHASE_FRAMES){
    const intensity = 1 - (Game.bleedingTimer / BLEEDING_PHASE_FRAMES);
    ctx.save();
    ctx.globalAlpha = intensity * 0.1;
    ctx.fillStyle = C.bloodLoss;
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = C.bloodLoss;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = intensity * 0.6;
    ctx.fillText('⚠ 出血期', CW/2, 18);
    ctx.restore();
  }

  // 愈合衰减暖色覆盖
  if(Game.healingProgress > 0){
    ctx.save();
    ctx.globalAlpha = Game.healingProgress * 0.08;
    ctx.fillStyle = C.heal;
    ctx.fillRect(0, 0, CW, CH);
    ctx.restore();
  }

}

// ===== HUD 更新 =====
function updateHUD(){
  if(!Game.player) return;
  const p = Game.player;

  // v3: 双人模式 — 更新 P2 HUD
  const p2hud = document.getElementById('hud-p2');
  if(Game.twoPlayer && Game.players.length >= 2){
    const p2 = Game.players[1];
    if(p2hud){
      p2hud.style.display = 'block';
      // P2 health
      const p2HealthBar = document.getElementById('health-bar-fill-p2');
      const p2HealthText = document.getElementById('health-text-p2');
      if(p2HealthBar){
        const pct2 = p2.maxHealth > 0 ? (p2.health / p2.maxHealth) * 100 : 0;
        p2HealthBar.style.width = pct2 + '%';
        p2HealthBar.classList.toggle('low', pct2 <= 50 && pct2 > 25);
        p2HealthBar.classList.toggle('critical', pct2 <= 25);
      }
      if(p2HealthText) p2HealthText.textContent = p2.health + '/' + p2.maxHealth;
      document.getElementById('cell-name-p2').textContent = p2.cell.name;
      document.getElementById('p2-indicator').textContent = 'P2 ' + p2.cell.short;
    }
  } else if(p2hud){
    p2hud.style.display = 'none';
  }

  // 左上角角色头像（跟随当前细胞）
  const avatarEl = $('cell-avatar');
  if(avatarEl){
    avatarEl.className = '';
    avatarEl.classList.add(p.cellType === 1 ? 'wbc' : p.cellType === 2 ? 'plt' : 'rbc');
    avatarEl.innerHTML = getCellAvatarHTML(p.cellType);
  }

  // 红心 → 血条
  const healthBar = $('health-bar-fill');
  const healthText = $('health-text');
  const healthPct = p.maxHealth > 0 ? (p.health / p.maxHealth) * 100 : 0;
  if(healthBar){
    healthBar.style.width = healthPct + '%';
    healthBar.classList.toggle('low', healthPct <= 50 && healthPct > 25);
    healthBar.classList.toggle('critical', healthPct <= 25);
  }
  if(healthText) healthText.textContent = p.health + '/' + p.maxHealth;

  // 能量条
  const pct=(Game.globalEnergy/getMaxEnergy())*100;
  const ef = $('energy-fill');
  ef.style.width = pct + '%';
  ef.className=pct<LOW_ENERGY?'low':'';
  const lvBadge=$('level-badge');if(lvBadge)lvBadge.textContent='Lv.'+Game.playerLevel;
  const xpFill=$('xp-fill');if(xpFill){const xpNext=xpForLevel(Game.playerLevel+1);const xpCurr=Game.playerLevel<=1?0:xpForLevel(Game.playerLevel);const xpPct=xpNext>xpCurr?((Game.xp-xpCurr)/(xpNext-xpCurr))*100:100;xpFill.style.width=Math.min(100,Math.max(0,xpPct))+'%';}
  // 细胞名称
  $('cell-name').textContent = p.cell.name;
  document.querySelector('#cell-badge .dot').style.background = p.cell.color;

  // Buff图标
  const buffsDiv = $('buffs');
  let bh = '';
  if(p.shield > 0){
    const sec = Math.ceil(p.shield/60);
    bh += `<div class="buff-icon" style="border-color:${C.shield};color:${C.shield}">盾<span class="timer">${sec}</span></div>`;
  }
  if(p.oxygen > 0){
    const sec = Math.ceil(p.oxygen/60);
    bh += `<div class="buff-icon" style="border-color:${C.oxygen};color:${C.oxygen}">O₂<span class="timer">${sec}</span></div>`;
  }
  if(p.complementAmmo > 0){
    bh += `<div class="buff-icon" style="border-color:${C.complement};color:${C.complement}">补<span class="timer">×${p.complementAmmo}</span></div>`;
  }
  if(p.aoeStomp > 0){
    const sec = Math.ceil(p.aoeStomp/60);
    bh += `<div class="buff-icon" style="border-color:${C.aoeBuff};color:${C.aoeBuff}">AOE<span class="timer">${sec}</span></div>`;
  }
  if(Game.oxyField){
    bh += `<div class="buff-icon" style="border-color:${C.oxyField};color:${C.oxyField}">领域<span class="timer">ON</span></div>`;
  }
  if(Game.tidePaused > 0){
    const sec = Math.ceil(Game.tidePaused/60);
    bh += `<div class="buff-icon" style="border-color:${C.heal};color:${C.heal}">止血<span class="timer">${sec}</span></div>`;
  }
  buffsDiv.innerHTML = bh;

  // 计时器
  const timerDiv = $('timer');
  if(timerDiv){
    timerDiv.textContent = formatTime(Game.levelTime);
  }

  // v3: 记忆细胞 — 显示全局收集进度
  const memIcon = $('memory-icon');
  if(memIcon){
    memIcon.classList.toggle('found', Game.stats.foundMemory);
    const total = getTotalMemoryCells();
    const bonus = getMemoryBonus(Game.memoryCells);
    let tooltip = Game.memoryCells + '/' + total + ' 记忆细胞';
    if(bonus.speedPct>0) tooltip += '\n移速 +' + bonus.speedPct + '%';
    if(bonus.maxHp>0) tooltip += '\n生命 +' + bonus.maxHp;
    if(bonus.startEnergy>0) tooltip += '\n初始能量 +' + bonus.startEnergy;
    if(bonus.swordDmg>0) tooltip += '\n伤害 +' + bonus.swordDmg;
    if(bonus.deathEnergyKeep>0) tooltip += '\n死亡保留 ' + bonus.deathEnergyKeep + '% 能量';
    if(bonus.startShield>0) tooltip += '\n开局护盾';
    memIcon.title = tooltip;
    memIcon.textContent = Game.memoryCells > 0 ? '🧬' + Game.memoryCells : '🧬';
  }

  // v3: 自适应难度指示器
  const objDisplay = $('objective-display');
  if(objDisplay){
    const diffCfg = ADAPTIVE_DIFFICULTY[Game.adaptiveDifficulty.level];
    const diffTag = objDisplay.querySelector('.diff-tag');
    if(diffTag){
      diffTag.textContent = diffCfg.name;
      diffTag.className = 'diff-tag ' + Game.adaptiveDifficulty.level;
    }
  }

  // ===== WBC 新技能槽更新 =====
  if(p.cellType === 1){
    const skills = [
      { id:'skill1', cd:p.biteCooldown, max:BITE_COOLDOWN, charges:null },
      { id:'skill2', cd:p.spitCooldown, max:SPIT_COOLDOWN, charges:null },
      { id:'skill3', cd:p.lanceCooldown, max:LANCE_COOLDOWN, charges:null },
      { id:'skill4', cd:p.pdashTimer>0?1:0, max:1, charges:p.pdashCharges, maxCharges:PDASH_CHARGES, pdashCooldown:p.pdashCooldown },
    ];
    for(const s of skills){
      const slot = $(s.id);
      if(!slot) continue;
      const cdEl = slot.querySelector('.skill-cooldown');
      if(s.cd > 0){
        slot.classList.add('cooling');
        slot.classList.remove('ready');
        const sec = Math.ceil(s.cd / 60);
        cdEl.textContent = sec + 's';
      } else {
        slot.classList.remove('cooling');
        slot.classList.add('ready');
        cdEl.textContent = '';
      }
      if(s.charges !== null){
        const chEl = slot.querySelector('.skill-charges');
        if(chEl) chEl.textContent = s.charges + '/' + s.maxCharges;
      }
    }
    const bar = $('skill-bar');
    if(bar) bar.style.display = 'flex';
  } else {
    const bar = $('skill-bar');
    if(bar) bar.style.display = 'none';
  }

  // v3: 双评分 — 击杀+收集同时显示
  const objEl = $('objective-display');
  if(objEl){
    let html = '';
    // 击杀进度
    const totalEnemies = Game.level ? (Game.level.enemies.length + (Game.boss&&Game.boss.alive?1:0)) : 0;
    const killed = Game.stats.kills;
    const kpct = totalEnemies > 0 ? killed / totalEnemies : 1;
    html += `⚔️<b style="color:${kpct>=0.9?'#66ff66':kpct>=0.5?'#ffd700':'#ff6b6b'}">${killed}/${totalEnemies}</b><small>${Math.round(kpct*100)}%</small> `;
    // 收集进度
    const collected = Game.itemsCollected;
    const totalItems = Game.totalItems;
    const cpct = totalItems > 0 ? collected / totalItems : 1;
    html += `📦<b style="color:${cpct>=0.9?'#66ff66':cpct>=0.5?'#ffd700':'#ff6b6b'}">${collected}/${totalItems}</b><small>${Math.round(cpct*100)}%</small>`;
    objEl.innerHTML = html;
  }

  // v2: 动态底栏
  const ctrlEl = $('hud-controls');
  if(ctrlEl && Game.player){
    const sprint = Game.player.sprinting;
    const sprintHint = ' <span class="sep">|</span> <span style="color:#ffd740;">🏃双击方向奔跑</span>';
    if(Game.player.cellType === 1){
      ctrlEl.innerHTML = '<span><kbd>←→</kbd>移动</span> <span class="sep">|</span> <span><kbd>空格</kbd>跳跃</span> <span class="sep">|</span> <span><kbd>↓</kbd>下蹲</span> <span class="sep">|</span> <span><kbd>E</kbd>挥剑</span> <span class="sep">|</span> <span><kbd>Shift</kbd>突进</span> <span class="sep">|</span> <span><kbd>Q</kbd>切换细胞</span>' + sprintHint;
    } else {
      ctrlEl.innerHTML = '<span><kbd>←→</kbd>移动</span> <span class="sep">|</span> <span><kbd>空格</kbd>跳跃</span> <span class="sep">|</span> <span><kbd>↓</kbd>下蹲</span> <span class="sep">|</span> <span><kbd>Q</kbd>切换细胞</span>' + sprintHint;
    }
    // 奔跑中高亮
    if(sprint){
      ctrlEl.innerHTML = ctrlEl.innerHTML.replace('双击方向奔跑', '奔跑中 <span style="color:#ff5252;">⚡1.5x -1ATP/0.5s</span>');
    }
  }
}

