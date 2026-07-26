import type { ClassicLevelDefinition } from '../types'

export const LEVEL_3_VESSEL = {
  "id": "3",
  "name": "血管奔流",
  "width": 100,
  "cellType": 3,
  "winCondition": "collect-all",
  "tide": true,
  "sky": [
    "#2a0a1a",
    "#5a1a3a"
  ],
  "map": [
    "                                                                                                    ",
    "                                                                                                    ",
    "                                                                                                    ",
    "                                                                                                    ",
    "                                                                        o     o     o              ",
    "                                                     o    f    o    ===   ===   ===                 ",
    "                                            o  f   ===  ===  ===                 ===                ",
    "                                o    f    ===  ===              o  f            ===   o   f         ",
    "                     o    f   ===  ===                    o    ===  ===   C      ===  ===  ===      ",
    "          o    f    ===  ===                    o    f    ===        ===  ========        ===       ",
    "  o  f  ===  ===  ==               o    f     ===  ===  ==     o             ====    o    ===   D  ",
    " ===  ==         ==  f  o  g  G  ===  ===  o  ==        == g === f  o  g  G ====  g ===  ==  ===== ",
    "P   BBBBBBBBBBBB  =====  ======  =====  =====  BBBBBBBBBB  ======  =====  ==BBB==  =====  ==  b  > ",
    "====================================================================================================",
    "===================================================================================================="
  ],
  "floatPlatforms": [],
  "pipeSpawners": [],
  "tutorials": [
    {
      "x": 300,
      "useCurrent": true,
      "body": "进入血管！血流冲击强烈\n失血区域遍布全程\n切换到红细胞减缓能量消耗！"
    },
    {
      "x": 1400,
      "useCurrent": true,
      "body": "大型葡萄球菌挡路！\n踩踏两次才能消灭\n按E挥剑或Shift突进快速解决\n氧气领域可以加成踩踏伤害！"
    },
    {
      "x": 2600,
      "useCurrent": true,
      "body": "前方Boss出没！\n只有白细胞能伤害Boss\n利用挥剑+突进+跳劈连招\nBoss掉落传说装备！"
    }
  ],
  "knowledgeCards": [
    {
      "x": 200,
      "key": "vessel",
      "title": "血管 — 生命之河",
      "text": "血管是血液流动的通道。\n动脉将氧气和营养输送到全身，\n静脉将代谢废物带回心肺。\n病原体入侵血管会引发菌血症，\n这是免疫系统的紧急事态！"
    },
    {
      "x": 1200,
      "key": "staph_info",
      "title": "葡萄球菌 — 血液入侵者",
      "text": "金黄色葡萄球菌(Staphylococcus aureus)\n是菌血症最常见的病原菌。\n大型葡萄球菌有更强的生命力，\n死亡后会分裂成多个小型个体。\n善用范围攻击清理！"
    }
  ]
} as const satisfies ClassicLevelDefinition
