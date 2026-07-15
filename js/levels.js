/* ====================================================================
 * levels.js — 关卡地图数据 + 教程对话 + 浮动平台定义
 * 仅第一关有完整数据，2~5关为空占位
 * ==================================================================== */

const LEVEL_MAPS = [
  /* ===== 第 1 关：擦伤 ===== */
  {
    name: '擦伤',
    width: 80,
    sky: [C.sky1, C.sky3],
    map: [
      //0         1         2         3         4         5         6         7
      //0123456789012345678901234567890123456789012345678901234567890123456789012345678901
      "                                                                                ", // 0
      "                                                                                ", // 1
      "                                                                                ", // 2
      "                                                                                ", // 3
      "                                                                                ", // 4
      "                                                                                ", // 5
      "                                 o                                              ", // 6  最高金币
      "                           f    ===   n                                         ", // 7  食物+最高平台+营养包
      "                      n   ===        ===   o                                    ", // 8  营养包+平台+平台+金币
      "                o    ===                  ===   C                               ", // 9  金币+平台+平台+存档
      "           n   ===                             ===   d        O                 ", // 10 营养包+平台+平台+饮料+氧气
      "          ===                                       ===     ====                ", // 11 平台+平台+平台+gap2浮动平台
      "  P  o o g       C                                  g  tb===                F   ", // 12 实体层
      "##################   ######################################       ##############", // 13 地面(gap1=18-20, gap2=59-65)
      "##################   ######################################       ##############", // 14 深地面
    ],
    // 浮动毛细血管平台（本关平台用静态阶梯，暂不启用浮动）
    floatPlatforms: [],
    // 教程对话气泡 (x触发位置, 角色, 台词)
    tutorials: [
      { x: 1750,useCurrent: true,
        body: '前方是终点大缺口！\nBoss细菌守在缺口前\n只有白细胞能伤害Boss\n击杀Boss后用血小板搭桥通过！' },
    ],
    // 知识卡片触发位置 (x触发, y可选高度限制, key标识, 标题, 文本)
    // y: 指定时仅当玩家在该高度或更高时触发（y越小越高，地面y≈340, 平台y≈276）
    knowledgeCards: [
      { x: 2, key: 'wbc',
        title: '白细胞',
        text: '嘿！我是白细胞。\n白细胞，将自体外入侵至体内的细菌与病毒等异物排除干净，是白细胞的主要工作。人类血液中的白细胞有一半以上都是中性粒细胞。\n前方有细菌出没，按 1 切换到白细胞！白细胞能消灭细菌，跳到细菌头顶踩踏消灭或按 E 挥剑斩杀！\n← → 或 A D 移动\n空格 / W / ↑ 跳跃\n长按跳更高，空中再按一次二段跳！' },
      { x: 440, y: 310, key: 'rbc',
        title: '红细胞',
        text: '看到粉色营养包了吗？\n按 3 切换到红细胞才能收集，营养包可以恢复大量能量\n红细胞，可通过血液循环将氧气和二氧化碳在体内运送。营养包只有红细胞能收集哦。' },
      { x: 1700, key: 'plt',
        title: '血小板',
        text: '嘿！我是血小板。血小板，血液中含有的一种细胞成分，会在血管受损时集结，堵住伤口进行止血。前方有断裂缺口，按 2 切换到血小板，按 E 消耗能量生成凝血平台，注意能量是否充足！' },
    ],
  },

  /* ===== 第 2 关：肺泡迷宫（空占位） ===== */
  { name: '肺泡迷宫', width: 80, sky: ['#1a2a3a','#3a6a8a'], map: [], tutorials: [], floatPlatforms: [], knowledgeCards: [] },

  /* ===== 第 3 关：血管奔流（空占位） ===== */
  { name: '血管奔流', width: 80, sky: ['#2a0a1a','#5a1a3a'], map: [], tutorials: [], floatPlatforms: [], knowledgeCards: [] },

  /* ===== 第 4 关：淋巴结（空占位） ===== */
  { name: '淋巴结', width: 80, sky: ['#1a1a2a','#3a3a5a'], map: [], tutorials: [], floatPlatforms: [], knowledgeCards: [] },

  /* ===== 第 5 关：Boss感染（空占位） ===== */
  { name: 'Boss感染', width: 80, sky: ['#2a0a0a','#6a0a0a'], map: [], tutorials: [], floatPlatforms: [], knowledgeCards: [] },
];

// ===== 关卡独立配置表（预留，后续关卡复用） =====
const LEVEL_DEFS = [
  {
    id: 1,
    name: '擦伤',
    bgMusic: 'wound',
    enemies: ['staph', 'staphLarge', 'strep', 'boss'],
    mechanics: ['bridge', 'crouch', 'sword', 'nutrition', 'boss'],
    checkpoint: true,
  },
  { id: 2, name: '肺泡迷宫', bgMusic: 'lung', enemies: [], mechanics: [], checkpoint: true },
  { id: 3, name: '血管奔流', bgMusic: 'vessel', enemies: [], mechanics: [], checkpoint: true },
  { id: 4, name: '淋巴结', bgMusic: 'lymph', enemies: [], mechanics: [], checkpoint: true },
  { id: 5, name: 'Boss感染', bgMusic: 'boss', enemies: [], mechanics: [], checkpoint: true },
];

// 记忆细胞科普卡片文本
const MEMORY_CARD = {
  title: '免疫记忆',
  text: '记忆细胞是免疫系统的"档案库"。\n当身体首次遇到某种病原体后，\n部分淋巴细胞会转化为记忆细胞。\n下次再遇到同样的敌人时，\n它们能迅速唤醒免疫系统，\n以更快的速度和更大的规模消灭入侵者。\n这就是疫苗起效的原理。',
};
