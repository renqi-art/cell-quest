import type { ClassicLevelDefinition } from '../types'

export const LEVEL_1_WBC = {
  "id": "1",
  "name": "白细胞觉醒",
  "width": 135,
  "cellType": 1,
  "winCondition": "kill-all",
  "sky": [
    "#7a2a3e",
    "#e8a0a0"
  ],
  "map": [
    "                                                                                                                                       ",
    "                        ?                                                                                                              ",
    "                                                                                                                                       ",
    "                                                                                                                                       ",
    "             ?                                                                                                                         ",
    "                       ooo                     ooo             ??                                       ?                              ",
    "        oo  o     ooo  ===                 oo  ===                                          t                                          ",
    "        ==  ^ o   ===            a     p   ==                          o^o    oo        o====                                          ",
    "      =     ===                 o o    p            ===    ooo ==      ===    ==   p   o==                                             ",
    "                               o   o  =p                   H    *                  p   =                p  aaaaaaaaaaaaaaa             ",
    "P     N                       o  G  o= p       t    ooooo   g     t                p                    p  aaaaaaaaaaaaaaa      b      ",
    "#######################################p###########################################p####################p##############################",
    "#######################################p###########################################p####################p##############################",
    "#######################################p###########################################p####################p##############################"
  ],
  "floatPlatforms": [],
  "pipeSpawners": [
    {
      "col": 75,
      "row": 7,
      "direction": "up",
      "trigger": "contact"
    },
    {
      "col": 39,
      "row": 7,
      "direction": "up-jump",
      "trigger": "contact"
    }
  ],
  "tutorials": [],
  "knowledgeCards": [
    {
      "x": 32,
      "key": "wbc",
      "title": "白细胞",
      "text": "白细胞是抵御伤口感染的先锋。当细菌通过擦伤创面入侵身体，白细胞会奔赴患处，吞噬并消灭病菌。我们看到的脓液，很多是英勇作战后牺牲的白细胞。"
    }
  ]
} as const satisfies ClassicLevelDefinition
