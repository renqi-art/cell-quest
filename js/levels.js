/* ====================================================================
 * levels.js — 关卡汇总入口（数据在 js/levels/ 目录下各文件中）
 * ==================================================================== */

// 内置关卡数据
const _BUILTIN_LEVELS = [LEVEL_0, LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5];

// 自定义关卡（从 localStorage 加载）
const _CUSTOM_LEVELS = loadCustomLevels();

// 合并所有关卡
const LEVEL_MAPS = [..._BUILTIN_LEVELS, ..._CUSTOM_LEVELS];

// ===== 关卡独立配置表 =====
const _BUILTIN_DEFS = [
  { id:0, name:'皮肤防线·擦伤',        bgMusic:'tutorial', enemies:[], mechanics:['collect','tutorial','pipe'], checkpoint:true },
  { id:1, name:'肠道危机·食物中毒(上)', bgMusic:'wound',    enemies:['staph','staphLarge','strep','boss'], mechanics:['sword','dash','stomp'], checkpoint:true },
  { id:2, name:'蠕虫侵袭·食物中毒(下)', bgMusic:'lung',     enemies:['strep'], mechanics:['crouch','floatPlatform','tide'], checkpoint:true },
  { id:3, name:'呼吸道烽火·流行性感冒', bgMusic:'vessel',   enemies:[], mechanics:['bloodLoss','tide','oxyField','collect','pipe'], checkpoint:true },
  { id:4, name:'组织溃烂·真菌感染',      bgMusic:'lymph',    enemies:['staph','staphLarge','strep'], mechanics:['sword','dash','stomp'], checkpoint:true },
  { id:5, name:'细胞畸变·癌细胞侵袭',    bgMusic:'boss',     enemies:['boss'], mechanics:['sword','dash','stomp','pipe'], checkpoint:true },
];

// 自定义关卡配置（从 localStorage 数据生成）
const _CUSTOM_DEFS = _CUSTOM_LEVELS.map((lvl, i) => ({
  id: 7 + i,
  name: lvl.name || '自定义关卡',
  icon: lvl.icon || '🗺️',
  bgMusic: 'tutorial',
  enemies: [],
  mechanics: [],
  checkpoint: false,
  _isCustom: true,
}));

// 合并所有配置
const LEVEL_DEFS = [..._BUILTIN_DEFS, ..._CUSTOM_DEFS];

// ===== LEVEL_CONFIGS 动态生成（给渲染用）=====
function buildLevelConfigs(){
  const configs = [
    { id:1, name:'皮肤防线·擦伤', icon:'🩹', cellType:3, winCondition:WIN_COLLECT_ALL,
      desc:'皮肤屏障·抵御外界擦伤感染', bg:[C.sky2,'#e8a0a0'] },
    { id:2, name:'肠道危机·食物中毒(上)', icon:'🦠', cellType:1, winCondition:WIN_KILL_ALL,
      desc:'肠道防线·清除入侵病菌', bg:[C.sky1,C.sky3] },
    { id:3, name:'蠕虫侵袭·食物中毒(下)', icon:'🪱', cellType:1, winCondition:WIN_KILL_ALL,
      desc:'蠕虫寄生·净化食物中毒', bg:['#1a2a3a','#3a6a8a'] },
    { id:4, name:'呼吸道烽火·流行性感冒', icon:'😷', cellType:3, winCondition:WIN_COLLECT_ALL,
      desc:'呼吸道战场·击退流感病毒', bg:['#2a0a1a','#5a1a3a'] },
    { id:5, name:'组织溃烂·真菌感染', icon:'🍄', cellType:1, winCondition:WIN_KILL_ALL,
      desc:'组织感染·剿灭真菌群落', bg:['#1a1a2a','#3a3a5a'], locked:true },
    { id:6, name:'细胞畸变·癌细胞侵袭', icon:'☣️', cellType:1, winCondition:WIN_KILL_ALL,
      desc:'终极危机·对抗癌细胞', bg:['#2a0a0a','#6a0a0a'], locked:true },
  ];
  for(let i=0; i<_CUSTOM_LEVELS.length; i++){
    const lvl = _CUSTOM_LEVELS[i];
    configs.push({
      id: 7 + i,
      name: lvl.name || '自定义关卡',
      icon: lvl.icon || '🗺️',
      cellType: lvl.cellType || 3,
      winCondition: lvl.winCondition || WIN_COLLECT_ALL,
      desc: lvl.desc || `由玩家创建的自定义关卡 #${i+1}`,
      bg: lvl.sky || [C.sky2, '#e8a0a0'],
      _isCustom: true,
    });
  }
  return configs;
}

// 记忆细胞科普卡片文本
const MEMORY_CARD = {
  title: '免疫记忆',
  text: '记忆细胞是免疫系统的"档案库"。\\n当身体首次遇到某种病原体后，\\n部分淋巴细胞会转化为记忆细胞。\\n下次再遇到同样的敌人时，\\n它们能迅速唤醒免疫系统，\\n以更快的速度和更大的规模消灭入侵者。\\n这就是疫苗起效的原理。',
};

// 刷新关卡数据（编辑器保存后调用）
function refreshCustomLevels(){
  const newLevels = loadCustomLevels();
  _CUSTOM_LEVELS.length = 0;
  _CUSTOM_LEVELS.push(...newLevels);
  // 同步更新 LEVEL_MAPS
  LEVEL_MAPS.length = _BUILTIN_LEVELS.length;
  LEVEL_MAPS.push(..._CUSTOM_LEVELS);
  // 同步更新 LEVEL_DEFS
  LEVEL_DEFS.length = _BUILTIN_DEFS.length;
  const newDefs = _CUSTOM_LEVELS.map((lvl, i) => ({
    id: 7 + i,
    name: lvl.name || '自定义关卡',
    icon: lvl.icon || '🗺️',
    bgMusic: 'tutorial',
    enemies: [],
    mechanics: [],
    checkpoint: false,
    _isCustom: true,
  }));
  LEVEL_DEFS.push(...newDefs);
  // 确保 Game 数组长度匹配（增加时填充，减少时裁剪）
  const total = LEVEL_MAPS.length;
  while(Game.unlocked.length < total) Game.unlocked.push(true);
  while(Game.completed.length < total) Game.completed.push(false);
  while(Game.stars.length < total) Game.stars.push(0);
  // 删除时裁剪多余项
  if(Game.unlocked.length > total) Game.unlocked.splice(total);
  if(Game.completed.length > total) Game.completed.splice(total);
  if(Game.stars.length > total) Game.stars.splice(total);
}
