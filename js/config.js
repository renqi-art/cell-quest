/* ====================================================================
 * config.js — 全局常量、调色板、细胞定义、关卡配置、音频、存档、游戏状态
 * ==================================================================== */

// ===== 画布与瓦片 =====
const TILE = 32;
const CW = 800, CH = 480;
const COLS = CW / TILE;   // 25 可见列
const ROWS = CH / TILE;   // 15 可见行

// ===== 物理参数（每固定步） =====
const GRAVITY       = 0.6;
const MOVE_ACCEL    = 0.5;
const MOVE_MAX      = 2.8;
const GROUND_FRICTION = 0.82;
const AIR_FRICTION  = 0.92;
const JUMP_VEL      = -12.5;
const MAX_FALL      = 10;
const COYOTE_FRAMES = 6;
const JUMP_BUFFER   = 6;
const STAND_H       = 44;
const CROUCH_H      = 22;
const PLAYER_W      = 22;
const CROUCH_SPEED  = 0.7;   // 蹲下时移速倍率
const DOUBLE_JUMP_MUL = 0.85; // 二段跳力度倍率

// ===== 能量与Buff =====
const MAX_ENERGY     = 100;
const BRIDGE_COST    = 15;
const BRIDGE_DURATION= 300;   // 5秒（60fps）
const LOW_ENERGY     = 20;    // 低于此值触发惩罚
const LOW_SPEED_MULT = 0.55;  // 低能量速度倍率
const SHIELD_DURATION= 600;   // 10秒
const OXYGEN_DURATION= 600;
const COMPLEMENT_AMMO= 5;
const BLOOD_LOSS_DRAIN = 0.4; // 每步扣除能量
const INVINCIBLE_FRAMES = 90; // 1.5秒无敌

// ===== 炎症潮汐 =====
const TIDE_CYCLE       = 360;  // 6秒一个周期
const TIDE_SURGE_FRAMES= 180;  // 前3秒为潮涌
const TIDE_DRAIN_MULT  = 3;    // 潮涌时能量消耗倍率
const TIDE_SPEED_MULT  = 0.5;  // 潮涌时额外减速倍率
const TIDE_WARN_FRAMES = 30;   // 潮涌前预警变色帧数

// ===== 浮动毛细血管平台 =====
const FLOAT_SPEED = 0.035;     // 角速度
const FLOAT_RANGE = 32;        // 上下浮动半幅(px)

// ===== 白细胞突进 =====
const DASH_COST     = 10;
const DASH_SPEED    = 7;
const DASH_FRAMES   = 8;
const DASH_COOLDOWN = 30;

// ===== 葡萄球菌分裂 =====
const STAPH_LARGE_HP = 2;
const SPLIT_COUNT    = 2;

// ===== 链球菌冲刺 =====
const CHARGE_RANGE    = 180;
const CHARGE_WINDUP   = 42;    // 0.7秒预警
const CHARGE_SPEED    = 5.5;
const CHARGE_FRAMES   = 30;    // 0.5秒冲刺
const CHARGE_COOLDOWN = 120;   // 2秒冷却

// ===== 迷你敌人刷新 =====
const MINI_SPAWN_MAX     = 3;
const MINI_SPAWN_INTERVAL= 360; // 6秒

// ===== 氧气-搭桥联动 =====
const OXY_BRIDGE_COST_MULT = 0.5;
const OXY_BRIDGE_DUR_MULT  = 1.5;

// ===== 踩踏范围Buff =====
const AOE_RADIUS  = 100;
const AOE_DURATION= 180; // 3秒

// ===== 四段生理剧情 =====
const BLEEDING_PHASE_FRAMES = 480;  // 8秒开局出血期
const BLEEDING_DRAIN = 0.05;        // 出血期每帧扣能量
const GAP_BLOOD_MULT = 2;           // 非血小板过缺口失血倍率
const INFLAMMATION_X = 39 * TILE;   // 炎症区起始x坐标

// ===== 脓液地块 =====
const PUS_DURATION = 360;           // 6秒留存
const PUS_SLOW_MULT = 0.7;          // 脓液减速倍率
const PUS_DRAIN = 0.1;              // 脓液每帧扣能量

// ===== 红细胞氧气压制领域 =====
const OXY_FIELD_TRIGGER = 120;      // 2秒触发
const OXY_FIELD_DRAIN = 0.08;       // 每帧消耗能量维持领域
const OXY_FIELD_TIDE_REDUCTION = 0.5; // 潮汐效果减半
const OXY_FIELD_STOMP_BONUS = 1;    // 白细胞踩踏额外伤害
const OXY_FIELD_PUS_FADE = 2;       // 脓液加速消退倍率

// ===== 血小板止血：暂停潮汐 =====
const BRIDGE_TIDE_PAUSE = 120;      // 2秒

// ===== 愈合衰减 =====
const HEALING_START_COL = 55;
const HEALING_END_COL = 75;

// ===== 道具能量 =====
const COIN_ENERGY   = 10;  // 金币恢复能量
const FOOD_ENERGY   = 25;  // 食物恢复能量
const DRINK_ENERGY  = 15;  // 饮料恢复能量
const NUTRITION_ENERGY = 30; // 营养包恢复能量（仅红细胞可收集）

// ===== Boss =====
const BOSS_HP    = 10;
const BOSS_W     = 72;
const BOSS_H     = 56;
const BOSS_CONTACT_DAMAGE = 1;

// ===== 白细胞挥剑 =====
const SWORD_RANGE    = 70;   // 攻击范围(px)
const SWORD_DAMAGE   = 2;    // 对敌人/Boss伤害
const SWORD_COST     = 5;    // 能量消耗
const SWORD_COOLDOWN = 25;   // 冷却帧数
const SWORD_DURATION = 12;   // 挥剑动画帧数

// ===== 速通 =====
const SPEEDRUN_KEY = 'cellQuest_bestTime_1';

// ===== 调色板 =====
const C = {
  // 天空
  sky1:'#3d1a2e', sky2:'#7a2a3e', sky3:'#c4485e',
  // 远景
  far:'#2a1020', mid:'#3e1828',
  // 瓦片
  ground:'#6b2030', groundTop:'#8b2840', groundDark:'#4a1520',
  platform:'#7a2a3a', platformTop:'#9a3a4a',
  scab:'#8a5a2a', scabTop:'#aa7038', scabDark:'#5a3a1a',
  bloodLoss:'#c41828', bloodLossTop:'#e02838',
  spike:'#888899',
  // 玩家
  wbc:'#f0ede0', wbcNuc:'#b4a890',
  platelet:'#ff8a8a', plateletDark:'#cc5050',
  rbc:'#d93025', rbcDark:'#a52015',
  // 敌人
  staph:'#ffd700', staphDark:'#cca820',
  strep:'#76c043', strepDark:'#5a9030',
  staphLarge:'#ff9500', staphLargeDark:'#cc7000',
  miniStaph:'#fff060', miniStaphDark:'#ccb020',
  chargeWarn:'#ff3030',
  // 道具
  shield:'#4fc3f7', oxygen:'#81d4fa', complement:'#ab47bc',
  memory:'#ce93d8', memoryGlow:'#e0b0ff',
  food:'#ff8c42', foodGlow:'#ffb380',
  drink:'#42c8ff', drinkGlow:'#80d8ff',
  // 效果
  particle:'#ffaa44', heal:'#66ff66', damage:'#ff4444',
  aoeBuff:'#ffdd44',
  // 潮汐
  tideSurge:'#ff2030', tideWarn:'#ff6040',
  // 浮动平台
  floatPlat:'#4a7a5a', floatPlatTop:'#6a9a7a', floatPlatDark:'#2a5a3a',
  // UI
  white:'#e8e8f0', dim:'#6a6a8a',
  checkpoint:'#9c6ade', checkpointActive:'#c4a0ff',
  finish:'#ffd700',
  // 对话气泡
  bubbleBg:'rgba(12,12,30,.94)', bubbleBorder:'#4a6aaa',
  bubbleTail:'#1a1a3a',
  // 教程
  tutBg:'rgba(10,10,30,.92)', tutBorder:'#4a6aaa',
  // 脓液
  pus:'#d4c878', pusDark:'#b0a060', pusGlow:'#e8e0a0',
  // 氧气领域
  oxyField:'#64b5f6', oxyFieldGlow:'#90caf9',
  // 营养包
  nutrition:'#e91e63', nutritionGlow:'#f48fb1',
  // Boss
  boss:'#8b0000', bossDark:'#5a0000', bossEye:'#ff1744', bossBar:'#ff3030',
  // 挥剑
  sword:'#fff9c4', swordGlow:'#fff59d',
};

// ===== 三细胞定义 =====
const CELLS = {
  1: {
    name:'白细胞', short:'WBC',
    color:C.wbc, nucleus:C.wbcNuc,
    ability:'stomp',        // 踩踏消灭细菌
    abilityDesc:'踩踏消灭细菌',
    speedMul:1.0, jumpMul:1.0,
    size:24,
  },
  2: {
    name:'血小板', short:'PLT',
    color:C.platelet, nucleus:C.plateletDark,
    ability:'bridge',       // 消耗能量生成凝血平台
    abilityDesc:'按E生成凝血平台',
    speedMul:0.9, jumpMul:0.95,
    size:20,
  },
  3: {
    name:'红细胞', short:'RBC',
    color:C.rbc, nucleus:C.rbcDark,
    ability:'oxygen',       // 氧气续航（减缓失血）
    abilityDesc:'氧气续航（减缓缓血）',
    speedMul:1.05, jumpMul:1.0,
    size:24,
  },
};

// ===== 关卡配置（5关插槽） =====
const LEVEL_CONFIGS = [
  { id:1, name:'擦伤', icon:'🩹', desc:'新手教学关。学习移动、跳跃、细胞切换、踩踏细菌、血小板搭桥。', bg:[C.sky1,C.sky3] },
  { id:2, name:'肺泡迷宫', icon:'🫁', desc:'气体交换之地，多路径探索。', bg:['#1a2a3a','#3a6a8a'], locked:true },
  { id:3, name:'血管奔流', icon:'🩸', desc:'血流冲击，高速通道。', bg:['#2a0a1a','#5a1a3a'], locked:true },
  { id:4, name:'淋巴结',   icon:'⚪', desc:'免疫中枢，强敌环伺。', bg:['#1a1a2a','#3a3a5a'], locked:true },
  { id:5, name:'Boss感染', icon:'☠️', desc:'终极威胁，击败感染源。', bg:['#2a0a0a','#6a0a0a'], locked:true },
];

// ===== 全局游戏状态 =====
const Game = {
  state: 'menu',           // menu | hub | playing | paused | complete | dead
  levelIndex: 0,           // 当前关卡索引 (0-4)
  // 全局进度
  unlocked: [true, false, false, false, false],
  completed: [false, false, false, false, false],
  stars:     [0, 0, 0, 0, 0],
  globalEnergy: 100,
  // 运行时
  keys: {},
  prevKeys: {},
  canvas: null, ctx: null,
  level: null, player: null,
  camera: { x:0, y:0, shake:0 },
  particles: [],
  tempPlatforms: [],
  projectiles: [],
  // 统计
  stats: { kills:0, items:0, deaths:0, foundMemory:false },
  // 教程
  tutorials: [],
  tutShown: {},
  tutorialsDone: false,    // localStorage 标记，首次通关后不再弹教程
  // 时间
  frame: 0,
  lastTime: 0,
  accumulator: 0,
  paused: false,
  levelStartTime: 0,       // 关卡开始时间戳
  levelTime: 0,            // 本局用时(ms)
  bestTime: 0,             // 最佳速通(ms)
  // 死亡闪烁
  deathTimer: 0,
  // 潮汐
  tideTimer: 0,
  // 浮动平台
  floatPlatforms: [],
  // 记忆卡片暂停
  memoryCardOpen: false,
  memoryCardOpenTime: 0,
  // 四段生理剧情
  bleedingTimer: 0,
  gapBloodMult: 1,
  bridgeUsedInGap: false,
  // 脓液地块
  pusTiles: [],
  // 氧气压制领域
  oxyField: false,
  oxyFieldTimer: 0,
  // 潮汐暂停（血小板止血）
  tidePaused: 0,
  // 愈合衰减进度 0~1
  healingProgress: 0,
  // Boss
  boss: null,
  // 白细胞挥剑
  swordTimer: 0,
  swordCooldown: 0,
  // 知识卡片（白细胞/红细胞/血小板）
  knowledgeShown: { wbc:false, rbc:false, plt:false },
  // 全敌击杀通关条件
  allEnemiesDead: false,
};

// ===== 存档系统 =====
function saveGame(){
  try{
    localStorage.setItem('cellQuest_save', JSON.stringify({
      unlocked:Game.unlocked,
      completed:Game.completed,
      stars:Game.stars,
      globalEnergy:Game.globalEnergy,
    }));
  }catch(e){}
}
function loadGame(){
  try{
    const raw = localStorage.getItem('cellQuest_save');
    if(raw){
      const d = JSON.parse(raw);
      Game.unlocked = d.unlocked || Game.unlocked;
      Game.completed = d.completed || Game.completed;
      Game.stars = d.stars || Game.stars;
      Game.globalEnergy = d.globalEnergy != null ? d.globalEnergy : 100;
    }
  }catch(e){}
}

// ===== WebAudio 音效 =====
const Sfx = {
  ctx: null,
  init(){
    if(!this.ctx){
      try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
    }
  },
  beep(freq, dur, type='square', vol=0.08){
    if(!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  },
  jump(){ this.beep(420, .12, 'square', .06); },
  doubleJump(){ this.beep(620, .1, 'square', .05); this.beep(820, .1, 'square', .04); },
  stomp(){ this.beep(180, .15, 'sawtooth', .08); this.beep(120, .2, 'square', .06); },
  hit(){ this.beep(80, .25, 'sawtooth', .1); },
  coin(){ this.beep(880, .08, 'square', .05); this.beep(1100, .08, 'square', .05); },
  pickup(){ this.beep(660, .1, 'triangle', .06); this.beep(990, .12, 'triangle', .06); },
  bridge(){ this.beep(300, .15, 'sine', .06); this.beep(400, .1, 'sine', .04); },
  switchCell(){ this.beep(500, .06, 'square', .04); this.beep(700, .06, 'square', .04); },
  checkpoint(){ this.beep(523, .1, 'triangle', .06); this.beep(659, .1, 'triangle', .06); this.beep(784, .15, 'triangle', .06); },
  shoot(){ this.beep(800, .06, 'sawtooth', .05); },
  dash(){ this.beep(300, .06, 'sawtooth', .05); this.beep(600, .08, 'sawtooth', .04); },
  charge(){ this.beep(150, .15, 'sawtooth', .04); this.beep(200, .15, 'sawtooth', .04); },
  split(){ this.beep(400, .08, 'square', .05); this.beep(500, .08, 'square', .04); },
  aoeStomp(){ this.beep(250, .1, 'sawtooth', .07); this.beep(150, .15, 'square', .05); },
  tide(){ this.beep(100, .3, 'sine', .04); },
  memory(){ [523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>this.beep(f,.1,'triangle',.06), i*80)); },
  oxyField(){ this.beep(440,.15,'sine',.05); this.beep(660,.15,'sine',.04); this.beep(880,.2,'sine',.03); },
  pus(){ this.beep(200,.1,'sawtooth',.04); },
  tidePause(){ this.beep(300,.1,'sine',.05); this.beep(400,.15,'sine',.04); },
  death(){ this.beep(200, .3, 'sawtooth', .08); this.beep(100, .4, 'sawtooth', .06); },
  complete(){
    [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.beep(f,.15,'triangle',.07), i*120));
  },
};
