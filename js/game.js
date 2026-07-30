/* ====================================================================
 * game.js — 关卡类、相机、输入、游戏循环、渲染、UI、扩展接口
 * ==================================================================== */

const $ = id => document.getElementById(id);

// Preview level registry (used by Vue editor adapter)
const _PREVIEW_LEVELS = {};
const _PREVIEW_CONFIGS = {};
function bindClick(id, handler){
  const element = $(id);
  if(!element) return null;
  element.addEventListener('click', handler);
  return element;
}
function escapeHtml(value){
  const entities = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

// ===== 头像：使用角色设计原画裁切图 =====
const _AVATAR_SPRITES = {
  1: { src: 'images/avatar-wbc.webp', name: 'wbc' },   // 白细胞 Aetherion 脸部
  2: { src: 'images/avatar-plt.webp', name: 'plt' },     // 血小板 脸部
  3: { src: 'images/avatar-rbc.webp', name: 'rbc' },     // 红细胞 R-07 脸部
};

// 根据细胞类型返回左上角头像 HTML
function getCellAvatarHTML(cellType){
  const cfg = _AVATAR_SPRITES[cellType];
  return `<img src="${cfg.src}" alt="${escapeHtml(cfg.name)}" class="avatar-img avatar-${escapeHtml(cfg.name)}">`;
}

function formatTime(ms){
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

// ===== 教程系统（对话气泡） =====
function checkTutorials(){
  // 已通关或全部跳过后不再显示教程
  if(Game.tutorialsDone) return;
  const p = Game.player;
  const lvl = Game.level;
  for(let i=0;i<lvl.tutorials.length;i++){
    const tut = lvl.tutorials[i];
    if(Game.tutShown[i]) continue;
    if(p.x > tut.x){
      Game.tutShown[i] = true;
      // 持久化：已看过的教程不再重复弹出
      try{
        localStorage.setItem('cellQuest_tutShown_' + Game.levelIndex, JSON.stringify(Game.tutShown));
      }catch(e){}
      // 动态跟随当前角色：useCurrent 标记的教程用玩家当前细胞发言
      if(tut.useCurrent){
        showTutorial(p.cell.name, p.cell.color, tut.body);
      } else {
        showTutorial(tut.speaker, tut.color, tut.body);
      }
      return;
    }
  }
}

let tutorialQueue = [];
function showTutorial(speaker, color, body){
  tutorialQueue.push({speaker, color, body});
  if(!Game.tutorialPause) showNextTutorial();
}

function showNextTutorial(){
  if(tutorialQueue.length === 0) return;
  const tut = tutorialQueue.shift();
  Game.tutorialPause = true;
  _notifyMobileState();
  $('bubble-speaker').textContent = tut.speaker.trim();
  $('bubble-speaker').style.color = tut.color;
  $('bubble-body').textContent = tut.body;
  $('dialogue-bubble').classList.add('active');
}

function dismissTutorial(){
  $('dialogue-bubble').classList.remove('active');
  if(tutorialQueue.length > 0){
    // 保持 tutorialPause=true，防止间隔期间 checkTutorials 触发新教程
    setTimeout(showNextTutorial, 100);
  } else {
    Game.tutorialPause = false;
    _notifyMobileState();
  }
  // 清除 jump 键状态，防止关闭对话框的 Space/Enter 被消费为跳跃输入（空中卡住 bug）
  Game.keys.jump = false;
  if(Game.player) Game.player.jumpBuffer = 0;
}

function skipAllTutorials(){
  const lvl = Game.level;
  if(lvl){
    for(let i=0;i<lvl.tutorials.length;i++) Game.tutShown[i] = true;
    try{
      localStorage.setItem('cellQuest_tutShown_' + Game.levelIndex, JSON.stringify(Game.tutShown));
    }catch(e){}
  }
  tutorialQueue = [];
  $('dialogue-bubble').classList.remove('active');
  Game.tutorialPause = false;
  Game.tutorialsDone = true;
  _notifyMobileState();
  try{ localStorage.setItem('cellQuest_tutorials_done', '1'); }catch(e){}
}

// ===== 记忆细胞科普卡片 =====
function showMemoryCard(){
  showKnowledgeCard(MEMORY_CARD.title, MEMORY_CARD.text);
}

// 通用知识卡片（白细胞/红细胞/血小板/记忆细胞）
function showKnowledgeCard(title, text){
  const card = $('memory-card');
  $('memory-card-title').textContent = title;
  $('memory-card-text').textContent = text;
  card.classList.remove('hidden');
  Game.memoryCardOpen = true;
  Game.memoryCardOpenTime = performance.now();
  _notifyMobileState();
}

// 知识卡片位置触发（走到x坐标处触发，不限次数，每张卡独立）
function checkKnowledgeCards(){
  if(!Game.level || !Game.level.knowledgeCards) return;
  if(Game.memoryCardOpen) return;
  if(Game.tutorialPause) return;
  const p = Game.player;
  if(!Game.knowledgeCardTriggered) Game.knowledgeCardTriggered = new Set();
  for(let i = 0; i < Game.level.knowledgeCards.length; i++){
    const kc = Game.level.knowledgeCards[i];
    if(Game.knowledgeCardTriggered.has(i)) continue;
    if(p.x > kc.x){
      // 如果指定了y坐标，需要玩家在该高度附近才触发
      if(kc.y !== undefined && p.y > kc.y + 20){
        continue;
      }
      Game.knowledgeCardTriggered.add(i);
      showKnowledgeCard(kc.title, kc.text);
      return;
    }
  }
}

function closeMemoryCard(){
  $('memory-card').classList.add('hidden');
  if(Game.memoryCardOpen){
    // 补偿暂停期间的计时器，避免速通时间包含读卡时间
    Game.levelStartTime += performance.now() - Game.memoryCardOpenTime;
  }
  Game.memoryCardOpen = false;
  _notifyMobileState();
}

function togglePause(){
  if(Game.state === 'playing'){
    Game.state = 'paused';
    Game.paused = true;
    $('pause-menu').classList.remove('hidden');
    _notifyMobileState();
  } else if(Game.state === 'paused'){
    Game.state = 'playing';
    Game.paused = false;
    $('pause-menu').classList.add('hidden');
    // 恢复时重新聚焦
    const container = $('game-container');
    const fp = $('focus-prompt');
    if(fp) fp.classList.add('hidden');
    container.focus();
    _notifyMobileState();
  }
}

function levelComplete(){
  Game.state = 'complete';
  _notifyMobileState();
  Sfx.complete();
  const idx = Game.levelIndex;
  Game.completed[idx] = true;
  const configs = buildLevelConfigs();
  if(idx + 1 < configs.length) Game.unlocked[idx + 1] = true;

  // v3: 双评分制星级评定
  let stars = 1;
  // 击杀完成度
  const totalEnemies = Game.level.enemies.length + Game.bosses.length;
  const killPct = totalEnemies > 0 ? Game.stats.kills / totalEnemies : 1;
  // 收集完成度
  const collectPct = Game.totalItems > 0 ? Game.itemsCollected / Game.totalItems : 1;
  // 综合完成度
  const completionPct = (killPct + collectPct) / 2;

  // 2星：双指标均 ≥ 60%
  if(killPct >= 0.6 && collectPct >= 0.6) stars++;
  // 3星：双指标均 100% + 0死亡
  if(killPct >= 1.0 && collectPct >= 1.0 && Game.stats.deaths === 0) stars++;
  // 完美通关（100%完成+0死亡）：展示特殊标记
  const isPerfect = completionPct >= 1.0 && Game.stats.deaths === 0;

  if(Game.stars[idx] < stars) Game.stars[idx] = stars;

  // 存储完成度用于结算面板
  Game._lastCompletionPct = completionPct;
  Game._lastIsPerfect = isPerfect;

  // 通关后视为已熟悉本关，之后不再自动弹出教程
  Game.tutorialsDone = true;
  try{ localStorage.setItem('cellQuest_tutorials_done', '1'); }catch(e){}

  // v3: 更新自适应难度
  const energyPct2 = Game.globalEnergy / getMaxEnergy();
  updateAdaptiveDifficulty(true, Game.deathsThisRun, Game.levelTime, energyPct2);

  // 速通记录
  let isNewRecord = false;
  const best = Game.bestTime;
  if(best === 0 || Game.levelTime < best){
    Game.bestTime = Game.levelTime;
    isNewRecord = true;
    try{ localStorage.setItem(SPEEDRUN_KEY, String(Game.bestTime)); }catch(e){}
  }
  saveGame();

  // v3: 首次通关提示设置昵称
  if(!Game.playerName){
    const name = prompt('🎉 首次通关！\n请输入你的玩家昵称 (排行榜显示):', '免疫战士');
    if(name && name.trim()){
      Game.playerName = name.trim().substring(0, 12);
      saveGame();
    }
  }

  // v3: 录入本地排行榜
  const rank = recordLevelScore(idx, Game.levelTime, Game._lastCompletionPct, Game.stats.deaths, Game.playerLevel);

  // v3: 成就检测
  Game._justCleared = true;
  Game._lifetimeKills += Game.stats.kills;
  saveGame();
  checkAchievements();
  Game._justCleared = false;

  $('complete-level-name').textContent = buildLevelConfigs()[idx].name;
  $('stat-kills').textContent = Game.stats.kills + ' (' + Math.round(killPct*100) + '%)';
  $('stat-items').textContent = Game.stats.items + ' (' + Math.round(collectPct*100) + '%)';
  $('stat-completion').textContent = Math.round(Game._lastCompletionPct * 100) + '%'
    + (Game._lastIsPerfect ? ' 👑 完美' : '');
  // v3: 科普卡片
  const kc = KNOWLEDGE_CARDS[idx + 1]; // 1-based ID mapping
  const knowEl = document.getElementById('stat-knowledge');
  if(knowEl && kc){
    knowEl.innerHTML = '<b style="color:#ffd700;">📖 ' + escapeHtml(kc.title) + '</b><br><small style="color:#aaa;">' + escapeHtml(kc.text) + '</small>';
    knowEl.style.display = 'block';
  } else if(knowEl){
    knowEl.style.display = 'none';
  }
  $('stat-energy').textContent = Math.round(Game.globalEnergy);
  $('stat-rating').textContent = '★'.repeat(stars) + '☆'.repeat(3-stars)
    + (Game._lastIsPerfect ? ' 👑' : '')
    + ' (' + Math.round(Game._lastCompletionPct * 100) + '%)';
  // v3: 排行
  if(rank && rank <= LB_MAX_ENTRIES){
    $('stat-rating').textContent += ' | 🏆 #' + rank;
  }
  $('stat-time').textContent = formatTime(Game.levelTime);
  $('stat-best-time').textContent = best > 0 ? formatTime(best) : '--:--.--';
  if(isNewRecord) $('stat-best-time').classList.add('new-record');
  else $('stat-best-time').classList.remove('new-record');
  // 记忆细胞状态
  const memEl = $('stat-memory');
  if(memEl) memEl.textContent = Game.stats.foundMemory ? '✓ 已收集' : '✗ 未找到';
  $('death-panel').classList.add('hidden');
  $('complete-screen').classList.remove('hidden');
  $('hud').classList.remove('active');
  // 通关庆祝彩带喷发特效
  if(window.stopConfetti) window.stopConfetti();
  if(window.startConfetti) window.startConfetti(2600);
}

// ===== 再来一局：重载当前关卡 =====
function replayLevel(){
  if(window.stopConfetti) window.stopConfetti();
  if(Game.levelIndex < 0){ backToHub(); return; } // 预览关卡无重玩入口
  const cell = Game.player ? Game.player.cellType : undefined;
  LoadLevel(Game.levelIndex + 1, cell); // levelIndex 为 0-based, LoadLevel 接收 1-based
}

// ===== 下一局：加载下一关，末关则返回大厅 =====
function nextLevel(){
  if(window.stopConfetti) window.stopConfetti();
  if(Game.levelIndex < 0){ backToHub(); return; } // 预览关卡
  const configs = buildLevelConfigs();
  const nextIdx = Game.levelIndex + 1;
  if(nextIdx < configs.length){
    LoadLevel(nextIdx + 1); // 下一关（已在通关时解锁）
  } else {
    showToast('🎉 已通关全部关卡！');
    backToHub();
  }
}

// ===== 背景音乐自由开关（仅控制 BGM，不影响任何音效）=====
function updateMusicButton(){
  const on = Sfx.bgmEnabled;
  const mb = $('music-btn');
  if(mb){ mb.textContent = on ? '🎵' : '🔇'; mb.classList.toggle('off', !on); mb.title = on ? '背景音乐：开 (M)' : '背景音乐：关 (M)'; }
  const mp = $('btn-music-pause');
  if(mp) mp.textContent = on ? '🎵 背景音乐：开' : '🔇 背景音乐：关';
  const mm = $('btn-music-menu');
  if(mm) mm.textContent = on ? '🎵 背景音乐：开' : '🔇 背景音乐：关';
  const mh = $('btn-music-hub');
  if(mh) mh.textContent = on ? '🎵 背景音乐：开' : '🔇 背景音乐：关';
}
function toggleMusic(){
  const on = Sfx.toggleBgm();
  updateMusicButton();
  showToast(on ? '🎵 背景音乐：开' : '🔇 背景音乐：关');
}

function backToHub(){
  Game.state = 'hub';
  if(window.stopConfetti) window.stopConfetti();
  Game.paused = false;
  Game.tutorialPause = false;
  Game.memoryCardOpen = false;
  Game.oxyField = false;
  Game.bosses = [];
  Game.swordTimer = 0;
  Game.swordCooldown = 0;
  Game.pusTiles = [];
  Game.tidePaused = 0;
  tutorialQueue = [];
  $('pause-menu').classList.add('hidden');
  $('complete-screen').classList.add('hidden');
  $('death-panel').classList.add('hidden');
  $('dialogue-bubble').classList.remove('active');
  $('memory-card').classList.add('hidden');
  $('hud').classList.remove('active');
  const fp = $('focus-prompt');
  if(fp){ fp.classList.remove('hidden'); fp.textContent = '点击此处开始游戏'; }
  showHub();
}

// ===== 关卡加载（通用入口函数） =====
function LoadLevel(n, cellTypeOverride){
  if(window.CELL_QUEST_DEBUG) console.log('[DEBUG] LoadLevel n=' + n + ' cell=' + cellTypeOverride + ' state=' + Game.state);
  // Preview level: n is a string key
  if(typeof n === 'string' && _PREVIEW_LEVELS[n]){
    const mapData = _PREVIEW_LEVELS[n];
    const cfg = _PREVIEW_CONFIGS[n];
    if(!mapData.map || mapData.map.length === 0){ showToast('该关卡正在建设中...'); return false; }
    Game.levelIndex = -1; // preview marker
    Game._previewLevelId = n;
    Game.qBlocks = [];
    Game.dcNPCs = [];
    Game.level = new Level(mapData);

    const defaultCell = cellTypeOverride || cfg.cellType || 1;
    Game.players = [];
    const p1 = new Player(Game.level.playerSpawn.x, Game.level.playerSpawn.y, 0);
    p1.cellType = defaultCell;
    Game.players.push(p1);

    if(Game.twoPlayer){
      const p2 = new Player(Game.level.playerSpawn.x + 40, Game.level.playerSpawn.y, 1);
      p2.cellType = Game._p2CellType || defaultCell;
      Game.players.push(p2);
      Game._p2CellType = null;
    }

    Game.player = Game.players[0];
    Game.player.cellType = defaultCell;
    if(cellTypeOverride){ cfg.winCondition = defaultCell === 3 ? WIN_COLLECT_ALL : WIN_KILL_ALL; }
    Game.winCondition = cfg.winCondition || WIN_KILL_ALL;
    Game.itemsCollected = 0;
    Game.totalItems = Game.level.items.length;
    Game.particles = []; Game.damageNumbers = [];
    Game.player.checkpointX = Game.level.playerSpawn.x;
    Game.player.checkpointY = Game.level.playerSpawn.y;
    Game.tempPlatforms = [];
    Game.clotWalls = [];
    Game.projectiles = [];
    Game.camera = {x:0, y:0, shake:0};
    Game.stats = {kills:0, items:0, deaths:0, foundMemory:false};
    Game.tutShown = {};
    tutorialQueue = [];
    Game.tutorialPause = false;
    Game.memoryCardOpen = false;
    Game.paused = false;
    Game.deathTimer = 0;
    Game.tideTimer = 0;
    Game.bleedingTimer = 0;
    Game.gapBloodMult = 1;
    Game.bridgeUsedInGap = false;
    Game.pusTiles = [];
    Game.oxyField = false;
    Game.tidePaused = 0;
    Game.healingProgress = 0;
    Game.cells = 99;  // infinite lives for preview
    Game.deathsThisRun = 0;
    Game.keysP2 = {};
    Game.prevKeysP2 = {};
    Game.swordTimer = 0;
    Game.swordCooldown = 0;
    Game.allEnemiesDead = false;

    // 编辑器预览已完整设置，跳过移动端战斗门槛
    // （移动端战斗门槛仅在非预览路径中检查）

    closeAllOverlays();
    if(Game.started){ Game.state = 'playing'; endTime = 0; }
    else {
      Game.state = 'playing';
      Game.started = true;
      Game.startTime = performance.now();
      hideFocusPrompt();
      if(!Game.loopStarted){ Game.loopStarted = true; Game.lastTime = performance.now(); requestAnimationFrame(loop); }
    }
    _notifyMobileState();
    Sfx.startFileBgm('level');
    // Emit state-changed for Vue adapter
    if(window.CellQuestLegacy._emitStateChanged) window.CellQuestLegacy._emitStateChanged();
    return true;
  }

  const idx = n - 1; // v3: 1-based → 0-based array index
  const configs = buildLevelConfigs();
  if(idx < 0 || idx >= configs.length) return false;
  // 自定义关卡始终可玩,不检查解锁状态
  if(!configs[idx]._isCustom && !Game.unlocked[idx]){
    showToast('关卡未解锁！');
    return false;
  }
  const mapData = LEVEL_MAPS[idx];
  if(!mapData.map || mapData.map.length === 0){
    showToast('该关卡正在建设中...');
    return false;
  }

  Game.levelIndex = idx;
  Game.qBlocks = [];
  Game.dcNPCs = [];     // v3: 重置DC NPC
  Game.level = new Level(mapData);
  const cfg = configs[idx];
  const isCustom = cfg._isCustom;

  // v3: 从Level 3开始(含自定义关卡)可自由选择细胞类型
  const defaultCell = cellTypeOverride || cfg.cellType || 1;
  Game.players = [];
  const p1 = new Player(Game.level.playerSpawn.x, Game.level.playerSpawn.y, 0);
  p1.cellType = defaultCell;
  Game.players.push(p1);

  if(Game.twoPlayer){
    const p2 = new Player(Game.level.playerSpawn.x + 40, Game.level.playerSpawn.y, 1);
    p2.cellType = Game._p2CellType || defaultCell;
    Game.players.push(p2);
    Game._p2CellType = null; // 用完清掉
  }

  Game.player = Game.players[0];
  Game.player.cellType = defaultCell;
  // 根据选择的细胞类型决定通关条件
  if(cellTypeOverride){
    cfg.winCondition = defaultCell === 3 ? WIN_COLLECT_ALL : WIN_KILL_ALL;
  }
  Game.winCondition = cfg.winCondition || WIN_KILL_ALL;
  Game.itemsCollected = 0;
  Game.totalItems = Game.level.items.length;
  Game.particles = [];Game.damageNumbers = [];
  Game.player.checkpointX = Game.level.playerSpawn.x;
  Game.player.checkpointY = Game.level.playerSpawn.y;
  Game.tempPlatforms = [];
  Game.clotWalls = [];
  Game.projectiles = [];
  Game.camera = {x:0, y:0, shake:0};
  Game.stats = {kills:0, items:0, deaths:0, foundMemory:false};
  // 教程进度持久化：避免每次进关卡都重新弹出已看过的教程
  try{
    const savedTut = localStorage.getItem('cellQuest_tutShown_' + idx);
    Game.tutShown = savedTut ? JSON.parse(savedTut) : {};
  }catch(e){ Game.tutShown = {}; }
  tutorialQueue = [];
  Game.tutorialPause = false;
  Game.memoryCardOpen = false;
  Game.paused = false;
  Game.deathTimer = 0;
  Game.tideTimer = 0;
  // 四段生理剧情状态重置
  Game.bleedingTimer = 0;
  Game.gapBloodMult = 1;
  Game.bridgeUsedInGap = false;
  Game.pusTiles = [];
  Game.oxyField = false;
  Game.tidePaused = 0;
  Game.healingProgress = 0;
  Game.cells = 3;          // 初始化细胞数（生命数）
  Game.deathsThisRun = 0;   // v3: 本局死亡计数
  Game.deathSeq = loadDeathSeq(); // 载入本关卡永久死亡序号（无限复活，不重置）
  Game.keysP2 = {};          // v3: 初始化P2按键
  Game.prevKeysP2 = {};
  // 挥剑状态重置（Boss 由关卡地图 b 瓦片创建，不在此处清空）
  Game.swordTimer = 0;
  Game.swordCooldown = 0;
  Game.allEnemiesDead = false;
  // 知识卡片触发状态（每张独立，不限制细胞类型）
  Game.knowledgeCardTriggered = new Set();

  // 检查是否首次游玩（教程）
  try{
    Game.tutorialsDone = localStorage.getItem('cellQuest_tutorials_done') === '1';
  }catch(e){ Game.tutorialsDone = false; }

  // 计时器
  Game.levelStartTime = performance.now();
  Game.levelTime = 0;

  // 加载最佳速通
  try{
    const bt = localStorage.getItem(SPEEDRUN_KEY);
    Game.bestTime = bt ? parseInt(bt) : 0;
  }catch(e){ Game.bestTime = 0; }

  // 低能量惩罚提示
  if(Game.globalEnergy < LOW_ENERGY){
    showToast('⚠ 能量不足！移动速度降低');
  }

  // v3: 应用记忆细胞永久加成
  applyMemoryBonuses();
  // v3: 应用自适应难度调整
  applyAdaptiveDifficulty();

  // 移动端战斗门槛检查
  if(Game.mobile){
    if(!Game.mobile.viewport.requestBattleStart()) return false;
  }

  if(window.CELL_QUEST_DEBUG) console.log('[DEBUG] Setting Game.state=playing, player=(' + Game.player.x + ',' + Game.player.y + ') health=' + Game.player.health + ' levelRows=' + Game.level.height);
  _updateFirstFrame = true;
  Game.state = 'playing';
  Sfx.startFileBgm('level');
  _notifyMobileState();
  $('hub-screen').classList.add('hidden');
  $('complete-screen').classList.add('hidden');
  $('death-panel').classList.add('hidden');
  $('pause-menu').classList.add('hidden');
  $('dialogue-bubble').classList.remove('active');
  $('memory-card').classList.add('hidden');
  $('hud').classList.add('active');
  // 自动聚焦游戏容器
  const container = $('game-container');
  const fp = $('focus-prompt');
  if(fp) fp.classList.add('hidden');
  container.focus();
  updateHUD();

  // 病例模式：如果关卡带 case 数据，通知适配器
  if(mapData.case) {
    Game._caseData = mapData.case;
    if(window.CellQuestLegacy._onCaseLevelLoad) {
      window.CellQuestLegacy._onCaseLevelLoad(mapData.case);
    }
  } else {
    Game._caseData = null;
  }

  return true;
}

// ===== v3: 记忆细胞加成应用 =====
function applyMemoryBonuses(){
  const bonus = getMemoryBonus(Game.memoryCells);
  if(Game.memoryCells <= 0) return;

  // 应用到所有玩家
  for(const p of Game.players){
    if(!p) continue;
    // 初始能量加成
    Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + bonus.startEnergy);
    // 最大生命加成
    if(bonus.maxHp > 0){
      p.maxHealth = 100 + bonus.maxHp;
      p.health = p.maxHealth;
    }
    // 挥剑伤害加成
    if(bonus.swordDmg > 0){
      p.atk = WBC_BASE_ATK + bonus.swordDmg;
    } else {
      p.atk = WBC_BASE_ATK;
    }
    // 开局护盾
    if(bonus.startShield > 0){
      p.shield = 600; // 10秒护盾
    }
  }
}

// ===== v3: 自适应难度应用 =====
function applyAdaptiveDifficulty(){
  const d = Game.adaptiveDifficulty;
  const lvl = Game.level;
  if(!lvl) return;

  const cfg = ADAPTIVE_DIFFICULTY[d.level];
  showToast('当前难度：' + cfg.name + ' | 敌人' + (d.adjustEnemies>=0?'+':'') + d.adjustEnemies + '% | 道具' + (d.adjustItems>=0?'+':'') + d.adjustItems + '%');

  if(d.adjustEnemies > 0){
    const extraCount = Math.floor(lvl.enemies.length * d.adjustEnemies / 100);
    for(let i = 0; i < extraCount; i++){
      const col = 30 + Math.floor(Math.random() * (lvl.width - 35));
      const type = Math.random() < 0.5 ? 'staph' : 'strep';
      lvl.enemies.push(new Enemy(col * TILE + 4, 12 * TILE + 8, type));
    }
  } else if(d.adjustEnemies < 0){
    const removeCount = Math.floor(lvl.enemies.length * Math.abs(d.adjustEnemies) / 100);
    for(let i = 0; i < removeCount && lvl.enemies.length > 1; i++){
      lvl.enemies.splice(Math.floor(Math.random() * lvl.enemies.length), 1);
    }
  }

  if(d.adjustItems > 0){
    const extraItems = Math.floor(lvl.items.length * d.adjustItems / 100);
    for(let i = 0; i < extraItems; i++){
      lvl.items.push(new Item(10*TILE + Math.random()*(lvl.width-15)*TILE, 12*TILE+8, 'atp'));
    }
  } else if(d.adjustItems < 0){
    const removeItems = Math.floor(lvl.items.length * Math.abs(d.adjustItems) / 100);
    for(let i = 0; i < removeItems && lvl.items.length > 2; i++){
      lvl.items.splice(Math.floor(Math.random() * lvl.items.length), 1);
    }
  }
  Game.totalItems = lvl.items.length;
}

// ===== 预留扩展接口 =====
const BossSystem = {
  phase: 0, hp: 0, maxHp: 0, patterns: [], timers: {},
  init(levelId){ /* 后续Boss关卡填充 */ },
  update(player, level){ /* Boss AI逻辑 */ },
  draw(ctx, camX){ /* Boss渲染 */ },
  reset(){ this.phase=0; this.hp=0; this.maxHp=0; this.patterns=[]; this.timers={}; },
};

function level2Mechanics(player, level){ /* 肺泡迷宫：气体流动/气泡平台 */ }
function level3Mechanics(player, level){ /* 血管奔流：血流冲击/高速通道 */ }
function level4Mechanics(player, level){ /* 淋巴结：免疫中枢/强敌AI */ }
function level5Mechanics(player, level){ /* Boss感染：三阶段Boss战 */ }

// ===== 死亡编号（无限复活 · 永久递增 · 永久记录） =====
// 每个关卡独立的死亡序号，持久化到 localStorage，刷新/重进关卡都继续累计，永不回收。
function deathSeqKey(){
  return 'cellQuest_deathSeq_' + (Game.levelIndex >= 0 ? Game.levelIndex : 'preview');
}
function loadDeathSeq(){
  try { return parseInt(localStorage.getItem(deathSeqKey())) || 0; }
  catch(e){ return 0; }
}
function saveDeathSeq(){
  try { localStorage.setItem(deathSeqKey(), String(Game.deathSeq || 0)); } catch(e){}
}

// ===== 死亡面板 =====
function showDeathPanel(){
  console.error('[DEBUG] showDeathPanel called! player=' + (Game.player ? Game.player.y : 'null') + ' state=' + Game.state);
  if(!Game.player) return;

  // 更新细胞名称
  const cellNames = {1:'白细胞（中性粒细胞）', 2:'血小板', 3:'红细胞'};
  $('death-cell-name').textContent = cellNames[Game.player.cellType] || '未知细胞';

  // 根据 cellType 选头像（WBC=1, PLT=2, RBC=3）
  const avatarMap = {1:'images/avatar-wbc.webp', 2:'images/avatar-plt.webp', 3:'images/avatar-rbc.webp'};
  const avatarEl = $('death-cell-avatar');
  avatarEl.src = avatarMap[Game.player.cellType] || 'images/avatar-rbc.webp';
  avatarEl.classList.remove('lost'); // 无限复活：头像不再变灰

  // 死亡编号标签（永久递增：001、002、003……）
  const countEl = $('death-cells-count');
  countEl.textContent = String(Game.deathSeq).padStart(3, '0') + '已死亡';
  countEl.classList.remove('lost');

  // 更新重试按钮（始终可点击，无限复活）
  const retryBtn = $('btn-retry');
  retryBtn.disabled = false;
  retryBtn.innerHTML = '继续挑战';

  // 显示面板，隐藏 HUD
  $('death-panel').classList.remove('hidden');
  $('hud').classList.remove('active');
  $('death-flash').classList.remove('active');
  Game.deathTimer = 0; // 防止 update() 中再次激活死亡闪屏

  // 自动聚焦
  const container = $('game-container');
  container.focus();
}

function retryFromDeath(){
  const lvl = Game.level;
  if(!lvl) return;

  // v3: 双人模式 — 两个玩家都重生到检查点
  for(const p of Game.players){
    if(!p) continue;
    p.x = p.checkpointX;
    p.y = p.checkpointY;
    if(Game.twoPlayer && p.playerIndex === 1) p.x += 40;
    p.vx = 0; p.vy = 0;
    p.health = p.maxHealth;
    p.invincible = 60;
    p.jumpsLeft = 1;
  }
  // 兼容旧代码
  Game.player = Game.players[0];

  // 复活切换编号：ATP 直接恢复为满格（每次切换到新编号角色，能量重置满格）
  Game.globalEnergy = getMaxEnergy();
  Game._deathEnergyKeep = 0;

  // 隐藏死亡面板
  $('death-panel').classList.add('hidden');
  $('hud').classList.add('active');
  Game.state = 'playing';
  Game.deathTimer = 0;
  _notifyMobileState();

  updateHUD();

  const container = $('game-container');
  container.focus();
}

function quitFromDeath(){
  // v3: 更新自适应难度（死亡退出也计入）
  updateAdaptiveDifficulty(false, Game.deathsThisRun, 0, 0);
  $('death-panel').classList.add('hidden');
  backToHub();
}

// ===== 初始化 =====
// ===== 背景图片预加载 =====
function preloadBgImages(){
  for(let i = 0; i < 6; i++){
    const img = new Image();
    img.src = 'images/backgrounds/bg' + (i + 1) + '.webp?v=1';
    Game.bgImages[i] = img;
  }
}

function init(){
  Game.canvas = $('canvas');
  Game.ctx = Game.canvas.getContext('2d');
  Game.ctx.imageSmoothingEnabled = false;

  loadSprites();
  preloadBgImages();

  // v3: 迁移旧版单存档 → 多栏位
  migrateOldSave();
  // 读取当前栏位
  try{
    const cs = localStorage.getItem('cellQuest_currentSlot');
    if(cs != null) Game.currentSlot = parseInt(cs) || 0;
  }catch(e){}
  loadGame();
  loadAdaptiveDifficulty();  // v3: AI自适应难度
  setupInput();

  // ===== NPC 先导片：点击「新的游戏」后全屏播放，结束/跳过后再进主城 =====
  function playNpcIntro(done){
    const wrap = $('npc-intro');
    const vid = $('npc-intro-video');
    const skip = $('npc-intro-skip');
    if(!wrap || !vid){ if(done) done(); return; }
    let finished = false;
    const finish = ()=>{
      if(finished) return; finished = true;
      try{ vid.pause(); vid.removeAttribute('src'); vid.load(); }catch(e){}
      wrap.classList.add('hidden');
      window.removeEventListener('keydown', onKey, true);
      if(skip) skip.removeEventListener('click', finish);
      wrap.removeEventListener('click', onWrapClick);
      if(done) done();
    };
    const onKey = (e)=>{
      if(e.key === 'Escape' || e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); e.stopPropagation(); finish(); }
    };
    const onWrapClick = (e)=>{ if(e.target === skip) return; finish(); };
    if(skip) skip.addEventListener('click', finish);
    wrap.addEventListener('click', onWrapClick);
    window.addEventListener('keydown', onKey, true);
    wrap.classList.remove('hidden'); // 显示全屏视频层
    vid.src = 'videos/npc-intro.mp4';
    vid.load();
    const p = vid.play();
    if(p && typeof p.catch === 'function'){
      p.catch(()=>{ /* 点击已是用户手势，通常可直接播放；被拦截时静待下次手势 */ });
    }
    vid.addEventListener('ended', finish, { once:true });
    // 兜底：视频加载/解码失败时不卡死，允许自动跳过进入主城
    vid.addEventListener('error', finish, { once:true });
  }

  bindClick('btn-start', ()=>{
    Sfx.init();
    // 自动找第一个空存档作为新游戏
    let emptySlot = -1;
    for(let i=0;i<MAX_SLOTS;i++){ if(!getSlotInfo(i).exists){ emptySlot=i; break; } }
    if(emptySlot >= 0){
      switchSlot(emptySlot);
      showToast('已创建新存档: 存档 '+(emptySlot+1));
    }
    // 先播放 NPC 先导片，结束/跳过后进入主城
    playNpcIntro(()=>{ showHub(); $('game-container').focus(); });
  });
  // 主菜单快捷按钮: 在当前页面弹出面板,不跳转
  bindClick('btn-menu-slots', ()=>{ Sfx.init(); showSlotPanel(); });
  bindClick('btn-menu-lb', ()=>{ Sfx.init(); showLeaderboard(); });
  // Hub 左上角返回
  bindClick('btn-menu-back-top', ()=>{ showMenu(); });
  bindClick('btn-menu-back', ()=>{ showMenu(); });
  bindClick('btn-hub-pedia', ()=>{ showPedia(); });
  bindClick('btn-pedia-close', ()=>{ closePedia(); });
  bindClick('btn-pedia-wbc', ()=>{ showCharDetail('wbc'); });
  bindClick('btn-pedia-rbc', ()=>{ showCharDetail('rbc'); });
  bindClick('btn-pedia-plt', ()=>{ showCharDetail('plt'); });
  bindClick('btn-char-back', ()=>{ closeCharDetail(); });
  bindClick('btn-resume', ()=>{ togglePause(); });
  bindClick('btn-quit', ()=>{ backToHub(); });
  bindClick('btn-next-level', ()=>{ nextLevel(); });
  bindClick('btn-complete-menu', ()=>{ replayLevel(); });
  bindClick('btn-complete-home', ()=>{ backToHub(); });
  // 死亡面板按钮
  bindClick('btn-retry', ()=>{ retryFromDeath(); });
  bindClick('btn-death-quit', ()=>{ quitFromDeath(); });
  bindClick('btn-death-menu', ()=>{ $('death-panel').classList.add('hidden'); showMenu(); });
  // 对话气泡按钮
  bindClick('btn-bubble-next', ()=>{ dismissTutorial(); });
  bindClick('btn-bubble-skip', ()=>{ skipAllTutorials(); });
  // 记忆卡片关闭
  bindClick('btn-memory-close', ()=>{ closeMemoryCard(); });
  // 确认框
  let confirmCallback=null;
  window.showConfirm=(msg,onYes)=>{Game.paused=true;$('confirm-msg').textContent=msg;$('confirm-dialog').classList.remove('hidden');confirmCallback=onYes;};
  window.hideConfirm=()=>{$('confirm-dialog').classList.add('hidden');confirmCallback=null;if(Game.state==='playing')Game.paused=false;};
  bindClick('btn-confirm-yes', e=>{e.stopPropagation();try{if(confirmCallback)confirmCallback();}catch(err){console.error(err);}hideConfirm();});
  bindClick('btn-confirm-no', e=>{e.stopPropagation();hideConfirm();});
  $('confirm-dialog').addEventListener('click',e=>{if(e.target===$('confirm-dialog'))hideConfirm();});
  bindClick('home-btn', e=>{e.stopPropagation();if(Game.state!=='playing'&&Game.state!=='paused')return;showConfirm('确定要离开当前关卡吗？\n进度将不会保存。',()=>{backToHub();});});

  // 背景音乐自由开关（HUD 与暂停菜单共用同一逻辑）
  Sfx.initBgmState();
  updateMusicButton();
  bindClick('music-btn', ()=>{ toggleMusic(); });
  bindClick('btn-music-pause', ()=>{ toggleMusic(); });
  bindClick('btn-music-menu', ()=>{ toggleMusic(); });
  bindClick('btn-music-hub', ()=>{ toggleMusic(); });

  // ===== 背景音乐音量滑块（HUD 与暂停面板共享状态，双向同步）=====
  function syncBgmVolumeUI(){
    const v = String(Math.round(Sfx.getBgmVolume() * 100));
    const a = $('bgm-volume'); if(a) a.value = v;
    const b = $('bgm-volume-pause'); if(b) b.value = v;
  }
  ['bgm-volume','bgm-volume-pause'].forEach(id => {
    const el = $(id);
    if(el) el.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value, 10);
      Sfx.setBgmVolume(pct / 100);          // 实时改音量并持久化
      // 同步另一个滑块
      ['bgm-volume','bgm-volume-pause'].forEach(oid => {
        if(oid !== id){ const o = $(oid); if(o) o.value = e.target.value; }
      });
    });
  });
  syncBgmVolumeUI();

  // v3: AI 生成关卡按钮
  bindClick('btn-hub-ai', ()=>{ showAIGeneratePanel(); });

  // v3: 存档管理
  bindClick('btn-hub-slots', ()=>{ showSlotPanel(); });

  // v3: 排行榜
  bindClick('btn-hub-lb', ()=>{ showLeaderboard(); });

  // v3: 成就
  bindClick('btn-hub-achs', ()=>{ showAchievements(); });

  // v3: 双人模式切换
  const btn2p = $('btn-hub-2p');
  if(btn2p){
    btn2p.onclick = ()=>{
      Game.twoPlayer = !Game.twoPlayer;
      btn2p.textContent = Game.twoPlayer ? '👥 双人模式: ON' : '👥 双人模式: OFF';
      btn2p.style.borderColor = Game.twoPlayer ? '#81c784' : '#4fc3f7';
      btn2p.style.color = Game.twoPlayer ? '#81c784' : '#4fc3f7';
      if(Game.twoPlayer){
        showToast('双人模式已开启 | P1: WASD+Space/E/Shift | P2: ↑↓←→+U/O | 技能: P1=1234 P2=7890');
      }
    };
  }

  showMenu();
  requestAnimationFrame(loop);
}

// ===== 技能树 UI =====
function openSkillTree(){renderSkillTree();$('skill-tree-screen').classList.remove('hidden');}
function closeSkillTree(){$('skill-tree-screen').classList.add('hidden');}
function renderSkillTree(){$('skill-points-display').textContent=Game.skillPoints+' 技能点';document.querySelectorAll('.skill-col').forEach(col=>{const cell=col.dataset.cell;const tree=SKILL_TREES[cell];let h='<h3 style="background:'+tree.color+'20;color:'+tree.color+'">'+tree.icon+' '+tree.name+'</h3>';tree.nodes.forEach(node=>{const rank=getSkillLevel(cell,node.id);const maxed=rank>=node.maxRank;let dots='';for(let i=0;i<node.maxRank;i++)dots+='<span class="sk-rank-dot'+(i<rank?' filled':'')+'"></span>';const btnCls=maxed?'sk-btn maxed':'sk-btn';const btnTxt=maxed?'MAX':'升级';const btnDis=maxed||Game.skillPoints<1?' disabled':'';h+='<div class="skill-node"><span class="sk-icon">'+node.icon+'</span><div class="sk-info"><div class="sk-name">'+node.name+'</div><div class="sk-desc">'+node.desc+'</div><div class="sk-ranks">'+dots+'</div></div><button class="'+btnCls+'"'+btnDis+' onclick="unlockSkill(\''+cell+'\',\''+node.id+'\');renderSkillTree();">'+btnTxt+'</button></div>';});col.innerHTML=h;});}

// ===== 装备 UI =====
function openEquipment(){renderEquipment();$('equipment-screen').classList.remove('hidden');}
function closeEquipment(){$('equipment-screen').classList.add('hidden');}
function renderEquipment(){['weapon','armor','accessory'].forEach(slot=>{const el=$('es-'+slot);const eid=Game.equipment[slot];if(eid){const eq=findEquip(eid);el.innerHTML=(eq?eq.name:eid)+'<br><small style="color:'+(eq?RARITY_COLORS[eq.rarity]:'#aaa')+'">'+(eq?RARITY_NAMES[eq.rarity]:'')+'</small>';el.className='es-item equipped';el.onclick=()=>{if(confirm('卸下'+(eq?eq.name:eid)+'？')){unequipItem(slot);renderEquipment();}};}else{el.innerHTML='空';el.className='es-item';el.onclick=null;}});$('inv-count').textContent=Game.inventory.length+'/20';const grid=$('inventory-grid');grid.innerHTML='';Game.inventory.forEach(eid=>{const eq=findEquip(eid);if(!eq)return;const card=document.createElement('div');card.className='inv-card';card.innerHTML='<div class="ic-name">'+eq.name+'</div><div class="ic-rarity" style="color:'+RARITY_COLORS[eq.rarity]+'">'+RARITY_NAMES[eq.rarity]+'</div><div class="ic-stats">'+statsText(eq.stats)+'</div>';card.onclick=()=>{equipItem(eid);renderEquipment();};grid.appendChild(card);});}
function statsText(stats){const n={atk:'攻',def:'防',spd:'速',maxHp:'命',maxEnergy:'能'};return Object.keys(stats).map(k=>n[k]+'+'+stats[k]).join(' ');}

window.CellQuestLegacy = {
  loadLevel(levelId, options) {
    Game.twoPlayer = Boolean(options.twoPlayer);
    if (options.playerTwoCell) Game._p2CellType = options.playerTwoCell;
    // Support preview string IDs
    if (typeof levelId === 'string' && _PREVIEW_LEVELS[levelId]) {
      return LoadLevel(levelId, options.playerOneCell);
    }
    return LoadLevel(Number(levelId), options.playerOneCell);
  },
  pause() {
    if (Game.state === 'playing') togglePause();
  },
  resume() {
    if (Game.state === 'paused') togglePause();
  },
  retry() {
    retryFromDeath();
  },
  quitLevel() {
    backToHub();
  },
  setTwoPlayer(enabled) {
    Game.twoPlayer = Boolean(enabled);
  },
  dispatch(command) {
    if (command.type !== 'input') return;
    const target = command.player === 2 ? Game.keysP2 : Game.keys;
    target[command.action] = command.pressed;
  },

  // ---- Preview level support (Vue case designer) ----

  registerPreviewLevel(levelData) {
    const id = 'preview-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    _PREVIEW_LEVELS[id] = levelData;
    _PREVIEW_CONFIGS[id] = {
      name: levelData._name || '病例试玩',
      icon: levelData._icon || '🔬',
      _isPreview: true,
      bgMusic: 'tutorial',
      enemies: [],
      mechanics: [],
    };
    return id;
  },

  unregisterPreviewLevel(id) {
    delete _PREVIEW_LEVELS[id];
    delete _PREVIEW_CONFIGS[id];
  },

  // Internal: emit state change (called by LoadLevel for preview)
  _emitStateChanged() {
    // State change is handled by the LegacyGameEngineAdapter tick observer.
    // This stub exists for future hooking.
  },
};

// Open the case editor in a new tab
function openEditor() { window.open('editor.html', '_blank') }

// Bridge: trigger level complete from case engine
window.cellQuest_triggerComplete = levelComplete;

window.addEventListener('load', init);

// ===== Cross-tab sync: auto-refresh levels when editor saves =====
window.addEventListener('storage', function(e) {
  if (e.key === 'cellQuest_customLevels_0') {
    refreshCustomLevels();
    if (Game.state === 'hub') renderLevelGrid();
  }
});

// Refresh builtin level data from server (for after editor saves to file)
async function refreshBuiltinLevels() {
  const files = ['level0_blood','level1_wbc','level2_alveoli','level3_vessel','level4_lymph'];
  let changed = false;
  for (let i = 0; i < files.length; i++) {
    try {
      const r = await fetch('js/levels/' + files[i] + '.js?_t=' + Date.now());
      const code = await r.text();
      // Extract object literal: const LEVEL_0 = {...};
      const match = code.match(/const\s+LEVEL_\d+\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        const oldJSON = JSON.stringify(_BUILTIN_LEVELS[i]);
        // new Function has global scope access — pass constants explicitly for safety
        var newData = (new Function('C', 'WIN_COLLECT_ALL', 'WIN_KILL_ALL', 'return ' + match[1]))(C, WIN_COLLECT_ALL, WIN_KILL_ALL);
        if (oldJSON !== JSON.stringify(newData)) {
          // Update in-place (LEVEL_MAPS shares same object ref)
          Object.keys(_BUILTIN_LEVELS[i]).forEach(function(k) { delete _BUILTIN_LEVELS[i][k]; });
          Object.assign(_BUILTIN_LEVELS[i], newData);
          changed = true;
        }
      }
    } catch(e) { /* skip on error */ }
  }
  if (changed && Game.state === 'hub') renderLevelGrid();
}

// When user switches back to this tab, refresh all levels
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    refreshCustomLevels();
    refreshBuiltinLevels();
  }
});
