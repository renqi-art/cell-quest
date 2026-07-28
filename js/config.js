/* ====================================================================
 * config.js — 游戏数据、全局状态、音频系统、存档管理
 * （物理/技能常量已移至 config-constants.js）
 * ==================================================================== */

// ===== 技能树 =====
const SKILL_TREES={
wbc:{name:'白细胞战斗树',color:'#f0ede0',icon:'⚔️',nodes:[
{id:'damagePlus',name:'攻击强化',desc:'挥剑/踩踏伤害+1/级',maxRank:3,icon:'⚔️'},
{id:'dashCooldown',name:'疾步',desc:'突进冷却-5帧/级',maxRank:3,icon:'💨'},
{id:'swordRange',name:'剑刃加长',desc:'挥剑范围+10px/级',maxRank:3,icon:'📏'},
{id:'slamRadius',name:'震荡波',desc:'跳劈半径+15px/级',maxRank:3,icon:'💥'},
]},
plt:{name:'血小板支援树',color:'#ff8a8a',icon:'🛡️',nodes:[
{id:'bridgeCost',name:'高效凝血',desc:'搭桥能耗-3/级',maxRank:3,icon:'🔧'},
{id:'bridgeDuration',name:'持久平台',desc:'平台持续+90帧/级',maxRank:3,icon:'⏱️'},
{id:'shieldDuration',name:'强化护盾',desc:'护盾持续+120帧/级',maxRank:3,icon:'🛡️'},
{id:'healOnBridge',name:'愈疗桥接',desc:'搭桥时恢复1心/级',maxRank:2,icon:'💚'},
]},
rbc:{name:'红细胞生存树',color:'#d93025',icon:'🔋',nodes:[
{id:'energyDrain',name:'节能代谢',desc:'失血能耗-15%/级',maxRank:3,icon:'🔋'},
{id:'oxyFieldPower',name:'领域强化',desc:'氧气领域效果+20%/级',maxRank:3,icon:'🌀'},
{id:'maxEnergy',name:'能量扩容',desc:'最大能量+15/级',maxRank:2,icon:'💎'},
{id:'nutritionBonus',name:'营养吸收',desc:'营养包额外恢复+10/级',maxRank:3,icon:'🍎'},
]}};
function getSkillLevel(cell,skillId){const t=Game.skills[cell];return(t&&t[skillId]!=null)?t[skillId]:0;}
function unlockSkill(cell,skillId){const t=Game.skills[cell];const n=SKILL_TREES[cell].nodes.find(n=>n.id===skillId);if(!n||t[skillId]>=n.maxRank||Game.skillPoints<1)return false;Game.skillPoints--;t[skillId]++;saveGame();Sfx.pickup();return true;}
function getMaxEnergy(){return MAX_ENERGY+getSkillLevel('rbc','maxEnergy')*15;}

// ===== 装备系统 =====
const EQUIPMENT_DB=[
{id:'ab_sword',slot:'weapon',name:'抗体剑',rarity:1,stats:{atk:2},color:'#e8e8f0'},
{id:'lysozyme_blade',slot:'weapon',name:'溶菌酶刃',rarity:1,stats:{atk:3},color:'#ffe082'},
{id:'complement_blade',slot:'weapon',name:'补体刃',rarity:2,stats:{atk:4},color:'#ab47bc'},
{id:'defensin_spear',slot:'weapon',name:'防御素矛',rarity:2,stats:{atk:5},color:'#64b5f6'},
{id:'phage_lance',slot:'weapon',name:'吞噬之矛',rarity:3,stats:{atk:6,spd:1},color:'#00e5ff'},
{id:'perforin_sword',slot:'weapon',name:'穿孔素剑',rarity:3,stats:{atk:8},color:'#ff5252'},
{id:'membrane_vest',slot:'armor',name:'细胞膜背心',rarity:1,stats:{def:1},color:'#81c784'},
{id:'collagen_mail',slot:'armor',name:'胶原蛋白甲',rarity:1,stats:{def:1,maxHp:1},color:'#a5d6a7'},
{id:'complement_shield',slot:'armor',name:'补体盾',rarity:2,stats:{def:2,maxHp:1},color:'#4fc3f7'},
{id:'mucin_armor',slot:'armor',name:'黏蛋白铠',rarity:2,stats:{def:2,maxHp:2},color:'#90caf9'},
{id:'lymph_armor',slot:'armor',name:'淋巴铠甲',rarity:3,stats:{def:4,maxHp:2},color:'#ffd700'},
{id:'cytokine_ring',slot:'accessory',name:'细胞因子戒指',rarity:1,stats:{maxEnergy:10},color:'#ce93d8'},
{id:'chemokine_charm',slot:'accessory',name:'趋化因子坠',rarity:1,stats:{maxEnergy:15},color:'#e1bee7'},
{id:'memory_amulet',slot:'accessory',name:'记忆护符',rarity:2,stats:{maxEnergy:20},color:'#e0b0ff'},
{id:'tlr_medal',slot:'accessory',name:'TLR勋章',rarity:2,stats:{maxEnergy:25},color:'#b39ddb'},
{id:'stem_talisman',slot:'accessory',name:'干细胞护符',rarity:3,stats:{maxEnergy:30,maxHp:1},color:'#ff8a80'},
];
const RARITY_NAMES=['','普通','稀有','传说'],RARITY_COLORS=['','#aaa','#ab47bc','#ffd700'];
const EQUIPMENT_DROPS={boss:['phage_lance','lymph_armor','stem_talisman','perforin_sword'],staphLarge:['complement_blade','complement_shield','memory_amulet','defensin_spear','mucin_armor','tlr_medal'],strep:['ab_sword','membrane_vest','cytokine_ring','lysozyme_blade','collagen_mail','chemokine_charm']};
function findEquip(id){return EQUIPMENT_DB.find(e=>e.id===id);}
function getEquipStat(s){let t=0;for(const sl of['weapon','armor','accessory']){const e=findEquip(Game.equipment[sl]);if(e&&e.stats[s])t+=e.stats[s];}return t;}
function equipItem(eid){const e=findEquip(eid);if(!e)return false;const i=Game.inventory.indexOf(eid);if(i<0)return false;const o=Game.equipment[e.slot];if(o)Game.inventory.push(o);Game.equipment[e.slot]=eid;Game.inventory.splice(i,1);saveGame();Sfx.pickup();return true;}
function unequipItem(slot){const id=Game.equipment[slot];if(!id)return false;if(Game.inventory.length>=20){showToast('背包已满！');return false;}Game.inventory.push(id);Game.equipment[slot]=null;saveGame();return true;}

// ===== v3: 视差背景配置 =====
const PARALLAX_PRESETS = {
  default: {far:{color:'#2a1020',alpha:0.15,pattern:'dots'}, mid:{color:'#3e1828',alpha:0.25,pattern:'grid'}, near:{color:'#5a2030',alpha:0.2,pattern:'cells'}},
  vessel:  {far:{color:'#1a0a1a',alpha:0.15,pattern:'dots'}, mid:{color:'#3a1a3a',alpha:0.3,pattern:'flow'}, near:{color:'#5a0a2a',alpha:0.2,pattern:'cells'}},
  alveoli: {far:{color:'#0a1a2a',alpha:0.15,pattern:'dots'}, mid:{color:'#1a3a5a',alpha:0.25,pattern:'bubbles'}, near:{color:'#2a4a6a',alpha:0.2,pattern:'cells'}},
  boss:    {far:{color:'#2a0a0a',alpha:0.2,pattern:'dots'}, mid:{color:'#4a0a0a',alpha:0.3,pattern:'grid'}, near:{color:'#6a0a0a',alpha:0.25,pattern:'cells'}},
  lymph:   {far:{color:'#0a0a1a',alpha:0.15,pattern:'dots'}, mid:{color:'#1a1a3a',alpha:0.25,pattern:'grid'}, near:{color:'#2a2a5a',alpha:0.2,pattern:'cells'}},
};
function getParallaxPreset(levelIndex){
  if(levelIndex === 0) return PARALLAX_PRESETS.default; // Level 1
  if(levelIndex === 1) return PARALLAX_PRESETS.vessel;  // Level 2
  if(levelIndex === 2) return PARALLAX_PRESETS.alveoli; // Level 3
  if(levelIndex === 3) return PARALLAX_PRESETS.vessel;  // Level 4
  if(levelIndex === 4) return PARALLAX_PRESETS.lymph;   // Level 5
  if(levelIndex === 5) return PARALLAX_PRESETS.boss;    // Level 6
  return PARALLAX_PRESETS.default;
}

// ===== 速通 =====
const SPEEDRUN_KEY = 'cellQuest_bestTime_1';

// ===== 自定义关卡系统 =====
const CUSTOM_LEVEL_ICONS = [
  { id:'🗺️', label:'地图' }, { id:'⚔️', label:'战斗' }, { id:'🧪', label:'实验' },
  { id:'🦠', label:'细菌' }, { id:'🧬', label:'DNA' }, { id:'💉', label:'注射' },
  { id:'🩸', label:'血液' }, { id:'🫁', label:'肺部' }, { id:'❤️', label:'心脏' },
  { id:'🧠', label:'大脑' }, { id:'🦴', label:'骨骼' }, { id:'💪', label:'肌肉' },
  { id:'🔬', label:'显微镜' }, { id:'⭐', label:'星星' }, { id:'🎮', label:'游戏' },
  { id:'🏆', label:'奖杯' }, { id:'🎯', label:'靶心' }, { id:'💎', label:'钻石' },
];

function loadCustomLevels(){
  try{
    const raw = localStorage.getItem(customLevelKey(Game.currentSlot));
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return [];
}
function saveCustomLevels(levels){
  try{ localStorage.setItem(customLevelKey(Game.currentSlot), JSON.stringify(levels)); }catch(e){}
}
function addCustomLevel(levelData, icon){
  const levels = loadCustomLevels();
  levelData.icon = icon || '🗺️';
  levelData.createdAt = Date.now();
  levels.push(levelData);
  saveCustomLevels(levels);
  return levels.length - 1;
}
function deleteCustomLevel(idx){
  const levels = loadCustomLevels();
  levels.splice(idx, 1);
  saveCustomLevels(levels);
}
function updateCustomLevel(idx, levelData){
  const levels = loadCustomLevels();
  if(idx >= 0 && idx < levels.length){
    levelData.icon = levelData.icon || levels[idx].icon || '🗺️';
    levelData.createdAt = levels[idx].createdAt || Date.now();
    levels[idx] = levelData;
    saveCustomLevels(levels);
  }
}
function setCustomLevelIcon(idx, icon){
  const levels = loadCustomLevels();
  if(idx >= 0 && idx < levels.length){
    levels[idx].icon = icon;
    saveCustomLevels(levels);
  }
}


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
  salmonella:'#b7d40a', salmonellaDark:'#7a8c06',
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
  // ? 方块
  qBlock:'#ffd700', qBlockEmpty:'#6a5a30',
  // 隐藏墙
  hiddenWall:'#3a2a4a', hiddenWallHint:'#5a4a6a',
  // 终点门
  gateLocked:'#8b6914', gateOpen:'#ffd700', gateGlow:'rgba(255,215,0,0.4)',
  // 碎裂平台
  crumble:'#8a6a3a', crumbleTop:'#aa8a4a', crumbleShake:'#ffaa44',
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

// ===== 关卡配置（动态生成，含自定义关卡）=====
// 注意：使用 buildLevelConfigs() 获取完整列表（定义在 levels.js）
// 旧的 LEVEL_CONFIGS 常量已由 buildLevelConfigs() 替代


// Game 全局状态对象已移至 config-game.js
const KNOWLEDGE_CARDS = {
  1: {title:'血液循环', text:'人体血管总长约10万公里,可绕地球2.5圈。红细胞在其中的平均寿命为120天,每秒约有200万个红细胞被替换。心脏每天跳动约10万次,泵送约7600升血液。'},
  2: {title:'白细胞与先天免疫', text:'白细胞(中性粒细胞)是最先到达感染部位的免疫细胞,占白细胞总数的50-70%。它们通过趋化作用感知细菌释放的化学信号,在几分钟内就能到达战场。'},
  3: {title:'肺泡与气体交换', text:'成人肺泡总面积约70-100平方米,相当于半个网球场。气体交换仅需0.3秒,二氧化碳和氧气通过扩散穿过仅0.5微米厚的肺泡膜。'},
  4: {title:'循环系统与失血', text:'人体失血超过30%(约1.5L)会导致失血性休克。血小板在血管受损时迅速聚集,释放凝血因子形成血栓。正常凝血时间约2-8分钟。'},
  5: {title:'淋巴结与适应性免疫', text:'淋巴结是免疫细胞的"训练营"。T细胞和B细胞在此学习识别特定病原体。一次感染后产生的记忆细胞可在体内存活数十年,这就是疫苗起效的原理。'},
  6: {title:'败血症', text:'败血症是感染引起的全身炎症反应综合征,全球每年约4900万人受影响,其中1100万人死亡。早期识别黄金1小时:抗生素+液体复苏可大幅提高存活率。'},
};
const ATP_KNOWLEDGE = {title:'ATP——生命的能量货币', text:'三磷酸腺苷(ATP)是所有细胞通用的能量分子。线粒体通过氧化磷酸化将食物中的化学能转化为ATP。每个细胞每天消耗约1000万个ATP分子。当一个ATP的磷酸键断裂时释放约30.5kJ/mol的能量,驱动肌肉收缩、细胞分裂等一切生命活动。'};

// ===== v3: 记忆细胞永久加成系统 =====
const MEMORY_BONUS_TIERS = [
  { count:1,  name:'初次免疫应答',    desc:'初始能量 +10',     bonus:{startEnergy:10} },
  { count:3,  name:'免疫记忆形成',    desc:'移动速度 +5%',     bonus:{speedPct:5} },
  { count:5,  name:'抗体亲和力成熟',  desc:'最大生命 +10',     bonus:{maxHp:10} },
  { count:8,  name:'二次免疫应答',    desc:'挥剑伤害 +1',      bonus:{swordDmg:1} },
  { count:12, name:'记忆持久性',      desc:'重生保留 50% 能量', bonus:{deathEnergyKeep:50} },
  { count:99, name:'终身免疫',        desc:'开局自带 1 护盾',   bonus:{startShield:1} }, // 99=全收集
];

function getMemoryBonus(count){
  let bonus = {startEnergy:0, speedPct:0, maxHp:0, swordDmg:0, deathEnergyKeep:0, startShield:0};
  for(const t of MEMORY_BONUS_TIERS){
    if(count >= t.count){
      for(const [k,v] of Object.entries(t.bonus)){
        bonus[k] += v;
      }
    }
  }
  return bonus;
}

function getTotalMemoryCells(){
  // 内置关卡每关1个记忆细胞
  return Math.min(_BUILTIN_LEVELS.length, 6);
}

function getLastUnlockedTier(count){
  for(let i = MEMORY_BONUS_TIERS.length-1; i >= 0; i--){
    if(count >= MEMORY_BONUS_TIERS[i].count) return MEMORY_BONUS_TIERS[i];
  }
  return null;
}

function collectMemoryCell(levelIndex){
  // 检查是否已在本关收集过
  if(Game.memoryCellsCollected[levelIndex]) return false;

  Game.memoryCellsCollected[levelIndex] = true;
  Game.memoryCells++;

  const oldBonus = getMemoryBonus(Game.memoryCells - 1);
  const newBonus = getMemoryBonus(Game.memoryCells);
  const tier = getLastUnlockedTier(Game.memoryCells);

  // 有新增益时才提示
  if(tier && JSON.stringify(oldBonus) !== JSON.stringify(newBonus)){
    showToast('🧬 ' + tier.name + '！\n' + tier.desc + '\n(已收集 ' + Game.memoryCells + ' 个记忆细胞)');
    spawnParticles(Game.player.x+Game.player.w/2, Game.player.y+Game.player.h/2, '#ce93d8', 25, 3);
  } else {
    showToast('🧬 发现记忆细胞！\n(已收集 ' + Game.memoryCells + ' 个记忆细胞)');
  }

  Game.stats.foundMemory = true;
  saveGame();
  return true;
}

// ===== v3: 关卡分享系统 =====
function exportLevelCode(idx){
  const configs = buildLevelConfigs();
  if(idx < 0 || idx >= configs.length) return null;
  const cfg = configs[idx];
  if(!cfg._isCustom) return null;
  const mapData = LEVEL_MAPS[idx];
  if(!mapData || !mapData.map) return null;
  const pack = { n:cfg.name||'', c:cfg.cellType||3, w:cfg.winCondition||WIN_COLLECT_ALL, m:mapData.map, s:mapData.sky||['#2a1020','#5a1a3a'] };
  const json = JSON.stringify(pack);
  // 简单压缩: 用 Base64 编码后去掉 =
  return 'CQ!' + btoa(unescape(encodeURIComponent(json))).replace(/=+$/,'');
}

const MAX_SHARED_LEVEL_CODE = 200_000;
const MAX_SHARED_LEVEL_ROWS = 30;
const MAX_SHARED_LEVEL_WIDTH = 200;
const SHARED_LEVEL_TILES = /^[ #=po?FPCgGtbBS^VJHDOnfda*MXN_]*$/;
const SHARED_LEVEL_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function importLevelCode(code){
  if(typeof code !== 'string' || !code.startsWith('CQ!')){
    return { error: '无效的关卡代码' };
  }
  if(code.length > MAX_SHARED_LEVEL_CODE){
    return { error: '关卡代码过大' };
  }

  try{
    let encoded = code.substring(3);
    if(!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1){
      return { error: '关卡代码编码无效' };
    }
    encoded += '='.repeat((4 - encoded.length % 4) % 4);
    const json = decodeURIComponent(escape(atob(encoded)));
    const pack = JSON.parse(json);
    if(!pack || typeof pack !== 'object' || Array.isArray(pack)){
      return { error: '关卡代码格式错误' };
    }
    if(typeof pack.n !== 'string' || !pack.n.trim() || pack.n.length > 100){
      return { error: '关卡名称无效' };
    }
    if(!Array.isArray(pack.m) || pack.m.length < 3 || pack.m.length > MAX_SHARED_LEVEL_ROWS){
      return { error: '关卡地图行数无效' };
    }
    if(pack.m.some(row =>
      typeof row !== 'string' ||
      row.length > MAX_SHARED_LEVEL_WIDTH ||
      !SHARED_LEVEL_TILES.test(row)
    )){
      return { error: '关卡地图包含无效瓦片或宽度' };
    }

    const cellType = pack.c == null ? 3 : pack.c;
    if(cellType !== 1 && cellType !== 3){
      return { error: '细胞类型无效' };
    }
    const winCondition = pack.w == null ? WIN_COLLECT_ALL : pack.w;
    if(winCondition !== WIN_KILL_ALL && winCondition !== WIN_COLLECT_ALL){
      return { error: '胜利条件无效' };
    }

    const sky = pack.s == null ? ['#2a1020', '#5a1a3a'] : pack.s;
    if(
      !Array.isArray(sky) ||
      sky.length !== 2 ||
      sky.some(color => typeof color !== 'string' || !SHARED_LEVEL_COLOR.test(color))
    ){
      return { error: '天空颜色无效' };
    }

    const width = Math.max(80, ...pack.m.map(row => row.length));
    const levelData = {
      name: pack.n.trim().substring(0, 20),
      cellType,
      winCondition,
      sky: [...sky],
      map: pack.m.map(row => row.padEnd(width, ' ')),
      width,
      floatPlatforms: [],
      miniSpawnArea: null,
      pipeSpawners: [],
      knowledgeCards: [],
      tutorials: [],
    };
    return levelData;
  }catch(error){
    return { error: '解析失败: ' + error.message };
  }
}

// ===== v3: AI 自适应难度系统 =====
const ADAPTIVE_DIFFICULTY = {
  easy:   { name:'🌱 萌新',   enemyMult:0.7, itemMult:1.3, tideMult:0.7, damageAdj:-1, energyBonus:0 },
  normal: { name:'⚔️ 标准',   enemyMult:1.0, itemMult:1.0, tideMult:1.0, damageAdj:0,  energyBonus:0 },
  hard:   { name:'💀 困难',   enemyMult:1.2, itemMult:0.8, tideMult:1.15,damageAdj:1,  energyBonus:-5 },
  extreme:{ name:'🔥 极限',   enemyMult:1.3, itemMult:0.7, tideMult:1.3, damageAdj:2,  energyBonus:-10 },
};

function getAdaptiveLevel(){
  const d = Game.adaptiveDifficulty;
  if(d.clearStreak >= 5 && d.recentDeaths === 0) return 'extreme';
  if(d.clearStreak >= 3 && d.recentDeaths <= 1) return 'hard';
  if(d.recentDeaths >= 5) return 'easy';
  if(d.recentDeaths >= 3 && d.clearStreak <= 1) return 'easy';
  // 分析通关质量
  if(d.recentClears.length >= 3){
    const avgTime = d.recentClears.reduce((a,c)=>a+c.time,0)/d.recentClears.length;
    const avgATP = d.recentClears.reduce((a,c)=>a+c.atpPct,0)/d.recentClears.length;
    if(avgTime < 60000 && avgATP > 70) return 'hard';   // <1分钟 + 高ATP → 困难
    if(avgTime > 180000 || avgATP < 30) return 'easy';   // >3分钟 或 低ATP → 简单
  }
  return 'normal';
}

function updateAdaptiveDifficulty(cleared, deathCount, clearTime, atpPct){
  const d = Game.adaptiveDifficulty;
  if(deathCount > 0){
    d.recentDeaths += deathCount;
    d.clearStreak = 0;
  }
  if(cleared){
    d.recentClears.push({time:clearTime||0, atpPct:atpPct||0});
    if(d.recentClears.length > 5) d.recentClears.shift();
    if(deathCount === 0) d.clearStreak++;
    else d.clearStreak = 0;
  }
  // 每完成一次关卡，衰减一次死亡记录（避免永远卡在easy）
  if(cleared && d.recentDeaths > 0) d.recentDeaths = Math.max(0, d.recentDeaths - 1);

  const newLevel = getAdaptiveLevel();
  d.level = newLevel;
  const cfg = ADAPTIVE_DIFFICULTY[newLevel];
  d.adjustEnemies = Math.round(cfg.enemyMult * 100 - 100);
  d.adjustItems = Math.round(cfg.itemMult * 100 - 100);
  d.adjustTide = Math.round(cfg.tideMult * 100 - 100);
  d.adjustDamage = cfg.damageAdj;
  // 调整初始能量
  Game.globalEnergy = Math.min(getMaxEnergy(), Math.max(20, MAX_ENERGY + cfg.energyBonus));

  // 持久化
  try{
    localStorage.setItem(adaptiveKey(Game.currentSlot), JSON.stringify({
      recentDeaths:d.recentDeaths, recentClears:d.recentClears, clearStreak:d.clearStreak, level:d.level
    }));
  }catch(e){}
}

function loadAdaptiveDifficulty(){
  try{
    const raw = localStorage.getItem(adaptiveKey(Game.currentSlot));
    if(raw){
      const d = JSON.parse(raw);
      Game.adaptiveDifficulty.recentDeaths = d.recentDeaths || 0;
      Game.adaptiveDifficulty.recentClears = d.recentClears || [];
      Game.adaptiveDifficulty.clearStreak = d.clearStreak || 0;
      const lvl = getAdaptiveLevel();
      Game.adaptiveDifficulty.level = lvl;
      const cfg = ADAPTIVE_DIFFICULTY[lvl];
      Game.adaptiveDifficulty.adjustEnemies = Math.round(cfg.enemyMult * 100 - 100);
      Game.adaptiveDifficulty.adjustItems = Math.round(cfg.itemMult * 100 - 100);
      Game.adaptiveDifficulty.adjustTide = Math.round(cfg.tideMult * 100 - 100);
      Game.adaptiveDifficulty.adjustDamage = cfg.damageAdj;
    }
  }catch(e){}
}

// ===== 存档系统 =====
// ===== v3: 成就系统 =====
const ACHIEVEMENTS = [
  {id:'first_clear', name:'免疫先锋', desc:'首次通关任意关卡', icon:'🛡️', check:()=>Game.completed.some(Boolean)},
  {id:'no_hit', name:'无伤战神', desc:'通关时零受伤', icon:'⭐', check:()=>Game._justCleared && Game.stats.deaths===0},
  {id:'speedrun', name:'速通达人', desc:'通关时间 < 60秒', icon:'⚡', check:()=>Game._justCleared && Game.levelTime<60000},
  {id:'energy_master', name:'能量管理专家', desc:'通关时ATP > 80', icon:'🔋', check:()=>Game._justCleared && Game.globalEnergy>80},
  {id:'perfect_clear', name:'完美清除', desc:'100%完成度通关', icon:'💯', check:()=>Game._justCleared && Game._lastCompletionPct>=1},
  {id:'kills_50', name:'百人斩', desc:'累计击杀50个敌人', icon:'💀', check:()=>Game._lifetimeKills>=50},
  {id:'no_death', name:'不死传说', desc:'0死亡通关任意3关', icon:'👑', check:()=>{if(!Game._justCleared)return false; let c=0; for(let i=0;i<Game.stars.length;i++){if(Game.completed[i]&&Game.stars[i]>=2)c++;} return c>=3;}},
  {id:'collector', name:'收藏家', desc:'收集3个记忆细胞', icon:'🧬', check:()=>Game.memoryCells>=3},
  {id:'level5', name:'终极免疫', desc:'通关第5关(Boss)', icon:'☠️', check:()=>Game.completed[5]},
  {id:'all_stars', name:'星光熠熠', desc:'累计获得10颗星', icon:'🌟', check:()=>(Game.stars||[]).reduce((a,b)=>a+b,0)>=10},
  {id:'sprinter', name:'奔跑吧细胞', desc:'使用奔跑模式跑过1000像素', icon:'🏃', check:()=>Game._sprintDistance>=1000},
  {id:'custom_creator', name:'关卡设计师', desc:'创建1个自定义关卡', icon:'🎨', check:()=>loadCustomLevels().length>0},
];

function loadAchievements(){
  try{
    const raw = localStorage.getItem('cellQuest_achievements');
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return {};
}
function saveAchievements(achs){ try{ localStorage.setItem('cellQuest_achievements', JSON.stringify(achs)); }catch(e){} }

function checkAchievements(){
  let achs = loadAchievements();
  let changed = false;
  for(const a of ACHIEVEMENTS){
    if(!achs[a.id] && a.check()){
      achs[a.id] = Date.now();
      changed = true;
      showToast('🏆 成就解锁: ' + a.icon + ' ' + a.name + '\n' + a.desc);
    }
  }
  if(changed) saveAchievements(achs);
}

// ===== v3: 本地排行榜系统 =====
const LB_MAX_ENTRIES = 5;

function lbKey(slot){ return 'cellQuest_leaderboard_' + slot; }

function loadLeaderboard(){
  try{
    const raw = localStorage.getItem(lbKey(Game.currentSlot));
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return {};
}

function saveLeaderboard(lb){
  try{ localStorage.setItem(lbKey(Game.currentSlot), JSON.stringify(lb)); }catch(e){}
}

function recordLevelScore(levelIndex, time, completionPct, deaths, playerLevel){
  const lb = loadLeaderboard();
  const key = 'level_' + levelIndex;
  if(!lb[key]) lb[key] = [];

  const entry = {
    name: Game.playerName || '无名细胞',
    time: time,                    // ms
    completionPct: completionPct,  // 0-1
    deaths: deaths,
    playerLevel: playerLevel,
    date: Date.now(),
  };

  lb[key].push(entry);
  // 按 完成度降序 → 时间升序 排名，取前5
  lb[key].sort((a,b) => b.completionPct - a.completionPct || a.time - b.time);
  lb[key] = lb[key].slice(0, LB_MAX_ENTRIES);

  saveLeaderboard(lb);
  return lb[key].indexOf(entry) + 1; // 返回排名(1-based)
}

function getLevelRanking(levelIndex){
  const lb = loadLeaderboard();
  return lb['level_' + levelIndex] || [];
}

function getTotalStarsRanking(){
  // 综合排行：按总星星 + 总通关数
  const lb = loadLeaderboard();
  // 当前存档的综合数据
  const totalStars = (Game.stars||[]).reduce((a,b)=>a+b,0);
  const totalCompleted = (Game.completed||[]).filter(Boolean).length;
  return { totalStars, totalCompleted, playerLevel: Game.playerLevel };
}

// ===== v3: 5存档栏位系统 =====
const MAX_SLOTS = 5;

function saveKey(slot){ return 'cellQuest_save_' + slot; }
function customLevelKey(slot){ return 'cellQuest_customLevels_' + slot; }
function adaptiveKey(slot){ return 'cellQuest_adaptive_' + slot; }

function saveGame(slot){
  const s = slot != null ? slot : Game.currentSlot;
  try{
    localStorage.setItem(saveKey(s), JSON.stringify({
      unlocked:Game.unlocked, completed:Game.completed, stars:Game.stars,
      globalEnergy:Game.globalEnergy,
      playerLevel:Game.playerLevel,xp:Game.xp,skillPoints:Game.skillPoints,
      skills:Game.skills,equipment:Game.equipment,inventory:Game.inventory,
      memoryCells:Game.memoryCells, memoryCellsCollected:Game.memoryCellsCollected,
      playerName:Game.playerName,
      lifetimeKills:Game._lifetimeKills, sprintDistance:Game._sprintDistance,
      saveVersion:3, lastSaved: Date.now(),
    }));
    localStorage.setItem('cellQuest_currentSlot', String(s));
  }catch(e){}
}

function loadGame(slot){
  const s = slot != null ? slot : Game.currentSlot;
  try{
    const raw = localStorage.getItem(saveKey(s));
    if(raw){
      const d = JSON.parse(raw);
      Game.unlocked = d.unlocked || [];
      Game.completed = d.completed || [];
      Game.stars = d.stars || [];
      Game.globalEnergy = d.globalEnergy != null ? d.globalEnergy : 100;
      Game.playerLevel = d.playerLevel || 1;
      Game.xp = d.xp || 0; Game.skillPoints = d.skillPoints || 0;
      Game.skills = d.skills || {wbc:{damagePlus:0,dashCooldown:0,swordRange:0,slamRadius:0},plt:{bridgeCost:0,bridgeDuration:0,shieldDuration:0,healOnBridge:0},rbc:{energyDrain:0,oxyFieldPower:0,maxEnergy:0,nutritionBonus:0}};
      Game.equipment = d.equipment || {weapon:null,armor:null,accessory:null};
      Game.inventory = d.inventory || [];
      Game.memoryCells = d.memoryCells || 0;
      Game.memoryCellsCollected = d.memoryCellsCollected || {};
      Game.playerName = d.playerName || '';
      Game._lifetimeKills = d.lifetimeKills || 0; Game._sprintDistance = d.sprintDistance || 0;
      // 扩容关卡数组
      const total = buildLevelConfigs().length;
      while(Game.unlocked.length < total) Game.unlocked.push(false);
      while(Game.completed.length < total) Game.completed.push(false);
      while(Game.stars.length < total) Game.stars.push(0);
      // 全部关卡默认解锁（已移除顺序通关解锁限制）
      for(let i = 0; i < Game.unlocked.length; i++) Game.unlocked[i] = true;
      return true; // 读取成功
    }
  }catch(e){}
  // 空存档: 重置为新游戏状态
  Game.unlocked = [true]; Game.completed = []; Game.stars = [];
  Game.globalEnergy = 100; Game.playerLevel = 1; Game.xp = 0; Game.skillPoints = 0;
  Game.skills = {wbc:{damagePlus:0,dashCooldown:0,swordRange:0,slamRadius:0},plt:{bridgeCost:0,bridgeDuration:0,shieldDuration:0,healOnBridge:0},rbc:{energyDrain:0,oxyFieldPower:0,maxEnergy:0,nutritionBonus:0}};
  Game.equipment = {weapon:null,armor:null,accessory:null}; Game.inventory = [];
  Game.memoryCells = 0; Game.memoryCellsCollected = {}; Game.playerName = '';
  Game._lifetimeKills = 0; Game._sprintDistance = 0;
  Game.adaptiveDifficulty = {level:'normal',recentDeaths:0,recentClears:[],clearStreak:0,adjustEnemies:0,adjustItems:0,adjustTide:0,adjustDamage:0};
  const total = buildLevelConfigs().length;
  while(Game.unlocked.length < total) Game.unlocked.push(false);
  while(Game.completed.length < total) Game.completed.push(false);
  while(Game.stars.length < total) Game.stars.push(0);
  Game.unlocked[0] = true;
  return false;
}

function getSlotInfo(slot){
  try{
    const raw = localStorage.getItem(saveKey(slot));
    if(raw){
      const d = JSON.parse(raw);
      const completedCount = (d.completed||[]).filter(Boolean).length;
      const totalStars = (d.stars||[]).reduce((a,b)=>a+b,0);
      const date = d.lastSaved ? new Date(d.lastSaved) : null;
      const dateStr = date ? (date.getMonth()+1)+'/'+date.getDate()+' '+date.getHours()+':'+String(date.getMinutes()).padStart(2,'0') : '空';
      return {
        exists: true, name: '存档 ' + (slot+1),
        completed: completedCount, stars: totalStars,
        level: d.playerLevel || 1, date: dateStr,
        memoryCells: d.memoryCells || 0,
        playerName: d.playerName || '',
      };
    }
  }catch(e){}
  return { exists: false, name: '空存档', completed: 0, stars: 0, level: 1, date: '--', memoryCells: 0, playerName: '' };
}

function switchSlot(slot){
  if(slot === Game.currentSlot) return;
  saveGame(); // 先保存当前
  Game.currentSlot = slot;
  localStorage.setItem('cellQuest_currentSlot', String(slot));
  loadGame(slot);
  loadAdaptiveDifficulty();
  refreshCustomLevels(); // 重新加载该栏位的自定义关卡
}

function resetSlot(slot){
  try{
    localStorage.removeItem(saveKey(slot));
    localStorage.removeItem(customLevelKey(slot));
    localStorage.removeItem(adaptiveKey(slot));
    if(slot === Game.currentSlot){
      // 重置当前栏位
      Game.unlocked = [true]; Game.completed = []; Game.stars = [];
      Game.globalEnergy = 100; Game.playerLevel = 1; Game.xp = 0; Game.skillPoints = 0;
      Game.skills = {wbc:{damagePlus:0,dashCooldown:0,swordRange:0,slamRadius:0},plt:{bridgeCost:0,bridgeDuration:0,shieldDuration:0,healOnBridge:0},rbc:{energyDrain:0,oxyFieldPower:0,maxEnergy:0,nutritionBonus:0}};
      Game.equipment = {weapon:null,armor:null,accessory:null}; Game.inventory = [];
      Game.memoryCells = 0; Game.memoryCellsCollected = {};
      Game.adaptiveDifficulty = {level:'normal',recentDeaths:0,recentClears:[],clearStreak:0,adjustEnemies:0,adjustItems:0,adjustTide:0,adjustDamage:0};
      const total = buildLevelConfigs().length;
      while(Game.unlocked.length < total) Game.unlocked.push(false);
      while(Game.completed.length < total) Game.completed.push(false);
      while(Game.stars.length < total) Game.stars.push(0);
      // 全部关卡默认解锁（已移除顺序通关解锁限制）
      for(let i = 0; i < Game.unlocked.length; i++) Game.unlocked[i] = true;
      saveGame();
      refreshCustomLevels();
    }
    return true;
  }catch(e){ return false; }
}

// 迁移旧版单存档 → 多栏位（首次启动时自动执行）
function customLevelMigrationIdentity(level){
  if(!level || typeof level !== 'object') return JSON.stringify(level);
  return JSON.stringify([
    level.name || '',
    level.cellType || 3,
    level.winCondition || '',
    Array.isArray(level.map) ? level.map : [],
  ]);
}

function migrateLegacyCustomLevels(){
  const legacyRaw = localStorage.getItem('cellQuest_customLevels');
  if(!legacyRaw) return;
  const legacy = JSON.parse(legacyRaw);
  if(!Array.isArray(legacy)) return;
  const targetKey = customLevelKey(0);
  const currentRaw = localStorage.getItem(targetKey);
  const current = currentRaw ? JSON.parse(currentRaw) : [];
  if(!Array.isArray(current)) return;
  const merged = [...current];
  const identities = new Set(current.map(customLevelMigrationIdentity));
  for(const level of legacy){
    const identity = customLevelMigrationIdentity(level);
    if(identities.has(identity)) continue;
    identities.add(identity);
    merged.push(level);
  }
  localStorage.setItem(targetKey, JSON.stringify(merged));
  localStorage.removeItem('cellQuest_customLevels');
}

// 迁移旧版单存档 → 多栏位（首次启动时自动执行）
function migrateOldSave(){
  try{
    const old = localStorage.getItem('cellQuest_save');
    if(old && !localStorage.getItem(saveKey(0))){
      localStorage.setItem(saveKey(0), old);
      localStorage.removeItem('cellQuest_save');
    }
    migrateLegacyCustomLevels();
    const oldAdaptive = localStorage.getItem('cellQuest_adaptive');
    if(oldAdaptive && !localStorage.getItem(adaptiveKey(0))){
      localStorage.setItem(adaptiveKey(0), oldAdaptive);
      localStorage.removeItem('cellQuest_adaptive');
    }
  }catch(error){
    console.warn('Legacy save migration failed', error);
  }
}
// Sfx 音频系统已移至 config-game.js
