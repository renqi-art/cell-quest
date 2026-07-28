/* ====================================================================
 * game-update.js — update() 核心游戏帧逻辑
 * ==================================================================== */

// ===== 更新逻辑 =====
let _updateFirstFrame = true;
function update(){
  if(Game.state !== 'playing') return;
  if(_updateFirstFrame){ if(window.CELL_QUEST_DEBUG) console.log('[DEBUG] First update frame! player=(' + Game.player.x + ',' + Game.player.y + ') state=' + Game.state); _updateFirstFrame = false; }

  if(Game.memoryCardOpen){
    Game.prevKeys = {...Game.keys};
    if(Game.camera.shake > 0) Game.camera.shake = 0;
    return;
  }
  if(Game.tutorialPause){
    Game.prevKeys = {...Game.keys};
    return;
  }
  if(Game.paused){
    Game.prevKeys = {...Game.keys};
    return;
  }

  // 合并移动端触控输入到 Game.keys
  // 注意：必须同时设 true 和 false，否则释放动作后按键会卡住
  if(Game.mobile){
    const actions = Game.mobile.input.getActions();
    for(const [action, pressed] of Object.entries(actions)){
      Game.keys[action] = pressed;
    }
  }

  const p = Game.player;
  const lvl = Game.level;

  // v2: ATP 基础代谢消耗
  Game.globalEnergy -= PASSIVE_DRAIN;
  if(Game.globalEnergy < 0) Game.globalEnergy = 0;

  // 开局出血期（前8秒持续缓慢扣能量）
  if(Game.bleedingTimer < BLEEDING_PHASE_FRAMES){
    Game.bleedingTimer++;
    Game.globalEnergy -= BLEEDING_DRAIN;
    if(Game.globalEnergy < 0) Game.globalEnergy = 0;
  }

  // 潮汐计时（止血暂停期间仍推进周期）
  if(Game.tidePaused > 0) Game.tidePaused--;
  Game.tideTimer++;

  // v3: 更新所有玩家
  for(const player of Game.players){
    player.update(lvl);
  }

  // 缺口未止血倍率
  if(p.x > 24 * TILE && !Game.bridgeUsedInGap){
    Game.gapBloodMult = GAP_BLOOD_MULT;
  } else {
    Game.gapBloodMult = 1;
  }

  // 愈合衰减进度（越靠近终点，潮汐/刷新逐步消退）
  const healStart = HEALING_START_COL * TILE;
  const healEnd = HEALING_END_COL * TILE;
  Game.healingProgress = p.x > healStart
    ? Math.min(1, (p.x - healStart) / (healEnd - healStart))
    : 0;

  // 死亡闪烁
  if(Game.deathTimer > 0){
    Game.deathTimer--;
    $('death-flash').classList.toggle('active', Game.deathTimer > 15);
  }

  // 敌人更新
  const prevKills = Game.stats.kills;
  for(const e of lvl.enemies) e.update(lvl, p);
  // Boss召唤的迷你菌分裂（存活>10s）
  for(const e of lvl.enemies){
    if(!e.alive || !e.isMini) continue;
    if(e.lifeTimer == null) e.lifeTimer = 0;
    e.lifeTimer++;
    if(e.lifeTimer >= 900 && lvl.enemies.length < 10){ // 15s, 上限10只
      e.lifeTimer = 0;
      const child = new Enemy(e.x + (Math.random()-0.5)*20, e.y, 'staph');
      child.makeMini();
      child.spawnX = child.x; child.spawnY = child.y;
      child.lifeTimer = 0;
      child.patrolRange = 130; // 继承Boss附近巡逻限制
      lvl.enemies.push(child);
      spawnParticles(e.x+e.w/2, e.y+e.h/2, C.miniStaph, 5, 1);
    }
  }
  // 清除死亡敌人（保留非迷你死亡敌人用于重生）
  lvl.enemies = lvl.enemies.filter(e => e.alive || !e.isMini);

  // v3: 成就检测(每120帧检查一次,避免频繁check)
  if(Game.frame % 120 === 0) checkAchievements();

  // v2: 击杀回能
  const killedThisFrame = Game.stats.kills - prevKills;
  if(killedThisFrame > 0){
    Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + killedThisFrame * KILL_ATP_SMALL);
  }

  // Boss更新
  if(Game.boss) Game.boss.update(lvl, p);

  // v3: DC NPC 更新
  for(const dc of Game.dcNPCs) dc.update(p);

  // 全敌击杀检测（含Boss）
  const allEnemiesDead = lvl.enemies.every(e => !e.alive) && (!Game.boss || !Game.boss.alive);
  Game.allEnemiesDead = allEnemiesDead;

  // 道具更新
  for(const it of lvl.items) it.update(p);
  // 记忆卡片可能在此弹出，立即暂停本帧后续逻辑
  if(Game.memoryCardOpen){
    Game.prevKeys = {...Game.keys};
    return;
  }

  // 子弹更新
  for(const pr of Game.projectiles){
    if(pr instanceof TurretProjectile) pr.update(lvl, p);
    else pr.update(lvl, lvl.enemies);
  }
  Game.projectiles = Game.projectiles.filter(pr=>pr.alive);

  // 临时平台更新
  for(const tp of Game.tempPlatforms) tp.update();
  Game.tempPlatforms = Game.tempPlatforms.filter(tp=>!tp.expired);

  // 脓液地块更新
  for(const pt of Game.pusTiles) pt.update();
  Game.pusTiles = Game.pusTiles.filter(pt=>!pt.expired);

  // 碎裂平台更新
  lvl.updateCrumblePlatforms();
  // 吞噬体冷却更新
  lvl.updatePhagosomes();
  // 抗体炮台更新
  lvl.updateTurrets(p);

  // 浮动平台更新
  for(const fp of Game.floatPlatforms) fp.update();

  // 粒子更新
  for(const pa of Game.particles) pa.update();
  Game.particles = Game.particles.filter(pa=>pa.life>0);
  for(const dn of Game.damageNumbers)dn.update();Game.damageNumbers=Game.damageNumbers.filter(dn=>dn.life>0);
  // 迷你敌人刷新
  lvl.updateMiniSpawn(p);
  // 管道刷怪
  lvl.updatePipeSpawns(p);

  // 存档点检测
  for(const cp of lvl.checkpoints){
    if(!cp.active && p.x+p.w > cp.x && p.x < cp.x+TILE && p.y+p.h > cp.y && p.y < cp.y+TILE){
      cp.active = true;
      p.checkpointX = cp.x + 4;
      p.checkpointY = cp.y;
      Sfx.checkpoint();
      showToast('存档点激活！');
      spawnParticles(cp.x+TILE/2, cp.y+TILE/2, C.checkpoint, 12, 2);
    }
  }

  // 终点门检测（v3: 双人模式需要两人都到）
  if(lvl.finish){
    let allAtGate = true;
    for(const pl of Game.players){
      if(!pl) continue;
      const atGate = pl.x+pl.w > lvl.finish.x+2 && pl.x < lvl.finish.x+TILE-2 &&
                     pl.y+pl.h > lvl.finish.y && pl.y < lvl.finish.y+TILE;
      if(!atGate){ allAtGate = false; break; }
    }
    if(allAtGate){
      levelComplete();
      return;
    }
  }

  // 教程触发
  checkTutorials();
  // 知识卡片触发
  checkKnowledgeCards();

  // 病例节点交互
  if(Game._caseData && window.CellQuestLegacy._dispatchCaseEvent) {
    const caseNodes = Game._caseData.nodes;
    const px = p.x + p.w/2, py = p.y + p.h/2;
    if(!Game._caseCooldowns) Game._caseCooldowns = {};
    for(const node of caseNodes) {
      const nx = node.x * TILE + TILE/2, ny = node.y * TILE + TILE/2;
      const dist = Math.hypot(px - nx, py - ny);
      if(dist < TILE * 2 && !Game._caseCooldowns[node.id]) {
        Game._caseCooldowns[node.id] = 60; // 1 second cooldown
        window.CellQuestLegacy._dispatchCaseEvent(
          node.kind === 'oxygen-source' || node.kind === 'target-tissue' ? 'oxygenDelivered' : 'infectionCleared',
          node.id
        );
        Sfx.pickup ? Sfx.pickup() : 0;
      }
    }
    // Tick cooldowns
    for(const k in Game._caseCooldowns) {
      if(Game._caseCooldowns[k] > 0) Game._caseCooldowns[k]--;
    }
  }

  // 相机
  updateCamera();

  // 计时器
  Game.levelTime = performance.now() - Game.levelStartTime;

  // HUD
  if(Game.frame % 6 === 0) updateHUD();

  Game.prevKeys = {...Game.keys};
}

