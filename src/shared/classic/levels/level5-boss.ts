import type { ClassicLevelDefinition } from '../types'

export const LEVEL_5_BOSS = {
  "id": "5",
  "name": "Boss感染",
  "width": 80,
  "cellType": 1,
  "winCondition": "kill-all",
  "sky": [
    "#2a0a0a",
    "#6a0a0a"
  ],
  "map": [
    "                                                                                ",
    "                                                                                ",
    "                              o              o               o                  ",
    "               ?             ===     o      ===     D       ===                 ",
    "         o   ===       g    ==     ===     f     ===      ==                    ",
    "   o   ===       g   ===   ==    ==   C  ==      ==   g  ==                     ",
    "  ===      g     ======   ==   ==   ====  ==  o  ==  =====                      ",
    " ==  g   ========       ==   ==  ==   ==  ==  ==== ==                           ",
    "P==  ========   ==  t  ==    ==  ==  o  ==  d   ==                              ",
    "######        ==  ==== ==    ==  ========  ==  ==                               ",
    "#    #   ?    ==    == ==    ==     ==     ==                                   ",
    "#    #  ===   ==  t == ==    ==     ==  f  ==                                   ",
    "#    =======  ==  ===  ==    ==  o  ==  ====                                    ",
    "######   #    D    ==  ==    ==  ==  ==     ===============================     ",
    "#####################################b################################F###      "
  ],
  "floatPlatforms": [],
  "pipeSpawners": [
    {
      "col": 30,
      "row": 0,
      "trigger": "timer",
      "enemy": "staph",
      "intervalTicks": 360,
      "maxSpawn": 3
    },
    {
      "col": 55,
      "row": 0,
      "trigger": "timer",
      "enemy": "strep",
      "intervalTicks": 420,
      "maxSpawn": 2
    }
  ],
  "tutorials": [
    {
      "x": 2400,
      "useCurrent": true,
      "body": "Boss细菌！\n只有白细胞能伤害Boss\n按E挥剑或空格踩踏攻击\n击杀Boss后门会解锁！"
    }
  ],
  "knowledgeCards": [
    {
      "x": 1900,
      "key": "boss",
      "title": "终极决战",
      "text": "前方就是细菌Boss的老巢！\n白细胞是唯一能对Boss造成伤害的免疫细胞。\n利用挥剑(E键)和踩踏进行连击，\n注意躲避Boss的攻击。\n击杀Boss后终点大门将会解锁。\n准备好迎接最终决战了吗？"
    }
  ]
} as const satisfies ClassicLevelDefinition
