/* ====================================================================
 * levels.js — 关卡汇总入口（数据在 js/levels/ 目录下各文件中）
 * ==================================================================== */

// 内置关卡数据。
// 第 5 关（LEVEL_5）为 Boss 关，其数据定义在 js/levels/level5_boss.js。
// 非 boss 版本不会加载该文件，因此这里对 LEVEL_5 做存在性守卫：
// 缺失时仅纳入前 5 关（0~4），既避免 ReferenceError 导致整个 init 崩溃，
// 也保证非 boss 版本不会出现 Boss 关入口。
const _BUILTIN_LEVELS = [LEVEL_0, LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4];
if (typeof LEVEL_5 !== 'undefined' && LEVEL_5) _BUILTIN_LEVELS.push(LEVEL_5);

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
];
if (typeof LEVEL_5 !== 'undefined' && LEVEL_5) {
  _BUILTIN_DEFS.push({ id:5, name:'细胞畸变·癌细胞侵袭', bgMusic:'boss', enemies:['boss'], mechanics:['sword','dash','stomp','pipe'], checkpoint:true });
}

// ===== 关卡开场剧情（玩家载入关卡后强制触发，不可跳过）=====
// 结构：每个关卡给出【树突状细胞】固定开场 + 三名可选角色各自一句回应。
// 实际对话 = 树突状细胞开场 + 玩家所选 2 名角色的回应，未选中的角色绝不出现。
// 角色键：wbc=白细胞, rbc=红细胞, plt=血小板
// 与 Game.levelIndex 一一对应：0=第1关，5=第6关
const LEVEL_INTRO_LINES = [
  { // 第1关 皮肤防线·擦伤
    dendritic: '这里是人体的第一道屏障——皮肤。一道擦伤撕裂了防御结界，细菌正从缺口悄悄往里钻，大家要提高警惕。',
    wbc: '缺口交给我。闯进来的病原体，我一个不留。',
    rbc: '屏障裂开我也有份责任！我这就去把养分送到位，撑住这道防线！',
    plt: '我马上用凝血网把裂痕一层层补上！不过……细菌会不会很厉害呀？'
  },
  { // 第2关 肠道危机·食物中毒(上)
    dendritic: '紧急情报——变质的伙食里藏着大量沙门氏菌，它们正顺着肠道繁殖，还不断释放毒素。',
    wbc: '肠道里的入侵者，我会逐一清掉。毒素也一并处理。',
    rbc: '肠道细胞的氧气就交给我！绝不能让组织因为缺氧而坏死！',
    plt: '那、那我要准备多少凝血块才够用呀？会不会不够？'
  },
  { // 第3关 蠕虫侵袭·食物中毒(下)
    dendritic: '寄生虫已经钻进肠道深处，躲在暗处潜伏，随时可能卷土重来，我们要格外当心。',
    wbc: '伪装也得认出来。潜伏的入侵者，我会精准清除。',
    rbc: '小心毒素！我盯紧供氧，只要宿主细胞不崩，它们就翻不了天！',
    plt: '虫子会不会咬人呀？我、我尽量不去靠近它们就是了……'
  },
  { // 第4关 呼吸道烽火·流行性感冒
    dendritic: '流感病毒攻破了上呼吸道，冰晶般的黏膜正被侵蚀，这片领空已经拉响警报。',
    wbc: '低温会拖慢免疫，但我不会让病毒在呼吸道扩散。',
    rbc: '气管分叉的地方我来加速供氧！我们一起把这片领空夺回来！',
    plt: '病毒是不是很小很小，要用很大力气才看得见呀？'
  },
  { // 第5关 组织溃烂·真菌感染
    dendritic: '真菌的菌丝正在组织里悄悄蔓延，那些薰衣草色的孢子，就是它们派出的前哨。',
    wbc: '真菌比细菌难缠，必须连同菌丝网络一起彻底毁掉。',
    rbc: '菌丝再密我也不怕！冲进去把它们的老巢端了！',
    plt: '孢子飘来飘去的好好看呀……诶，它们会不会黏到我身上？'
  },
  { // 第6关 细胞畸变·癌细胞侵袭
    dendritic: '最高警报——癌细胞正在疯狂增殖，它们会伪装成正常细胞，躲过免疫系统的眼睛。',
    wbc: '最后的战场。哪怕它们无限分裂，我也会把每一个都清除。',
    rbc: '星环已经扭曲了！不管多疯狂，我们都要终结这场病变！',
    plt: '它们为什么要变成坏细胞呀？我、我有点怕……但我会努力帮忙的！'
  }
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
