/* ====================================================================
 * config-game.js — 全局游戏状态 (Game) + WebAudio 音效系统 (Sfx)
 * ==================================================================== */

// ===== 全局游戏状态 =====
const Game = {
  state: 'menu',           // menu | hub | playing | paused | complete | dead
  levelIndex: 0,           // 当前关卡索引 (0-5)
  // 全局进度
  unlocked: [true, true, true, true, true, true],
  completed: [false, false, false, false, false, false],
  stars:     [0, 0, 0, 0, 0, 0],
  globalEnergy: 100,
  cells: 3,                // 当前关卡剩余细胞（生命数）
  currentSlot: 0,           // v3: 当前存档栏位 (0-4)
  playerName: '',            // v3: 排行榜昵称
  // 出战队伍：玩家选择 2 名角色，对局内按 Q 切换
  party: [1, 2, 3],          // 默认 [白细胞, 血小板, 红细胞]（便于在局内 Q 切换体验三套技能）
  partyIndex: 0,             // 当前激活的角色在 party 中的索引
  debugMode: false,          // 调试模式：解锁全部关卡，方便并行配置
  // 运行时
  keys: {},
  prevKeys: {},
  canvas: null, ctx: null,
  level: null, player: null,
  camera: { x:0, y:0, shake:0 },
  particles: [],
  tempPlatforms: [],
  clotWalls: [],
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
  // v2: 关卡细胞锁定
  winCondition: null,
  itemsCollected: 0,
  totalItems: 0,
  // ? 方块
  qBlocks: [],
  // ATP 图片
  atpImg: null,
  // v3: 关卡背景图片（预加载）
  bgImages: [null, null, null, null, null, null],
  renderAlpha: 0,
  // RPG系统
  playerLevel:1,xp:0,skillPoints:0,damageNumbers:[],
  skills:{wbc:{damagePlus:0,dashCooldown:0,swordRange:0,slamRadius:0},plt:{bridgeCost:0,bridgeDuration:0,shieldDuration:0,healOnBridge:0},rbc:{energyDrain:0,oxyFieldPower:0,maxEnergy:0,nutritionBonus:0}},
  equipment:{weapon:null,armor:null,accessory:null},inventory:[],
  // v3: 本局死亡计数
  deathsThisRun: 0,
  // v3: 记忆细胞全局收集
  memoryCells: 0,              // 全局累计收集数
  memoryCellsCollected: {},    // { levelIndex: true } 已收集过哪些关的记忆细胞
  // v3: 双人模式
  twoPlayer: false,
  players: [],
  keysP2: {},
  prevKeysP2: {},
  // v3: DC NPC 数组
  dcNPCs: [],
  // v3: 成就追踪
  _lifetimeKills: 0,
  _sprintDistance: 0,
  _justCleared: false,
  // v3: AI 自适应难度系统
  adaptiveDifficulty:{
    level:'normal',          // 'easy' | 'normal' | 'hard' | 'extreme'
    recentDeaths:0,          // 最近3次关卡累计死亡次数
    recentClears:[],         // [{time, atpPct, kills}] 最近5次通关记录
    clearStreak:0,           // 连续通关次数（无死亡）
    adjustEnemies:0,         // 敌人数量调整（±30%）
    adjustItems:0,           // 道具数量调整（±20%）
    adjustTide:0,            // 潮涌频率调整（±15%）
    adjustDamage:0,          // 敌人伤害调整（±1）
  },
};

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

  // ===== 角色走路脚步声（移植自本地旧 config.js，独立 HTMLAudioElement，不依赖 Web Audio ctx）=====
  // 不受 BGM 静音开关 / M 键控制；使用上传的脚步音频文件 audio/sfx_footstep.mp3
  _footEl: null,
  footstep(){
    try{
      if(!this._footEl){
        this._footEl = new Audio('audio/sfx_footstep.mp3');
        this._footEl.volume = 0.4;
        this._footEl.preload = 'auto';
      }
      this._footEl.currentTime = 0;
      const p = this._footEl.play();
      if(p && p.catch) p.catch(()=>{});
    }catch(e){}
  },

  // ===== 分层音效系统（新增扩展，不影响 jump / doubleJump 等既有逻辑）=====
  muted: false,
  // 文件型 BGM（用户上传的 mp3）播放状态
  _bgmFileEl: null,
  _bgmFileMode: null,
  _bgmFileVol: 0.5,
  _tiersReady: false,
  _now(){ return this.ctx ? this.ctx.currentTime : 0; },
  _initTiers(){
    this.init();
    if(!this.ctx || this._tiersReady) return;
    // 各层级独立增益节点：互不覆盖、互不抢占
    this._gBgm   = this.ctx.createGain(); this._gBgm.gain.value   = 0.022; // 背景音乐：音量最低（仅微弱点缀）
    this._gAlarm = this.ctx.createGain(); this._gAlarm.gain.value = 0.55; // 警报心跳：音量最突出
    this._gWarn  = this.ctx.createGain(); this._gWarn.gain.value  = 0.22; // 能量预警
    this._gSword = this.ctx.createGain(); this._gSword.gain.value = 0.30; // 战斗打击
    this._gPick  = this.ctx.createGain(); this._gPick.gain.value  = 0.30; // 拾取
    [this._gBgm, this._gAlarm, this._gWarn, this._gSword, this._gPick].forEach(g => g.connect(this.ctx.destination));
    this._tiersReady = true;
  },
  resume(){
    this.init();
    this._initTiers();
    if(!this.muted && this.ctx && this.ctx.state === 'suspended'){ try{ this.ctx.resume(); }catch(e){} }
  },
  suspendAll(){ if(this.ctx && this.ctx.state === 'running'){ try{ this.ctx.suspend(); }catch(e){} } this.stopAlarm(); },
  toggleMute(){
    this.muted = !this.muted;
    if(this.muted) this.suspendAll(); else this.resume();
    this._applyFileBgmMute();
    return this.muted;
  },

  // 1) 循环背景音乐（音量最低，仅作点缀）
  //    mode: 'menu'  = 舒缓（主菜单 / 选关界面）
  //          'level' = 稍活泼、有激情（正式关卡，带轻底鼓律动）
  startBgm(mode){
    mode = mode || this._bgmMode || 'menu';
    this._bgmMode = mode;
    this._initTiers();
    if(!this.ctx) return;
    if(this._bgmOn){
      if(this._bgmMode === mode) return; // 同模式不重复启动
      this.stopBgm();                    // 切换模式：先停后启
    }
    this._bgmOn = true;

    // 两套风格参数
    const CFG = mode === 'level'
      ? { // 关卡：明亮、稍快、带轻底鼓，更"有激情"
          scale:[261.63, 329.63, 392.00, 440.00, 523.25, 659.25],
          motif:[0,2,4,5, 4,2,3,4, 5,4,2,0, 3,4,2,-1],
          bass:[130.81, 130.81, 174.61, 196.00],
          stepDur:0.34, noteGain:0.5, bassGain:0.55, lp:2200, kick:true
        }
      : { // 菜单：低沉、舒缓、留白多
          scale:[196.00, 233.08, 261.63, 311.13, 349.23, 392.00],
          motif:[0,2,4,2, 3,2,-1,-1, 4,3,2,0, -1,-1,-1,-1],
          bass:[98.00, 98.00, 130.81, 116.54],
          stepDur:0.6, noteGain:0.42, bassGain:0.5, lp:1200, kick:false
        };

    // 整体低通，去掉高频毛刺
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = CFG.lp;
    lp.connect(this._gBgm);

    const playNote = (freq, time, dur, peak, type) => {
      if(!freq || freq <= 0) return;
      const o = this.ctx.createOscillator();
      o.type = type || 'triangle';
      o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(peak, time + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      o.connect(g); g.connect(lp);
      o.start(time); o.stop(time + dur + 0.05);
    };
    // 轻底鼓：短促低频下坠，增加律动（仅关卡版）
    const playKick = (time) => {
      const o = this.ctx.createOscillator(); o.type = 'sine';
      const g = this.ctx.createGain();
      o.frequency.setValueAtTime(120, time);
      o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.9, time + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
      o.connect(g); g.connect(this._gBgm);
      o.start(time); o.stop(time + 0.18);
    };

    let step = 0;
    let nextTime = this._now() + 0.2;
    const tick = () => {
      if(!this._bgmOn) return;
      // 音频上下文未解锁（浏览器自动播放策略）时仅等待，不排程
      if(!this.ctx || this.ctx.state !== 'running'){ this._bgmTimer = setTimeout(tick, 250); return; }
      const now = this._now();
      if(nextTime < now) nextTime = now + 0.2; // 从挂起恢复后纠正排程时间，避免一次性补播
      const ahead = now + 1.0; // 提前 1 秒排程，避免卡顿
      while(nextTime < ahead){
        const idx = CFG.motif[step % CFG.motif.length];
        if(idx >= 0) playNote(CFG.scale[idx], nextTime, CFG.stepDur * 1.7, CFG.noteGain, 'triangle');
        if(step % 4 === 0){
          const b = CFG.bass[(step / 4) % CFG.bass.length];
          playNote(b, nextTime, CFG.stepDur * 3.4, CFG.bassGain, 'sine');
          if(CFG.kick) playKick(nextTime);
        }
        step++;
        nextTime += CFG.stepDur;
      }
      this._bgmTimer = setTimeout(tick, 250);
    };
    tick();
  },
  stopBgm(){
    this._bgmOn = false;
    if(this._bgmTimer){ clearTimeout(this._bgmTimer); this._bgmTimer = null; }
    if(this._bgmNodes){ this._bgmNodes.forEach(n => { try{ n.stop && n.stop(); }catch(e){} }); this._bgmNodes = null; }
  },

  // 文件型 BGM：真正循环播放用户上传的 mp3（audio/bgm_loop.mp3 等）
  // 与上面的合成 BGM（startBgm）互不干扰、互不覆盖；用于实际游玩入口（老版 js 引擎）。
  startFileBgm(mode){
    mode = mode || 'menu';
    // 同模式且正在播放则跳过，避免每帧重建
    if(this._bgmFileMode === mode && this._bgmFileEl && !this._bgmFileEl.paused) return;
    this.stopFileBgm();
    this._bgmFileMode = mode;
    const MAP = { menu: 'audio/menu_bgm.mp3', level: 'audio/level_bgm.mp3' };
    const src = MAP[mode] || 'audio/bgm_loop.mp3';
    const el = new Audio(src);
    el.loop = true;
    el.volume = this.muted ? 0 : this._bgmFileVol;
    el.preload = 'auto';
    this._bgmFileEl = el;
    const p = el.play();
    if(p && typeof p.catch === 'function'){
      // 浏览器自动播放策略拦截：首次用户手势（点击/按键）时补播
      p.catch(()=>{
        const resume = ()=>{
          try{ el.play().catch(()=>{}); }catch(e){}
          window.removeEventListener('pointerdown', resume);
          window.removeEventListener('keydown', resume);
        };
        window.addEventListener('pointerdown', resume, { once:true });
        window.addEventListener('keydown', resume, { once:true });
      });
    }
  },
  stopFileBgm(){
    if(this._bgmFileEl){
      try{ this._bgmFileEl.pause(); this._bgmFileEl.src = ''; }catch(e){}
      this._bgmFileEl = null;
    }
    this._bgmFileMode = null;
  },
  _applyFileBgmMute(){
    if(this._bgmFileEl) this._bgmFileEl.volume = this.muted ? 0 : this._bgmFileVol;
  },

  // 2) 血量过低警报：循环心跳 + 急促呼吸（音量最突出，持续提醒）
  startAlarm(){
    this._initTiers();
    if(!this.ctx || this._alarmOn) return;
    this._alarmOn = true;
    const beat = () => {
      if(!this._alarmOn) return;
      if(this.ctx.state !== 'running'){ this._alarmTimer = setTimeout(beat, 400); return; }
      this._heartThump(false);
      this._alarmTimer = setTimeout(() => {
        if(!this._alarmOn) return;
        if(this.ctx.state !== 'running'){ this._alarmTimer = setTimeout(beat, 400); return; }
        this._heartThump(true);
        this._alarmTimer = setTimeout(beat, 620);
      }, 300);
    };
    beat();
  },
  stopAlarm(){
    this._alarmOn = false;
    if(this._alarmTimer){ clearTimeout(this._alarmTimer); this._alarmTimer = null; }
  },
  _heartThump(second){
    if(!this.ctx) return;
    const t = this._now();
    const o = this.ctx.createOscillator(); o.type = 'sine';
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(second ? 58 : 72, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(second ? 0.85 : 1.0, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(this._gAlarm);
    o.start(t); o.stop(t + 0.25);
  },

  // 3) 能量不足预警（短促两声）
  energyWarn(){
    this._initTiers();
    if(!this.ctx) return;
    const t = this._now();
    [0, 0.16].forEach((d, i) => {
      const o = this.ctx.createOscillator(); o.type = 'square';
      const g = this.ctx.createGain();
      o.frequency.value = 520 + i * 180;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(1, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.14);
      o.connect(g); g.connect(this._gWarn);
      o.start(t + d); o.stop(t + d + 0.16);
    });
  },

  // 4) 战斗打击（挥剑 / 攻击怪物）短促打击音
  swordHit(){
    this._initTiers();
    if(!this.ctx) return;
    const t = this._now();
    const len = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.value = 0.9;
    src.connect(bp); bp.connect(g); g.connect(this._gSword);
    src.start(t);
    const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = 900;
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.5, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g2); g2.connect(this._gSword);
    o.start(t); o.stop(t + 0.09);
  },

  // 5) 交互拾取（氧气 / 营养 / 水源 —— 红细胞交互）专属音效
  rbcPickup(){
    this._initTiers();
    if(!this.ctx) return;
    const t = this._now();
    [880, 1175].forEach((f, i) => {
      const o = this.ctx.createOscillator(); o.type = 'triangle';
      const g = this.ctx.createGain();
      o.frequency.value = f;
      const d = i * 0.06;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(1, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
      o.connect(g); g.connect(this._gPick);
      o.start(t + d); o.stop(t + d + 0.2);
    });
  },
};
