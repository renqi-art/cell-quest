/* 血液循环 */
const LEVEL_0 = {
  name: '血液循环',
  width: 135,
  cellType: 3,
  winCondition: WIN_COLLECT_ALL,
  sky: [C.sky2, '#e8a0a0'],
  map: [
      "                                                                                                                                       ",
      "                                        ?                                                                                              ",
      "                                                                                    ?                                                  ",
      "                                                                          oo                                                           ",
      "                             ?                                           o  o                  ??                             o        ",
      "          o                           =====                             o    o                                               op        ",
      "         o o           ooooo                 o                         o   p  o        oooo                                 opp        ",
      "        o   o     ooo  =====    oooo        ==    oo               o  ==   p   o    p  ====                                oppp        ",
      "       o     o    ===        p  ====            ====     o    p            p    o   p         ===                         opppp        ",
      "    oo==  p ===              p                         ===    p   ===      p   ==   p                 p                  oppppp        ",
      "    ==    p                  p                                p            p        p                 p                 opppppp        ",
      "P         p                  p             C                  p            p        p                 p                 ppppppp    F   ",
      "#####################################################################################################################################  ",
      "#####################################################################################################################################  ",
      "#####################################################################################################################################  ",
  ],
  floatPlatforms: [],
  pipeSpawners: [
    { col:10, row:9, dir:'up_jump', trigger:'proximity', range:2 },
    { col:75, row:6, dir:'up', trigger:'contact' }
  ],
  tutorials: [],
  knowledgeCards: [],
};
