/* ====================================================================
 * config-constants.js — 游戏常量（物理、技能、敌人、Boss、ATP、瓦片）
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
