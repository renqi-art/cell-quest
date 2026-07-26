import type { ClassicLevelDefinition } from '../types'

export const LEVEL_4_LYMPH = {
  "id": "4",
  "name": "淋巴结",
  "width": 80,
  "cellType": 1,
  "winCondition": "kill-all",
  "sky": [
    "#7a2a3e",
    "#e8a0a0"
  ],
  "map": [
    "                                                                                ",
    "                                                                                ",
    "                                                  ?             ?               ",
    "                    ?              ?                                            ",
    "                                            o      o    o                       ",
    "                               o    o     ===         ===            o          ",
    "                   o    o    ===  ===            ==        D  ==                ",
    "          o       ===  ===          ==  C   o   ==  t      ===      ==    o     ",
    "    o    ===     ==      ==   t    ==  ========  ==      ==      G  ==   ===    ",
    "   ===  ==  o  ==  G    ==  ==== ===      ==    ==  t  ==  o   ========  ==     ",
    "   =  ==  ====  ========  ==      ==  o   ==  o ==  ====  ===       ==  ==  D   ",
    "P  =  G   t  ==  t   ==  ==  o   ==  ===  ==  ====      ==  G  o  ==  ==  === F ",
    "###############################=================================================",
    "######################==#=====#####=============================================",
    "####################============================================================"
  ],
  "floatPlatforms": [],
  "pipeSpawners": [],
  "tutorials": [],
  "knowledgeCards": []
} as const satisfies ClassicLevelDefinition
