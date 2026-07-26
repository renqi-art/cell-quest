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

// ===== 碎裂平台（踩踏后崩解，Cat Mario 式陷阱）=====
const CRUMBLE_SHAKE_FRAMES = 45;  // 0.75 秒抖动预警
const CRUMBLE_RESPAWN_FRAMES = 240; // 4 秒后重生

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
const BLEEDING_DRAIN = 0.02;        // 出血期每帧扣能量（已放慢）
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

// ===== 道具能量（v2: ATP 统一能源，以下均废弃改为 0）=====
const COIN_ENERGY   = 0;   // 金币不再提供能量
const FOOD_ENERGY   = 0;   // 食物不再提供能量
const DRINK_ENERGY  = 0;   // 饮料不再提供能量
const NUTRITION_ENERGY = 0; // 营养包不再提供能量（仅作收集计数）

// ===== ATP 能源系统 =====
const PASSIVE_DRAIN = 0.005;   // 基础代谢消耗/帧（已放慢，能量可在正常游玩时长内维持）
const RBC_OXY_REGEN = 0.06;    // RBC 氧气领域回能/帧
const KILL_ATP_SMALL = 15;     // 普通敌人击杀 +ATP
const KILL_ATP_LARGE = 30;     // 大型敌人击杀 +ATP
const KILL_ATP_BOSS  = 100;    // Boss 击杀 +ATP
const QBLOCK_ATP     = 15;     // ? 方块掉落 ATP
const ATP_PICKUP     = 20;     // ATP 拾取物

// ===== 关卡细胞锁定 & 通关条件 =====
const WIN_KILL_ALL = 'killAll';
const WIN_COLLECT_ALL = 'collectAll';

// ===== ? 方块 =====
const QBLOCK_BOUNCE_FRAMES = 12;
const QBLOCK_BOUNCE_AMT = 8;

// ===== Boss =====
const BOSS_HP    = 10;
const BOSS_W     = 72;
const BOSS_H     = 56;
const BOSS_CONTACT_DAMAGE = 1;
// Boss 技能冷却 (帧, 60fps)
const BOSS_CD_SHIELD     = 1200; // 技能一 血盾 20s
const BOSS_CD_RING       = 1080; // 技能二 溶血环 18s
const BOSS_CD_LEUKOCIDIN = 1440; // 技能三 杀白细胞素 24s
const BOSS_CD_SPAWN      = 2700; // 技能四 增殖 45s（降低频率）
const BOSS_CD_SHOCK      = 2700; // 技能五 毒休克 45s
const BOSS_SHIELD_PCT    = 0.15; // 血盾血量比例
const BOSS_BIOFILM_HP_PCT = 0.4; // 生物膜触发血量%
const BOSS_RING_SPEED    = 3;    // 溶血环扩散速度 px/frame
const BOSS_RING_MAX_R    = 200;  // 溶血环最大半径

// ===== 白细胞挥剑 =====
const SWORD_RANGE    = 70;   // 攻击范围(px)
const SWORD_DAMAGE   = 2;    // 对敌人/Boss伤害
const SWORD_COST     = 5;    // 能量消耗
const SWORD_COOLDOWN = 25;   // 冷却帧数
const SWORD_DURATION = 12;   // 挥剑动画帧数

// ===== 白细胞基础属性（用于新技能伤害计算）=====
const WBC_BASE_ATK = 5;     // 基础攻击力（可被装备加成）
const METER = 32;           // 1米 = 32像素（接近 1 tile）

// ===== 技能一：吞噬撕咬 (Phagocytic Bite) =====
const BITE_RANGE        = 80;    // 单体锁定范围 2.5米
const BITE_COST         = 0;     // 无能量消耗
const BITE_COOLDOWN     = 360;   // 6秒 @ 60fps
const BITE_MULT         = 2.0;   // 伤害倍率 攻击力×200%
const BITE_EXECUTE_PCT  = 0.30;  // 血量<30%触发斩杀
const BITE_EXECUTE_MULT = 3.0;  // 斩杀倍率 总×600%
const BITE_HEAL_PCT     = 0.25;  // 击杀回血 25%最大生命

// ===== 技能二：活性氧喷吐 (Oxidative Burst Spit) =====
const SPIT_RANGE_DEG = 60;       // 60°扇形
const SPIT_RANGE_M   = 5;        // 5米射程
const SPIT_COST      = 8;        // 能量消耗
const SPIT_COOLDOWN  = 480;      // 8秒
const SPIT_MULT      = 1.2;      // 即时伤害 攻击力×120%
const SPIT_DOT_MULT  = 0.15;    // 每秒15% (×60帧/秒)
const SPIT_DOT_DUR   = 300;      // 5秒
const SPIT_DEF_DEBUFF = 0.10;    // 防御降低10%

// ===== 技能三：弹性蛋白酶贯枪 (Elastase Lance) =====
const LANCE_RANGE_M   = 8;      // 8米射程
const LANCE_WIDTH_M   = 2;      // 2米宽度
const LANCE_COST      = 10;     // 能量消耗
const LANCE_COOLDOWN  = 600;    // 10秒
const LANCE_MULT      = 1.5;    // 攻击力×150%
const LANCE_DEF_PEN   = 0.20;   // 破甲20%
const LANCE_DEF_DUR   = 360;    // 6秒
const LANCE_BONUS_MULT = 1.5;   // 对生物膜/血盾额外×50%

// ===== 技能四：杀菌渗透·瞬突 (Bactericidal Permeability Dash) =====
const PDASH_RANGE_M   = 5;      // 冲刺5米
const PDASH_SHOCK_R   = 96;     // 冲击波半径 3米
const PDASH_COST      = 12;     // 能量消耗
const PDASH_COOLDOWN  = 840;    // 14秒
const PDASH_CHARGES   = 2;      // 2层充能
const PDASH_MULT      = 1.3;    // 攻击力×130%
const PDASH_KNOCKBACK = 64;     // 击退2米
const PDASH_INVUL     = 30;     // 0.5秒不可选中

// ===== XP 经验与等级 =====
const XP_BASE=100,XP_GROWTH=1.5,MAX_LEVEL=30,SKILL_POINTS_PER_LEVEL=1;
const XP_PER_KILL={staph:10,staphLarge:30,staphMini:5,strep:20,boss:200,salmonella:15};
function xpForLevel(lv){return Math.floor(XP_BASE*Math.pow(XP_GROWTH,lv-1));}

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
  party: [1, 3],             // 默认 [白细胞, 红细胞]
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

// ===== v3: 科普卡片 =====
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

  // ===== 分层音效系统（新增扩展，不影响 jump / doubleJump 等既有逻辑）=====
  muted: false,
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
